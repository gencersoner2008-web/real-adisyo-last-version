import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, QrCode } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function ManageTablesPage() {
  const [tables, setTables] = useState([]);
  const [name, setName] = useState("");
  const [qrTable, setQrTable] = useState(null);

  const load = async () => {
    const { data } = await api.get("/tables");
    setTables(data);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await api.post("/tables", { name: name.trim() });
      setName("");
      toast.success("Masa eklendi");
      load();
    } catch (e) {
      toast.error("Eklenemedi");
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`${t.name} silinsin mi?`)) return;
    try {
      await api.delete(`/tables/${t.id}`);
      toast.success("Silindi");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Silinemedi");
    }
  };

  const qrUrl = (id) => `${window.location.origin}/qr/${id}`;
  const qrImg = (id) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrUrl(id))}`;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Yönetim</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Masa Yönetimi</h1>
      </div>

      <div className="bg-white rounded-2xl border border-[#E6DDD1] p-6 card-shadow flex items-end gap-4 max-w-xl">
        <div className="flex-1">
          <Label>Yeni masa adı</Label>
          <Input
            data-testid="new-table-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: Masa 9 veya Teras 1"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <Button data-testid="add-table-btn" onClick={add} className="rounded-full bg-[#C8664D] hover:bg-[#A6513A] text-white pill-shadow">
          <Plus className="w-4 h-4 mr-2" /> Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((t) => (
          <div key={t.id} data-testid={`manage-table-${t.id}`} className="bg-white rounded-2xl border border-[#E6DDD1] p-5 card-shadow flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold">{t.name}</p>
              <p className="text-xs text-[#6B5D54] mt-1">
                {t.has_open_order ? "Açık adisyonu var" : "Boş"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setQrTable(t)} className="rounded-full border-[#E6DDD1]" data-testid={`qr-table-${t.id}`}>
                <QrCode className="w-3.5 h-3.5 mr-1.5" /> QR
              </Button>
              <Button variant="outline" size="sm" onClick={() => remove(t)} className="rounded-full border-[#E6DDD1] text-[#C8664D]" data-testid={`delete-table-${t.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!qrTable} onOpenChange={(o) => !o && setQrTable(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{qrTable?.name} • QR Kod</DialogTitle>
          </DialogHeader>
          {qrTable && (
            <div className="flex flex-col items-center gap-4 py-4">
              <img src={qrImg(qrTable.id)} alt="QR" className="w-64 h-64 rounded-xl border border-[#E6DDD1]" />
              <p className="text-xs text-[#6B5D54] break-all text-center">{qrUrl(qrTable.id)}</p>
              <p className="text-sm text-[#6B5D54] text-center">
                Müşteri bu QR&apos;ı okuttuğunda kendi siparişini oluşturabilir; sipariş bu masada adisyona düşer.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
