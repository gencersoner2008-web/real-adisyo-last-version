import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Coffee, LayoutGrid, Package, Grid3x3, BarChart3, LogOut, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMuted, setMuted, playChime } from "@/lib/chime";
import { toast } from "sonner";

const navItems = [
  { to: "/", label: "Masalar", icon: LayoutGrid, end: true, testid: "nav-tables" },
  { to: "/urunler", label: "Ürünler", icon: Package, testid: "nav-products" },
  { to: "/masa-yonetim", label: "Masa Yönetimi", icon: Grid3x3, testid: "nav-manage-tables" },
  { to: "/raporlar", label: "Raporlar", icon: BarChart3, testid: "nav-reports" },
];

export default function AppShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [muted, setMutedState] = useState(isMuted());

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) {
      playChime(); // preview chime when un-muting
      toast.success("Sipariş sesi açıldı");
    } else {
      toast.message("Sipariş sesi kapatıldı");
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-[#E6DDD1] no-print">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2C1F16] flex items-center justify-center">
              <Coffee className="w-5 h-5 text-[#F9F6F0]" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#6B5D54]">Adisyon</p>
              <p className="font-display font-bold text-[15px]">REAL COFFEE</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#2C1F16] text-[#F9F6F0]"
                      : "text-[#2C1F16] hover:bg-[#F2EBE1]"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              data-testid="mute-toggle-btn"
              onClick={toggleMute}
              title={muted ? "Sipariş sesi kapalı" : "Sipariş sesi açık"}
              className={`rounded-full h-9 w-9 p-0 ${muted ? "text-[#C8664D]" : "text-[#5F704E]"} hover:bg-[#F2EBE1]`}
            >
              {muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              data-testid="logout-btn"
              onClick={() => { logout(); navigate("/login"); }}
              className="text-[#6B5D54] hover:text-[#2C1F16] hover:bg-[#F2EBE1]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Çıkış</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
