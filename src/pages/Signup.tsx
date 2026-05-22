import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, User, CheckCircle2, ChevronRight, Weight, Calendar, HelpCircle, Briefcase, Share2, AlertCircle, Lock, Sparkles, Shield, Info, ArrowRight, Lightbulb, Activity, Droplets, Flame, Check, Clock, MapPin, Plus, X, Search, ImageOff, Scan } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import matrixData from "@/data/skincare_matrix.json";

const matrix = (matrixData as any).skincare_matrix;

const professions = [
    "Étudiant(e)",
    "Domaine Médical",
    "Informatique / Tech",
    "Enseignement / Recherche",
    "Employé(e) / Bureau",
    "Cadre / Direction",
    "Artisan / Commerçant",
    "Indépendant(e) / Freelance",
    "Sans emploi",
    "Retraité(e)",
    "Autre"
];

const channels = ["Instagram", "LinkedIn", "TikTok", "Facebook", "Twitter/X", "Bouche à oreille", "Recherche Google", "Autre"];

const BASELINE_MAP: Record<string, string> = {
    "Légère": "moins", "Légères": "moins",
    "Modérée": "pareil", "Modérées": "pareil",
    "Forte": "plus", "Fortes": "plus",
};

const Signup = () => {
    const navigate = useNavigate();

    // Step 4: Identifiants
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Step 1: Socio-pro et Canaux
    const [profession, setProfession] = useState("");
    const [usedChannels, setUsedChannels] = useState<string[]>([]);
    const [otherChannel, setOtherChannel] = useState("");

    // Step 2: Âge et Sexe
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");

    // Step 3: Diagnostic peau + Objectifs
    const [skinType, setSkinType] = useState("");
    const [skinProblems, setSkinProblems] = useState<string[]>([]);
    const [skinGoals, setSkinGoals] = useState<string[]>([]);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizStep, setQuizStep] = useState(1);
    const [quizAnswers, setQuizAnswers] = useState({ q1: "", q2: "", q3: "", q4: "" });

    // Step 3.1: Skin State Baselines (Amira branch)
    const [acneBaseline, setAcneBaseline] = useState("");
    const [rednessBaseline, setRednessBaseline] = useState("");
    const [drynessBaseline, setDrynessBaseline] = useState("");

    // Step 3 — Carnation
    const [carnation, setCarnation] = useState("");

    // Step 4 — Cycle
    const [lastPeriodDate, setLastPeriodDate] = useState("");
    const [cycleDuration, setCycleDuration] = useState(28);

    // Step 5 — Location
    const [locationMode, setLocationMode] = useState<"geo" | "manual" | null>(null);
    const [manualCity, setManualCity] = useState("");
    const [geoLoading, setGeoLoading] = useState(false);

    // Step 6 — Produits (sélection locale, insert après création compte)
    const [productSearchQuery, setProductSearchQuery] = useState("");
    const [productCatalogResults, setProductCatalogResults] = useState<any[]>([]);
    const [selectedOnboardingProducts, setSelectedOnboardingProducts] = useState<any[]>([]);
    const [onboardingScannerOpen, setOnboardingScannerOpen] = useState(false);
    const [onboardingScanMessage, setOnboardingScanMessage] = useState<string | null>(null);
    const onboardingScannerRef = useRef<any>(null);

    // Pricing Step State
    const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

    const [step, setStep] = useState(1);
    const [showPreview, setShowPreview] = useState(false);
    const [pricingMode, setPricingMode] = useState<"free" | "premium">("premium");
    const [loading, setLoading] = useState(false);

    const PLANS = {
        monthly: { id: "monthly_plan", price: "9,99€", period: "/mois", subtext: "Facturé mensuellement" },
        yearly: { id: "yearly_plan", price: "5,99€", period: "/mois", subtext: "71,88€ facturés une fois par an", badge: "-40%" }
    };

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await (supabase as any).from('profiles').select('*').eq('id', session.user.id).single();
                if (data) {
                    if (data.first_name) setFirstName(data.first_name);
                    if (data.last_name) setLastName(data.last_name);
                    if (data.profession) setProfession(data.profession);
                    if (data.used_channels) setUsedChannels(data.used_channels);
                    if (data.age) setAge(data.age.toString());
                    if (data.gender) setGender(data.gender);
                    if (data.skin_type) setSkinType(data.skin_type);
                    if (data.skin_problems) setSkinProblems(data.skin_problems);
                    if (data.skin_goals) setSkinGoals(data.skin_goals);

                    if (data.skin_goals && (data.skin_goals as any).length > 0) {
                        navigate("/dashboard");
                    }
                }
            }
        };
        checkSession();
    }, [navigate]);

    const generateAdvice = () => {
        const advices: { title: string, content: string, iconStr: string }[] = [];

        // 1. Type Advice
        const typeInfo = matrix.types_de_peau.find((t: any) => t.type === skinType);
        if (typeInfo) {
            advices.push({
                title: `Peau ${skinType}`,
                content: `Votre priorité est de cibler : ${typeInfo.signal_prioritaire}. Privilégiez des actifs comme ${typeInfo.ingredients_a_privilegier.slice(0, 2).join(' ou ')}.`,
                iconStr: "🛡️"
            });
        }

        // 2. Goals Advice
        skinGoals.forEach(goal => {
            const goalInfo = matrix.objectifs.find((o: any) => o.objectif === goal);
            if (goalInfo) {
                let content = `Pour votre objectif ${goal}, misez sur ${goalInfo.actifs_cles.slice(0, 2).join(' et ')}.`;
                if (goalInfo.regles.includes("SPF obligatoire")) {
                    content += " N'oubliez jamais votre protection SPF le matin pour protéger vos résultats.";
                }
                advices.push({
                    title: goal,
                    content,
                    iconStr: "✨"
                });
            }
        });

        // 3. Special Rules
        if (skinType === "Sensible" || skinProblems.includes("Eczéma")) {
            advices.push({
                title: "Précaution",
                content: "Votre peau étant réactive, effectuez toujours un patch test 24h avant d'introduire un nouvel actif.",
                iconStr: "🩺"
            });
        }

        return advices.slice(0, 4); // Show up to 4 advices
    };

    useEffect(() => {
        if (productSearchQuery.length < 2) { setProductCatalogResults([]); return; }
        const timer = setTimeout(async () => {
            const { data } = await (supabase as any)
                .from("user_products")
                .select("id, product_name, brand, photo_url, product_type")
                .is("user_id", null)
                .or(`product_name.ilike.%${productSearchQuery}%,brand.ilike.%${productSearchQuery}%`)
                .limit(8);
            if (data) setProductCatalogResults(data);
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearchQuery]);

    const processOnboardingBarcode = async (barcode: string) => {
        const { data: catalogProduct } = await (supabase as any)
            .from("user_products")
            .select("*")
            .is("user_id", null)
            .eq("barcode", barcode)
            .maybeSingle();
        if (catalogProduct) {
            const isAlready = selectedOnboardingProducts.some(p => p.id === catalogProduct.id);
            if (!isAlready) setSelectedOnboardingProducts(prev => [...prev, catalogProduct]);
            setOnboardingScanMessage("Produit trouvé et ajouté ✓");
        } else {
            setOnboardingScanMessage("Produit non reconnu — introuvable dans le catalogue");
        }
        setTimeout(() => setOnboardingScanMessage(null), 4000);
    };

    useEffect(() => {
        if (!onboardingScannerOpen) return;
        let scanner: any;
        const init = async () => {
            const { Html5Qrcode } = await import("html5-qrcode");
            scanner = new Html5Qrcode("qr-reader-onboarding");
            onboardingScannerRef.current = scanner;
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 120 } },
                async (code: string) => {
                    await scanner.stop().catch(() => {});
                    onboardingScannerRef.current = null;
                    setOnboardingScannerOpen(false);
                    await processOnboardingBarcode(code);
                },
                undefined
            );
        };
        init().catch(() => setOnboardingScannerOpen(false));
        return () => { onboardingScannerRef.current?.stop().catch(() => {}); };
    }, [onboardingScannerOpen]);

    const toggleOnboardingProduct = (product: any) => {
        const isAdded = selectedOnboardingProducts.some(p => p.id === product.id);
        if (isAdded) setSelectedOnboardingProducts(prev => prev.filter(p => p.id !== product.id));
        else setSelectedOnboardingProducts(prev => [...prev, product]);
    };

    const BackButton = () => (
        <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
                e.preventDefault();
                if (showPreview) setShowPreview(false);
                else if (step === 10) {
                    if (pricingMode === "free") setStep(8);
                    else setStep(9);
                }
                else if (step === 9) setStep(8);
                else if (step === 8) setShowPreview(true);
                else if (step > 1) setStep(step - 1);
                else navigate("/onboarding");
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-border/40 bg-white/50 hover:bg-white transition-all shadow-sm shrink-0 mt-1"
        >
            <ArrowLeft size={16} strokeWidth={1.5} className="text-foreground" />
        </motion.button>
    );

    const toggleChannel = (ch: string) => {
        if (usedChannels.includes(ch)) {
            setUsedChannels(usedChannels.filter(c => c !== ch));
        } else {
            setUsedChannels([...usedChannels, ch]);
        }
    };

    const toggleProblem = (prob: string) => {
        if (skinProblems.includes(prob)) {
            setSkinProblems(skinProblems.filter(p => p !== prob));
        } else {
            setSkinProblems([...skinProblems, prob]);
        }
    };

    const toggleGoal = (goal: string) => {
        if (skinGoals.includes(goal)) {
            setSkinGoals(skinGoals.filter(g => g !== goal));
        } else {
            setSkinGoals([...skinGoals, goal]);
        }
    };

    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 7 && !showPreview) {
            setShowPreview(true);
            window.scrollTo(0, 0);
            return;
        }

        if (showPreview) {
            setShowPreview(false);
            setStep(8);
            window.scrollTo(0, 0);
            return;
        }

        if (step === 8) {
            if (pricingMode === "free") {
                setStep(10);
            } else {
                setStep(9);
            }
            window.scrollTo(0, 0);
            return;
        }

        if (step < 10) {
            setStep(step + 1);
            window.scrollTo(0, 0);
            return;
        }

        // Step 10: Final Signup
        if (!firstName || !lastName || !email || !password) return;
        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { first_name: firstName, last_name: lastName } }
            });

            if (authError) {
                toast.error(authError.message);
                setLoading(false);
                return;
            }

            const userId = authData.user?.id;
            if (!userId) {
                toast.error("Erreur lors de la création du compte.");
                setLoading(false);
                return;
            }

            const today = new Date().toISOString().split("T")[0];

            const { error: profileError } = await (supabase as any).from("profiles").upsert({
                id: userId,
                first_name: firstName,
                last_name: lastName,
                profession: profession || null,
                used_channels: usedChannels.length > 0 ? usedChannels.map(c => c === "Autre" ? `Autre: ${otherChannel}` : c) : null,
                age: age ? parseInt(age) : null,
                gender: gender || null,
                skin_type: skinType || null,
                skin_problems: skinProblems.length > 0 ? skinProblems : null,
                skin_goals: skinGoals.length > 0 ? skinGoals : null,
                carnation: carnation || null,
                last_period_date: lastPeriodDate || null,
                cycle_duration: cycleDuration,
                manual_location: locationMode === "manual" ? manualCity || null : null,
            });

            if (selectedOnboardingProducts.length > 0) {
                await (supabase as any).from("user_products").insert(
                    selectedOnboardingProducts.map(p => ({
                        product_name: p.product_name,
                        brand: p.brand,
                        photo_url: p.photo_url,
                        product_type: p.product_type,
                        user_id: userId,
                        morning_use: true,
                        frequency: "daily",
                        is_active: true,
                    }))
                );
            }

            const baselinePromises: any[] = [];
            await Promise.all(baselinePromises);

            if (profileError) {
                console.error("Profile update error:", profileError);
                toast.error("Profil créé mais erreur lors de la sauvegarde des réponses.");
            }

            setLoading(false);
            localStorage.removeItem("guestProfile");
            navigate("/dashboard");
        } catch (error) {
            console.error("Signup error:", error);
            toast.error("Une erreur est survenue lors de l'inscription.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <motion.div
                key={showPreview ? "preview" : step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col p-6 z-10 max-w-md mx-auto w-full pb-32"
            >
                {showPreview ? (
                    <div className="space-y-8 h-full flex flex-col">
                        <div className="mb-6 flex items-start gap-4">
                            <BackButton />
                            <div>
                                <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Analyse Préliminaire</h1>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Basé sur vos réponses</p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 relative overflow-y-auto custom-scrollbar pr-1">
                            {generateAdvice().map((advice, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 + idx * 0.05 }}
                                    className="flex flex-col gap-4 p-8 premium-card border-none bg-white/60 group transition-all hover:bg-white/40"
                                >
                                    <div className="flex gap-6">
                                        <span className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform duration-500">{advice.iconStr}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-display text-xl text-foreground italic">{advice.title}</h3>
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                                            </div>
                                            <p className="text-[13px] text-foreground/80 leading-relaxed italic">{advice.content}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="mt-8 p-8 rounded-[32px] bg-primary/5 border border-primary/10 relative overflow-hidden backdrop-blur-sm z-20"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <Lock size={16} className="text-primary/30" />
                                </div>
                                <div className="flex gap-4">
                                    <div className="bg-white rounded-full p-2 text-primary shadow-sm h-fit shrink-0"><Lightbulb size={16} strokeWidth={2.5} /></div>
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">Accédez à une analyse complète</h3>
                                        <p className="text-[12px] text-foreground/70 leading-relaxed italic">
                                            Accédez à une <span className="text-primary font-bold">analyse complète</span>. Débloquez des conseils ultra-personnalisés incluant l'impact de votre cycle, la météo et votre routine après l'inscription.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            <div className="pt-8">
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
                                >
                                    CONTINUER <ArrowRight size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleNext} className="space-y-6 h-full flex flex-col">
                        {step === 1 && (
                            <>
                                <div className="mb-10 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Socio-professsionnel</h1>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">(Optionnel) Données statistiques</p>
                                    </div>
                                </div>
                                <div className="space-y-8 flex-1">
                                    <div className="space-y-4 relative">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Catégorie professionnelle</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                            <select
                                                className="w-full pl-12 h-14 bg-white border border-border/60 rounded-full focus:outline-none focus:border-primary text-xs font-bold tracking-tight appearance-none transition-all shadow-sm"
                                                value={profession}
                                                onChange={(e) => setProfession(e.target.value)}
                                            >
                                                <option value="">Sélectionner (optionnel)</option>
                                                {professions.map(prof => (
                                                    <option key={prof} value={prof}>{prof}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-6 pt-10 border-t border-border/40">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Canaux de découverte</label>
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            {channels.map(ch => (
                                                <button type="button" key={ch} onClick={() => toggleChannel(ch)}
                                                    className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${usedChannels.includes(ch) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {ch}
                                                </button>
                                            ))}
                                        </div>
                                        <AnimatePresence>
                                            {usedChannels.includes("Autre") && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 overflow-hidden">
                                                    <Input
                                                        type="text"
                                                        placeholder="Veuillez préciser..."
                                                        value={otherChannel}
                                                        onChange={(e) => setOtherChannel(e.target.value)}
                                                        className="h-14"
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="mb-10 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Profil physique</h1>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Personnalisation de l'analyse</p>
                                    </div>
                                </div>
                                <div className="space-y-8 flex-1">
                                    <div className="space-y-4 relative">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Âge</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                            <Input type="number" placeholder="ex: 28" min="10" max="120"
                                                className="pl-12"
                                                value={age} onChange={(e) => setAge(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-6 pt-10 border-t border-border/40">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Sexe</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {["Femme", "Homme", "Autre"].map(g => (
                                                <button type="button" key={g} onClick={() => setGender(g)}
                                                    className={`py-4 px-2 border rounded-full transition-all text-[10px] font-bold uppercase tracking-widest ${gender === g ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Step 3 — Carnation */}
                        {step === 3 && (
                            <>
                                <div className="mb-10 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Votre carnation</h1>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Personnalisation colorimétrique</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 flex-1">
                                    {[
                                        { value: "très_claire",   label: "Très claire",    color: "#F5E6D8" },
                                        { value: "claire",        label: "Claire",          color: "#EAC9A8" },
                                        { value: "beige_doré",    label: "Beige dorée",     color: "#C8924F" },
                                        { value: "olive_caramel", label: "Olive-Caramel",   color: "#A0622A" },
                                        { value: "foncée",        label: "Foncée",          color: "#6B3A1F" },
                                        { value: "ébène",         label: "Ébène",           color: "#2C1810" },
                                    ].map(swatch => (
                                        <button
                                            type="button"
                                            key={swatch.value}
                                            onClick={() => setCarnation(swatch.value)}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                                carnation === swatch.value
                                                    ? "border-primary bg-primary/5 premium-shadow"
                                                    : "border-border/40 bg-background/40"
                                            }`}
                                        >
                                            <div className="w-12 h-12 rounded-full shadow-sm" style={{ backgroundColor: swatch.color }} />
                                            <p className="text-[10px] font-bold text-foreground uppercase tracking-widest text-center leading-tight">
                                                {swatch.label}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Step 4 — Cycle menstruel */}
                        {step === 4 && (
                            <>
                                <div className="mb-10 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Établissons votre profil de peau</h1>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Cycle menstruel</p>
                                    </div>
                                </div>
                                <div className="space-y-8 flex-1">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Vos dernières règles</label>
                                        <Input
                                            type="date"
                                            value={lastPeriodDate}
                                            onChange={(e) => setLastPeriodDate(e.target.value)}
                                            className="h-14 rounded-2xl font-mono"
                                            max={new Date().toISOString().split("T")[0]}
                                        />
                                    </div>
                                    <div className="space-y-6 pt-6 border-t border-border/40">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Durée du cycle</label>
                                            <span className="text-sm font-bold text-primary">{cycleDuration} jours</span>
                                        </div>
                                        <Slider
                                            value={[cycleDuration]}
                                            min={21}
                                            max={35}
                                            step={1}
                                            onValueChange={(v) => setCycleDuration(v[0])}
                                        />
                                        <p className="text-[10px] text-muted-foreground text-center italic">21 jours — 35 jours · Défaut : 28 jours</p>
                                    </div>
                                    <div className="flex gap-3">
                                        {["Je ne sais pas", "Pas de règles"].map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => setLastPeriodDate("")}
                                                className="flex-1 py-3 rounded-2xl border border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:border-primary transition-all"
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Step 5 — Localisation météo */}
                        {step === 5 && (
                            <>
                                <div className="mb-10 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Votre météo au service de votre peau</h1>
                                    </div>
                                </div>
                                <div className="space-y-8 flex-1">
                                    <div className="space-y-3">
                                        {[
                                            { icon: "☀️", title: "Indice UV",    desc: "Adapte votre SPF en temps réel" },
                                            { icon: "💨", title: "Pollution",     desc: "Protège votre barrière cutanée" },
                                            { icon: "🌡️", title: "Température",  desc: "Ajuste l'hydratation recommandée" },
                                        ].map(b => (
                                            <div key={b.title} className="flex items-center gap-4 p-4 bg-muted/20 rounded-2xl">
                                                <span className="text-2xl">{b.icon}</span>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{b.title}</p>
                                                    <p className="text-[11px] text-muted-foreground">{b.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={geoLoading}
                                        onClick={() => {
                                            setGeoLoading(true);
                                            navigator.geolocation.getCurrentPosition(
                                                () => { setLocationMode("geo"); setGeoLoading(false); },
                                                () => { setGeoLoading(false); setLocationMode("manual"); }
                                            );
                                        }}
                                        className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow disabled:opacity-60"
                                    >
                                        {geoLoading
                                            ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            : <MapPin size={18} strokeWidth={1.5} />}
                                        {geoLoading ? "Localisation..." : "Autoriser la localisation"}
                                    </button>
                                    {locationMode === "geo" && (
                                        <p className="text-center text-sm text-primary font-semibold">✓ Localisation activée</p>
                                    )}
                                    {locationMode === "manual" ? (
                                        <Input
                                            value={manualCity}
                                            onChange={(e) => setManualCity(e.target.value)}
                                            placeholder="Ex: Paris"
                                            className="h-14"
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setLocationMode("manual")}
                                            className="w-full text-center text-[11px] text-muted-foreground underline underline-offset-4 hover:text-primary transition-colors"
                                        >
                                            Saisir ma ville manuellement
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Step 6 — Ajout produits */}
                        {step === 6 && (
                            <>
                                <div className="mb-6 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Ajouter vos produits</h1>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Votre routine actuelle</p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar space-y-4 pr-1">
                                    {/* Search card — même layout que Vanity */}
                                    <div className="premium-card p-0 overflow-hidden">
                                        <div className="p-5 bg-background/50 border-b border-border/50">
                                            <h2 className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-4">Rechercher un produit</h2>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        value={productSearchQuery}
                                                        onChange={(e) => setProductSearchQuery(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                                                        placeholder="Chercher un produit ou marque..."
                                                        className="pl-10 text-sm rounded-xl py-6 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setOnboardingScannerOpen(true)}
                                                    className="w-12 h-12 rounded-xl bg-muted/20 flex items-center justify-center text-foreground/60 hover:bg-muted/40 transition-colors flex-shrink-0 self-center"
                                                >
                                                    <Scan size={18} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            {productCatalogResults.length > 0 ? (
                                                <div className="grid gap-3">
                                                    {productCatalogResults.map(p => {
                                                        const isAdded = selectedOnboardingProducts.some(s => s.id === p.id);
                                                        return (
                                                            <div key={p.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl transition-all hover:border-primary/30 shadow-sm">
                                                                <div className="w-14 h-14 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
                                                                    {p.photo_url
                                                                        ? <img src={p.photo_url} alt={p.product_name} className="w-full h-full object-contain" />
                                                                        : <ImageOff size={18} className="text-muted-foreground/40" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-foreground truncate">{p.product_name}</p>
                                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter truncate">{p.brand}</p>
                                                                    {p.product_type && (
                                                                        <p className="text-[10px] text-primary/70 mt-0.5 truncate">{p.product_type}</p>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleOnboardingProduct(p)}
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                                                        isAdded
                                                                            ? "bg-primary/10 text-primary cursor-default"
                                                                            : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                                                                    }`}
                                                                >
                                                                    {isAdded ? <Check size={16} /> : <Plus size={16} />}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-center text-[11px] text-muted-foreground italic py-2">
                                                    Tapez le nom d'un produit ou d'une marque pour rechercher
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selected products card */}
                                    {selectedOnboardingProducts.length > 0 && (
                                        <div className="premium-card p-5">
                                            <p className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-4">
                                                {selectedOnboardingProducts.length} produit{selectedOnboardingProducts.length > 1 ? "s" : ""} sélectionné{selectedOnboardingProducts.length > 1 ? "s" : ""}
                                            </p>
                                            <div className="grid gap-2">
                                                {selectedOnboardingProducts.map(p => (
                                                    <div key={p.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl shadow-sm">
                                                        <div className="w-10 h-10 bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
                                                            {p.photo_url
                                                                ? <img src={p.photo_url} alt={p.product_name} className="w-full h-full object-contain" />
                                                                : <ImageOff size={14} className="text-muted-foreground/40" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-foreground truncate">{p.product_name}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter truncate">{p.brand}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleOnboardingProduct(p)}
                                                            className="w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shrink-0"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Scanner overlay */}
                                {onboardingScannerOpen && (
                                    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6">
                                        <p className="text-white text-sm font-medium tracking-wide">Scannez un code-barres</p>
                                        <div id="qr-reader-onboarding" className="w-72 rounded-2xl overflow-hidden" />
                                        <button
                                            type="button"
                                            onClick={() => setOnboardingScannerOpen(false)}
                                            className="text-white/60 text-sm hover:text-white transition-colors"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                )}

                                {/* Toast scan */}
                                {onboardingScanMessage && (
                                    <div className="fixed bottom-28 left-4 right-4 max-w-sm mx-auto bg-foreground text-background text-sm rounded-2xl px-4 py-3 text-center z-40">
                                        {onboardingScanMessage}
                                    </div>
                                )}
                            </>
                        )}

                        {step === 7 && (
                            <>
                                <div className="mb-10 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Diagnostic & Objectifs</h1>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Identification et priorités</p>
                                    </div>
                                </div>
                                <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Type de peau</label>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {["Sèche", "Grasse", "Mixte", "Normale", "Sensible", "Acnéique"].map(type => (
                                                <button type="button" key={type} onClick={() => { setSkinType(type); setQuizStarted(false); }}
                                                    className={`py-5 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinType === type && !quizStarted ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                        <button type="button" onClick={() => { setQuizStarted(!quizStarted); setSkinType(""); setQuizStep(1); }}
                                            className={`w-full py-4 px-4 border rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${quizStarted ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-white text-primary border-primary hover:bg-primary/5'}`}>
                                            Diagnostic assisté
                                        </button>

                                        <AnimatePresence>
                                            {quizStarted && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="premium-card p-6 mt-6 overflow-hidden bg-white/40 border-primary/10">
                                                    {quizStep === 1 && (
                                                        <div className="space-y-6">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">1. Réaction après nettoyage</p>
                                                            <div className="flex flex-col gap-3">
                                                                {[
                                                                    { label: "Elle tiraille et est inconfortable", val: "Sèche" },
                                                                    { label: "Elle brille sur tout le visage", val: "Grasse" },
                                                                    { label: "Seulement la zone T brille", val: "Mixte" },
                                                                    { label: "Elle est confortable et équilibrée", val: "Normale" },
                                                                    { label: "Elle est rouge ou chauffe", val: "Sensible" }
                                                                ].map(opt => (
                                                                    <button type="button" key={opt.val} onClick={() => { setQuizAnswers({ ...quizAnswers, q1: opt.val }); setQuizStep(2); }}
                                                                        className="text-left py-4 px-6 border border-border/40 rounded-2xl text-[11px] font-bold tracking-tight hover:border-primary transition-all bg-white/60 hover:bg-white shadow-sm">
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {quizStep === 2 && (
                                                        <div className="space-y-6">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">2. Apparence des pores</p>
                                                            <div className="flex flex-col gap-3">
                                                                {[
                                                                    { label: "Presque invisibles", val: "Sèche" },
                                                                    { label: "Larges sur tout le visage", val: "Grasse" },
                                                                    { label: "Visibles uniquement sur le nez", val: "Mixte" },
                                                                    { label: "Petits mais réguliers", val: "Normale" }
                                                                ].map(opt => (
                                                                    <button type="button" key={opt.val} onClick={() => { setQuizAnswers({ ...quizAnswers, q2: opt.val }); setQuizStep(3); }}
                                                                        className="text-left py-4 px-6 border border-border/40 rounded-2xl text-[11px] font-bold tracking-tight hover:border-primary transition-all bg-white/60 hover:bg-white shadow-sm">
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {quizStep === 3 && (
                                                        <div className="space-y-6">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">3. Fréquence des imperfections</p>
                                                            <div className="flex flex-col gap-3">
                                                                {[
                                                                    { label: "Rarement ou jamais", val: "Sèche" },
                                                                    { label: "Très souvent (points noirs, boutons)", val: "Grasse" },
                                                                    { label: "Localisées sur le front ou le nez", val: "Mixte" },
                                                                    { label: "Ma peau réagit aux produits", val: "Sensible" }
                                                                ].map(opt => (
                                                                    <button type="button" key={opt.val} onClick={() => { setQuizAnswers({ ...quizAnswers, q3: opt.val }); setQuizStep(4); }}
                                                                        className="text-left py-4 px-6 border border-border/40 rounded-2xl text-[11px] font-bold tracking-tight hover:border-primary transition-all bg-white/60 hover:bg-white shadow-sm">
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {quizStep === 4 && (
                                                        <div className="space-y-6">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">4. Texture au toucher</p>
                                                            <div className="flex flex-col gap-3">
                                                                {[
                                                                    { label: "Rugueuse ou squameuse", val: "Sèche" },
                                                                    { label: "Épaisse et souvent huileuse", val: "Grasse" },
                                                                    { label: "Variable (grasse et sèche)", val: "Mixte" },
                                                                    { label: "Lisse, douce et souple", val: "Normale" }
                                                                ].map(opt => (
                                                                    <button type="button" key={opt.val} onClick={() => {
                                                                        const finalAnswers = { ...quizAnswers, q4: opt.val };
                                                                        setQuizAnswers(finalAnswers);
                                                                        const scores = { Sèche: 0, Grasse: 0, Mixte: 0, Normale: 0, Sensible: 0 };
                                                                        if (finalAnswers.q1 === "Sèche") scores.Sèche += 2;
                                                                        if (finalAnswers.q1 === "Grasse") scores.Grasse += 2;
                                                                        if (finalAnswers.q1 === "Mixte") scores.Mixte += 2;
                                                                        if (finalAnswers.q1 === "Normale") scores.Normale += 2;
                                                                        if (finalAnswers.q1 === "Sensible") scores.Sensible += 2;
                                                                        if (finalAnswers.q2 === "Sèche") { scores.Sèche += 1; scores.Normale += 1; }
                                                                        if (finalAnswers.q2 === "Grasse") scores.Grasse += 2;
                                                                        if (finalAnswers.q2 === "Mixte") scores.Mixte += 2;
                                                                        if (finalAnswers.q2 === "Normale") scores.Normale += 2;
                                                                        if (finalAnswers.q3 === "Sèche") { scores.Sèche += 1; scores.Normale += 1; }
                                                                        if (finalAnswers.q3 === "Grasse") scores.Grasse += 2;
                                                                        if (finalAnswers.q3 === "Mixte") scores.Mixte += 2;
                                                                        if (finalAnswers.q3 === "Sensible") scores.Sensible += 2;
                                                                        if (finalAnswers.q4 === "Sèche") scores.Sèche += 2;
                                                                        if (finalAnswers.q4 === "Grasse") scores.Grasse += 2;
                                                                        if (finalAnswers.q4 === "Mixte") scores.Mixte += 2;
                                                                        if (finalAnswers.q4 === "Normale") scores.Normale += 2;
                                                                        let winner = "Normale";
                                                                        let maxScore = -1;
                                                                        Object.entries(scores).forEach(([type, score]) => {
                                                                            if (score > maxScore) {
                                                                                maxScore = score;
                                                                                winner = type;
                                                                            }
                                                                        });
                                                                        setSkinType(winner);
                                                                        setQuizStep(5);
                                                                    }}
                                                                        className="text-left py-4 px-6 border border-border/40 rounded-2xl text-[11px] font-bold tracking-tight hover:border-primary transition-all bg-white/60 hover:bg-white shadow-sm">
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {quizStep === 5 && (
                                                        <div className="space-y-6 text-center py-4">
                                                            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                                                                <CheckCircle2 size={40} strokeWidth={1.5} />
                                                            </div>
                                                            <h3 className="text-xl font-display text-foreground leading-tight">Analyse terminée</h3>
                                                            <div className="p-6 rounded-3xl bg-white border border-primary/10 premium-shadow">
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-60">Type détecté</p>
                                                                <p className="text-2xl font-display text-primary">{skinType}</p>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground leading-relaxed italic px-4">
                                                                Votre peau semble être de type {skinType}.
                                                                Validez pour enregistrer.
                                                            </p>
                                                            <div className="flex flex-col gap-4 mt-8">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQuizStarted(false)}
                                                                    className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow"
                                                                >
                                                                    Valider
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQuizStep(1)}
                                                                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                                                                >
                                                                    Recommencer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="space-y-6 pt-10 border-t border-border/40">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Sensibilités prioritaires</label>
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            {["Acné", "Rougeurs", "Taches", "Points noirs", "Déshydratation", "Rides", "Cernes", "Eczéma"].map(prob => (
                                                <button type="button" key={prob} onClick={() => toggleProblem(prob)}
                                                    className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinProblems.includes(prob) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {prob}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-10 border-t border-border/40">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Objectifs & Priorités</label>
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            {["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Taches", "Pores", "Anti-cernes"].map(goal => (
                                                <button type="button" key={goal} onClick={() => toggleGoal(goal)}
                                                    className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinGoals.includes(goal) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                    {goal}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 8 && (
                            <div className="space-y-8 h-full flex flex-col">
                                <div className="mb-6 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-2">Votre essai gratuit</p>
                                        <h1 className="text-2xl font-display text-foreground leading-tight">Commencer à prendre soin de vous</h1>
                                    </div>
                                </div>

                                {/* Billing toggle — Annuel (-40%) left, Mensuel right */}
                                <div className="bg-muted/20 p-1.5 rounded-full flex relative border border-border/40">
                                    <motion.div
                                        className="absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-full shadow-sm"
                                        animate={{ x: selectedPlan === 'monthly' ? '100%' : '0%' }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                    <button type="button" onClick={() => setSelectedPlan("yearly")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 relative ${selectedPlan === 'yearly' ? 'text-primary' : 'text-muted-foreground'}`}>
                                        <Badge className="absolute -top-3 -left-2 bg-primary text-primary-foreground text-[8px] px-2 py-0.5 border-none shadow-sm">-40%</Badge>
                                        Annuel
                                    </button>
                                    <button type="button" onClick={() => setSelectedPlan("monthly")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 ${selectedPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>
                                        Mensuel
                                    </button>
                                </div>

                                {/* Price */}
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

                                {/* Features */}
                                <div className="space-y-4">
                                    {[
                                        { label: "Accès illimité", desc: "Toutes les fonctionnalités sans restriction" },
                                        { label: "Sans engagement", desc: "Annulez à tout moment" },
                                        { label: "Conseils personnalisés", desc: "Adaptés à votre cycle, météo et routine" },
                                        { label: "Mémoire illimitée", desc: "Historique complet sans limite de temps" },
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.05 * i }}
                                            className="flex items-start gap-4"
                                        >
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

                                {/* CTAs */}
                                <div className="space-y-3 pt-2 mt-auto">
                                    <button
                                        type="button"
                                        onClick={() => { setStep(10); window.scrollTo(0, 0); }}
                                        className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
                                    >
                                        Passer premium
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setStep(10); window.scrollTo(0, 0); }}
                                        className="w-full h-14 border border-border/60 text-muted-foreground rounded-full text-[11px] font-bold uppercase tracking-[0.15em] hover:border-primary hover:text-primary transition-colors"
                                    >
                                        Commencer mon essai gratuit
                                    </button>
                                    <p className="text-center text-[10px] text-muted-foreground pt-1">
                                        Renouvelé automatiquement à 9,99€/mois. Annulable à tout moment.
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === 9 && (
                            <div className="space-y-8 h-full flex flex-col">
                                <div className="mb-4 flex items-center gap-4">
                                    <BackButton />
                                    <h2 className="text-2xl font-display text-foreground italic">Choisissez votre abonnement</h2>
                                </div>

                                {/* Segmented Control */}
                                <div className="bg-muted/20 p-1.5 rounded-full flex mb-8 relative border border-border/40">
                                    <motion.div
                                        className="absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-full shadow-sm"
                                        animate={{ x: selectedPlan === 'yearly' ? '100%' : '0%' }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                    <button type="button" onClick={() => setSelectedPlan("monthly")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 ${selectedPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>Mensuel</button>
                                    <button type="button" onClick={() => setSelectedPlan("yearly")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 relative ${selectedPlan === 'yearly' ? 'text-primary' : 'text-muted-foreground'}`}>
                                        Annuel
                                        <Badge className="absolute -top-3 -right-2 bg-primary text-primary-foreground text-[8px] px-2 py-0.5 border-none shadow-sm">{PLANS.yearly.badge}</Badge>
                                    </button>
                                </div>

                                {/* Price Display */}
                                <motion.div layout className="bg-primary/5 p-8 rounded-[40px] border border-primary/10 text-center mb-6 relative overflow-hidden shadow-sm">
                                    <AnimatePresence mode="wait">
                                        <motion.div key={selectedPlan} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-5">
                                            {selectedPlan === 'yearly' && (
                                                <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-2 shadow-sm">
                                                    <span>-40%</span>
                                                    <span className="w-1 h-1 bg-white/40 rounded-full" />
                                                    <span>Offre de lancement</span>
                                                </div>
                                            )}
                                            <div className="flex items-baseline justify-center gap-2">
                                                <span className="text-5xl font-display text-foreground italic leading-none">{PLANS[selectedPlan].price}</span>
                                                <span className="text-xl text-muted-foreground italic">{PLANS[selectedPlan].period}</span>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[13px] text-muted-foreground italic tracking-tight leading-relaxed font-medium">{PLANS[selectedPlan].subtext}</p>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </motion.div>

                                <div className="space-y-4 mb-8">
                                    {["Accès illimité", "Sans engagement", "Aucun débit maintenant"].map((text, idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><Check size={12} strokeWidth={3} /></div>
                                            <span className="text-[13px] font-medium text-foreground italic">{text}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4 pt-4">
                                    <Button
                                        type="submit"
                                        className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
                                    >
                                        SOUSCRIRE À L'OFFRE
                                    </Button>
                                    <button
                                        type="submit"
                                        className="w-full text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-center hover:text-primary transition-colors py-2"
                                    >
                                        Continuer gratuitement
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 10 && (
                            <>
                                <div className="mb-10 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Identifiants</h1>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Dernière étape : créer votre compte</p>
                                    </div>
                                </div>
                                <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Prénom</label>
                                            <div className="relative">
                                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                                <Input placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-12" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Nom</label>
                                            <div className="relative">
                                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                                <Input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-12" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                            <Input type="email" placeholder="email@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-12" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4">Mot de passe</label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} strokeWidth={1.5} />
                                            <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-12" />
                                        </div>
                                        <div className="px-4 space-y-2">
                                            <p className={`text-[9px] flex items-center gap-2 ${password.length >= 8 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                                <CheckCircle2 size={10} /> 8 caractères minimum
                                            </p>
                                            <p className={`text-[9px] flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                                <CheckCircle2 size={10} /> Une majuscule
                                            </p>
                                            <p className={`text-[9px] flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                                <CheckCircle2 size={10} /> Un chiffre
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-10 flex items-start gap-4 px-4 bg-muted/15 rounded-[32px] p-6 border border-border/20">
                                        <Shield className="text-primary shrink-0" size={20} />
                                        <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                            Vos données sont sécurisées et conformes au RGPD. Nous ne partageons jamais vos informations personnelles.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {step !== 8 && step !== 9 && (
                            <div className="fixed bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-md border-t border-border/40 z-20 flex flex-col gap-4">
                                {step === 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(step + 1)}
                                        className="w-full text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                                    >
                                        Passer cette étape
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    disabled={
                                        (loading) ||
                                        (step === 1 && usedChannels.includes('Autre') && !otherChannel) ||
                                        (step === 2 && (!age || !gender)) ||
                                        (step === 3 && !carnation) ||
                                        (step === 7 && !showPreview && (!skinType || skinGoals.length === 0)) ||
                                        (step === 10 && (!firstName || !lastName || !email || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)))
                                    }
                                    className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {loading ? "ENREGISTREMENT..." : step === 10 ? "TERMINER" : "SUIVANT"} <ChevronRight size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        )}
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default Signup;
