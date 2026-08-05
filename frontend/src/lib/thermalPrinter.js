// Minimal ESC/POS 80mm thermal-printer helper using WebUSB.
// Supported in Chrome/Edge/Opera on HTTPS. Falls back cleanly if unsupported.

// ---- CP857 (Turkish) encoding table ----
// Maps unicode -> single byte in CP857. Non-mapped chars fall back to '?'.
const CP857 = {
  "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "ä": 0x84, "à": 0x85, "å": 0x86,
  "ç": 0x87, "ê": 0x88, "ë": 0x89, "è": 0x8A, "ï": 0x8B, "î": 0x8C, "ı": 0x8D,
  "Ä": 0x8E, "Å": 0x8F, "É": 0x90, "æ": 0x91, "Æ": 0x92, "ô": 0x93, "ö": 0x94,
  "ò": 0x95, "û": 0x96, "ù": 0x97, "İ": 0x98, "Ö": 0x99, "Ü": 0x9A, "¢": 0x9B,
  "£": 0x9C, "¥": 0x9D, "Ş": 0x9E, "ş": 0x9F, "á": 0xA0, "í": 0xA1, "ó": 0xA2,
  "ú": 0xA3, "ñ": 0xA4, "Ñ": 0xA5, "Ğ": 0xA6, "ğ": 0xA7, "¿": 0xA8, "®": 0xA9,
  "°": 0xF8, "€": 0xD5,
};

const encodeCP857 = (text) => {
  const bytes = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) {
      bytes.push(code);
    } else if (CP857[ch] !== undefined) {
      bytes.push(CP857[ch]);
    } else {
      bytes.push(0x3F); // '?'
    }
  }
  return new Uint8Array(bytes);
};

// ---- ESC/POS command shortcuts ----
const ESC = 0x1B, GS = 0x1D, LF = 0x0A;
const CMD = {
  init: () => new Uint8Array([ESC, 0x40]),
  charset_cp857: () => new Uint8Array([ESC, 0x74, 13]), // code page CP857
  align: (n) => new Uint8Array([ESC, 0x61, n]), // 0 left, 1 center, 2 right
  bold: (on) => new Uint8Array([ESC, 0x45, on ? 1 : 0]),
  size: (w, h) => new Uint8Array([GS, 0x21, ((w & 0x0F) << 4) | (h & 0x0F)]),
  feed: (n) => new Uint8Array([ESC, 0x64, n]),
  cut: () => new Uint8Array([GS, 0x56, 0x00]),
  lf: () => new Uint8Array([LF]),
};

const concat = (chunks) => {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
};

const line = (text = "") => concat([encodeCP857(text), CMD.lf()]);

// 42-char width for 80mm printers at font A (33 for font B).
const WIDTH = 42;
const padRight = (s, n) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));
const padLeft = (s, n) => (s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s);
const dashes = (ch = "-") => ch.repeat(WIDTH);

const sizeLabel = (s) => {
  if (!s) return "";
  if (s === "tall") return "Tall";
  if (s === "grande") return "Grande";
  if (s === "venti") return "Venti";
  if (s === "standart") return "Standart";
  return s;
};

const fmtTL = (n) => {
  // Use '₺' but printer likely lacks it; render as "TL" for max compatibility.
  const v = (n || 0).toFixed(2);
  return v + " TL";
};

// ---- Build ESC/POS payload for a paid order ----
export const buildReceipt = (order) => {
  const dt = order.paid_at ? new Date(order.paid_at) : new Date();
  const parts = [];

  parts.push(CMD.init(), CMD.charset_cp857());

  // Header
  parts.push(CMD.align(1), CMD.bold(true), CMD.size(1, 1));
  parts.push(line("REAL COFFEE ADISYON"));
  parts.push(CMD.size(0, 0), CMD.bold(false));
  parts.push(line("Fiş / Adisyon"));
  parts.push(CMD.lf());

  // Info block
  parts.push(CMD.align(0));
  parts.push(line("Masa       : " + (order.table_name || "-")));
  parts.push(line("Tarih      : " + dt.toLocaleString("tr-TR")));
  parts.push(line("Adisyon No : " + (order.id || "").slice(0, 8).toUpperCase()));
  parts.push(line(dashes()));

  // Column header
  parts.push(CMD.bold(true));
  parts.push(line(padRight("ÜRÜN", 22) + padLeft("ADT", 4) + padLeft("TUTAR", 16)));
  parts.push(CMD.bold(false));
  parts.push(line(dashes()));

  // Items
  for (const it of order.items || []) {
    const name = it.name + (it.size ? " (" + sizeLabel(it.size) + ")" : "");
    // Wrap long names
    const first = name.slice(0, 22);
    const rest = name.length > 22 ? name.slice(22) : "";
    const row = padRight(first, 22) + padLeft(String(it.qty), 4) + padLeft(fmtTL(it.unit_price * it.qty), 16);
    parts.push(line(row));
    if (rest) {
      // Continuation line under name only
      let r = rest;
      while (r.length > 0) {
        parts.push(line(padRight(r.slice(0, 22), 22)));
        r = r.slice(22);
      }
    }
    parts.push(line("  " + fmtTL(it.unit_price) + " x " + it.qty));
  }

  parts.push(line(dashes()));

  // Discount block (if any)
  const hasDiscount = (order.discount_percent || 0) > 0 && (order.subtotal || 0) > 0;
  if (hasDiscount) {
    const discount = (order.subtotal || 0) - (order.total || 0);
    parts.push(line(padRight("Ara Toplam", 22) + padLeft(fmtTL(order.subtotal), 20)));
    parts.push(line(padRight("Happy Hour (-%" + order.discount_percent + ")", 22) + padLeft("-" + fmtTL(discount), 20)));
    parts.push(line(dashes()));
  }

  // Total
  parts.push(CMD.bold(true), CMD.size(0, 1));
  parts.push(line(padRight("TOPLAM", 22) + padLeft(fmtTL(order.total), 20)));
  parts.push(CMD.size(0, 0), CMD.bold(false));
  parts.push(CMD.lf());

  // Footer
  parts.push(CMD.align(1));
  parts.push(line("Bizi tercih ettiginiz icin"));
  parts.push(line("tesekkur ederiz"));
  parts.push(CMD.feed(3));
  parts.push(CMD.cut());

  return concat(parts);
};

// ---- WebUSB connection helpers ----
const findBulkOutEndpoint = (device) => {
  const conf = device.configuration;
  if (!conf) return null;
  for (const iface of conf.interfaces) {
    for (const alt of iface.alternates) {
      const ep = alt.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
      if (ep) {
        return {
          interfaceNumber: iface.interfaceNumber,
          alternateSetting: alt.alternateSetting,
          endpointNumber: ep.endpointNumber,
        };
      }
    }
  }
  return null;
};

const openDevice = async (device) => {
  if (!device.opened) await device.open();
  if (!device.configuration) await device.selectConfiguration(1);
  const target = findBulkOutEndpoint(device);
  if (!target) throw new Error("Yazıcıda uygun bulk-out endpoint bulunamadı");
  try { await device.claimInterface(target.interfaceNumber); }
  catch (e) {
    // On Linux/Chrome the interface may be held by the OS; try releasing then re-claim
    throw new Error("Yazıcı arayüzü açılamadı: " + (e.message || e));
  }
  if (target.alternateSetting !== 0) {
    await device.selectAlternateInterface(target.interfaceNumber, target.alternateSetting);
  }
  return target;
};

export const isWebUsbSupported = () => typeof navigator !== "undefined" && !!navigator.usb;

export const getKnownPrinter = async () => {
  if (!isWebUsbSupported()) return null;
  const devices = await navigator.usb.getDevices();
  return devices[0] || null;
};

export const requestPrinter = async () => {
  if (!isWebUsbSupported()) throw new Error("Tarayıcınız WebUSB desteklemiyor. Lütfen Chrome/Edge kullanın.");
  const device = await navigator.usb.requestDevice({
    filters: [{ classCode: 7 }, {}],
  });
  return device;
};

export const printOrder = async (device, order) => {
  const target = await openDevice(device);
  const data = buildReceipt(order);
  // Send in ~2KB chunks to be safe with some printers
  const chunkSize = 2048;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await device.transferOut(target.endpointNumber, chunk);
  }
};

export const printerName = (device) =>
  device?.productName || device?.manufacturerName || `USB ${device?.vendorId?.toString(16)}:${device?.productId?.toString(16)}`;
