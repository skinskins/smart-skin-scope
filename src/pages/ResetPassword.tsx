import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas.");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        setLoading(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Votre mot de passe a été mis à jour avec succès !");
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-background p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />

            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate("/login")}
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
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-display font-bold text-foreground mb-3">Nouveau mot de passe</h1>
                    <p className="text-muted-foreground text-sm">Définissez un nouveau mot de passe pour sécuriser votre compte.</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="space-y-2 relative">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Nouveau mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Confirmer le mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-11 py-6 bg-card rounded-2xl border-transparent focus-visible:ring-primary/30 shadow-sm"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold shadow-elevated mt-4 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
