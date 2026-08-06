import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function PasswordChangeButton() {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState("");
  const [np, setNp] = useState("");
  const [np2, setNp2] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setCur(""); setNp(""); setNp2(""); };

  const submit = async (e) => {
    e.preventDefault();
    if (np.length < 4) { toast.error("Yeni şifre en az 4 karakter olmalı"); return; }
    if (np !== np2) { toast.error("Yeni şifreler eşleşmiyor"); return; }
    setBusy(true);
    try {
      await api.put("/auth/password", { current_password: cur, new_password: np });
      toast.success("Şifre güncellendi");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Şifre değiştirilemedi");
    } finally {
      setBusy(false);
    }
  };

  const resetToDefault = async () => {
    if (!window.confirm("Şifre varsayılan (1234) olarak sıfırlansın mı?")) return;
    setBusy(true);
    try {
      await api.post("/auth/reset-password");
      toast.success("Şifre 1234 olarak sıfırlandı");
      setOpen(false);
      reset();
    } catch (_) {
      toast.error("Sıfırlanamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button
          data-testid="password-change-btn"
          variant="ghost"
          size="sm"
          className="rounded-full h-9 w-9 p-0 text-[#6B5D54] hover:text-[#2C1F16] hover:bg-[#F2EBE1]"
          title="Şifre değiştir"
        >
          <KeyRound className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Şifre Değiştir</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div>
            <Label>Mevcut Şifre</Label>
            <Input
              data-testid="pw-current"
              type="password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <Label>Yeni Şifre</Label>
            <Input
              data-testid="pw-new"
              type="password"
              value={np}
              onChange={(e) => setNp(e.target.value)}
              minLength={4}
              required
            />
          </div>
          <div>
            <Label>Yeni Şifre (Tekrar)</Label>
            <Input
              data-testid="pw-new-2"
              type="password"
              value={np2}
              onChange={(e) => setNp2(e.target.value)}
              minLength={4}
              required
            />
          </div>
          <p className="text-xs text-[#6B5D54]">Unuttuysanız, giriş yaptıktan sonra "Varsayılana Sıfırla" ile 1234'e dönebilirsiniz.</p>
          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              data-testid="pw-reset-default-btn"
              variant="ghost"
              size="sm"
              onClick={resetToDefault}
              disabled={busy}
              className="text-[#6B5D54]"
            >
              Varsayılana Sıfırla
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>İptal</Button>
              <Button
                type="submit"
                data-testid="pw-save-btn"
                disabled={busy}
                className="rounded-full bg-[#C8664D] hover:bg-[#A6513A] text-white"
              >
                Kaydet
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
