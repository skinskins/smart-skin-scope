import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Visibility rules (mock for now):
//  - Shown when the user has 7+ days of tracking data
//  - Hidden once a passport has already been generated
const PassportPromptCard = () => {
  const navigate = useNavigate();

  // Mock data — will be replaced with real logic later
  const hasEnoughData = true; // user has 30 days of data
  const passportGenerated = false; // passport not yet generated

  if (!hasEnoughData || passportGenerated) return null;

  return (
    <section className="mb-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-white border border-[#111111] flex flex-col gap-5"
      >
        <p className="text-[10px] font-mono font-bold text-[#111111] uppercase tracking-widest">
          MILESTONE ATTEINT
        </p>
        <h3 className="text-xl font-display font-black text-[#111111] uppercase tracking-tight">
          PASSEPORT DISPONIBLE
        </h3>
        <p className="text-xs font-mono text-[#555555] uppercase tracking-[0.05em]">
          30 JOURS DE SUIVI COMPLÉTÉS
        </p>
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold text-[#111111] uppercase tracking-widest">
            30/30 JOURS
          </span>
          <div className="w-full h-[3px] bg-[#E5E5E5]">
            <div className="h-full w-full bg-[#111111]" />
          </div>
        </div>
        <button
          onClick={() => navigate("/passport/preview")}
          className="px-6 py-3 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-black transition-colors flex items-center gap-2"
        >
          GÉNÉRER MON PASSEPORT
          <ChevronRight size={14} />
        </button>
      </motion.div>
    </section>
  );
};

export default PassportPromptCard;
