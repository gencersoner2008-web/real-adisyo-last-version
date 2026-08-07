import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { formatTL, sizeLabel } from "@/lib/api";
import { Coffee, Flame, Snowflake, Cookie, Receipt, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import HotDrinkPicker from "@/components/HotDrinkPicker";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const catMeta = {
  hot: { label: "Sıcak", icon: Flame },
  cold: { label: "Soğuk", icon: Snowflake },
  other: { label: "Diğer", icon: Cookie },
};

export default function QrOrderPage() {
  const { tableId } = useParams();
  const [table, setTable] = useState(null);
  const [products, setProducts] = useState([]);
  const [extras, setExtras] = useState([]);
  const [category, setCategory] = useState("hot");
  const [sizePicker, setSizePicker] = useState(null);
  const [order, setOrder] = useState(null);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [tRes, mRes, eRes, oRes] = await Promise.all([
          axios.get(`${API}/public/table/${tableId}`),
          axios.get(`${API}/public/menu`),
          axios.get(`${API}/public/extras`),
          axios.get(`${API}/public/orders/table/${tableId}`),
        ]);
        setTable(tRes.data);
        setProducts(mRes.data);
        setExtras(eRes.data);
        setOrder(oRes.data || null);
      } catch (e) {
        toast.error("Masa bulunamadı");
      }
    })();
  }, [tableId]);

  const grouped = useMemo(() => {
    const g = { hot: [], cold: [], other: [] };
    products.forEach((p) => g[p.category]?.push(p));
    return g;
  }, [products]);

  const send = async (product, size = null, extra_ids = []) => {
    try {
      const { data } = await axios.post(`${API}/public/orders/table/${tableId}/add`, {
        product_id: product.id, size, qty: 1, extra_ids,
      });
      setOrder(data);
      toast.success(`${product.name}${size ? " • " + sizeLabel(size) : ""} eklendi`);
    } catch (e) {
      toast.error("Sipariş gönderilemedi");
    }
  };

  const itemCount = order?.items?.reduce((s, i) => s + i.qty, 0) || 0;
  const hasDiscount = (order?.discount_percent || 0) > 0 && (order?.subtotal || 0) > 0;

  return (
    <div className="min-h-screen bg-[#F9F6F0] pb-28">
      <header className="bg-white border-b border-[#E6DDD1] px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2C1F16] flex items-center justify-center">
            <Coffee className="w-5 h-5 text-[#F9F6F0]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#6B5D54]">Real Coffee</p>
            <p className="font-display font-bold">{table?.name || "..."}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Menü</p>
          <h1 className="font-display text-2xl font-bold mt-1">Sipariş vermek için ürün seçin</h1>
          <p className="text-sm text-[#6B5D54] mt-1">Sıcak içeceklere şurup, ekstra süt gibi ekstralar ekleyebilirsiniz. Aşağıdaki toplam güncel adisyonunuzu gösterir.</p>
        </div>

        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="bg-[#F2EBE1] rounded-full p-1 w-full grid grid-cols-3">
            {Object.entries(catMeta).map(([k, m]) => (
              <TabsTrigger key={k} value={k} className="rounded-full data-[state=active]:bg-[#2C1F16] data-[state=active]:text-white">
                <m.icon className="w-4 h-4 mr-1" />
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.keys(catMeta).map((k) => (
            <TabsContent key={k} value={k} className="mt-4 grid gap-3">
              {grouped[k].map((p) => (
                <button
                  key={p.id}
                  data-testid={`qr-product-${p.id}`}
                  onClick={() => (p.category === "hot" ? setSizePicker(p) : send(p))}
                  className="text-left rounded-2xl bg-white border border-[#E6DDD1] p-4 hover:border-[#C8664D] transition-colors card-shadow"
                >
                  <p className="font-display font-semibold">{p.name}</p>
                  {p.category === "hot" ? (
                    <p className="text-sm text-[#6B5D54] mt-1">
                      Tall {formatTL(p.price_tall)} • Grande {formatTL(p.price_grande)} • Venti {formatTL(p.price_venti)}
                    </p>
                  ) : (
                    <p className="text-[#C8664D] font-bold mt-1">{formatTL(p.price)}</p>
                  )}
                </button>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Full order card (expanded) */}
        {showCart && order && order.items?.length > 0 && (
          <section className="bg-white rounded-2xl border border-[#E6DDD1] p-5 card-shadow" data-testid="qr-cart-expanded">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-[#6B5D54]" />
              <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Adisyonunuz</p>
            </div>
            <ul className="space-y-2.5">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2C1F16]">
                      {it.name}{it.size ? " • " + sizeLabel(it.size) : ""} × {it.qty}
                    </p>
                    {(it.extras || []).length > 0 && (
                      <p className="text-[11px] text-[#8A5A2B]">
                        + {it.extras.map((e) => e.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[#2C1F16] whitespace-nowrap">
                    {formatTL(it.unit_price * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
            {hasDiscount && (
              <div className="mt-4 pt-3 border-t border-[#E6DDD1] space-y-1 text-sm">
                <div className="flex justify-between text-[#6B5D54]">
                  <span>Ara Toplam</span>
                  <span>{formatTL(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#C8664D] font-medium">
                  <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />Happy Hour (-%{order.discount_percent})</span>
                  <span>-{formatTL(order.subtotal - order.total)}</span>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Sticky bottom total bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E6DDD1] bg-white/95 backdrop-blur px-5 py-3 z-40 shadow-[0_-6px_20px_rgba(44,31,22,0.06)]" data-testid="qr-total-bar">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => setShowCart((v) => !v)}
            className="flex items-center gap-2 text-left disabled:opacity-40"
            disabled={itemCount === 0}
            data-testid="qr-cart-toggle"
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${itemCount > 0 ? "bg-[#C8664D] text-white" : "bg-[#F2EBE1] text-[#6B5D54]"}`}>
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B5D54]">
                {itemCount > 0 ? `${itemCount} ürün • ${showCart ? "Kapat" : "Detay"}` : "Sepetiniz boş"}
              </p>
              <p className="font-display text-lg font-bold text-[#2C1F16] leading-none mt-0.5" data-testid="qr-total-amount">
                {formatTL(order?.total || 0)}
              </p>
            </div>
          </button>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B5D54]">Ödenecek</p>
            <p className="text-sm text-[#2C1F16]">Kasada masaya söyleyin</p>
          </div>
        </div>
      </div>

      <HotDrinkPicker
        product={sizePicker}
        extras={extras}
        open={!!sizePicker}
        onOpenChange={(o) => !o && setSizePicker(null)}
        onSubmit={(size, extra_ids) => send(sizePicker, size, extra_ids)}
      />
      <Toaster richColors position="top-center" />
    </div>
  );
}
