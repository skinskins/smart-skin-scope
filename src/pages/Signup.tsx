import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, User, CheckCircle2, ChevronRight, Weight, Calendar, HelpCircle, Briefcase, Share2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

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

const Signup = () => {
    const navigate = useNavigate();

    // Step 1: Identifiants
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");

    // Step 2: Socio-pro et Canaux
    const [profession, setProfession] = useState("");
    const [usedChannels, setUsedChannels] = useState<string[]>([]);

    // Step 3: Âge et Poids et Sexe
    const [age, setAge] = useState("");
    const [weight, setWeight] = useState("");
    const [gender, setGender] = useState("");

    // Step 4: Type de peau et problemes
    const [skinType, setSkinType] = useState("");
    const [showHelp, setShowHelp] = useState(false);
    const [skinProblems, setSkinProblems] = useState<string[]>([]);
    const [otherChannel, setOtherChannel] = useState("");

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

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

    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 1) {
            if (!firstName || !lastName || !email) return;
            setStep(2);
        } else if (step === 2) {
            if (!profession || usedChannels.length === 0) return;
            if (usedChannels.includes("Autre") && !otherChannel) return;
            setStep(3);
        } else if (step === 3) {
            if (!age || !weight || !gender) return;
            setStep(4);
        } else if (step === 4) {

            setLoading(true);
            const guestProfileParams = {
                first_name: firstName,
                last_name: lastName,
                email,
                profession,
                used_channels: usedChannels.map(c => c === "Autre" ? `Autre: ${otherChannel}` : c),
                age: parseInt(age),
                weight: parseFloat(weight),
                gender,
                skin_type: skinType,
                skin_problems: skinProblems
            };

            try {
                // Tente d'enregistrer dans Supabase
                // @ts-ignore
                const { data, error } = await supabase
                    .from("guest_profiles")
                    .insert(guestProfileParams)
                    .select()
                    .single();

                if (error) {
                    console.error("Supabase insert error:", error);
                    // Silencieusement continue avec l'ID local si le DB n'est pas encore migré
                }

                // Save profile locally, and include Database ID if available
                const localProfile = {
                    ...guestProfileParams,
                    id: data?.id || crypto.randomUUID()
                };

                localStorage.setItem("guestProfile", JSON.stringify(localProfile));
                navigate("/checkin", { state: { isOnboarding: true, firstName } });
            } catch (err) {
                console.error("Unexpected error:", err);
                const localProfile = {
                    ...guestProfileParams,
                    id: crypto.randomUUID()
                };
                localStorage.setItem("guestProfile", JSON.stringify(localProfile));
                navigate("/checkin", { state: { isOnboarding: true, firstName } });
            }
        }
    };


    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/3" />

            <div className="p-6 relative z-10 flex items-center justify-between">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                        if (step > 1) setStep(step - 1);
                        else navigate("/onboarding");
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-muted/50 rounded-full"
                >
                    <ArrowLeft size={20} className="text-foreground" />
                </motion.button>
                <div className="text-sm font-semibold text-muted-foreground bg-muted pt-1 pb-1 px-3 rounded-full">
                    Étape {step} / 4
                </div>
            </div>

            <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col p-6 z-10 max-w-md mx-auto w-full pb-32"
            >
                <form onSubmit={handleNext} className="space-y-6 h-full flex flex-col">

                    {step === 1 && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Faisons connaissance</h1>
                                <p className="text-muted-foreground text-sm">Renseignez vos identifiants pour commencer.</p>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Prénom</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="text" placeholder="Votre prénom" required
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Nom de famille</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="text" placeholder="Votre nom" required
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="email" placeholder="vous@email.com" required
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Votre Profil Professionnel</h1>
                                <p className="text-muted-foreground text-sm">Ces informations sont récoltées uniquement à des fins informatives pour nous aider à mieux vous comprendre.</p>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Catégorie socio-professionnelle</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <select
                                            className="w-full pl-11 py-3 h-[52px] bg-card rounded-2xl border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-sm appearance-none"
                                            value={profession}
                                            onChange={(e) => setProfession(e.target.value)}
                                            required
                                        >
                                            <option value="" disabled className="text-muted-foreground">Sélectionner une catégorie</option>
                                            {professions.map(prof => (
                                                <option key={prof} value={prof}>{prof}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
                                        <Share2 size={16} /> Quels canaux (réseaux sociaux, etc.) utilisez-vous ?
                                    </label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {channels.map(ch => (
                                            <button type="button" key={ch} onClick={() => toggleChannel(ch)}
                                                className={`py-2 px-4 rounded-full text-xs font-semibold transition-all border ${usedChannels.includes(ch) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
                                                {ch}
                                            </button>
                                        ))}
                                    </div>
                                    <AnimatePresence>
                                        {usedChannels.includes("Autre") && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden">
                                                <Input
                                                    type="text"
                                                    placeholder="Veuillez préciser..."
                                                    value={otherChannel}
                                                    onChange={(e) => setOtherChannel(e.target.value)}
                                                    className="bg-card rounded-xl border-border/50 focus-visible:ring-primary/30"
                                                    required
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">À propos de vous</h1>
                                <p className="text-muted-foreground text-sm">Ces informations aident à personnaliser vos conseils santé.</p>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Âge</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="number" placeholder="Ex: 28" required min="10" max="120"
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={age} onChange={(e) => setAge(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Poids (en kg)</label>
                                    <div className="relative">
                                        <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                        <Input type="number" placeholder="Ex: 65" required min="30" max="300"
                                            className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                            value={weight} onChange={(e) => setWeight(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2 border-t border-border/50">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Sexe</label>
                                    <div className="flex gap-2">
                                        {["Femme", "Homme", "Autre"].map(g => (
                                            <button type="button" key={g} onClick={() => setGender(g)}
                                                className={`flex-1 py-3 px-2 rounded-2xl text-xs font-semibold transition-all border ${gender === g ? 'bg-primary text-primary-foreground border-primary shadow-elevated' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Votre Peau</h1>
                                <p className="text-muted-foreground text-sm">Sélectionnez le type qui vous correspond le plus.</p>
                            </div>
                            <div className="space-y-6 flex-1 overflow-y-auto pb-4 custom-scrollbar">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-semibold text-foreground">Type de Peau</label>
                                        <button type="button" onClick={() => setShowHelp(!showHelp)} className="text-xs flex items-center gap-1 text-primary hover:underline">
                                            <HelpCircle size={14} /> M'aider à choisir
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {showHelp && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-primary/5 p-4 rounded-xl text-sm text-muted-foreground border border-primary/20 space-y-2 overflow-hidden mb-4">
                                                <p><strong className="text-foreground">Sèche:</strong> Tiraille après le nettoyage, manque d'éclat, rugueuse.</p>
                                                <p><strong className="text-foreground">Grasse:</strong> Brille sur tout le visage, pores dilatés souvent visibles.</p>
                                                <p><strong className="text-foreground">Mixte:</strong> Grasse sur la zone T (front, nez, menton), sèche ou normale sur les joues.</p>
                                                <p><strong className="text-foreground">Sensible:</strong> Réagit vite (rougeurs, échauffements) aux produits ou changements de température.</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {["Sèche", "Grasse", "Mixte", "Normale", "Sensible"].map(type => (
                                            <button type="button" key={type} onClick={() => setSkinType(type)}
                                                className={`py-6 px-2 rounded-2xl text-sm font-semibold transition-all border ${skinType === type ? 'bg-primary text-primary-foreground border-primary shadow-elevated scale-[1.02]' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border/50">
                                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        Problèmes rencontrés
                                    </label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {["Acné", "Rougeurs", "Taches brunes", "Points noirs", "Déshydratation", "Rides fixes", "Cernes / Poches", "Eczéma", "Rosacée", "Sensibilité extrême"].map(prob => (
                                            <button type="button" key={prob} onClick={() => toggleProblem(prob)}
                                                className={`py-2 px-4 rounded-full text-xs font-semibold transition-all border ${skinProblems.includes(prob) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-foreground border-border/50 hover:bg-accent'}`}>
                                                {prob}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-20">
                        <button
                            type="submit"
                            disabled={
                                (loading) ||
                                (step === 2 && (!profession || usedChannels.length === 0 || (usedChannels.includes('Autre') && !otherChannel))) ||
                                (step === 4 && !skinType)
                            }
                            className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? "Enregistrement..." : step === 4 ? "Terminer" : "Suivant"} <ChevronRight size={18} />
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Signup;
