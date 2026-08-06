import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { api, formatTL } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp } from "lucide-react";

export default function SalesTrendChart() {
  const [range, setRange] = useState("weekly");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get("/reports/timeseries", { params: { period: range } })
      .then((r) => { if (!cancelled) setData(r.data); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const stats = useMemo(() => {
    if (data.length === 0) return { total: 0, avg: 0, peakLabel: "-", peakTotal: 0 };
    const total = data.reduce((s, d) => s + d.total, 0);
    const nonZero = data.filter((d) => d.total > 0).length || 1;
    const avg = total / nonZero;
    const peak = data.reduce((m, d) => (d.total > m.total ? d : m), data[0]);
    return { total, avg, peakLabel: peak.label, peakTotal: peak.total };
  }, [data]);

  const peakDate = useMemo(
    () => data.reduce((m, d) => (d.total > m.total ? d : m), { date: null, total: 0 }).date,
    [data]
  );

  const compactTL = (v) => {
    if (v >= 1000) return "₺" + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k";
    return "₺" + Math.round(v);
  };

  return (
    <section className="bg-white rounded-2xl border border-[#E6DDD1] card-shadow p-6 space-y-5" data-testid="sales-chart">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#6B5D54]">
            <TrendingUp className="w-4 h-4" />
            <p className="text-xs uppercase tracking-[0.24em]">Satış Trendi</p>
          </div>
          <h2 className="font-display text-2xl font-bold mt-1 text-[#2C1F16]">
            {range === "weekly" ? "Son 7 gün" : "Son 12 ay"}
          </h2>
        </div>
        <Tabs value={range} onValueChange={setRange}>
          <TabsList className="bg-[#F2EBE1] rounded-full p-1">
            <TabsTrigger value="weekly" data-testid="chart-tab-weekly" className="rounded-full data-[state=active]:bg-[#2C1F16] data-[state=active]:text-white px-5">Haftalık</TabsTrigger>
            <TabsTrigger value="monthly" data-testid="chart-tab-monthly" className="rounded-full data-[state=active]:bg-[#2C1F16] data-[state=active]:text-white px-5">Aylık</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#F9F6F0] p-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B5D54]">Toplam</p>
          <p className="font-display text-xl font-bold text-[#2C1F16] mt-0.5">{formatTL(stats.total)}</p>
        </div>
        <div className="rounded-xl bg-[#F9F6F0] p-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B5D54]">Ortalama</p>
          <p className="font-display text-xl font-bold text-[#2C1F16] mt-0.5">{formatTL(stats.avg)}</p>
        </div>
        <div className="rounded-xl bg-[#FFF4E6] p-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#8A5A2B]">En Yüksek</p>
          <p className="font-display text-xl font-bold text-[#2C1F16] mt-0.5">{formatTL(stats.peakTotal)}</p>
          <p className="text-[11px] text-[#8A5A2B]">{stats.peakLabel}</p>
        </div>
      </div>

      <div className="h-72 w-full" data-testid="sales-chart-canvas">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-[#6B5D54]">Yükleniyor...</div>
        ) : data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-[#6B5D54]">Veri yok</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFE8DC" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#6B5D54", fontSize: 11 }} axisLine={{ stroke: "#E6DDD1" }} tickLine={false} />
              <YAxis
                tick={{ fill: "#6B5D54", fontSize: 11 }}
                axisLine={{ stroke: "#E6DDD1" }}
                tickLine={false}
                width={52}
                tickFormatter={compactTL}
              />
              <Tooltip
                cursor={{ fill: "rgba(200,102,77,0.08)" }}
                contentStyle={{ background: "#2C1F16", border: "none", borderRadius: 12, color: "#F9F6F0", padding: "8px 12px" }}
                labelStyle={{ color: "#F9F6F0", fontWeight: 600, fontSize: 12 }}
                itemStyle={{ color: "#F2EBE1", fontSize: 12 }}
                formatter={(v, n) => [n === "total" ? formatTL(v) : v, n === "total" ? "Satış" : "Adisyon"]}
              />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.date} fill={d.date === peakDate ? "#C8664D" : "#2C1F16"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
