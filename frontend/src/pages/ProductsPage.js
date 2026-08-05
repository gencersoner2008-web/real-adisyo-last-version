import { useEffect, useState } from "react";
import { api, formatTL, categoryLabel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  name: "", category: "hot",
  price_tall: "", price_grande: "", price_venti: "", price: "",
};

const emptyExtraForm = { name: "", price: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [extras, setExtras] = useState([]);
  const [extraOpen, setExtraOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState(null);
  const [extraForm, setExtraForm] = useState(emptyExtraForm);

  const load = async () => {
    const [p, e] = await Promise.all([api.get("/products"), api.get("/extras")]);
    setProducts(p.data);
    setExtras(e.data);
  };
  useEffect(() => { load(); }, []);

  const startAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const startEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      price_tall: p.price_tall ?? "",
      price_grande: p.price_grande ?? "",
      price_venti: p.price_venti ?? "",
      price: p.price ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = { name: form.name, category: form.category };
      if (form.category === "hot") {
        payload.price_tall = parseFloat(form.price_tall);
        payload.price_grande = parseFloat(form.price_grande);
        payload.price_venti = parseFloat(form.price_venti);
      } else {
        payload.price = parseFloat(form.price);
      }
      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post("/products", payload);
      toast.success(editing ? "Ürün güncellendi" : "Ürün eklendi");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Kaydedilemedi");
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`${p.name} silinsin mi?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success("Silindi");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Silinemedi");
    }
  };

  const grouped = { hot: [], cold: [], other: [] };
  products.forEach((p) => grouped[p.category]?.push(p));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Ürünler</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Ürün Yönetimi</h1>
        </div>
        <Button
          data-testid="add-product-btn"
          onClick={startAdd}
          className="rounded-full bg-[#C8664D] hover:bg-[#A6513A] text-white pill-shadow transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> Yeni Ürün
        </Button>
      </div>

      {["hot", "cold", "other"].map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-[#2C1F16]">{categoryLabel(cat)}</h2>
          {grouped[cat].length === 0 ? (
            <p className="text-[#6B5D54] text-sm">Bu kategoride ürün yok.</p>
          ) : (
            <div className="grid gap-3">
              {grouped[cat].map((p) => (
                <div key={p.id} data-testid={`product-row-${p.id}`} className="bg-white rounded-2xl border border-[#E6DDD1] p-4 flex items-center justify-between card-shadow">
                  <div>
                    <p className="font-display font-semibold text-[#2C1F16]">{p.name}</p>
                    <p className="text-sm text-[#6B5D54]">
                      {cat === "hot"
                        ? `Tall ${formatTL(p.price_tall)} • Grande ${formatTL(p.price_grande)} • Venti ${formatTL(p.price_venti)}`
                        : formatTL(p.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button data-testid={`edit-product-${p.id}`} variant="outline" size="sm" onClick={() => startEdit(p)} className="rounded-full border-[#E6DDD1]">
                      <Pencil className="w-3.5 h-3.5 mr-1.5" /> Düzenle
                    </Button>
                    <Button data-testid={`delete-product-${p.id}`} variant="outline" size="sm" onClick={() => remove(p)} className="rounded-full border-[#E6DDD1] text-[#C8664D] hover:bg-[#F2EBE1]">
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Sil
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing ? "Ürünü Düzenle" : "Yeni Ürün"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Ad</Label>
              <Input data-testid="product-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="product-category-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Sıcak İçecekler</SelectItem>
                  <SelectItem value="cold">Soğuk İçecekler</SelectItem>
                  <SelectItem value="other">Diğer Ürünler</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.category === "hot" ? (
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Tall (₺)</Label><Input data-testid="price-tall" type="number" value={form.price_tall} onChange={(e) => setForm({ ...form, price_tall: e.target.value })} /></div>
                <div><Label>Grande (₺)</Label><Input data-testid="price-grande" type="number" value={form.price_grande} onChange={(e) => setForm({ ...form, price_grande: e.target.value })} /></div>
                <div><Label>Venti (₺)</Label><Input data-testid="price-venti" type="number" value={form.price_venti} onChange={(e) => setForm({ ...form, price_venti: e.target.value })} /></div>
              </div>
            ) : (
              <div>
                <Label>Fiyat (₺)</Label>
                <Input data-testid="price-single" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
            <Button data-testid="save-product-btn" onClick={save} className="rounded-full bg-[#C8664D] hover:bg-[#A6513A] text-white">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Extras section ---- */}
      <section className="space-y-4 pt-6 border-t border-[#E6DDD1]">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C8664D]" />
              <h2 className="font-display text-2xl font-bold text-[#2C1F16]">Ekstralar</h2>
            </div>
            <p className="text-sm text-[#6B5D54] mt-1">Sıcak içeceklere eklenebilecek şurup, süt, ekstra shot vb.</p>
          </div>
          <Button
            data-testid="add-extra-btn"
            onClick={() => { setEditingExtra(null); setExtraForm(emptyExtraForm); setExtraOpen(true); }}
            className="rounded-full bg-[#2C1F16] hover:bg-[#3d2a1e] text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Yeni Ekstra
          </Button>
        </div>

        {extras.length === 0 ? (
          <p className="text-[#6B5D54] text-sm">Henüz ekstra yok.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {extras.map((e) => (
              <div key={e.id} data-testid={`extra-row-${e.id}`} className="bg-white rounded-2xl border border-[#E6DDD1] p-4 flex items-center justify-between card-shadow">
                <div>
                  <p className="font-display font-semibold text-[#2C1F16]">{e.name}</p>
                  <p className="text-sm text-[#C8664D] font-semibold">+{formatTL(e.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    data-testid={`edit-extra-${e.id}`}
                    variant="outline" size="sm"
                    onClick={() => {
                      setEditingExtra(e);
                      setExtraForm({ name: e.name, price: String(e.price) });
                      setExtraOpen(true);
                    }}
                    className="rounded-full border-[#E6DDD1]"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Düzenle
                  </Button>
                  <Button
                    data-testid={`delete-extra-${e.id}`}
                    variant="outline" size="sm"
                    onClick={async () => {
                      if (!window.confirm(`${e.name} silinsin mi?`)) return;
                      try {
                        await api.delete(`/extras/${e.id}`);
                        toast.success("Silindi");
                        load();
                      } catch (_) {
                        toast.error("Silinemedi");
                      }
                    }}
                    className="rounded-full border-[#E6DDD1] text-[#C8664D]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={extraOpen} onOpenChange={setExtraOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editingExtra ? "Ekstrayı Düzenle" : "Yeni Ekstra"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Ad</Label>
              <Input
                data-testid="extra-name-input"
                value={extraForm.name}
                onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                placeholder="Örn: Vanilya Şurubu"
              />
            </div>
            <div>
              <Label>Fiyat (₺)</Label>
              <Input
                data-testid="extra-price-input"
                type="number"
                value={extraForm.price}
                onChange={(e) => setExtraForm({ ...extraForm, price: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setExtraOpen(false)}>İptal</Button>
            <Button
              data-testid="save-extra-btn"
              onClick={async () => {
                try {
                  const payload = { name: extraForm.name, price: parseFloat(extraForm.price) };
                  if (editingExtra) await api.put(`/extras/${editingExtra.id}`, payload);
                  else await api.post("/extras", payload);
                  toast.success(editingExtra ? "Ekstra güncellendi" : "Ekstra eklendi");
                  setExtraOpen(false);
                  load();
                } catch (err) {
                  toast.error(err?.response?.data?.detail || "Kaydedilemedi");
                }
              }}
              className="rounded-full bg-[#C8664D] hover:bg-[#A6513A] text-white"
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
