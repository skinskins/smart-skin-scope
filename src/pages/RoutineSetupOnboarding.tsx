import { motion } from "framer-motion";
import { Check, X, ArrowRight, Search, Plus, ImageOff } from "lucide-react";
import { useState, useEffect } from "react";
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
    const [dbProducts, setDbProducts] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const toggleSetupProduct = (p: string) => {
        if (setupTimeTab === "am") {
            setTempAmProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
        } else {
            setTempPmProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
        }
    };

    useEffect(() => {
        const searchProducts = async () => {
            if (customProductInput.length < 2) {
                setDbProducts([]);
                return;
            }

            setIsSearching(true);
            try {
                const { data, error } = await (supabase as any)
                    .from('user_products')
                    .select('*')
                    .or(`product_name.ilike.%${customProductInput}%,brand.ilike.%${customProductInput}%`)
                    .limit(6);

                if (!error && data) {
                    setDbProducts(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(searchProducts, 300);
        return () => clearTimeout(timer);
    }, [customProductInput]);

    const addCustomSetupProduct = () => {
        if (!customProductInput.trim()) return;
        const p = customProductInput.trim();
        if (setupTimeTab === "am" && !tempAmProducts.includes(p)) setTempAmProducts(prev => [...prev, p]);
        if (setupTimeTab === "pm" && !tempPmProducts.includes(p)) setTempPmProducts(prev => [...prev, p]);

        if (!ALL_PRODUCTS.includes(p) && !userCustomProducts.includes(p)) {
            setUserCustomProducts(prev => [...prev, p]);
        }

        setCustomProductInput("");
        setDbProducts([]);
    };

    const addProductFromDb = (pName: string, pBrand: string) => {
        const p = `${pBrand} - ${pName}`;
        if (setupTimeTab === "am" && !tempAmProducts.includes(p)) setTempAmProducts(prev => [...prev, p]);
        if (setupTimeTab === "pm" && !tempPmProducts.includes(p)) setTempPmProducts(prev => [...prev, p]);

        if (!userCustomProducts.includes(p)) {
            setUserCustomProducts(prev => [...prev, p]);
        }

        setCustomProductInput("");
        setDbProducts([]);
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
                await (supabase as any).from("profiles").update({
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

                    <div className="relative shrink-0 mt-4 mb-2">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            value={customProductInput} 
                            onChange={e => setCustomProductInput(e.target.value)} 
                            placeholder="Rechercher un produit ou marque..." 
                            className="pl-12 text-sm rounded-2xl py-7 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-inner" 
                            onKeyDown={e => { if (e.key === 'Enter') addCustomSetupProduct() }} 
                        />
                        {isSearching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pb-4">
                        {/* Search Results */}
                        {dbProducts.length > 0 && (
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Résultats trouvés</p>
                                <div className="grid gap-3">
                                    {dbProducts.map((p) => (
                                        <div key={p.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl group transition-all hover:border-primary/40 shadow-sm">
                                            <div className="w-16 h-16 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center border border-border/50">
                                                {p.photo_url ? (
                                                    <img src={p.photo_url} alt={p.product_name} className="w-full h-full object-contain transition-transform group-hover:scale-105" />
                                                ) : (
                                                    <ImageOff size={20} className="text-muted-foreground/40" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">{p.product_name}</p>
                                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider truncate mt-0.5">{p.brand}</p>
                                            </div>
                                            <button 
                                                onClick={() => addProductFromDb(p.product_name, p.brand)}
                                                className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all shrink-0 shadow-sm"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 px-1">Produits classiques</p>
                            <div className="grid gap-2.5">
                                {Array.from(new Set([...ALL_PRODUCTS, ...userCustomProducts])).map(p => {
                                    const isActive = setupTimeTab === "am" ? tempAmProducts.includes(p) : tempPmProducts.includes(p);
                                    const isCustom = !ALL_PRODUCTS.includes(p);
                                    return (
                                        <div key={p} className="flex gap-2">
                                            <button onClick={() => toggleSetupProduct(p)} className={`flex-1 flex justify-between items-center px-5 py-4 rounded-2xl border transition-all text-sm font-bold ${isActive ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border bg-card text-foreground/80 hover:bg-accent'}`}>
                                                {p}
                                                {isActive && <Check size={18} />}
                                            </button>
                                            {isCustom && (
                                                <button onClick={() => {
                                                    setUserCustomProducts(prev => prev.filter(x => x !== p));
                                                    setTempAmProducts(prev => prev.filter(x => x !== p));
                                                    setTempPmProducts(prev => prev.filter(x => x !== p));
                                                }} className="px-4 py-4 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 hover:bg-destructive/20 transition-colors">
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-3 pt-4 pb-6 bg-gradient-to-t from-background via-background to-transparent">
                        <button
                            onClick={saveRoutineConfig}
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-elevated flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                        >
                            {loading ? "Création..." : "Valider et voir ma Peau"} <ArrowRight size={18} />
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
