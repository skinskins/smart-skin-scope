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
        <div className="min-h-screen bg-white flex flex-col relative overflow-hidden pb-32">

            <div className="p-6 relative z-10 flex items-center justify-between border-b border-[#E5E5E5] bg-white">
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center border border-[#111111]"
                >
                    <ArrowLeft size={18} className="text-[#111111]" />
                </motion.button>
                {isOnboarding && (
                    <div className="text-[10px] font-mono font-bold text-[#111111] uppercase tracking-[0.1em] border border-[#111111] px-3 py-1">
                        ÉTAPE 5 / 5
                    </div>
                )}
            </div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col p-6 z-10 max-w-lg mx-auto w-full"
            >
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold font-display text-[#111111] uppercase tracking-[0.05em] mb-4">CHECK-IN</h1>
                    <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">Protocole de suivi quotidien • {timeRef}</p>
                </div>

                <div className="space-y-8 flex-1">

                    {/* Paramètres du lieu (Météo) */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <h2 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <MapPin size={14} className="text-[#111111]" /> MÉTÉO & ENVIRONNEMENT
                        </h2>
                        <div className="bg-white border border-[#111111] p-6 space-y-4">
                            {!isEditingLocation ? (
                                <button onClick={() => { setIsEditingLocation(true); setLocationInput(data.location || manualLocationState || ""); }} className="text-left w-full focus:outline-none">
                                    <div className="flex items-center gap-4 group">
                                        <div className="w-10 h-10 border border-[#E5E5E5] flex items-center justify-center text-[#111111] flex-shrink-0 group-hover:border-[#111111] transition-colors">
                                            <MapPin size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-1">Localisation</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-[#111111] uppercase tracking-tight">{data.location}</p>
                                                <Pencil size={12} className="text-[#AAAAAA]" />
                                            </div>
                                        </div>
                                        <span className="ml-auto flex items-center gap-2 text-[10px] font-mono font-bold text-[#111111] uppercase tracking-[0.1em]">
                                            <span className="w-1.5 h-1.5 bg-[#111111] animate-pulse" />
                                            DIRECT
                                        </span>
                                    </div>
                                </button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Input type="text" value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="VILLE" className="flex-1 rounded-none border-[#111111] h-12 uppercase font-bold text-xs" />
                                    <button type="button" onClick={() => { setManualLocation(locationInput); setIsEditingLocation(false); }} className="bg-[#111111] text-white w-12 h-12 flex items-center justify-center">
                                        <Check size={18} />
                                    </button>
                                    <button type="button" onClick={() => setIsEditingLocation(false)} className="bg-white border border-[#E5E5E5] text-[#111111] w-12 h-12 flex items-center justify-center">
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.section>

                    {/* Démaquillage */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-6">
                        <h2 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <Sparkles size={14} className="text-[#111111]" /> SOIN D'HIER SOIR
                        </h2>
                        <div className="bg-white border border-[#111111] p-6">
                            <p className="text-xs font-bold text-[#111111] uppercase tracking-tight mb-6">Avez-vous bien retiré votre maquillage (ou bien nettoyé votre peau) hier soir ?</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setMakeupRemoved(true)}
                                    className={`py-4 px-2 border transition-all text-xs font-bold uppercase tracking-tight ${makeupRemoved === true ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                >
                                    OUI
                                </button>
                                <button
                                    onClick={() => setMakeupRemoved(false)}
                                    className={`py-4 px-2 border transition-all text-xs font-bold uppercase tracking-tight ${makeupRemoved === false ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                >
                                    NON, OUBLIÉ
                                </button>
                            </div>
                        </div>
                    </motion.section>

                    {/* Stress */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
                        <h2 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <HeartPulse size={14} className="text-[#111111]" /> NIVEAU DE STRESS
                        </h2>
                        <div className="bg-white border border-[#111111] p-6 space-y-6">
                            <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setData({ ...data, stressLevel: v })}
                                        className={`py-4 border transition-all text-xs font-bold ${data.stressLevel === v ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white border-[#E5E5E5] text-[#111111] hover:border-[#111111]'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between px-1">
                                <span className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">ZEN</span>
                                <span className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">INTENSE</span>
                            </div>
                        </div>
                    </motion.section>

                    {/* Sommeil */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
                        <h2 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <Moon size={14} className="text-[#111111]" /> RÉCUPÉRATION / SOMMEIL
                        </h2>
                        <div className="bg-white border border-[#111111] p-6">
                            <div className="flex justify-between items-center mb-6">
                                <label className="text-xs font-bold text-[#111111] uppercase tracking-tight">DURÉE DU SOMMEIL</label>
                                <span className="text-xl font-bold text-[#111111]">{data.sleepHours} H</span>
                            </div>
                            <Slider value={[data.sleepHours]} min={3} max={12} step={0.5} onValueChange={(v) => setData({ ...data, sleepHours: v[0] })} className="py-4" />
                        </div>
                    </motion.section>

                    {/* Cycle */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
                        <h2 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <Waves size={14} className="text-[#111111]" /> CYCLE HORMONAL
                        </h2>
                        <div className="bg-white border border-[#111111] p-6">
                            <p className="text-xs font-bold text-[#111111] uppercase tracking-tight mb-6">PHASE ACTUELLE</p>
                            <div className="grid grid-cols-2 gap-3">
                                {["Menstruation", "Folliculaire", "Ovulatoire", "Lutéal", "Aucun", "Autre"].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setData({ ...data, cyclePhase: p })}
                                        className={`py-4 px-2 border transition-all text-[10px] font-bold uppercase tracking-tight ${data.cyclePhase === p ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setData({ ...data, cyclePhase: "Je ne sais pas" })}
                                    className={`col-span-2 py-4 px-2 border transition-all text-[10px] font-bold uppercase tracking-tight ${data.cyclePhase === "Je ne sais pas" ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                >
                                    JE NE SAIS PAS
                                </button>
                            </div>
                        </div>
                    </motion.section>

                    {/* Alimentation & Alcool */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-6">
                        <h2 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <Salad size={14} className="text-[#111111]" /> ALIMENTATION & ALCOOL
                        </h2>
                        <div className="bg-white border border-[#111111] p-6 space-y-8">
                            <div>
                                <p className="text-xs font-bold text-[#111111] uppercase tracking-tight mb-6">QUALITÉ NUTRITIONNELLE (HIER)</p>
                                <div className="flex gap-2">
                                    {[{ v: "bien", l: "SAINE" }, { v: "moyen", l: "MOYENNE" }, { v: "mauvais", l: "LOURDE" }].map(t => (
                                        <button
                                            key={t.v}
                                            onClick={() => setData({ ...data, foodQuality: t.v as any })}
                                            className={`flex-1 py-4 px-2 border transition-all text-[10px] font-bold uppercase tracking-tight ${data.foodQuality === t.v ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                        >
                                            {t.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t border-[#E5E5E5] pt-8">
                                <p className="text-xs font-bold text-[#111111] uppercase tracking-tight mb-6">CONSOMMATION D'ALCOOL ({isMorning ? "HIER" : "AUJOURD'HUI"})</p>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setData({ ...data, hasAlcohol: true })}
                                        className={`py-4 px-2 border transition-all text-xs font-bold uppercase tracking-tight ${data.hasAlcohol === true ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                    >
                                        OUI
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData({ ...data, hasAlcohol: false })}
                                        className={`py-4 px-2 border transition-all text-xs font-bold uppercase tracking-tight ${data.hasAlcohol === false ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                    >
                                        NON
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {data.hasAlcohol && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2 overflow-hidden">
                                            <div className="flex justify-between items-center mb-6">
                                                <label className="text-xs font-bold text-[#111111] uppercase tracking-tight">UNITÉS D'ALCOOL</label>
                                                <span className="text-xl font-bold text-[#111111]">{data.alcoholDrinks}</span>
                                            </div>
                                            <Slider value={[data.alcoholDrinks]} min={1} max={10} step={1} onValueChange={(v) => setData({ ...data, alcoholDrinks: v[0] })} className="py-4" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.section>

                    {/* Hydratation */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-6">
                        <h2 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <Droplets size={14} className="text-[#111111]" /> APPORT HYDRIQUE
                        </h2>
                        <div className="bg-white border border-[#111111] p-6">
                            <p className="text-xs font-bold text-[#111111] uppercase tracking-tight mb-6">CONSOMMATION D'EAU ({isMorning ? "HIER" : "AUJOURD'HUI"})</p>
                            <div className="flex flex-col gap-3">
                                {["Pas assez", "Suffisamment", "Trop"].map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setData({ ...data, waterStatus: opt as any })}
                                        className={`py-5 px-6 border transition-all text-xs font-bold uppercase tracking-tight text-left flex justify-between items-center ${data.waterStatus === opt ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                    >
                                        <span>{opt.toUpperCase()}</span>
                                        {data.waterStatus === opt && <Check size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.section>

                    {/* Sport */}
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
                        <h2 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <Dumbbell size={14} className="text-[#111111]" /> ACTIVITÉ PHYSIQUE
                        </h2>
                        <div className="bg-white border border-[#111111] p-6">
                            <p className="text-xs font-bold text-[#111111] uppercase tracking-tight mb-6">SÉANCE DE SPORT ({isMorning ? "HIER" : "AUJOURD'HUI"})</p>
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button
                                    onClick={() => setData({ ...data, didSport: true })}
                                    className={`py-4 px-2 border transition-all text-xs font-bold uppercase tracking-tight ${data.didSport === true ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                >
                                    OUI
                                </button>
                                <button
                                    onClick={() => setData({ ...data, didSport: false })}
                                    className={`py-4 px-2 border transition-all text-xs font-bold uppercase tracking-tight ${data.didSport === false ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111]'}`}
                                >
                                    NON
                                </button>
                            </div>
                            {data.didSport && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-6 border-t border-[#E5E5E5] overflow-hidden">
                                    <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-4">INTENSITÉ DE L'EFFORT</p>
                                    <div className="flex gap-2">
                                        {["Légère", "Modérée", "Intense"].map(lvl => (
                                            <button
                                                key={lvl}
                                                onClick={() => setData({ ...data, sportIntensity: lvl })}
                                                className={`flex-1 py-4 border transition-all text-[10px] font-bold uppercase tracking-tight ${data.sportIntensity === lvl ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white border-[#E5E5E5] text-[#111111] hover:border-[#111111]'}`}
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
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-[#E5E5E5] z-20">
                <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 bg-[#111111] text-white py-5 font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors"
                >
                    VALIDER LE CHECK-IN <ArrowRight size={18} />
                </button>
            </div>

        </div>
    );
};

export default DailyCheckin;
