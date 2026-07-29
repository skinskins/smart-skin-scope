import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import type { SignupStepProps } from "@/pages/signup/types";

const StepPricing = ({ BackButton, selectedPlan, setSelectedPlan, PLANS, setStep }: SignupStepProps) => {
    return (
        <div className="space-y-8 h-full flex flex-col">
            <div className="mb-6 flex items-start gap-4">
                <BackButton />
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-2">Votre essai gratuit</p>
                    <h1 className="text-2xl font-display text-foreground leading-tight">Commencer à prendre soin de vous</h1>
                </div>
            </div>

            <div className="bg-muted/20 p-1.5 rounded-full flex relative border border-border/40">
                <motion.div className="absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-full shadow-sm" animate={{ x: selectedPlan === 'monthly' ? '100%' : '0%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                <button type="button" onClick={() => setSelectedPlan('yearly')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 relative ${selectedPlan === 'yearly' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Badge className="absolute -top-3 -left-2 bg-primary text-primary-foreground text-[8px] px-2 py-0.5 border-none shadow-sm">-40%</Badge>
                    Annuel
                </button>
                <button type="button" onClick={() => setSelectedPlan('monthly')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 ${selectedPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Mensuel
                </button>
            </div>

            <motion.div layout className="bg-primary/5 p-8 rounded-[40px] border border-primary/10 text-center relative overflow-hidden shadow-sm">
                <AnimatePresence mode="wait">
                    <motion.div key={selectedPlan} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-3">
                        {selectedPlan === 'yearly' && (
                            <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm">
                                <span>-40%</span>
                                <span className="w-1 h-1 bg-white/40 rounded-full" />
                                <span>Offre de lancement</span>
                            </div>
                        )}
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="text-5xl font-display text-foreground italic leading-none">{PLANS[selectedPlan].price}</span>
                            <span className="text-xl text-muted-foreground italic">{PLANS[selectedPlan].period}</span>
                        </div>
                        <p className="text-[13px] text-muted-foreground italic tracking-tight font-medium">{PLANS[selectedPlan].subtext}</p>
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            <div className="space-y-4">
                {[
                    { label: 'Accès illimité', desc: 'Toutes les fonctionnalités sans restriction' },
                    { label: 'Sans engagement', desc: 'Annulez à tout moment' },
                    { label: 'Conseils personnalisés', desc: 'Adaptés à votre cycle, météo et routine' },
                    { label: 'Mémoire illimitée', desc: 'Historique complet sans limite de temps' },
                ].map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="flex items-start gap-4">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                            <Check size={11} strokeWidth={3} />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                            <p className="text-[11px] text-muted-foreground italic leading-tight">{item.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="space-y-3 pt-2 mt-auto">
                <button type="button" onClick={() => { setStep(10); window.scrollTo(0, 0); }} className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]">
                    Passer premium
                </button>
                <button type="button" onClick={() => { setStep(10); window.scrollTo(0, 0); }} className="w-full h-14 border border-border/60 text-muted-foreground rounded-full text-[11px] font-bold uppercase tracking-[0.15em] hover:border-primary hover:text-primary transition-colors">
                    Commencer mon essai gratuit
                </button>
                <p className="text-center text-[10px] text-muted-foreground pt-1">Renouvelé automatiquement à 9,99€/mois. Annulable à tout moment.</p>
            </div>
        </div>
    );
};

export default StepPricing;
