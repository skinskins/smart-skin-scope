import { motion } from "framer-motion";
import { Sparkles, Shield, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const PricingValueScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col p-8 pt-16 max-w-md mx-auto">
      {/* Top Label */}
      <motion.p 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] text-center mb-6"
      >
        VOTRE ACCÈS PREMIUM ✦
      </motion.p>

      {/* Headline */}
      <motion.h1 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-4xl font-display text-center text-foreground mb-12 leading-tight italic"
      >
        Prenez soin de vous, sans limites
      </motion.h1>

      {/* Main Illustration Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-12"
      >
        <Card className="premium-card aspect-square flex items-center justify-center bg-card/20 border-none shadow-none">
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles size={64} strokeWidth={1} />
          </div>
        </Card>
      </motion.div>

      {/* Benefits */}
      <div className="space-y-8 mb-12">
        {[
          { icon: <Shield size={20} strokeWidth={1.5} />, label: "Analyse illimitée", desc: "Diagnostics complets et personnalisés chaque jour." },
          { icon: <Clock size={20} strokeWidth={1.5} />, label: "Suivi historique", desc: "Visualisez l'évolution de votre peau sur le long terme." },
          { icon: <Sparkles size={20} strokeWidth={1.5} />, label: "Conseils exclusifs", desc: "Accès à l'intégralité de la matrice scientifique." },
        ].map((benefit, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
            className="flex gap-5 items-start"
          >
            <div className="text-primary mt-1 p-2 bg-primary/5 rounded-full">{benefit.icon}</div>
            <div>
              <p className="text-[14px] font-bold text-foreground uppercase tracking-tight">{benefit.label}</p>
              <p className="text-[13px] text-muted-foreground italic leading-relaxed">{benefit.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-auto space-y-5">
        <Separator className="bg-border/40" />
        <Button 
          onClick={() => navigate("/pricing-plan")}
          className="w-full h-16 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
        >
          Suivant
        </Button>
        <p className="text-[11px] text-muted-foreground text-center italic">
          14 jours gratuits · Aucun débit maintenant
        </p>
      </div>
    </div>
  );
};

export default PricingValueScreen;
