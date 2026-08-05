import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, formatTL, sizeLabel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Flame, Snowflake, Cookie, Plus, Minus, Trash2, Printer, QrCode } from "lucide-react";
import Receipt from "@/components/Receipt";

const catMeta = {
  hot: { label: "Sıcak İçecekler", icon: Flame },
  cold: { label: "Soğuk İçecekler", icon: Snowflake },
  other: { label: "Diğer Ürünler", icon: Cookie },
};

export default function OrderPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [order, setOrder] = useState(null);
  const [table, setTable] = useState(null);
  const [sizePicker, setSizePicker] = useState(null); // product being sized
  const [category, setCategory] = useState("hot");
  const [receiptData, setReceiptData] = useState(null);

  const load = async () => {
    const [p, o, tl] = await Promise.all([
      api.get("/products"),
      api.get(`/orders/table/${tableId}`),
      api.get("/tables"),
    ]);
    setProducts(p.data);
    setOrder(o.data || null);
    setTable(tl.data.find((x) => x.id === tableId) || null);
  };

  useEffect(() => { load(); }, [tableId]);
  // Polling for QR-driven updates
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/orders/table/${tableId}`);
        setOrder(data || null);
      } catch (_e) { /* ignore poll errors */ }
    }, 5000);
    return () => clearInterval(t);
  }, [tableId]);

  const grouped = useMemo(() => {
    const g = { hot: [], cold: [], other: [] };
    for (const p of products) g[p.category]?.push(p);
    return g;
  }, [products]);

  const addItem = async (product, size = null) => {
    try {
      const { data } = await api.post(`/orders/table/${tableId}/add`, {
        product_id: product.id,
        size,
        qty: 1,
      });
      setOrder(data);
      toast.success(`${product.name}${size ? " • " + sizeLabel(size) : ""} eklendi`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Eklenemedi");
    }
  };

  const removeOne = async (itemId) => {
    const { data } = await api.post(`/orders/table/${tableId}/remove/${itemId}`);
    setOrder(data);
  };
  const removeAll = async (itemId) => {
    const { data } = await api.post(`/orders/table/${tableId}/delete-item/${itemId}`);
    setOrder(data);
  };

  const pay = async () => {
    if (!order || order.items.length === 0) return;
    try {
      const { data } = await api.post(`/orders/table/${tableId}/pay`);
      setReceiptData(data);
      // Wait a tick then print
      setTimeout(() => {
        window.print();
      }, 250);
      setOrder(null);
      toast.success("Ödeme alındı, fiş yazdırılıyor");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Ödeme başarısız");
    }
  };

  const qrUrl = `${window.location.origin}/qr/${tableId}`;

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              data-testid="order-back-btn"
              onClick={() => navigate("/")}
              className="text-[#6B5D54] hover:bg-[#F2EBE1]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Masalar
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Sipariş</p>
              <h1 className="font-display text-3xl font-bold">{table?.name || "Masa"}</h1>
            </div>
          </div>
          <a
            href={qrUrl}
            target="_blank"
            rel="noreferrer"
            data-testid="qr-link"
            className="hidden sm:inline-flex items-center gap-2 text-xs text-[#6B5D54] hover:text-[#2C1F16]"
          >
            <QrCode className="w-4 h-4" />
            QR Sipariş linki
          </a>
        </div>

        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="bg-[#F2EBE1] rounded-full p-1">
            {Object.entries(catMeta).map(([k, m]) => (
              <TabsTrigger
                key={k}
                value={k}
                data-testid={`cat-tab-${k}`}
                className="rounded-full data-[state=active]:bg-[#2C1F16] data-[state=active]:text-white px-5 py-2"
              >
                <m.icon className="w-4 h-4 mr-2" />
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.keys(catMeta).map((k) => (
            <TabsContent key={k} value={k} className="mt-6">
              {grouped[k].length === 0 ? (
                <p className="text-[#6B5D54]">Bu kategoride ürün yok. Ürünler ekranından ekleyebilirsiniz.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {grouped[k].map((p) => (
                    <button
                      key={p.id}
                      data-testid={`product-card-${p.id}`}
                      onClick={() => (p.category === "hot" ? setSizePicker(p) : addItem(p))}
                      className="text-left rounded-2xl bg-white border border-[#E6DDD1] p-5 hover:-translate-y-1 transition-transform card-shadow"
                    >
                      <p className="font-display text-lg font-semibold text-[#2C1F16]">{p.name}</p>
                      {p.category === "hot" ? (
                        <div className="mt-3 text-sm text-[#6B5D54] space-y-1">
                          <div className="flex justify-between"><span>Tall</span><span className="font-medium text-[#2C1F16]">{formatTL(p.price_tall)}</span></div>
                          <div className="flex justify-between"><span>Grande</span><span className="font-medium text-[#2C1F16]">{formatTL(p.price_grande)}</span></div>
                          <div className="flex justify-between"><span>Venti</span><span className="font-medium text-[#2C1F16]">{formatTL(p.price_venti)}</span></div>
                        </div>
                      ) : (
                        <p className="mt-3 text-[#C8664D] font-display text-xl font-bold">{formatTL(p.price)}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Cart */}
      <aside className="lg:col-span-4">
        <div className="sticky top-24 bg-white rounded-3xl border border-[#E6DDD1] card-shadow p-6 flex flex-col max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Adisyon</p>
              <h2 className="font-display text-2xl font-bold">{table?.name}</h2>
            </div>
            {order?.source === "qr" && (
              <span className="text-[10px] uppercase tracking-[0.18em] bg-[#F2EBE1] text-[#6B5D54] px-2 py-1 rounded-full">
                QR Sipariş
              </span>
            )}
          </div>

          <div className="mt-5 flex-1 overflow-y-auto -mr-2 pr-2 space-y-3" data-testid="cart-items">
            {!order || order.items.length === 0 ? (
              <div className="border border-dashed border-[#E6DDD1] rounded-xl p-8 text-center">
                <p className="text-[#6B5D54] text-sm">Adisyon boş. Ürün eklemek için sol taraftan seçim yapın.</p>
              </div>
            ) : (
              order.items.map((it) => (
                <div key={it.id} data-testid={`cart-item-${it.id}`} className="flex items-start gap-3 pb-3 border-b border-[#F2EBE1] last:border-none">
                  <div className="flex-1">
                    <p className="font-medium text-[#2C1F16]">{it.name}</p>
                    <p className="text-xs text-[#6B5D54]">
                      {it.size ? sizeLabel(it.size) + " • " : ""}{formatTL(it.unit_price)}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2 bg-[#F9F6F0] rounded-full px-1 py-1">
                      <button data-testid={`cart-dec-${it.id}`} onClick={() => removeOne(it.id)} className="w-7 h-7 rounded-full bg-white border border-[#E6DDD1] hover:bg-[#F2EBE1] flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-medium">{it.qty}</span>
                      <button data-testid={`cart-inc-${it.id}`} onClick={() => addItem({ id: it.product_id, name: it.name, category: it.size && it.size !== "standart" ? "hot" : "other" }, it.size && it.size !== "standart" ? it.size : null)} className="w-7 h-7 rounded-full bg-white border border-[#E6DDD1] hover:bg-[#F2EBE1] flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-semibold text-[#2C1F16]">{formatTL(it.unit_price * it.qty)}</p>
                    <button data-testid={`cart-del-${it.id}`} onClick={() => removeAll(it.id)} className="mt-2 text-[#6B5D54] hover:text-[#C8664D] transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#E6DDD1]">
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Toplam</p>
              <p data-testid="cart-total" className="font-display text-3xl font-bold text-[#2C1F16]">
                {formatTL(order?.total || 0)}
              </p>
            </div>
            <Button
              data-testid="pay-button"
              disabled={!order || order.items.length === 0}
              onClick={pay}
              className="w-full h-12 rounded-full bg-[#C8664D] hover:bg-[#A6513A] text-white pill-shadow transition-colors font-semibold"
            >
              <Printer className="w-4 h-4 mr-2" />
              Öde & Fiş Yazdır
            </Button>
          </div>
        </div>
      </aside>

      {/* Size picker for hot drinks */}
      <Dialog open={!!sizePicker} onOpenChange={(o) => !o && setSizePicker(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{sizePicker?.name} • Boy seçin</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {["tall", "grande", "venti"].map((s) => (
              <button
                key={s}
                data-testid={`size-${s}`}
                onClick={async () => {
                  const prod = sizePicker;
                  setSizePicker(null);
                  await addItem(prod, s);
                }}
                className="rounded-xl border border-[#E6DDD1] p-4 hover:border-[#C8664D] hover:bg-[#F9F6F0] transition-colors text-center"
              >
                <p className="font-display font-semibold capitalize">{sizeLabel(s)}</p>
                <p className="text-[#C8664D] font-bold mt-1">{formatTL(sizePicker?.[`price_${s}`])}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSizePicker(null)}>İptal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {receiptData && <Receipt order={receiptData} onDone={() => setReceiptData(null)} />}
    </div>
  );
}
