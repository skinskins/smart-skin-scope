import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, HeartPulse, Moon, Droplets, GlassWater, Flame, Check, X, MapPin, Pencil, Thermometer, CloudSun, Sun, Sparkles, Dumbbell, Salad, Waves } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useWeatherData } from "@/hooks/useWeatherData";

export const defaultDailyLog = {
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
        waterStatus: "Suffisamment" as "Pas assez" | "Suffisamment" | "Trop",
        hasAlcohol: false,
        alcoholDrinks: 0,
        sleepHours: 7,
        cyclePhase: "Folliculaire",
        stressLevel: 3,
        foodQuality: "moyen" as "bien" | "moyen" | "mauvais",
        location: defaultDailyLog.location,
        weather: defaultDailyLog.weather,
        didSport: false,
        sportIntensity: "Légère"
    });

    const [makeupRemoved, setMakeupRemoved] = useState<boolean | null>(true);
    const [manualLocationState, setManualLocationState] = useState<string | null>(() => localStorage.getItem("manualLocation"));
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [locationInput, setLocationInput] = useState("");

    const setManualLocation = (loc: string | null) => {
        setManualLocationState(loc);
        if (loc) localStorage.setItem("manualLocation", loc);
        else localStorage.removeItem("manualLocation");
    };

    const { weather: liveWeather, loading: weatherLoading } = useWeatherData(manualLocationState || undefined);

    useEffect(() => {
        if (!weatherLoading && liveWeather.locationName !== "...") {
            setData((d) => ({ ...d, weather: liveWeather, location: liveWeather.locationName || d.location }));
        }
    }, [liveWeather, weatherLoading]);

    // Check if already checked in today unless it's the first onboarding checkin
    useEffect(() => {
        const lastCheckin = localStorage.getItem("lastCheckinDate");
        const today = new Date().toISOString().split('T')[0];

        if (lastCheckin === today && !isOnboarding) {
            navigate("/checkin-advice", { replace: true });
        }
    }, [isOnboarding, navigate]);

    const handleSave = async () => {
        // Mapping for backward compatibility or database expectations
        const mappedWaterGlasses = data.waterStatus === "Pas assez" ? 4 : data.waterStatus === "Suffisamment" ? 8 : 12;
        const finalAlcoholDrinks = data.hasAlcohol ? data.alcoholDrinks : 0;

        // Cache local immédiat
        const payload = {
            ...data,
            waterGlasses: mappedWaterGlasses,
            alcoholDrinks: finalAlcoholDrinks,
            makeupRemoved
        };
        localStorage.setItem("dailyCheckinData", JSON.stringify(payload));
        localStorage.setItem("manualUpdates", JSON.stringify({
            stress: Date.now(),
            sleep: Date.now(),
            cycle: Date.now(),
            water: Date.now(),
            alcohol: Date.now(),
            workout: Date.now(),
            food: Date.now()
        }));

        // Envoi au Cloud (Supabase)
        try {
            const guestProfileStr = localStorage.getItem("guestProfile");
            if (guestProfileStr) {
                const guestProfile = JSON.parse(guestProfileStr);
                if (guestProfile.id) {
                    // @ts-ignore
                    await supabase.from("guest_checkins").insert({
                        guest_id: guestProfile.id,
                        sleep_hours: data.sleepHours,
                        water_glasses: mappedWaterGlasses,
                        stress_level: data.stressLevel,
                        cycle_phase: data.cyclePhase,
                        diet_quality: data.foodQuality,
                        location: data.location,
                        weather: data.weather,
                        makeup_removed: makeupRemoved,
                        did_sport: data.didSport,
                        sport_intensity: data.didSport ? data.sportIntensity : null
                    });
                }
            } else {
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData?.session) {
                    // @ts-ignore
                    await supabase.from("profiles").update({
                        sleep_hours: data.sleepHours,
                        water_glasses: mappedWaterGlasses,
                        alcohol_drinks: finalAlcoholDrinks,
                        cycle_phase: data.cyclePhase,
                        stress_level: data.stressLevel,
                        food_quality: data.foodQuality,
                        did_sport: data.didSport,
                        sport_intensity: data.didSport ? data.sportIntensity : null
                    }).eq("id", sessionData.session.user.id);
                }
            }

            // Mark as checked in today
            localStorage.setItem("lastCheckinDate", new Date().toISOString().split('T')[0]);
        } catch (e) {
            console.error("Erreur d'enregistrement réseau", e);
        }

        if (isOnboarding) {
            navigate("/checkin-advice", { state: { ...location.state } });
        } else {
            navigate("/checkin-advice");
        }
    };

    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 16;
    const timeRef = isMorning ? "ces dernières 24 heures" : "votre journée passée";

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden pb-32">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/3" />

            <div className="p-6 relative z-10 flex items-center justify-between">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center bg-muted/50 rounded-full"
                >
                    <ArrowLeft size={20} className="text-foreground" />
                </motion.button>
                {isOnboarding && (
                    <div className="text-sm font-semibold text-muted-foreground bg-muted pt-1 pb-1 px-3 rounded-full">
                        Étape 5 / 5
                    </div>
                )}
            </div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col p-6 z-10 max-w-lg mx-auto w-full"
            >
                <div className="mb-6">
                    <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Check-in Quotidien</h1>
                    <p className="text-muted-foreground text-sm">Comment s'est passée {timeRef} ?</p>
                </div>

                <div className="space-y-8 flex-1">

                    {/* Paramètres du lieu (Météo) */}
                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="text-primary" size={20} /> Météo & Environnement</h2>
                        <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50 space-y-4">
                            {!isEditingLocation ? (
                                <button onClick={() => { setIsEditingLocation(true); setLocationInput(data.location || manualLocationState || ""); }} className="text-left w-full focus:outline-none">
                                    <div className="flex items-center gap-2 pb-3 border-b border-border hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
                                        <MapPin size={18} className="text-primary" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Localisation</p>
                                            <div className="flex items-center gap-1">
                                                <p className="text-sm font-semibold text-foreground">{data.location}</p>
                                                <Pencil size={12} className="text-muted-foreground/40" />
                                            </div>
                                        </div>
                                        <span className="ml-auto flex items-center gap-1 text-[10px] text-primary/60">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                            En direct
                                        </span>
                                    </div>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 pb-3 border-b border-border">
                                    <Input type="text" value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="Ex: Paris" className="flex-1 rounded-xl h-9" />
                                    <button type="button" onClick={() => { setManualLocation(locationInput); setIsEditingLocation(false); }} className="bg-primary text-primary-foreground p-2 rounded-xl">
                                        <Check size={16} />
                                    </button>
                                    <button type="button" onClick={() => setIsEditingLocation(false)} className="bg-muted text-muted-foreground p-2 rounded-xl">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.section>

                    {/* Démaquillage */}
                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="text-skin-texture" size={20} /> Soin d'hier soir</h2>
                        <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50">
                            <p className="text-sm font-medium mb-3">Avez-vous bien retiré votre maquillage (ou bien nettoyé votre peau) hier soir ?</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setMakeupRemoved(true)}
                                    className={`py-3 px-2 rounded-2xl text-sm font-semibold transition-all border ${makeupRemoved === true ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                >
                                    Oui
                                </button>
                                <button
                                    onClick={() => setMakeupRemoved(false)}
                                    className={`py-3 px-2 rounded-2xl text-sm font-semibold transition-all border ${makeupRemoved === false ? 'bg-skin-redness text-white border-skin-redness shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                >
                                    Non, j'ai oublié
                                </button>
                            </div>
                        </div>
                    </motion.section>

                    {/* Stress */}
                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2"><HeartPulse className="text-skin-glow" size={20} /> Stress</h2>
                        <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50 space-y-4">
                            <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setData({ ...data, stressLevel: v })}
                                        className={`py-4 rounded-2xl border transition-all ${data.stressLevel === v ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card border-border hover:bg-accent'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between px-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Zen</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Extrême</span>
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
                        <h2 className="text-lg font-semibold flex items-center gap-2"><Waves className="text-rose-400" size={20} /> Cycle Menstruel</h2>
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
                                <button
                                    onClick={() => setData({ ...data, cyclePhase: "Je ne sais pas" })}
                                    className={`col-span-2 py-3 px-2 rounded-2xl text-xs font-semibold transition-all border ${data.cyclePhase === "Je ne sais pas" ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                >
                                    🤷‍♀️ Je ne sais pas
                                </button>
                            </div>
                        </div>
                    </motion.section>

                    {/* Alimentation & Alcool */}
                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2"><Salad className="text-orange-400" size={20} /> Alimentation & Alcool</h2>
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
                                <p className="text-sm font-medium mb-3">Consommation d'alcool ({isMorning ? "hier" : "aujourd'hui"})</p>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setData({ ...data, hasAlcohol: true })}
                                        className={`py-3 px-2 rounded-2xl text-sm font-semibold transition-all border ${data.hasAlcohol === true ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                    >
                                        Oui
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData({ ...data, hasAlcohol: false })}
                                        className={`py-3 px-2 rounded-2xl text-sm font-semibold transition-all border ${data.hasAlcohol === false ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                    >
                                        Non
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {data.hasAlcohol && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2 overflow-hidden">
                                            <div className="flex justify-between mb-8">
                                                <label className="text-sm font-medium">Nombre de verres</label>
                                                <span className="text-sm font-bold text-primary">{data.alcoholDrinks}</span>
                                            </div>
                                            <Slider value={[data.alcoholDrinks]} min={1} max={10} step={1} onValueChange={(v) => setData({ ...data, alcoholDrinks: v[0] })} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.section>

                    {/* Hydratation */}
                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2"><Droplets className="text-blue-400" size={20} /> Hydratation</h2>
                        <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50">
                            <p className="text-sm font-medium mb-3">Comment avez-vous bu {isMorning ? "hier" : "aujourd'hui"} ?</p>
                            <div className="flex flex-col gap-2">
                                {["Pas assez", "Suffisamment", "Trop"].map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setData({ ...data, waterStatus: opt as any })}
                                        className={`py-4 px-4 rounded-2xl text-sm font-semibold transition-all border ${data.waterStatus === opt ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                    >
                                        {opt === "Pas assez" ? "🏜️ Pas assez suffisement" : opt === "Suffisamment" ? "💧 Suffisamment" : "🌊 Trop"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.section>

                    {/* Sport */}
                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2"><Dumbbell className="text-emerald-500" size={20} /> Activité Physique</h2>
                        <div className="bg-card p-5 rounded-3xl shadow-sm border border-border/50">
                            <p className="text-sm font-medium mb-3">Avez-vous fait du sport aujourd'hui, ou prévoyez-vous d'en faire ?</p>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button
                                    onClick={() => setData({ ...data, didSport: true })}
                                    className={`py-3 px-2 rounded-2xl text-sm font-semibold transition-all border ${data.didSport === true ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                >
                                    Oui
                                </button>
                                <button
                                    onClick={() => setData({ ...data, didSport: false })}
                                    className={`py-3 px-2 rounded-2xl text-sm font-semibold transition-all border ${data.didSport === false ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                >
                                    Non
                                </button>
                            </div>
                            {data.didSport && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-2 border-t border-border/50 overflow-hidden">
                                    <p className="text-sm font-medium mb-3 mt-4">Intensité</p>
                                    <div className="flex gap-2">
                                        {["Légère", "Modérée", "Intense"].map(lvl => (
                                            <button
                                                key={lvl}
                                                onClick={() => setData({ ...data, sportIntensity: lvl })}
                                                className={`flex-1 py-3 px-2 rounded-2xl text-xs font-semibold transition-all border ${data.sportIntensity === lvl ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.section>

                </div>
            </motion.div>

            {/* Footer Fixed */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-20 flex flex-col items-center gap-4">
                <button
                    onClick={handleSave}
                    className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated hover:opacity-90 active:scale-[0.98] transition-all"
                >
                    Valider<ArrowRight size={18} />
                </button>
            </div>

        </div>
    );
};

export default DailyCheckin;
