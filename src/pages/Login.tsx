import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Bon retour parmi nous !");

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            const profile = data as any;
            if (profile && profile.skin_goals && (profile.skin_goals as any).length > 0) {
                navigate("/checkin-advice");
            } else {
                navigate("/signup");
            }
        } else {
            navigate("/checkin-advice");
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            toast.error("Veuillez entrer votre email pour réinitialiser votre mot de passe.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        setLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Un email de réinitialisation vous a été envoyé.");
        }
    };

    return (
        <div className="min-h-screen bg-white p-6 flex flex-col relative overflow-hidden">
            {/* Header */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => navigate("/onboarding")}
                className="w-10 h-10 flex items-center justify-center border border-[#111111] mb-12 mt-4 z-10 relative"
            >
                <ArrowLeft size={18} className="text-[#111111]" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 flex flex-col justify-center z-10 max-w-sm mx-auto w-full"
            >
                <div className="mb-12 text-center">
                    <h1 className="text-3xl font-bold font-display text-[#111111] uppercase tracking-[0.05em] mb-4">LOG-IN</h1>
                    <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">Accès au protocole dermatologique personnel</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" size={16} />
                            <Input
                                type="email"
                                placeholder="EMAIL@EXAMPLE.COM"
                                className="pl-11 h-14 bg-white border border-[#111111] rounded-none focus-visible:ring-0 focus-visible:border-[#111111] font-bold text-xs uppercase tracking-tight"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] ml-1">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AAAAAA]" size={16} />
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-11 h-14 bg-white border border-[#111111] rounded-none focus-visible:ring-0 focus-visible:border-[#111111] font-bold text-xs uppercase tracking-tight"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={loading}
                            className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] hover:text-[#111111] disabled:opacity-50"
                        >
                            MOT DE PASSE OUBLIÉ ?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#111111] text-white h-14 font-bold uppercase tracking-[0.2em] mt-8 hover:bg-black transition-all disabled:opacity-50"
                    >
                        {loading ? "AUTHENTIFICATION..." : "ACCÉDER"}
                    </button>
                </form>

                <p className="text-center text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mt-auto pt-8">
                    PAS ENCORE DE COMPTE ?{" "}
                    <button onClick={() => navigate("/signup")} className="text-[#111111] border-b border-[#111111] ml-1">
                        CRÉER UN COMPTE
                    </button>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
