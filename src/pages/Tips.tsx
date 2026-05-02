import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Info } from "lucide-react";
import { getActiveAdvice, Context, SKIN_TYPE_MAP, AdviceItem } from "@/utils/advice";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateCyclePhase } from "@/utils/cycle";

const Tips = () => {
    const [selectedAdvice, setSelectedAdvice] = useState<AdviceItem | null>(null);

    const factors = useMemo(() => {
        const saved = localStorage.getItem("dailyCheckinData");
        const parsed = saved ? JSON.parse(saved) : {};
        if (!parsed.cycleDuration) parsed.cycleDuration = 28;
        if (!parsed.periodDuration) parsed.periodDuration = 5;
        return parsed;
    }, []);

    const guest = useMemo(() => {
        const saved = localStorage.getItem("guestProfile");
        return saved ? JSON.parse(saved) : {};
    }, []);

    const isAllFactorsDone = useMemo(() => {
        const required = ['sleepHours', 'stressLevel', 'waterStatus', 'alcoholDrinks', 'cyclePhase', 'didSport', 'makeupRemoved', 'foodQuality'];
        return required.every(key => {
            const val = factors[key];
            return val !== undefined && val !== null && val !== "" && val !== "N/A";
        });
    }, [factors]);

    const adviceList = useMemo(() => {
        if (!isAllFactorsDone) return [];
        if (!factors.weather) return [];
        const skinType = SKIN_TYPE_MAP[guest.skin_type] ?? "normal";
        
        const makeupRemoved = factors.makeupRemoved !== undefined ? factors.makeupRemoved : true;
        const didSport = factors.didSport === true || (typeof factors.didSport === 'string' && factors.didSport !== "Non");
        
        const ctx: Context = {
            skinType,
            uvIndex: Math.floor(factors.weather?.uv ?? 0),
            tempC: factors.weather?.temp ?? 20,
            humidity: factors.weather?.humidity ?? 50,
            aqi: factors.weather?.aqiScore ?? 25,
            sleepHours: factors.sleepHours ?? 8,
            stressLevel: (factors.stressLevel ?? 1) * 2,
            alcoholLastNight: factors.alcoholDrinks ?? 0,
            removedMakeupLastNight: makeupRemoved,
            didSportToday: didSport,
            cycleDay: calculateCyclePhase(factors.lastPeriodDate, factors.cycleDuration, factors.periodDuration).day
        };

        const advice = getActiveAdvice(ctx);
        if (advice.length === 0) {
            advice.push({
                iconStr: "✨",
                title: "Tout va bien",
                text: "Vos indicateurs sont au vert ! Maintenez votre belle routine actuelle.",
                tip: "Continuez de bien hydrater votre peau chaque matin.",
                group: "g1",
                priority: "low"
            });
        }
        return advice;
    }, [factors, guest, isAllFactorsDone]);

    return (
        <div className="min-h-screen bg-background pb-24 px-5 pt-10 max-w-lg mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center relative z-10">
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Sparkles size={24} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-4xl font-display text-foreground leading-tight">Conseils du jour</h1>
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Bio-Analyse Personnalisée</p>
            </motion.div>

            <div className="space-y-6 relative z-10">
                {!isAllFactorsDone ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="premium-card p-10 bg-white/60 flex flex-col items-center gap-6 text-center border-primary/10">
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary italic opacity-80">Check-in requis</p>
                            <p className="text-[13px] text-foreground leading-relaxed italic">Complétez vos facteurs de vie sur la page d'accueil pour débloquer vos protocoles de soin personnalisés.</p>
                        </div>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {adviceList.map((advice, idx) => (
                            <motion.div key={advice.title} 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95 }} 
                                transition={{ delay: idx * 0.1 }} 
                                onClick={() => setSelectedAdvice(advice)}
                                className="premium-card p-8 bg-white/60 hover:bg-white transition-all group overflow-hidden cursor-pointer active:scale-[0.98]"
                            >
                                <div className="flex gap-6">
                                    <div className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform duration-500">{advice.iconStr}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-display text-xl text-foreground italic">{advice.title}</h3>
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                                        </div>
                                        <p className="text-[13px] text-foreground/80 leading-relaxed italic line-clamp-2">{advice.text}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Modale de conseil détaillé */}
            <Dialog open={!!selectedAdvice} onOpenChange={() => setSelectedAdvice(null)}>
                <DialogContent className="max-w-sm rounded-[40px] border-none bg-background premium-shadow p-10">
                    <DialogHeader className="mb-8">
                        <div className="text-5xl mb-6">{selectedAdvice?.iconStr}</div>
                        <DialogTitle className="text-2xl font-display text-foreground italic">{selectedAdvice?.title}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-8">
                        <p className="text-sm text-foreground/80 leading-relaxed italic">{selectedAdvice?.text}</p>
                        
                        {selectedAdvice?.ingredients && selectedAdvice.ingredients.length > 0 && (
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Ingrédients cibles</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAdvice.ingredients.map(ing => (
                                        <span key={ing} className="px-4 py-2 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/10 italic">{ing}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedAdvice?.tip && (
                            <div className="flex gap-4 p-6 bg-primary/5 rounded-[32px] border border-primary/10">
                                <div className="bg-white rounded-full p-2 text-primary shadow-sm h-fit"><Info size={14} strokeWidth={2.5} /></div>
                                <p className="text-[11px] font-bold text-primary/80 leading-relaxed uppercase tracking-widest italic">{selectedAdvice.tip}</p>
                            </div>
                        )}

                        <button 
                            onClick={() => setSelectedAdvice(null)}
                            className="w-full h-16 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all mt-6"
                        >
                            Compris
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Tips;
