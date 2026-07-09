import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, User, CheckCircle2, ChevronRight, Weight, Calendar, HelpCircle, Briefcase, Share2, AlertCircle, Lock, Sparkles, Shield, Info, ArrowRight, Lightbulb, Activity, Droplets, Flame, Check, Clock, MapPin, Plus, X, Search, ImageOff, Scan, Camera } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { normalizeCarnation } from "@/utils/carnation";
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

// La colonne profiles.carnation attend les slugs du sélecteur manuel (step 3),
// alors que skin-analysis (IA) renvoie des libellés différents ("très claire",
// "beige dorée", "olive-caramel"...). Sans normalisation, l'upsert profiles
// est rejeté quand la valeur vient de l'analyse photo.

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
    const [onboardingPhotoBase64, setOnboardingPhotoBase64] = useState<string | null>(null);
    const [onboardingAnalysis, setOnboardingAnalysis] = useState<any>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [showDiagnostic, setShowDiagnostic] = useState(false);
    const [editingDiagnostic, setEditingDiagnostic] = useState(false);
    const [correctedSkinType, setCorrectedSkinType] = useState("");
    const [correctedProblems, setCorrectedProblems] = useState<string[]>([]);
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
                const { data } = await (supabase as any).from('profiles').select('first_name, last_name, profession, used_channels, age, gender, skin_type, skin_problems, skin_goals').eq('id', session.user.id).single();
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
                    await scanner.stop().catch(() => { });
                    onboardingScannerRef.current = null;
                    setOnboardingScannerOpen(false);
                    await processOnboardingBarcode(code);
                },
                undefined
            );
        };
        init().catch(() => setOnboardingScannerOpen(false));
        return () => { onboardingScannerRef.current?.stop().catch(() => { }); };
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
                else if (step > 2) setStep(step - 1);
                else if (step === 2) navigate("/onboarding");
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

        if (step === 7 && onboardingPhotoBase64 && !showDiagnostic) {
            setShowDiagnostic(true);
            window.scrollTo(0, 0);
            return;
        }
        if (showDiagnostic) {
            setShowDiagnostic(false);
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
            // Si photo prise et on est au step 2, sauter carnation (step 3)
            if (step === 2 && onboardingPhotoBase64) {
                setStep(4);
            } else {
                setStep(step + 1);
            }
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
                skin_type: correctedSkinType || skinType || onboardingAnalysis?.type_peau_detecte || null,
                skin_problems: correctedProblems.length > 0 ? correctedProblems : (skinProblems.length > 0 ? skinProblems : null),
                skin_goals: skinGoals.length > 0 ? skinGoals : null,
                carnation: carnation || normalizeCarnation(onboardingAnalysis?.carnation_detectee) || null,
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
                        evening_use: true,
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

            localStorage.removeItem("guestProfile");
            // Persister l'analyse de peau de l'onboarding (option A2) avant de générer les conseils
            console.log("[DEBUG] onboardingAnalysis avant insert:", onboardingAnalysis);
            if (onboardingAnalysis && onboardingPhotoBase64) {
                // storage_path est NOT NULL sur skin_photos : il faut uploader la photo
                // avant l'upsert, sinon l'insert échoue silencieusement et analysis_json
                // n'est jamais écrit (aucune ligne n'est créée pour la journée).
                const storagePath = `${userId}/${today}.jpg`;
                const photoBytes = Uint8Array.from(atob(onboardingPhotoBase64), c => c.charCodeAt(0));
                const { error: uploadError } = await supabase.storage
                    .from("skin-photos")
                    .upload(storagePath, photoBytes, { contentType: "image/jpeg", upsert: true });
                if (uploadError) {
                    console.error("[DEBUG] skin_photos upload error:", uploadError);
                }

                const { error: skinPhotoError } = await (supabase as any).from("skin_photos").upsert({
                    user_id: userId,
                    date: today,
                    storage_path: storagePath,
                    analysis_json: onboardingAnalysis,
                }, { onConflict: "user_id,date" });
                if (skinPhotoError) {
                    console.error("[DEBUG] skin_photos upsert error:", skinPhotoError);
                }
            }
            // Générer les conseils de la semaine (piliers) à partir de l'analyse
            supabase.functions.invoke("generate-weekly-advice", {
                body: { user_id: userId },
            }).catch((e) => console.warn("generate-weekly-advice:", e));
            setLoading(false);
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
                                <div className="mb-6 flex items-start gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-2">
                                            Obtenez votre diagnostic de peau
                                        </h1>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                            Une simple photo suffit
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col gap-6">
                                    {/* Zone photo */}
                                    <div className="relative rounded-3xl overflow-hidden bg-muted/20 border border-border/40" style={{ height: 320 }}>
                                        {onboardingPhotoBase64 ? (
                                            <img
                                                src={`data:image/jpeg;base64,${onboardingPhotoBase64}`}
                                                alt="Photo peau"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/50">
                                                <Camera size={40} strokeWidth={1.2} />
                                                <p className="text-sm">Visage démaquillé, face à la lumière</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Disclaimer RGPD */}
                                    <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-4">
                                        Votre photo est utilisée uniquement pour l'analyse de peau, conformément à notre politique de confidentialité.
                                    </p>

                                    {/* Bouton prendre une photo */}
                                    <label className="w-full h-14 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all active:scale-[0.98]">
                                        <Camera size={18} strokeWidth={2} />
                                        {onboardingPhotoBase64 ? "Reprendre la photo" : "Prendre une photo"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="user"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const base64 = await new Promise<string>((resolve, reject) => {
                                                    const img = new Image();
                                                    const url = URL.createObjectURL(file);
                                                    img.onload = () => {
                                                        const canvas = document.createElement("canvas");
                                                        const MAX = 1200;
                                                        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
                                                        canvas.width = img.width * ratio;
                                                        canvas.height = img.height * ratio;
                                                        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                                                        URL.revokeObjectURL(url);
                                                        resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
                                                    };
                                                    img.onerror = reject;
                                                    img.src = url;
                                                });
                                                setOnboardingPhotoBase64(base64);
                                                setAnalysisLoading(true);
                                                supabase.functions.invoke("skin-analysis", {
                                                    body: { imageBase64: base64, age: age || undefined },

                                                }).then(({ data }) => {
                                                    if (data?.rejected) {
                                                        // Photo mauvaise qualité → message + reset photo
                                                        setOnboardingPhotoBase64(null);
                                                        setAnalysisLoading(false);
                                                        alert(`📸 ${data.reason}`);
                                                        return;
                                                    }
                                                    if (data?.analysis) {
                                                        setOnboardingAnalysis(data.analysis);
                                                        setCorrectedSkinType(data.analysis.type_peau_detecte ?? "");
                                                    }
                                                    setAnalysisLoading(false);
                                                }).catch(() => setAnalysisLoading(false));
                                            }}
                                        />
                                    </label>
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
                                        { value: "très_claire", label: "Très claire", color: "#F5E6D8" },
                                        { value: "claire", label: "Claire", color: "#EAC9A8" },
                                        { value: "beige_doré", label: "Beige dorée", color: "#C8924F" },
                                        { value: "olive_caramel", label: "Olive-Caramel", color: "#A0622A" },
                                        { value: "foncée", label: "Foncée", color: "#6B3A1F" },
                                        { value: "ébène", label: "Ébène", color: "#2C1810" },
                                    ].map(swatch => (
                                        <button
                                            type="button"
                                            key={swatch.value}
                                            onClick={() => setCarnation(swatch.value)}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${carnation === swatch.value
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
                                            { icon: "☀️", title: "Indice UV", desc: "Adapte votre SPF en temps réel" },
                                            { icon: "💨", title: "Pollution", desc: "Protège votre barrière cutanée" },
                                            { icon: "🌡️", title: "Température", desc: "Ajuste l'hydratation recommandée" },
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
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isAdded
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
                                        <h1 className="text-2xl font-display text-foreground leading-tight mb-3">Vos objectifs</h1>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Qu'est-ce qui compte le plus pour vous ?</p>
                                    </div>
                                </div>
                                <div className="space-y-8 flex-1 overflow-y-auto pb-4 custom-scrollbar pr-1">
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        {["Hydratation", "Anti-âge", "Éclat / Glow", "Anti-imperfections", "Apaiser", "Taches", "Pores", "Anti-cernes"].map(goal => (
                                            <button type="button" key={goal} onClick={() => toggleGoal(goal)}
                                                className={`py-4 px-2 border rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest ${skinGoals.includes(goal) ? 'bg-primary text-primary-foreground border-primary premium-shadow' : 'bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/20'}`}>
                                                {goal}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        {showDiagnostic && (
                            <div className="space-y-6 h-full flex flex-col">
                                <div className="mb-6 flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <button type="button" onClick={() => setShowDiagnostic(false)}>
                                            <ArrowLeft size={20} strokeWidth={1.8} className="text-foreground mt-1" />
                                        </button>
                                        <div>
                                            <h1 className="text-2xl font-display text-foreground leading-tight mb-1">
                                                Votre diagnostic de peau
                                            </h1>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                                Basé sur votre photo
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEditingDiagnostic(!editingDiagnostic)}
                                        className="w-9 h-9 rounded-full bg-muted/20 flex items-center justify-center"
                                    >
                                        {editingDiagnostic
                                            ? <Check size={16} strokeWidth={2} className="text-primary" />
                                            : <Sparkles size={16} strokeWidth={1.5} className="text-foreground/60" />}
                                    </button>
                                </div>

                                {analysisLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <p className="text-sm text-muted-foreground">Analyse de votre peau en cours...</p>
                                    </div>
                                ) : onboardingAnalysis ? (
                                    <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                                        {/* Photo prise */}
                                        {onboardingPhotoBase64 && (
                                            <div className="rounded-3xl overflow-hidden border border-border/40 bg-muted/20 flex items-center justify-center" style={{ maxHeight: 280 }}>
                                                <img
                                                    src={`data:image/jpeg;base64,${onboardingPhotoBase64}`}
                                                    alt="Votre photo"
                                                    className="w-full h-auto max-h-[280px] object-contain"
                                                />
                                            </div>
                                        )}

                                        {/* KPIs principaux */}
                                        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/20 rounded-2xl">
                                            {[
                                                { label: "Type", value: onboardingAnalysis.type_peau_detecte ?? "—" },
                                                { label: "Carnation", value: onboardingAnalysis.carnation_detectee ?? "—" },
                                                { label: "Âge", value: age ? `${age} ans` : "—" },
                                                { label: "Éclat", value: onboardingAnalysis.eclat_global ? `${onboardingAnalysis.eclat_global}/10` : "—" },
                                            ].map(kpi => (
                                                <div key={kpi.label} className="bg-white rounded-xl p-3 border border-border/40">
                                                    <p className="text-[10px] text-muted-foreground font-medium mb-1">{kpi.label}</p>
                                                    <p className="text-sm font-bold text-foreground capitalize">{kpi.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Scores visuels */}
                                        <div className="bg-white rounded-2xl p-4 border border-border/40 space-y-3">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Scores cutanés</p>
                                            {[
                                                { label: "Hydratation", value: onboardingAnalysis.hydratation?.score, max: 4, color: "bg-blue-400" },
                                                { label: "Érythème", value: onboardingAnalysis.erytheme?.score, max: 4, color: "bg-red-400" },
                                                { label: "Sébum zone T", value: onboardingAnalysis.sebum?.zone_t, max: 5, color: "bg-yellow-400" },
                                                { label: "Acné", value: onboardingAnalysis.acne?.score, max: 4, color: "bg-orange-400" },
                                            ].map(s => (
                                                <div key={s.label}>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-[11px] font-semibold text-foreground">{s.label}</span>
                                                        <span className="text-[11px] text-muted-foreground">{s.value}/{s.max}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                                        <div className={`h-full ${s.color} rounded-full`} style={{ width: `${(s.value / s.max) * 100}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Points forts */}
                                        {onboardingAnalysis.points_forts?.length > 0 && (
                                            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">✨ Points forts</p>
                                                {onboardingAnalysis.points_forts.map((p: string, i: number) => (
                                                    <p key={i} className="text-[12px] text-foreground/80 mb-1">• {p}</p>
                                                ))}
                                            </div>
                                        )}

                                        {/* Points attention */}
                                        {onboardingAnalysis.points_attention?.length > 0 && (
                                            <div className="bg-muted/10 rounded-2xl p-4 border border-border/40">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">À surveiller</p>
                                                {onboardingAnalysis.points_attention.map((p: string, i: number) => (
                                                    <p key={i} className="text-[12px] text-foreground/80 mb-1">• {p}</p>
                                                ))}
                                            </div>
                                        )}

                                        {/* Mode édition */}
                                        {editingDiagnostic && (
                                            <div className="bg-white rounded-2xl p-4 border-2 border-primary/20 space-y-4">
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Corriger si nécessaire</p>
                                                <div>
                                                    <p className="text-[11px] font-bold text-foreground mb-2">Type de peau</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {["normale", "sèche", "grasse", "mixte", "sensible"].map(t => (
                                                            <button type="button" key={t} onClick={() => setCorrectedSkinType(t)}
                                                                className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all ${correctedSkinType === t ? 'bg-primary text-white border-primary' : 'bg-muted/20 border-transparent text-foreground/60'}`}>
                                                                {t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-foreground mb-2">Préoccupations</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {["Acné", "Rides", "Taches", "Rougeurs", "Cernes", "Sécheresse", "Eczéma"].map(p => (
                                                            <button type="button" key={p}
                                                                onClick={() => setCorrectedProblems(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                                                                className={`py-1.5 px-3 rounded-full text-[10px] font-bold border transition-all ${correctedProblems.includes(p) ? 'bg-primary text-white border-primary' : 'bg-muted/10 border-border/40 text-foreground/60'}`}>
                                                                {p}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Observations */}
                                        {onboardingAnalysis.observations_libres && (
                                            <div className="bg-muted/5 rounded-2xl p-4 border border-border/20">
                                                <p className="text-[11px] text-foreground/70 leading-relaxed italic">{onboardingAnalysis.observations_libres}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                                        <p className="text-muted-foreground text-sm">Analyse non disponible</p>
                                        <p className="text-[11px] text-muted-foreground/60">Vous pourrez analyser votre peau depuis l'application</p>
                                    </div>
                                )}
                            </div>
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
                                    <div>
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">Votre essai est terminé</p>
                                        <h2 className="text-2xl font-display text-foreground leading-tight">Continuez à prendre soin de vous</h2>
                                    </div>
                                </div>

                                {/* Segmented Control — Annuel (-40%) left, Mensuel right */}
                                <div className="bg-muted/20 p-1.5 rounded-full flex mb-8 relative border border-border/40">
                                    <motion.div
                                        className="absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-full shadow-sm"
                                        animate={{ x: selectedPlan === 'monthly' ? '100%' : '0%' }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                    <button type="button" onClick={() => setSelectedPlan("yearly")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 relative ${selectedPlan === 'yearly' ? 'text-primary' : 'text-muted-foreground'}`}>
                                        <Badge className="absolute -top-3 -left-2 bg-primary text-primary-foreground text-[8px] px-2 py-0.5 border-none shadow-sm">{PLANS.yearly.badge}</Badge>
                                        Annuel
                                    </button>
                                    <button type="button" onClick={() => setSelectedPlan("monthly")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest z-10 transition-colors duration-300 ${selectedPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>Mensuel</button>
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
                                            <p className="text-[13px] text-muted-foreground italic tracking-tight leading-relaxed font-medium">{PLANS[selectedPlan].subtext}</p>
                                        </motion.div>
                                    </AnimatePresence>
                                </motion.div>

                                {/* Feature list matching Figma */}
                                <div className="space-y-4 mb-8">
                                    {[
                                        { label: "Accès illimité", desc: "Toutes les fonctionnalités sans restriction" },
                                        { label: "Sans engagement", desc: "Annulez à tout moment" },
                                        { label: "Conseils personnalisés", desc: "Adaptés à votre cycle, météo et routine" },
                                        { label: "Mémoire illimitée", desc: "Historique complet sans limite de temps" },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-4">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5"><Check size={11} strokeWidth={3} /></div>
                                            <div>
                                                <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                                                <p className="text-[11px] text-muted-foreground italic leading-tight">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3 pt-4">
                                    <Button
                                        type="submit"
                                        className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow hover:opacity-90 transition-all active:scale-[0.98]"
                                    >
                                        Passer premium
                                    </Button>
                                    <button
                                        type="submit"
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

                                        (step === 2 && (!age || !gender)) ||
                                        (step === 3 && !carnation) ||
                                        (step === 7 && skinGoals.length === 0) ||
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
