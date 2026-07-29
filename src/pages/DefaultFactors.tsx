import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import FactorsPicker from "@/components/FactorsPicker";

export default function DefaultFactors() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden max-w-lg mx-auto px-5 pt-8 pb-10">

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-border/40 bg-white/50 hover:bg-white transition-all shadow-sm shrink-0 mt-1"
        >
          <ArrowLeft size={18} strokeWidth={1.8} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-display text-foreground leading-tight mb-1">Ton quotidien</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Glisse vers Nacre ce qui façonne ta peau
          </p>
        </div>
      </div>

      <div className="flex-1">
        <FactorsPicker
          onDone={() => navigate("/dashboard")}
          onSkip={() => navigate("/dashboard")}
        />

      </div>

    </div>
  );
}
