import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  isWebUsbSupported, getKnownPrinter, requestPrinter, printOrder, printerName,
} from "@/lib/thermalPrinter";

const PrinterContext = createContext(null);

export function PrinterProvider({ children }) {
  const [device, setDevice] = useState(null);
  const [ready, setReady] = useState(false);
  const supported = isWebUsbSupported();

  useEffect(() => {
    (async () => {
      if (supported) {
        try {
          const d = await getKnownPrinter();
          if (d) setDevice(d);
        } catch (_) { /* ignore */ }
      }
      setReady(true);
    })();
    if (supported) {
      const onDisc = (e) => { if (device && e.device === device) setDevice(null); };
      const onConn = () => {};
      navigator.usb.addEventListener("disconnect", onDisc);
      navigator.usb.addEventListener("connect", onConn);
      return () => {
        navigator.usb.removeEventListener("disconnect", onDisc);
        navigator.usb.removeEventListener("connect", onConn);
      };
    }
    // eslint-disable-next-line
  }, [supported]);

  const connect = useCallback(async () => {
    const d = await requestPrinter();
    setDevice(d);
    return d;
  }, []);

  const disconnect = useCallback(async () => {
    if (device) {
      try { await device.close(); } catch (_) { /* noop */ }
    }
    setDevice(null);
  }, [device]);

  const print = useCallback(async (order) => {
    if (!device) throw new Error("Yazıcı bağlı değil");
    await printOrder(device, order);
  }, [device]);

  return (
    <PrinterContext.Provider
      value={{
        supported,
        ready,
        connected: !!device,
        deviceName: device ? printerName(device) : null,
        connect,
        disconnect,
        print,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}

export const usePrinter = () => useContext(PrinterContext);
