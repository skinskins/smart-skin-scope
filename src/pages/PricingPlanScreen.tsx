import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const PLANS = {
  monthly: {
    id: "monthly_plan",
    price: "4,99€",
    period: "/mois",
    subtext: "Facturé mensuellement"
  },
  yearly: {
    id: "yearly_plan",
    price: "2,99€",
    period: "/mois",
    subtext: "35,99€ facturés une fois par an • Offre de lancement",
    badge: "-40%"
  }
};

const PricingPlanScreen = () => {
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const navigate = useNavigate();

  const onStartTrial = (planId: string) => {
    // TODO: Connect to RevenueCat/Stripe for plan: planId
    console.log("Starting trial for:", planId);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-8 pt-16 max-w-md mx-auto">
      <h2 className="text-2xl font-display text-center text-foreground mb-12 italic">Choisissez votre abonnement</h2>

      {/* Segmented Control */}
      <div className="bg-muted/20 p-1.5 rounded-full flex mb-12 relative border border-border/40">
        <motion.div
          className="absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-full shadow-sm"
          animate={{ x: plan === 'yearly' ? '100%' : '0%' }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <button
          onClick={() => setPlan("monthly")}
          className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 ${plan === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          Mensuel
        </button>
        <button
          onClick={() => setPlan("yearly")}
          className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 relative ${plan === 'yearly' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          Annuel
          <Badge className="absolute -top-3 -right-2 bg-primary text-primary-foreground text-[8px] px-2 py-0.5 border-none shadow-sm">
            {PLANS.yearly.badge}
          </Badge>
        </button>
      </div>

      {/* Price Display */}
      <motion.div 
        layout
        className="bg-primary/5 p-10 rounded-[40px] border border-primary/10 text-center mb-12 relative overflow-hidden shadow-sm"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={plan}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {plan === 'yearly' && (
              <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-2 shadow-sm">
                <span>-40%</span>
                <span className="w-1 h-1 bg-white/40 rounded-full" />
                <span>Offre de lancement</span>
              </div>
            )}
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-7xl font-display text-foreground italic leading-none">{PLANS[plan].price}</span>
              <span className="text-xl text-muted-foreground italic">{PLANS[plan].period}</span>
            </div>
            <div className="space-y-2">
              <p className="text-[13px] text-muted-foreground italic tracking-tight leading-relaxed font-medium">
                {PLANS[plan].subtext}
              </p>
              <p className="text-[15px] text-foreground font-semibold italic">14 jours d'essai gratuit inclus</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <Separator className="bg-border/40 mb-12" />

      {/* Reassurance Rows */}
      <div className="space-y-6 mb-12">
        {["Accès illimité à toutes les analyses et conseils", "Sans engagement", "Aucun débit maintenant", "Résiliable à tout moment"].map((text, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * idx }}
            className="flex items-center gap-4"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Check size={14} strokeWidth={3} />
            </div>
            <span className="text-[14px] font-medium text-foreground italic">{text}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-auto space-y-6">

        <Button
          onClick={() => onStartTrial(PLANS[plan].id)}
          className="w-full h-16 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
        >
          Souscrire à l'offre
        </Button>
        <button 
          onClick={() => onStartTrial(PLANS[plan].id)}
          className="w-full text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-center hover:text-primary transition-colors py-2"
        >
          Démarrer mon essai gratuit de 14 jours - sans engagement
        </button>
      </div>
    </div>
  );
};

export default PricingPlanScreen;
