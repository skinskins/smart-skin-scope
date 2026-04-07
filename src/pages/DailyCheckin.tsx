import { motion } from "framer-motion";
import { ArrowRight, HeartPulse, Activity, Moon, Droplets, GlassWater, Flame, Coffee, Check, X } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Slider } from "@/components/ui/slider";

export const defaultDailyLog = {
    heartRate: 72,
    stressLevel: 3,
    sleepHours: 7.5,
    cyclePhase: "Folliculaire",
    waterGlasses: 6,
    alcoholDrinks: 0,
    workoutMinutes: 0,
    foodQuality: "moyen" as "bien" | "moyen" | "mauvais",
    weather: { temp: 24, humidity: 55, uv: 6, pollution: "..." },
    location: ""
};

import { supabase } from "@/integrations/supabase/client";

const DailyCheckin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isOnboarding = location.state?.isOnboarding;
    const [data, setData] = useState({
        heartRate: 70,
        waterGlasses: 5,
        alcoholDrinks: 0,
        sleepHours: 7,
        cyclePhase: "Folliculaire",
        stressLevel: 3,
        foodQuality: "moyen" as "bien" | "moyen" | "mauvais"
    });

    const handleSave = async () => {
        // Cache local immédiat
        localStorage.setItem("dailyCheckinData", JSON.stringify(data));
        localStorage.setItem("manualUpdates", JSON.stringify({
            heartStress: Date.now(),
            sleep: Date.now(),
            cycle: Date.now(),
            water: Date.now(),
            alcohol: Date.now(),
            workout: Date.now(),
            food: Date.now()
        }));

        // Envoi au Cloud (Supabase) si connecté
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
                // @ts-ignore
                await supabase.from("profiles").update({
                    heart_rate: data.heartRate,
                    sleep_hours: data.sleepHours,
                    water_glasses: data.waterGlasses,
                    alcohol_drinks: data.alcoholDrinks,
                    cycle_phase: data.cyclePhase,
                    stress_level: data.stressLevel,
                    food_quality: data.foodQuality
                }).eq("id", sessionData.session.user.id);
            }
        } catch (e) {
            console.error("Erreur d'enregistrement réseau", e);
        }

        if (isOnboarding) {
            navigate("/setup-routine");
        } else {
            navigate("/");
        }
    };

    const handleSkip = () => {
        // Keep it empty so Dashboard uses fallback
        if (isOnboarding) {
            navigate("/setup-routine");
        } else {
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen bg-background pb-32">
            {/* Dynamic Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-5">
                <h1 className="text-2xl font-display font-bold text-foreground">Check-in Quotidien</h1>
                <p className="text-muted-foreground text-sm">Comment vous sentez-vous aujourd'hui ?</p>
            </div>

            <div className="p-6 space-y-8 max-w-lg mx-auto">

                {/* Coeur & Stress */}
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><HeartPulse className="text-skin-glow" size={20} /> Rythme & Stress</h2>
                    <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50 space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium">BPM</label>
                                <span className="text-sm font-bold text-primary">{data.heartRate} bpm</span>
                            </div>
                            <Slider value={[data.heartRate]} min={40} max={180} step={1} onValueChange={(v) => setData({ ...data, heartRate: v[0] })} />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium">Niveau de Stress</label>
                                <span className="text-sm font-bold text-primary">{data.stressLevel} / 5</span>
                            </div>
                            <Slider value={[data.stressLevel]} min={1} max={5} step={1} onValueChange={(v) => setData({ ...data, stressLevel: v[0] })} />
                        </div>
                    </div>
                </motion.section>

                {/* Sommeil */}
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Moon className="text-indigo-400" size={20} /> Sommeil</h2>
                    <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50">
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium">Temps de sommeil</label>
                            <span className="text-sm font-bold text-primary">{data.sleepHours} h</span>
                        </div>
                        <Slider value={[data.sleepHours]} min={3} max={12} step={0.5} onValueChange={(v) => setData({ ...data, sleepHours: v[0] })} />
                    </div>
                </motion.section>

                {/* Cycle */}
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="text-rose-400" size={20} /> Cycle Menstruel</h2>
                    <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50">
                        <p className="text-sm font-medium mb-3">Phase actuelle</p>
                        <div className="grid grid-cols-2 gap-2">
                            {["Menstruel", "Folliculaire", "Ovulatoire", "Lutéal"].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setData({ ...data, cyclePhase: p })}
                                    className={`py-3 px-2 rounded-2xl text-xs font-semibold transition-all border ${data.cyclePhase === p ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* Alimentation & Alcool */}
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Coffee className="text-orange-400" size={20} /> Alimentation & Alcool</h2>
                    <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50 space-y-6">
                        <div>
                            <p className="text-sm font-medium mb-3">Qualité de l'alimentation (hier)</p>
                            <div className="flex gap-2">
                                {[{ v: "bien", l: "Saine" }, { v: "moyen", l: "Moyenne" }, { v: "mauvais", l: "Lourde / Sucrée" }].map(t => (
                                    <button
                                        key={t.v}
                                        onClick={() => setData({ ...data, foodQuality: t.v as any })}
                                        className={`flex-1 py-3 px-2 rounded-2xl text-xs font-semibold transition-all border ${data.foodQuality === t.v ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                    >
                                        {t.l}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="border-t border-border/50 pt-6">
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium">Verres d'alcool</label>
                                <span className="text-sm font-bold text-primary">{data.alcoholDrinks}</span>
                            </div>
                            <Slider value={[data.alcoholDrinks]} min={0} max={10} step={1} onValueChange={(v) => setData({ ...data, alcoholDrinks: v[0] })} />
                        </div>
                    </div>
                </motion.section>

                {/* Hydratation */}
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Droplets className="text-blue-400" size={20} /> Hydratation</h2>
                    <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50 space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium">Verres d'eau</label>
                                <span className="text-sm font-bold text-primary">{data.waterGlasses}</span>
                            </div>
                            <Slider value={[data.waterGlasses]} min={0} max={15} step={1} onValueChange={(v) => setData({ ...data, waterGlasses: v[0] })} />
                        </div>
                    </div>
                </motion.section>

            </div>

            {/* Footer Fixed */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-20 flex flex-col items-center gap-4">
                <button
                    onClick={handleSave}
                    className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated hover:opacity-90 active:scale-[0.98] transition-all"
                >
                    Valider<ArrowRight size={18} />
                </button>
                <button onClick={handleSkip} className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
                    Passer pour cette fois
                </button>
            </div>

        </div>
    );
};

export default DailyCheckin;
