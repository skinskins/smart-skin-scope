import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Search, Plus, Minus, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

const ALL_PRODUCTS = ["Nettoyant", "Lotion Tonique", "Sérum", "Hydratant", "SPF 50", "Contour yeux", "Rétinol", "Masque", "Huile de soin", "Exfoliant AHA/BHA", "Traitement local"];

const Routine = () => {
  const [baseAmProducts, setBaseAmProducts] = useState<string[]>(() => {
    const saved = localStorage.getItem("local_am_routine");
    return saved ? JSON.parse(saved) : ["Nettoyant", "Hydratant", "SPF 50"];
  });
  const [basePmProducts, setBasePmProducts] = useState<string[]>(() => {
    const saved = localStorage.getItem("local_pm_routine");
    return saved ? JSON.parse(saved) : ["Nettoyant", "Hydratant"];
  });

  const [customProductInput, setCustomProductInput] = useState("");
  const [productTime, setProductTime] = useState<"am" | "pm">("am");
  const [userCustomProducts, setUserCustomProducts] = useState<string[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // @ts-ignore
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data, error }) => {
            if (data && !error) {
              const profile = data as any;
              if (profile.am_routine && Array.isArray(profile.am_routine)) setBaseAmProducts(profile.am_routine);
              if (profile.pm_routine && Array.isArray(profile.pm_routine)) setBasePmProducts(profile.pm_routine);

              const allUserRoutines = [...(profile.am_routine || []), ...(profile.pm_routine || [])];
              setUserCustomProducts(allUserRoutines.filter((p: string) => !ALL_PRODUCTS.includes(p)));
            }
          });
      }
    });
  }, []);

  useEffect(() => {
    const searchProducts = async () => {
      if (customProductInput.length < 2) {
        setDbProducts([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
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

  const currentProducts = productTime === "am" ? baseAmProducts : basePmProducts;

  const syncBaselineToSupabase = async (am: string[], pm: string[]) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        // @ts-ignore
        await supabase.from("profiles").update({
          am_routine: am,
          pm_routine: pm
        }).eq("id", sessionData.session.user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleBaselineProduct = (p: string) => {
    if (productTime === "am") {
      const newList = baseAmProducts.includes(p) ? baseAmProducts.filter(x => x !== p) : [...baseAmProducts, p];
      setBaseAmProducts(newList);
      localStorage.setItem("local_am_routine", JSON.stringify(newList));
      syncBaselineToSupabase(newList, basePmProducts);
    } else {
      const newList = basePmProducts.includes(p) ? basePmProducts.filter(x => x !== p) : [...basePmProducts, p];
      setBasePmProducts(newList);
      localStorage.setItem("local_pm_routine", JSON.stringify(newList));
      syncBaselineToSupabase(baseAmProducts, newList);
    }
  };

  const addCustomBaselineProduct = () => {
    if (!customProductInput.trim()) return;
    const p = customProductInput.trim();
    
    if (productTime === "am") {
      if (!baseAmProducts.includes(p)) {
        const newList = [...baseAmProducts, p];
        setBaseAmProducts(newList);
        localStorage.setItem("local_am_routine", JSON.stringify(newList));
        syncBaselineToSupabase(newList, basePmProducts);
      }
    } else {
      if (!basePmProducts.includes(p)) {
        const newList = [...basePmProducts, p];
        setBasePmProducts(newList);
        localStorage.setItem("local_pm_routine", JSON.stringify(newList));
        syncBaselineToSupabase(baseAmProducts, newList);
      }
    }

    if (!ALL_PRODUCTS.includes(p) && !userCustomProducts.includes(p)) {
      setUserCustomProducts(prev => [...prev, p]);
    }

    setCustomProductInput("");
    setDbProducts([]);
  };

  const addBaselineProductFromDb = (pName: string, pBrand: string) => {
    const p = `${pBrand} - ${pName}`;
    
    if (productTime === "am") {
      if (!baseAmProducts.includes(p)) {
        const newList = [...baseAmProducts, p];
        setBaseAmProducts(newList);
        localStorage.setItem("local_am_routine", JSON.stringify(newList));
        syncBaselineToSupabase(newList, basePmProducts);
      }
    } else {
      if (!basePmProducts.includes(p)) {
        const newList = [...basePmProducts, p];
        setBasePmProducts(newList);
        localStorage.setItem("local_pm_routine", JSON.stringify(newList));
        syncBaselineToSupabase(baseAmProducts, newList);
      }
    }

    if (!userCustomProducts.includes(p)) {
      setUserCustomProducts(prev => [...prev, p]);
    }

    setCustomProductInput("");
    setDbProducts([]);
  };

  return (
    <div className="min-h-screen pb-24 px-5 pt-10 max-w-lg mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-display text-foreground leading-tight">Ma Routine</h1>
      </div>

      {/* Global AM/PM Toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-muted/40 rounded-full p-1 border border-border/20">
          <button onClick={() => setProductTime("am")}
            className={`px-8 py-2 rounded-full text-xs font-bold transition-all ${productTime === "am" ? 'bg-primary text-primary-foreground premium-shadow' : 'text-muted-foreground hover:text-foreground'}`}>
            Matin
          </button>
          <button onClick={() => setProductTime("pm")}
            className={`px-8 py-2 rounded-full text-xs font-bold transition-all ${productTime === "pm" ? 'bg-primary text-primary-foreground premium-shadow' : 'text-muted-foreground hover:text-foreground'}`}>
            Soir
          </button>
        </div>
      </div>

      <div className="space-y-8 flex flex-col">
        {/* Configuration Section (Top) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-0 overflow-hidden order-1">
          <div className="p-6 bg-background/50 border-b border-border/50">
            <h2 className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-4">Ajouter des produits</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                value={customProductInput} 
                onChange={e => setCustomProductInput(e.target.value)} 
                placeholder="Chercher un produit ou marque..." 
                className="pl-10 text-sm rounded-xl py-6 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary" 
                onKeyDown={e => { if (e.key === 'Enter') addCustomBaselineProduct() }} 
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Search Results */}
            {dbProducts.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Résultats</p>
                <div className="grid gap-3">
                  {dbProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl group transition-all hover:border-primary/30 shadow-sm">
                      <div className="w-14 h-14 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center border border-border/50">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.product_name} className="w-full h-full object-contain" />
                        ) : (
                          <ImageOff size={18} className="text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{p.product_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tighter truncate">{p.brand}</p>
                      </div>
                      <button 
                        onClick={() => addBaselineProductFromDb(p.product_name, p.brand)}
                        className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generic Categories (Horizontal Scroll) */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Produits classiques</p>
              <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar -mx-1 px-1">
                {Array.from(new Set([...ALL_PRODUCTS, ...userCustomProducts])).map(p => {
                  const isActive = productTime === "am" ? baseAmProducts.includes(p) : basePmProducts.includes(p);
                  return (
                    <div key={p} className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => toggleBaselineProduct(p)} 
                        className={`flex items-center gap-2 px-5 py-3 rounded-full border transition-all text-xs font-semibold whitespace-nowrap ${isActive ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border bg-card text-foreground/80 hover:bg-accent'}`}
                      >
                        {p}
                        {isActive ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* My Routine Section (Bottom) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="premium-card p-8 order-2">
          <p className="text-[10px] font-bold text-foreground/80 tracking-widest mb-6 uppercase">Ma Routine {productTime === "am" ? "du matin" : "du soir"}</p>
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {currentProducts.length > 0 ? (
                currentProducts.map((p) =>
                  <motion.div 
                    key={p} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 10 }}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-semibold border border-border bg-background/40 hover:border-primary/30 transition-all shadow-sm"
                  >
                    <span className="text-foreground/90">{p}</span>
                    <button 
                      onClick={() => toggleBaselineProduct(p)}
                      className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm"
                    >
                      <Minus size={16} />
                    </button>
                  </motion.div>
                )
              ) : (
                <p className="text-xs text-muted-foreground italic py-6 text-center">Aucun produit dans votre routine pour le moment.</p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Routine;
