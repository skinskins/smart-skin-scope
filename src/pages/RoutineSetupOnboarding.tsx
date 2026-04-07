import { motion } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const ALL_PRODUCTS = [
    "Nettoyant", "Lotion Tonique", "Sérum", "Hydratant", "SPF 50",
    "Contour yeux", "Rétinol", "Masque", "Huile de soin",
    "Exfoliant AHA/BHA", "Traitement local"
];

const RoutineSetupOnboarding = () => {
    const navigate = useNavigate();
    const [setupTimeTab, setSetupTimeTab] = useState<"am" | "pm">("am");
    const [tempAmProducts, setTempAmProducts] = useState<string[]>([]);
    const [tempPmProducts, setTempPmProducts] = useState<string[]>([]);
    const [customProductInput, setCustomProductInput] = useState("");
    const [userCustomProducts, setUserCustomProducts] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const toggleSetupProduct = (p: string) => {
        if (setupTimeTab === "am") {
            setTempAmProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
        } else {
            setTempPmProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
        }
    };

    const addCustomSetupProduct = () => {
        if (!customProductInput.trim()) return;
        const p = customProductInput.trim();
        if (setupTimeTab === "am" && !tempAmProducts.includes(p)) setTempAmProducts(prev => [...prev, p]);
        if (setupTimeTab === "pm" && !tempPmProducts.includes(p)) setTempPmProducts(prev => [...prev, p]);

        if (!ALL_PRODUCTS.includes(p) && !userCustomProducts.includes(p)) {
            setUserCustomProducts(prev => [...prev, p]);
        }

        setCustomProductInput("");
    };

    const handleSkip = () => {
        navigate("/");
    };

    const saveRoutineConfig = async () => {
        setLoading(true);

        localStorage.setItem("local_am_routine", JSON.stringify(tempAmProducts));
        localStorage.setItem("local_pm_routine", JSON.stringify(tempPmProducts));

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
                // @ts-ignore
                await supabase.from("profiles").update({
                    am_routine: tempAmProducts,
                    pm_routine: tempPmProducts
                }).eq("id", sessionData.session.user.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 flex flex-col relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-[10%] left-[-20%] w-72 h-72 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex-1 flex flex-col max-w-sm mx-auto w-full z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 flex-1 flex flex-col pt-8"
                >
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-3 leading-tight">Votre Routine</h1>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Quels produits utilisez-vous habituellement ? Configurez votre routine une seule fois pour y avoir accès sur votre tableau de bord tous les jours !
                        </p>
                    </div>

                    <div className="flex bg-muted rounded-xl p-1 shrink-0">
                        <button onClick={() => setSetupTimeTab("am")}
                            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${setupTimeTab === "am" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                            ☀️ Matin
                        </button>
                        <button onClick={() => setSetupTimeTab("pm")}
                            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${setupTimeTab === "pm" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                            🌙 Soir
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 space-y-5 pb-4">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Produits classiques</p>
                            <div className="flex flex-col gap-2">
                                {Array.from(new Set([...ALL_PRODUCTS, ...userCustomProducts])).map(p => {
                                    const isActive = setupTimeTab === "am" ? tempAmProducts.includes(p) : tempPmProducts.includes(p);
                                    const isCustom = !ALL_PRODUCTS.includes(p);
                                    return (
                                        <div key={p} className="flex gap-2">
                                            <button onClick={() => toggleSetupProduct(p)} className={`flex-1 flex justify-between items-center px-4 py-3.5 rounded-xl border transition-all text-sm font-semibold ${isActive ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border bg-card text-foreground hover:bg-accent'}`}>
                                                {p}
                                                {isActive && <Check size={16} />}
                                            </button>
                                            {isCustom && (
                                                <button onClick={() => {
                                                    setUserCustomProducts(prev => prev.filter(x => x !== p));
                                                    setTempAmProducts(prev => prev.filter(x => x !== p));
                                                    setTempPmProducts(prev => prev.filter(x => x !== p));
                                                }} className="px-4 py-3.5 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 hover:bg-destructive/20 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-4">Je ne trouve pas mon produit</p>
                            <div className="flex gap-2">
                                <Input value={customProductInput} onChange={e => setCustomProductInput(e.target.value)} placeholder="Ex: Crème hydratante La Roche Posay" className="text-sm rounded-xl py-6" onKeyDown={e => { if (e.key === 'Enter') addCustomSetupProduct() }} />
                                <button onClick={addCustomSetupProduct} className="bg-primary/20 text-primary px-5 rounded-xl text-sm font-bold hover:bg-primary/30 transition-all">
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-3 pt-4 pb-6 bg-gradient-to-t from-background via-background to-transparent">
                        <button
                            onClick={saveRoutineConfig}
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-elevated flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                        >
                            {loading ? "Création..." : "Valider et Voir ma Peau"} <ArrowRight size={18} />
                        </button>
                        <button
                            onClick={handleSkip}
                            className="w-full text-muted-foreground py-3 rounded-2xl font-medium text-sm hover:bg-muted/50 transition-colors"
                        >
                            Je ferai ça plus tard
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default RoutineSetupOnboarding;
