import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function HappyHourButton() {
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState(settings.happy_hour_percent);
  const [saving, setSaving] = useState(false);
  const active = settings.happy_hour_enabled;

  // Keep local pct in sync when settings change externally
  if (!open && pct !== settings.happy_hour_percent) {
    // eslint-disable-next-line no-unused-expressions
    setPct(settings.happy_hour_percent);
  }

  const toggle = async (v) => {
    setSaving(true);
    try {
      await update({ happy_hour_enabled: v, happy_hour_percent: Number(pct) || 0 });
      toast[v ? "success" : "message"](v ? `Happy Hour açıldı • -%${pct}` : "Happy Hour kapatıldı");
    } catch (_) {
      toast.error("Ayar kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const savePct = async () => {
    setSaving(true);
    try {
      const p = Math.max(0, Math.min(90, Number(pct) || 0));
      await update({ happy_hour_percent: p });
      setPct(p);
      toast.success(`İndirim oranı %${p} olarak güncellendi`);
    } catch (_) {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="happy-hour-btn"
          size="sm"
          variant={active ? "default" : "outline"}
          className={
            active
              ? "rounded-full bg-[#C8664D] hover:bg-[#A6513A] text-white pill-shadow"
              : "rounded-full border-[#E6DDD1] text-[#2C1F16] hover:bg-[#F2EBE1]"
          }
        >
          <Sparkles className={`w-4 h-4 mr-2 ${active ? "" : "text-[#C8664D]"}`} />
          <span className="hidden md:inline">Happy Hour</span>
          <span className="md:hidden">HH</span>
          {active && <span className="ml-2 font-semibold">-%{settings.happy_hour_percent}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl border-[#E6DDD1]">
        <div className="space-y-4">
          <div>
            <p className="font-display text-lg font-semibold text-[#2C1F16]">Happy Hour</p>
            <p className="text-xs text-[#6B5D54]">Aktif olduğu sürece tüm açık adisyonlara indirim uygulanır.</p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#F9F6F0] px-4 py-3">
            <Label htmlFor="hh-switch" className="text-[#2C1F16] font-medium">Kampanya</Label>
            <Switch
              id="hh-switch"
              data-testid="happy-hour-switch"
              checked={active}
              disabled={saving}
              onCheckedChange={toggle}
            />
          </div>
          <div>
            <Label className="text-[#2C1F16]">İndirim oranı (%)</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                data-testid="happy-hour-percent"
                type="number"
                min={0}
                max={90}
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                className="h-10 bg-white"
              />
              <Button
                data-testid="happy-hour-save-percent"
                onClick={savePct}
                disabled={saving}
                className="h-10 rounded-full bg-[#2C1F16] hover:bg-[#3d2a1e] text-white"
              >
                Kaydet
              </Button>
            </div>
            <p className="text-xs text-[#6B5D54] mt-2">0-90 arası bir değer girin. Değişiklik tüm açık adisyonlara anında yansır.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
