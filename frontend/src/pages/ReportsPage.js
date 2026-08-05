import { useCallback, useEffect, useState } from "react";
import { api, formatTL, sizeLabel } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const PERIODS = [
  { key: "daily", label: "Günlük" },
  { key: "monthly", label: "Aylık" },
  { key: "yearly", label: "Yıllık" },
];

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState("daily");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    const [s, p, o] = await Promise.all([
      api.get("/reports/summary"),
      api.get("/reports/products", { params: { period } }),
      api.get("/reports/orders", { params: { period } }),
    ]);
    setSummary(s.data);
    setProducts(p.data);
    setOrders(o.data);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const deleteOne = async (id) => {
    try {
      await api.delete(`/reports/orders/${id}`);
      toast.success("Sipariş silindi");
      load();
    } catch (_) {
      toast.error("Silinemedi");
    }
  };

  const deleteAll = async () => {
    try {
      const { data } = await api.delete("/reports/orders", { params: { period } });
      toast.success(`${data.deleted} sipariş silindi`);
      load();
    } catch (_) {
      toast.error("Silinemedi");
    }
  };

  const summaryCard = (label, total, count, dark) => (
    <div
      data-testid={`summary-${label.toLowerCase().split(" ")[0]}`}
      className={`rounded-2xl p-6 card-shadow ${dark ? "bg-[#2C1F16] text-white" : "bg-white border border-[#E6DDD1] text-[#2C1F16]"}`}
    >
      <p className={`text-xs uppercase tracking-[0.24em] ${dark ? "text-white/60" : "text-[#6B5D54]"}`}>{label}</p>
      <p className="font-display text-3xl lg:text-4xl font-bold mt-2">{formatTL(total)}</p>
      <p className={`text-sm mt-1 ${dark ? "text-white/70" : "text-[#6B5D54]"}`}>{count ?? 0} adisyon</p>
    </div>
  );

  const productList = () => (
    products.length === 0 ? (
      <div className="border border-dashed border-[#E6DDD1] rounded-2xl p-10 text-center text-[#6B5D54]">
        Bu dönemde satılan ürün yok.
      </div>
    ) : (
      <div className="bg-white rounded-2xl border border-[#E6DDD1] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F2EBE1] text-[#2C1F16]">
            <tr>
              <th className="text-left py-3 px-4 font-medium">Ürün</th>
              <th className="text-left py-3 px-4 font-medium">Boy</th>
              <th className="text-right py-3 px-4 font-medium">Adet</th>
              <th className="text-right py-3 px-4 font-medium">Gelir</th>
            </tr>
          </thead>
          <tbody>
            {products.map((r, i) => (
              <tr key={i} className="border-t border-[#F2EBE1]">
                <td className="py-3 px-4">{r.name}</td>
                <td className="py-3 px-4 text-[#6B5D54]">{sizeLabel(r.size) || "-"}</td>
                <td className="py-3 px-4 text-right font-medium">{r.qty}</td>
                <td className="py-3 px-4 text-right font-medium">{formatTL(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  const orderList = () => (
    orders.length === 0 ? (
      <div className="border border-dashed border-[#E6DDD1] rounded-2xl p-10 text-center text-[#6B5D54]">
        Bu dönemde kapatılmış adisyon yok.
      </div>
    ) : (
      <div className="bg-white rounded-2xl border border-[#E6DDD1] overflow-hidden">
        <div className="grid grid-cols-[1.2fr_2fr_1fr_1fr_auto] gap-3 items-center px-4 py-3 bg-[#F2EBE1] text-xs uppercase tracking-[0.16em] text-[#6B5D54]">
          <div>Masa</div>
          <div>Tarih</div>
          <div className="text-right">Adet</div>
          <div className="text-right">Tutar</div>
          <div className="w-8" />
        </div>
        <ul>
          {orders.map((o) => {
            const isOpen = !!expanded[o.id];
            return (
              <li key={o.id} data-testid={`order-row-${o.id}`} className="border-t border-[#F2EBE1]">
                <div className="grid grid-cols-[1.2fr_2fr_1fr_1fr_auto] gap-3 items-center px-4 py-3">
                  <button
                    onClick={() => setExpanded((s) => ({ ...s, [o.id]: !s[o.id] }))}
                    className="inline-flex items-center gap-1.5 text-left font-medium text-[#2C1F16] hover:text-[#C8664D]"
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {o.table_name}
                  </button>
                  <div className="text-sm text-[#6B5D54]">
                    {o.paid_at ? new Date(o.paid_at).toLocaleString("tr-TR") : "-"}
                  </div>
                  <div className="text-right text-sm">{o.item_count}</div>
                  <div className="text-right font-semibold">{formatTL(o.total)}</div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        data-testid={`delete-order-${o.id}`}
                        variant="ghost"
                        size="sm"
                        className="text-[#6B5D54] hover:text-[#C8664D] hover:bg-[#F2EBE1] h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Bu adisyonu silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {o.table_name} • {formatTL(o.total)} • {o.paid_at && new Date(o.paid_at).toLocaleString("tr-TR")}. Bu işlem geri alınamaz ve rapor toplamlarını değiştirir.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteOne(o.id)} className="bg-[#C8664D] hover:bg-[#A6513A]">
                          Sil
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {isOpen && (
                  <div className="px-6 pb-4 -mt-1">
                    <div className="rounded-xl bg-[#F9F6F0] p-4 text-sm space-y-1.5">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <p className="text-[#2C1F16]">
                              {it.name}{it.size ? ` (${sizeLabel(it.size)})` : ""} × {it.qty}
                            </p>
                            {(it.extras || []).length > 0 && (
                              <p className="text-[11px] text-[#8A5A2B]">
                                + {it.extras.map((ex) => ex.name).join(", ")}
                              </p>
                            )}
                          </div>
                          <span className="text-[#2C1F16] font-medium whitespace-nowrap">{formatTL(it.unit_price * it.qty)}</span>
                        </div>
                      ))}
                      {o.discount_percent > 0 && (
                        <div className="flex justify-between text-[#C8664D] pt-2 border-t border-[#E6DDD1] mt-2">
                          <span>Happy Hour (-%{o.discount_percent})</span>
                          <span>-{formatTL((o.subtotal || 0) - (o.total || 0))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    )
  );

  const periodLabel = PERIODS.find((p) => p.key === period)?.label;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Raporlar</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Satış Özeti</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {summaryCard("Günlük Toplam", summary?.daily_total, summary?.daily_order_count, false)}
        {summaryCard("Aylık Toplam", summary?.monthly_total, summary?.monthly_order_count, true)}
        {summaryCard("Yıllık Toplam", summary?.yearly_total, summary?.yearly_order_count, false)}
      </div>

      <Tabs value={period} onValueChange={setPeriod}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-[#F2EBE1] rounded-full p-1">
            {PERIODS.map((p) => (
              <TabsTrigger
                key={p.key}
                value={p.key}
                data-testid={`tab-${p.key}`}
                className="rounded-full data-[state=active]:bg-[#2C1F16] data-[state=active]:text-white px-5"
              >
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {orders.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  data-testid="delete-all-period-btn"
                  variant="outline"
                  className="rounded-full border-[#E6DDD1] text-[#C8664D] hover:bg-[#F2EBE1]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {periodLabel} dönemi sıfırla
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>{periodLabel} dönemin tüm adisyonları silinsin mi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu dönemde kapatılmış <b>{orders.length}</b> adisyon (toplam <b>{formatTL(orders.reduce((s, o) => s + o.total, 0))}</b>) kalıcı olarak silinecek. Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAll} className="bg-[#C8664D] hover:bg-[#A6513A]">
                    Hepsini Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {PERIODS.map((p) => (
          <TabsContent key={p.key} value={p.key} className="mt-6 space-y-8">
            <section className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-[#2C1F16]">Satılan Ürünler</h2>
              {productList()}
            </section>
            <section className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-[#2C1F16]">Kapatılan Adisyonlar</h2>
              {orderList()}
            </section>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
