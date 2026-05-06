import { motion } from "framer-motion";
import { FileText, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Contextual card prompting the user to generate their "Passeport de peau".
 *
 * Visibility rules (mock for now):
 *  - Shown when the user has 7+ days of tracking data
 *  - Hidden once a passport has already been generated
 */
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
        className="p-8 bg-white border border-[#111111] flex flex-col items-center gap-4 text-center"
      >
        <div className="p-4 border border-[#111111]">
          <FileText size={24} className="text-[#111111]" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#111111]">
            Passeport de peau disponible
          </p>
          <p className="text-xs text-[#555555] leading-relaxed uppercase font-mono tracking-[0.05em]">
            Vos 30 jours de suivi sont prêts à être partagés avec votre professionnel de santé.
          </p>
          <button
            onClick={() => navigate("/passport/preview")}
            className="mt-4 px-6 py-3 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-black transition-colors flex items-center gap-2 mx-auto"
          >
            Générer mon passeport
            <ChevronRight size={14} />
          </button>
        </div>
      </motion.div>
    </section>
  );
};

export default PassportPromptCard;
