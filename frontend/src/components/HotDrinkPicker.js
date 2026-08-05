import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTL, sizeLabel } from "@/lib/api";
import { Plus } from "lucide-react";

// Reusable picker for hot drinks: choose size + optional extras (syrups/milk).
// Props: product, extras, open, onOpenChange, onSubmit(size, extra_ids)
export default function HotDrinkPicker({ product, extras = [], open, onOpenChange, onSubmit }) {
  const [size, setSize] = useState("grande");
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [busy, setBusy] = useState(false);

  // Restrict extras per product: null/undefined means all allowed, array means whitelist.
  const shownExtras = useMemo(() => {
    const allowed = product?.allowed_extra_ids;
    if (!Array.isArray(allowed)) return extras;
    const set = new Set(allowed);
    return extras.filter((e) => set.has(e.id));
  }, [extras, product]);

  useEffect(() => {
    if (open) {
      setSize("grande");
      setSelectedExtras([]);
    }
  }, [open, product?.id]);

  const basePrice = product ? product[`price_${size}`] || 0 : 0;
  const extrasTotal = useMemo(
    () => selectedExtras.reduce((s, id) => s + (extras.find((e) => e.id === id)?.price || 0), 0),
    [selectedExtras, extras]
  );
  const total = basePrice + extrasTotal;

  const toggleExtra = (id) => {
    setSelectedExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!product) return;
    setBusy(true);
    try {
      await onSubmit(size, selectedExtras);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] flex flex-col p-0">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{product?.name}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-4 overflow-y-auto space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54] mb-3">Boy</p>
            <div className="grid grid-cols-3 gap-3">
              {["tall", "grande", "venti"].map((s) => (
                <button
                  key={s}
                  data-testid={`size-${s}`}
                  onClick={() => setSize(s)}
                  className={`rounded-xl p-4 border-2 text-center transition-colors ${
                    size === s
                      ? "border-[#C8664D] bg-[#FFF4EE]"
                      : "border-[#E6DDD1] bg-white hover:border-[#C8664D]/40"
                  }`}
                >
                  <p className="font-display font-semibold">{sizeLabel(s)}</p>
                  <p className="text-[#C8664D] font-bold mt-1">{formatTL(product?.[`price_${s}`])}</p>
                </button>
              ))}
            </div>
          </div>

          {shownExtras.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54] mb-3">Ekstralar (opsiyonel)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {shownExtras.map((e) => {
                  const active = selectedExtras.includes(e.id);
                  return (
                    <label
                      key={e.id}
                      data-testid={`extra-${e.id}`}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                        active ? "border-[#C8664D] bg-[#FFF4EE]" : "border-[#E6DDD1] bg-white hover:border-[#C8664D]/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          checked={active}
                          onCheckedChange={() => toggleExtra(e.id)}
                          className="border-[#C8664D] data-[state=checked]:bg-[#C8664D] data-[state=checked]:border-[#C8664D]"
                        />
                        <span className="text-sm font-medium text-[#2C1F16] truncate">{e.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#C8664D] whitespace-nowrap">+{formatTL(e.price)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 flex-row items-center justify-between sm:justify-between border-t border-[#E6DDD1] mt-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B5D54]">Toplam</p>
            <p data-testid="picker-total" className="font-display text-2xl font-bold text-[#2C1F16]">{formatTL(total)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button
              data-testid="picker-add-btn"
              onClick={submit}
              disabled={busy}
              className="rounded-full bg-[#C8664D] hover:bg-[#A6513A] text-white pill-shadow"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Ekle
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
