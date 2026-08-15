import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, User, CheckCircle2, ChevronRight, Weight, Calendar, HelpCircle, Briefcase, Share2, AlertCircle, Lock, Sparkles, Shield, Info, ArrowRight, Lightbulb, Activity, Droplets, Flame, Check, Clock, MapPin, Plus, X, Search, ImageOff, Scan, Camera } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { normalizeCarnation } from "@/utils/carnation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import matrixData from "@/data/skincare_matrix.json";
import StepProfilePhysical from "@/pages/signup/steps/StepProfilePhysical";
import StepConsent from "@/pages/signup/steps/StepConsent";
import StepFactors, { FACTOR_TAG_KEYS } from "@/pages/signup/steps/StepFactors";
import StepPhotoDiagnostic from "@/pages/signup/steps/StepPhotoDiagnostic";
import StepCarnation from "@/pages/signup/steps/StepCarnation";
import StepCycle from "@/pages/signup/steps/StepCycle";
import StepLocation from "@/pages/signup/steps/StepLocation";
import StepProducts from "@/pages/signup/steps/StepProducts";
import StepGoals from "@/pages/signup/steps/StepGoals";
import StepDiagnosticReview from "@/pages/signup/steps/StepDiagnosticReview";
import StepPricing from "@/pages/signup/steps/StepPricing";
import StepPricingExtended from "@/pages/signup/steps/StepPricingExtended";
import StepAccount from "@/pages/signup/steps/StepAccount";

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

    // Step 1.5: Consentement données (juste après Profil physique)
    const [personalizedRecommendationsConsent, setPersonalizedRecommendationsConsent] = useState(false);
    const [aiLearningConsent, setAiLearningConsent] = useState(false);
    const [productResearchConsent, setProductResearchConsent] = useState(false);

    // Step 3: Diagnostic peau + Objectifs
    const [skinType, setSkinType] = useState("");
    const [skinProblems, setSkinProblems] = useState<string[]>([]);
    const [skinGoals, setSkinGoals] = useState<string[]>([]);
    const [defaultFactors, setDefaultFactors] = useState<string[]>([]);
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
    const [cycleStatus, setCycleStatus] = useState<"unknown" | "none" | null>(null);

    // Step 5 — Location
    const [locationMode, setLocationMode] = useState<"geo" | "manual" | null>(null);
    const [manualCity, setManualCity] = useState("");
    const [geoLoading, setGeoLoading] = useState(false);

    // Step 6 — Produits (sélection locale, insert après création compte)
    const [productSearchQuery, setProductSearchQuery] = useState("");
    const [productCatalogResults, setProductCatalogResults] = useState<any[]>([]);
    const [selectedOnboardingProducts, setSelectedOnboardingProducts] = useState<any[]>([]);
    const [onboardingScanLoading, setOnboardingScanLoading] = useState(false);

    const handleOnboardingProductScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        setOnboardingScanLoading(true);
        setOnboardingScanMessage(null);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const { data, error } = await supabase.functions.invoke("product-scan", {
                body: { imageBase64: base64 },
            });
            if (error) {
                throw new Error(error.message ?? "Erreur scan");
            }
            if (data?.status === "unrecognized" || !data?.product_name) {
                setOnboardingScanMessage("Produit non reconnu — essaie une photo plus nette du packaging");
                setTimeout(() => setOnboardingScanMessage(null), 4000);
                return;
            }
            const scannedProduct = {
                id: `scan-${Date.now()}`,
                product_name: data.product_name,
                brand: data.brand ?? null,
                product_type: data.product_type ?? null,
                ingredients: data.ingredients ?? null,
                photo_url: data.photo_url ?? null,
            };
            setSelectedOnboardingProducts(prev => [...prev, scannedProduct]);
            setOnboardingScanMessage("Produit trouve et ajoute \u2713");
            setTimeout(() => setOnboardingScanMessage(null), 4000);
        } catch (err) {
            setOnboardingScanMessage("Erreur lors de l'identification du produit");
            setTimeout(() => setOnboardingScanMessage(null), 4000);
        } finally {
            setOnboardingScanLoading(false);
        }
    };
    const [onboardingScanMessage, setOnboardingScanMessage] = useState<string | null>(null);

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
        monthly: { id: "monthly_plan", price: "11,99€", period: "/mois", subtext: "Facturé mensuellement" },
        yearly: { id: "yearly_plan", price: "6,99€", period: "/mois", subtext: "71,88€ facturés une fois par an", badge: "-40%" }
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
            const { data, error } = await supabase.functions.invoke("product-search", {
                body: { query: productSearchQuery },
            });
            if (!error && data?.products) {
                setProductCatalogResults(
                    data.products.map((p: any, i: number) => ({
                        id: `search-${Date.now()}-${i}`,
                        product_name: p.product_name,
                        brand: p.brand,
                        photo_url: p.photo_url,
                        product_type: p.product_type,
                        ingredients: p.ingredients,
                    }))
                );
            } else {
                setProductCatalogResults([]);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [productSearchQuery]);


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
                if (showPreview) {
                    setShowPreview(false);
                    if (onboardingPhotoBase64) setShowDiagnostic(true);
                    else setStep(6);
                }
                else if (showDiagnostic) {
                    setShowDiagnostic(false);
                    setStep(6);
                }
                // Partie paiement désactivée temporairement (steps 8/9) : on revient directement à la preview.
                // else if (step === 10) {
                //     if (pricingMode === "free") setStep(8);
                //     else setStep(9);
                // }
                // else if (step === 9) setStep(8);
                // else if (step === 8) setShowPreview(true);
                else if (step === 10) setShowPreview(true);
                else if (step === 4) setStep(3.5);
                // Étape "Cycle menstruel" (step 4) non proposée aux utilisateurs Homme — on revient à l'étape Objectifs.
                else if (step === 5 && gender === "Homme") setStep(3.5);
                // Étape "Votre carnation" (step 3) sautée à l'aller si une photo a été prise — on la resaute au retour.
                else if (step === 3.5) setStep(onboardingPhotoBase64 ? 2 : 3);
                else if (step > 2) setStep(step - 1);
                else if (step === 2) setStep(1.8);
                else if (step === 1.8) setStep(1.5);
                else if (step === 1.5) setStep(1);
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

    const addDefaultFactor = (key: string) => {
        setDefaultFactors(prev => prev.includes(key) ? prev : [...prev, key]);
    };

    const removeDefaultFactor = (key: string) => {
        setDefaultFactors(prev => prev.filter(k => k !== key));
    };

    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 6 && !showDiagnostic && !showPreview) {
            if (onboardingPhotoBase64) {
                setShowDiagnostic(true);
            } else {
                setShowPreview(true);
            }
            window.scrollTo(0, 0);
            return;
        }
        if (showDiagnostic) {
            setShowDiagnostic(false);
            setShowPreview(true);
            window.scrollTo(0, 0);
            return;
        }
        if (showPreview) {
            setShowPreview(false);
            // Partie paiement désactivée temporairement : on saute directement les steps 8/9 (pricing).
            // setStep(8);
            setStep(10);
            window.scrollTo(0, 0);
            return;
        }

        // Partie paiement désactivée temporairement (step 8 = choix pricing free/premium).
        // if (step === 8) {
        //     if (pricingMode === "free") {
        //         setStep(10);
        //     } else {
        //         setStep(9);
        //     }
        //     window.scrollTo(0, 0);
        //     return;
        // }

        if (step === 1) {
            setStep(1.5);
            window.scrollTo(0, 0);
            return;
        }
        if (step === 1.5) {
            setStep(1.8);
            window.scrollTo(0, 0);
            return;
        }
        if (step === 1.8) {
            setStep(2);
            window.scrollTo(0, 0);
            return;
        }

        if (step < 10) {
            if (step === 2) {
                // Photo prise → le type de peau et la carnation seront déduits de l'analyse (étape diagnostic).
                // Photo passée → on demande le type de peau et la carnation manuellement (étape 3).
                setStep(onboardingPhotoBase64 ? 3.5 : 3);
            } else if (step === 3) {
                setStep(3.5);
            } else if (step === 3.5) {
                // Étape "Cycle menstruel" (step 4) non proposée aux utilisateurs Homme.
                setStep(gender === "Homme" ? 5 : 4);
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
                default_factors: defaultFactors.length > 0
                    ? Object.fromEntries(FACTOR_TAG_KEYS.map(key => [key, defaultFactors.includes(key)]))
                    : null,
                carnation: carnation || normalizeCarnation(onboardingAnalysis?.carnation_detectee) || null,
                last_period_date: lastPeriodDate || null,
                cycle_duration: cycleDuration,
                manual_location: locationMode === "manual" ? manualCity || null : null,
                personalized_recommendations_consent: personalizedRecommendationsConsent,
                ai_learning_consent: aiLearningConsent,
                product_research_consent: productResearchConsent,
            });

            if (selectedOnboardingProducts.length > 0) {
                await (supabase as any).from("user_products").insert(
                    selectedOnboardingProducts.map(p => ({
                        product_name: p.product_name,
                        brand: p.brand,
                        photo_url: p.photo_url,
                        product_type: p.product_type,
                        ingredients: p.ingredients ?? null,
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
            // La génération des conseils de la semaine est laissée au premier chargement du
            // Dashboard (fetchAdvice) plutôt que déclenchée ici en fire-and-forget : les deux
            // appels en parallèle (celui-ci + celui du Dashboard juste après la redirection)
            // passaient chacun le check "déjà généré ?" avant que l'autre ait inséré ses lignes,
            // doublant le nombre de conseils insérés pour la même semaine.
            localStorage.setItem("nacre_show_beta_welcome", "1");
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
                            <StepProfilePhysical
                                BackButton={BackButton}
                                age={age}
                                setAge={setAge}
                                gender={gender}
                                setGender={setGender}
                            />
                        )}

                        {step === 1.5 && (
                            <StepConsent
                                BackButton={BackButton}
                                personalizedRecommendationsConsent={personalizedRecommendationsConsent}
                                setPersonalizedRecommendationsConsent={setPersonalizedRecommendationsConsent}
                                aiLearningConsent={aiLearningConsent}
                                setAiLearningConsent={setAiLearningConsent}
                                productResearchConsent={productResearchConsent}
                                setProductResearchConsent={setProductResearchConsent}
                            />
                        )}

                        {step === 1.8 && (
                            <StepFactors
                                BackButton={BackButton}
                                defaultFactors={defaultFactors}
                                addDefaultFactor={addDefaultFactor}
                                removeDefaultFactor={removeDefaultFactor}
                            />
                        )}

                        {step === 2 && (
                            <StepPhotoDiagnostic
                                BackButton={BackButton}
                                age={age}
                                onboardingPhotoBase64={onboardingPhotoBase64}
                                setOnboardingPhotoBase64={setOnboardingPhotoBase64}
                                setAnalysisLoading={setAnalysisLoading}
                                setOnboardingAnalysis={setOnboardingAnalysis}
                                setCorrectedSkinType={setCorrectedSkinType}
                                setCorrectedProblems={setCorrectedProblems}
                            />
                        )}

                        {step === 3 && (
                            <StepCarnation
                                BackButton={BackButton}
                                carnation={carnation}
                                setCarnation={setCarnation}
                                skinType={skinType}
                                setSkinType={setSkinType}
                                skinProblems={skinProblems}
                                toggleProblem={toggleProblem}
                            />
                        )}

                        {step === 3.5 && (
                            <StepGoals
                                BackButton={BackButton}
                                skinGoals={skinGoals}
                                toggleGoal={toggleGoal}
                            />
                        )}

                        {step === 4 && (
                            <StepCycle
                                BackButton={BackButton}
                                lastPeriodDate={lastPeriodDate}
                                setLastPeriodDate={setLastPeriodDate}
                                cycleDuration={cycleDuration}
                                setCycleDuration={setCycleDuration}
                                cycleStatus={cycleStatus}
                                setCycleStatus={setCycleStatus}
                            />
                        )}

                        {step === 5 && (
                            <StepProducts
                                BackButton={BackButton}
                                productSearchQuery={productSearchQuery}
                                setProductSearchQuery={setProductSearchQuery}
                                productCatalogResults={productCatalogResults}
                                selectedOnboardingProducts={selectedOnboardingProducts}
                                onboardingScanLoading={onboardingScanLoading}
                                onboardingScanMessage={onboardingScanMessage}
                                handleOnboardingProductScan={handleOnboardingProductScan}
                                toggleOnboardingProduct={toggleOnboardingProduct}
                            />
                        )}

                        {step === 6 && !showDiagnostic && (
                            <StepLocation
                                BackButton={BackButton}
                                setLocationMode={setLocationMode}
                                locationMode={locationMode}
                                manualCity={manualCity}
                                setManualCity={setManualCity}
                                geoLoading={geoLoading}
                                setGeoLoading={setGeoLoading}
                            />
                        )}

                        {showDiagnostic && (
                            <StepDiagnosticReview
                                age={age}
                                onboardingPhotoBase64={onboardingPhotoBase64}
                                analysisLoading={analysisLoading}
                                onboardingAnalysis={onboardingAnalysis}
                                editingDiagnostic={editingDiagnostic}
                                setEditingDiagnostic={setEditingDiagnostic}
                                correctedSkinType={correctedSkinType}
                                setCorrectedSkinType={setCorrectedSkinType}
                                correctedProblems={correctedProblems}
                                setCorrectedProblems={setCorrectedProblems}
                                carnation={carnation}
                                setCarnation={setCarnation}
                            />
                        )}
                        {/* Partie paiement désactivée temporairement (steps 8/9) — conservée pour réactivation future.
                        {step === 8 && (
                            <StepPricing
                                BackButton={BackButton}
                                selectedPlan={selectedPlan}
                                setSelectedPlan={setSelectedPlan}
                                PLANS={PLANS}
                                setStep={setStep}
                            />
                        )}

                        {step === 9 && (
                            <StepPricingExtended
                                BackButton={BackButton}
                                selectedPlan={selectedPlan}
                                setSelectedPlan={setSelectedPlan}
                                PLANS={PLANS}
                            />
                        )}
                        */}

                        {step === 10 && (
                            <StepAccount
                                BackButton={BackButton}
                                firstName={firstName}
                                setFirstName={setFirstName}
                                lastName={lastName}
                                setLastName={setLastName}
                                email={email}
                                setEmail={setEmail}
                                password={password}
                                setPassword={setPassword}
                            />
                        )}

                        {step !== 8 && step !== 9 && (
                            <div className="fixed bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-md border-t border-border/40 z-20 flex flex-col gap-4">
                                {step === 2 && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="w-full text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                                    >
                                        Passer cette étape
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    disabled={
                                        (loading) ||

                                        (step === 1 && (!age || !gender)) ||
                                        (step === 1.5 && (!personalizedRecommendationsConsent || !aiLearningConsent)) ||
                                        (step === 3 && (!carnation || !skinType)) ||
                                        (step === 3.5 && skinGoals.length === 0) ||
                                        (step === 4 && !lastPeriodDate && !cycleStatus) ||
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
