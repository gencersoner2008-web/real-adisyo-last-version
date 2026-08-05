import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { formatTL } from "@/lib/api";
import { Coffee, Flame, Snowflake, Cookie, Check } from "lucide-react";
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
  const [placed, setPlaced] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [tRes, mRes, eRes] = await Promise.all([
          axios.get(`${API}/public/table/${tableId}`),
          axios.get(`${API}/public/menu`),
          axios.get(`${API}/public/extras`),
        ]);
        setTable(tRes.data);
        setProducts(mRes.data);
        setExtras(eRes.data);
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
      await axios.post(`${API}/public/orders/table/${tableId}/add`, {
        product_id: product.id, size, qty: 1, extra_ids,
      });
      const sizeStr = size ? " • " + (size === "tall" ? "Tall" : size === "grande" ? "Grande" : size === "venti" ? "Venti" : size) : "";
      const extrasStr = extra_ids.length > 0
        ? " + " + extra_ids.map((id) => extras.find((e) => e.id === id)?.name).filter(Boolean).join(", ")
        : "";
      const label = `${product.name}${sizeStr}${extrasStr}`;
      setPlaced((prev) => [{ id: Date.now(), label }, ...prev].slice(0, 20));
      toast.success(`Sipariş garsona iletildi`);
    } catch (e) {
      toast.error("Sipariş gönderilemedi");
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
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
          <p className="text-sm text-[#6B5D54] mt-1">Sıcak içeceklere şurup, ekstra süt gibi ekstralar ekleyebilirsiniz.</p>
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

        {placed.length > 0 && (
          <section className="bg-white rounded-2xl border border-[#E6DDD1] p-5 card-shadow">
            <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Bu masada gönderdikleriniz</p>
            <ul className="mt-3 space-y-2">
              {placed.map((x) => (
                <li key={x.id} className="flex items-start gap-2 text-sm text-[#2C1F16]">
                  <Check className="w-4 h-4 text-[#768962] mt-0.5 shrink-0" /> {x.label}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

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
