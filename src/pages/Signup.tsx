import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, User, CheckCircle2, CalendarHeart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Signup = () => {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [age, setAge] = useState("");
    const [skinType, setSkinType] = useState("Mixte");
    const [step, setStep] = useState(1); // 1 = Info, 2 = Success
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: name,
                    age: parseInt(age) || null,
                    skin_type: skinType
                }
            }
        });

        setLoading(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        setStep(2);
        setTimeout(() => {
            navigate("/checkin");
        }, 2500);
    };

    if (step === 2) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2" />

                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="bg-card p-8 rounded-3xl shadow-card z-10 flex flex-col items-center text-center max-w-sm w-full"
                >
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-foreground mb-2">Compte créé !</h2>
                    <p className="text-muted-foreground text-sm">Bienvenue, {name || "Utilisateur"}. Votre profil analyse peau a été initialisé.</p>

                    <div className="mt-8 relative w-full h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2.2, ease: "linear" }}
                            className="absolute top-0 left-0 bottom-0 bg-primary"
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">Redirection...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 flex flex-col relative overflow-hidden">
            {/* Decorative Blur Backgrounds */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/3" />

            {/* Header */}
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate("/onboarding")}
                className="w-10 h-10 flex items-center justify-center bg-muted/50 rounded-full mb-8 mt-2 z-10 relative"
            >
                <ArrowLeft size={20} className="text-foreground" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 flex flex-col justify-center z-10 max-w-sm mx-auto w-full"
            >
                <div className="mb-10">
                    <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Créons votre profil</h1>
                    <p className="text-muted-foreground text-sm">Renseignez vos informations pour bénéficier de conseils personnalisés.</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-2 relative">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Prénom</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                            <Input
                                type="text"
                                placeholder="Votre prénom"
                                className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="space-y-2 relative flex-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Âge</label>
                            <div className="relative">
                                <CalendarHeart className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                                <Input type="number" placeholder="ex: 28" min={12} max={120} className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm" value={age} onChange={(e) => setAge(e.target.value)} required />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                            <Input
                                type="email"
                                placeholder="vous@email.com"
                                className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                            <Input
                                type="password"
                                placeholder="Créer un mot de passe"
                                className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground ml-1 mt-1">8 caractères minimum</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated mt-6 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? "Création en cours..." : "Créer mon compte"}
                    </button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-auto pt-8">
                    Déjà un compte ?{" "}
                    <button onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline">
                        Se connecter
                    </button>
                </p>
            </motion.div>
        </div>
    );
};

export default Signup;
