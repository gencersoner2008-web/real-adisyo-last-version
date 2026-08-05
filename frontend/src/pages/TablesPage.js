import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatTL } from "@/lib/api";
import { Coffee, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: t }, { data: s }] = await Promise.all([
        api.get("/tables"),
        api.get("/reports/summary"),
      ]);
      setTables(t);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-8">
      {/* Summary strip */}
      <section className="grid sm:grid-cols-2 gap-5">
        <div data-testid="summary-daily" className="bg-white rounded-2xl p-6 border border-[#E6DDD1] card-shadow">
          <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Bugün</p>
          <p className="font-display text-3xl sm:text-4xl font-bold mt-2 text-[#2C1F16]">
            {formatTL(summary?.daily_total)}
          </p>
          <p className="text-sm text-[#6B5D54] mt-1">{summary?.daily_order_count ?? 0} adisyon kapatıldı</p>
        </div>
        <div data-testid="summary-monthly" className="bg-[#2C1F16] rounded-2xl p-6 text-white card-shadow">
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">Bu Ay</p>
          <p className="font-display text-3xl sm:text-4xl font-bold mt-2">{formatTL(summary?.monthly_total)}</p>
          <p className="text-sm text-white/70 mt-1">{summary?.monthly_order_count ?? 0} adisyon kapatıldı</p>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Masalar</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Masa seçiniz</h1>
          </div>
          <Link to="/masa-yonetim">
            <Button data-testid="tables-manage-link" variant="outline" className="rounded-full border-[#E6DDD1] hover:bg-[#F2EBE1]">
              <Plus className="w-4 h-4 mr-2" />
              Masa Ekle
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-[#6B5D54]">Yükleniyor...</p>
        ) : tables.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#E6DDD1] p-12 text-center">
            <p className="text-[#6B5D54]">Henüz masa yok. Sağ üstten masa ekleyin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {tables.map((t) => (
              <button
                key={t.id}
                data-testid={`table-card-${t.name.replace(/\s+/g, "-")}`}
                onClick={() => navigate(`/masalar/${t.id}`)}
                className={`text-left rounded-2xl p-5 border transition-transform hover:-translate-y-1 duration-200 ${
                  t.has_open_order
                    ? "bg-[#C8664D] text-white border-[#C8664D] card-shadow"
                    : "bg-white border-[#E6DDD1] card-shadow hover:border-[#C8664D]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.has_open_order ? "bg-white/20" : "bg-[#F2EBE1]"}`}>
                    <Coffee className={`w-5 h-5 ${t.has_open_order ? "text-white" : "text-[#2C1F16]"}`} />
                  </div>
                  {t.has_open_order && (
                    <span className="text-[10px] uppercase tracking-[0.2em] bg-white/20 px-2 py-1 rounded-full">
                      Açık
                    </span>
                  )}
                </div>
                <p className="font-display text-xl font-semibold mt-4">{t.name}</p>
                <div className={`mt-2 text-sm flex items-center gap-2 ${t.has_open_order ? "text-white/85" : "text-[#6B5D54]"}`}>
                  <Users className="w-3.5 h-3.5" />
                  {t.has_open_order ? `${t.open_item_count} ürün • ${formatTL(t.open_total)}` : "Boş"}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
