import { usePrinter } from "@/context/PrinterContext";
import { Button } from "@/components/ui/button";
import { Printer, PrinterCheck, Unplug } from "lucide-react";
import { toast } from "sonner";

export default function PrinterButton() {
  const { supported, ready, connected, deviceName, connect, disconnect } = usePrinter();

  if (!ready) return null;

  if (!supported) {
    return (
      <div
        data-testid="printer-unsupported"
        className="inline-flex items-center gap-2 text-xs text-[#6B5D54] bg-[#F2EBE1] rounded-full px-3 py-1.5"
        title="WebUSB desteklenmiyor. Chrome/Edge kullanın."
      >
        <Printer className="w-3.5 h-3.5" />
        Tarayıcı yazdırma (yedek)
      </div>
    );
  }

  if (connected) {
    return (
      <div className="inline-flex items-center gap-2">
        <div
          data-testid="printer-connected"
          className="inline-flex items-center gap-2 text-xs text-[#5F704E] bg-[#E9EFDD] rounded-full px-3 py-1.5"
        >
          <PrinterCheck className="w-3.5 h-3.5" />
          {deviceName || "Yazıcı bağlı"}
        </div>
        <Button
          data-testid="printer-disconnect-btn"
          size="sm"
          variant="ghost"
          onClick={async () => { await disconnect(); toast.message("Yazıcı bağlantısı kesildi"); }}
          className="text-[#6B5D54] hover:bg-[#F2EBE1] rounded-full h-8 px-3"
        >
          <Unplug className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      data-testid="printer-connect-btn"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await connect();
          toast.success("Termal yazıcı bağlandı");
        } catch (e) {
          if (e?.name === "NotFoundError") return; // user cancelled
          toast.error(e?.message || "Yazıcı bağlanamadı");
        }
      }}
      className="rounded-full border-[#E6DDD1] hover:bg-[#F2EBE1]"
    >
      <Printer className="w-4 h-4 mr-2" />
      Termal Yazıcı Bağla
    </Button>
  );
}
