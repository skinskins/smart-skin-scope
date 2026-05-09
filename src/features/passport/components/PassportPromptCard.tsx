import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PassportPromptCard = () => {
  const navigate = useNavigate();

  // Visibility rules: Shown when the user has enough data
  // For now, we show it to allow testing the feature
  const hasEnoughData = true; 

  if (!hasEnoughData) return null;

  return (
    <section className="mb-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card p-10 bg-white border-none relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles size={18} strokeWidth={1.5} />
                </div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Milestone Atteint</p>
            </div>
            
            <h3 className="text-3xl font-display text-foreground leading-tight mb-2 italic">Passeport disponible</h3>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-8 opacity-60">30 jours de suivi complétés</p>
            
            <div className="space-y-3 mb-10">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-primary">30/30 Jours</span>
                <span className="text-muted-foreground opacity-40">100%</span>
              </div>
              <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-primary" 
                />
              </div>
            </div>
            
            <button
              onClick={() => navigate("/passport/preview")}
              className="w-full h-16 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-full premium-shadow hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Générer mon passeport
              <ChevronRight size={14} strokeWidth={3} />
            </button>
        </div>
      </motion.div>
    </section>
  );
};

export default PassportPromptCard;

