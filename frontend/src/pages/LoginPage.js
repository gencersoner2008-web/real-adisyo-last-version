import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Coffee, Lock } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(password);
      toast.success("Hoş geldiniz");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "linear-gradient(180deg, #F9F6F0 0%, #F2EBE1 100%)",
      }}
    >
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-3xl h-[540px] card-shadow">
            <img
              src="https://images.unsplash.com/photo-1598959652545-c0230cdbb01f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBzaG9wJTIwaW50ZXJpb3IlMjB3YXJtJTIwbGlnaHRpbmd8ZW58MHx8fHwxNzg1OTY1MjgyfDA&ixlib=rb-4.1.0&q=85"
              alt="Coffee shop"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2C1F16]/70 via-[#2C1F16]/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <p className="text-sm uppercase tracking-[0.2em] opacity-80">Point of Sale</p>
              <h2 className="font-display text-3xl font-semibold mt-2">
                Sıcak bir servis, sıcak bir kahve.
              </h2>
            </div>
          </div>
        </div>

        <div className="warm-noise bg-white rounded-3xl p-10 card-shadow border border-[#E6DDD1]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#2C1F16] flex items-center justify-center">
              <Coffee className="w-6 h-6 text-[#F9F6F0]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#6B5D54]">Adisyon Sistemi</p>
              <h1 className="font-display text-2xl font-bold">REAL COFFEE ADİSYON</h1>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#2C1F16]">Şifre</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#6B5D54]" />
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 bg-[#F9F6F0] border-[#E6DDD1] focus-visible:ring-[#C8664D]"
                  placeholder="Şifrenizi giriniz"
                />
              </div>
              <p className="text-xs text-[#6B5D54]">Varsayılan şifre: 1234</p>
            </div>

            <Button
              type="submit"
              data-testid="login-submit-btn"
              disabled={loading}
              className="w-full h-12 rounded-full bg-[#C8664D] hover:bg-[#A6513A] text-white pill-shadow transition-colors font-semibold text-base"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>

          <p className="mt-8 text-xs text-[#6B5D54] text-center">
            © {new Date().getFullYear()} REAL COFFEE • Adisyon Sistemi
          </p>
        </div>
      </div>
    </div>
  );
}
