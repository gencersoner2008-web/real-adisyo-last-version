import { useEffect, useState } from "react";
import { api, formatTL, sizeLabel } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, d, m] = await Promise.all([
        api.get("/reports/summary"),
        api.get("/reports/products", { params: { period: "daily" } }),
        api.get("/reports/products", { params: { period: "monthly" } }),
      ]);
      setSummary(s.data);
      setDaily(d.data);
      setMonthly(m.data);
    })();
  }, []);

  const list = (items) => (
    items.length === 0 ? (
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
            {items.map((r, i) => (
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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Raporlar</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Satış Özeti</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-[#E6DDD1] card-shadow">
          <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Günlük Toplam</p>
          <p data-testid="report-daily-total" className="font-display text-4xl font-bold mt-2">{formatTL(summary?.daily_total)}</p>
          <p className="text-sm text-[#6B5D54] mt-1">{summary?.daily_order_count ?? 0} adisyon</p>
        </div>
        <div className="bg-[#2C1F16] text-white rounded-2xl p-6 card-shadow">
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">Aylık Toplam</p>
          <p data-testid="report-monthly-total" className="font-display text-4xl font-bold mt-2">{formatTL(summary?.monthly_total)}</p>
          <p className="text-sm text-white/70 mt-1">{summary?.monthly_order_count ?? 0} adisyon</p>
        </div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="bg-[#F2EBE1] rounded-full p-1">
          <TabsTrigger value="daily" data-testid="tab-daily" className="rounded-full data-[state=active]:bg-[#2C1F16] data-[state=active]:text-white px-5">Günlük Satılan Ürünler</TabsTrigger>
          <TabsTrigger value="monthly" data-testid="tab-monthly" className="rounded-full data-[state=active]:bg-[#2C1F16] data-[state=active]:text-white px-5">Aylık Satılan Ürünler</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-6">{list(daily)}</TabsContent>
        <TabsContent value="monthly" className="mt-6">{list(monthly)}</TabsContent>
      </Tabs>
    </div>
  );
}
