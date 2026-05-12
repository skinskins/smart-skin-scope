import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Shield, Clock, Check, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const PricingValueScreen = () => {
  const navigate = useNavigate();
  const [pricingMode, setPricingMode] = useState<"free" | "premium">("premium");

  const PLANS = {
    yearly: { price: "2,99€" }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-12 max-w-md mx-auto">
      {/* Top Label */}
      <motion.p 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] text-center mb-4"
      >
        CHOISISSEZ VOTRE ACCÈS ✦
      </motion.p>

      {/* Headline */}
      <motion.h1 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-display text-center text-foreground mb-8 leading-tight italic"
      >
        Prenez soin de vous, sans limites
      </motion.h1>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mode Selector */}
        <div className="bg-muted/20 p-1.5 rounded-full flex mb-8 relative border border-border/40">
          <motion.div
            className="absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-full shadow-sm"
            animate={{ x: pricingMode === 'premium' ? '100%' : '0%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button type="button" onClick={() => setPricingMode("free")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 ${pricingMode === 'free' ? 'text-primary' : 'text-muted-foreground'}`}>Gratuit</button>
          <button type="button" onClick={() => setPricingMode("premium")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 relative ${pricingMode === 'premium' ? 'text-primary' : 'text-muted-foreground'}`}>
            Premium ({PLANS.yearly.price}/mois)
          </button>
        </div>

        <div className="flex-1 space-y-10 overflow-y-auto pb-4 custom-scrollbar pr-1">
          <AnimatePresence mode="wait">
            {pricingMode === "free" ? (
              <motion.div
                key="free-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-4 bg-muted/5 rounded-[32px] p-6 border border-border/20">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2">Ce qui est inclus :</p>
                  {[
                    { label: "Conseils personnalisés", desc: "Adaptés à vos facteurs (cycle, météo, actifs).", included: true },
                    { label: "100 produits", desc: "Accès à notre base de données produits.", included: true },
                    { label: "Vos produits recommandés", desc: "Quels produits utiliser chaque jour.", included: true },
                    { label: "Mémoire 30 jours", desc: "Historique limité de vos check-ins.", included: true },
                    { label: "Suivi & Scoring Standard", desc: "Suivi de base après chaque check-in.", included: true },
                    { label: "Mémoire illimitée", desc: "Gardez tout votre historique à vie.", included: false },
                    { label: "Base de données étendue", desc: "Accès à tous les produits du marché.", included: false },
                    { label: "Analyses Expert", desc: "Conseils scientifiques approfondis.", included: false },
                    { label: "Suivi & Scoring Avancé", desc: "Analyses d'évolution précises.", included: false },
                  ].map((item, i) => (
                    <div key={i} className={`flex gap-3 items-start ${!item.included ? 'opacity-60' : ''}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${item.included ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>
                        {item.included ? <Check size={10} /> : <Lock size={10} />}
                      </div>
                      <div>
                        <p className={`text-[11px] font-bold uppercase tracking-tight ${item.included ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</p>
                        <p className="text-[10px] text-muted-foreground italic leading-tight">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="premium-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-4 bg-emerald-500/5 rounded-[32px] p-6 border border-emerald-500/20 premium-shadow">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2 px-2">Avantages Premium :</p>
                  {[
                    { label: "Mémoire illimitée", desc: "Historique complet sans aucune limite de temps." },
                    { label: "Base de données étendue", desc: "Accès à l'intégralité des produits du marché." },
                    { label: "Analyses Expert", desc: "Conseils scientifiques exclusifs et approfondis." },
                    { label: "Zéro Publicité", desc: "Une expérience fluide et sans interruption." },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 mt-0.5">
                        <Sparkles size={10} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground italic leading-tight">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-auto pt-4">
          <Button 
            onClick={() => {
              if (pricingMode === "free") navigate("/signup"); // Or wherever free signup starts
              else navigate("/pricing-plan");
            }}
            className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
          >
            {pricingMode === "free" ? "Continuer Gratuitement" : "Passer au Premium"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center italic mt-4">
            14 jours gratuits · Aucun débit maintenant
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingValueScreen;
