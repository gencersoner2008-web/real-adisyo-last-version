import { useEffect } from "react";
import { formatTL, sizeLabel } from "@/lib/api";

export default function Receipt({ order, onDone }) {
  useEffect(() => {
    const handler = () => onDone && onDone();
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, [onDone]);

  const dt = order.paid_at ? new Date(order.paid_at) : new Date();
  const hasDiscount = (order.discount_percent || 0) > 0 && (order.subtotal || 0) > 0;

  return (
    <div id="receipt-print" className="hidden print:block">
      <div style={{ textAlign: "center", fontWeight: "bold" }}>REAL COFFEE ADİSYON</div>
      <div style={{ textAlign: "center", fontSize: 12 }}>Fiş / Adisyon</div>
      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
      <div style={{ fontSize: 12 }}>Masa: {order.table_name}</div>
      <div style={{ fontSize: 12 }}>Tarih: {dt.toLocaleString("tr-TR")}</div>
      <div style={{ fontSize: 12 }}>Adisyon No: {order.id.slice(0, 8).toUpperCase()}</div>
      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
      <table style={{ width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Ürün</th>
            <th style={{ textAlign: "center" }}>Adet</th>
            <th style={{ textAlign: "right" }}>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id}>
              <td style={{ textAlign: "left" }}>
                {it.name}
                {it.size ? ` (${sizeLabel(it.size)})` : ""}
              </td>
              <td style={{ textAlign: "center" }}>{it.qty}</td>
              <td style={{ textAlign: "right" }}>{formatTL(it.unit_price * it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
      {hasDiscount && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span>Ara Toplam</span>
            <span>{formatTL(order.subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span>Happy Hour (-%{order.discount_percent})</span>
            <span>-{formatTL(order.subtotal - order.total)}</span>
          </div>
        </>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 14, marginTop: 4 }}>
        <span>TOPLAM</span>
        <span>{formatTL(order.total)}</span>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, marginTop: 12 }}>Bizi tercih ettiğiniz için teşekkürler ☕</div>
    </div>
  );
}
