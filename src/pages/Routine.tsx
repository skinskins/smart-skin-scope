import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Search, Plus, Minus, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

const ALL_PRODUCTS = ["Nettoyant", "Lotion Tonique", "Sérum", "Hydratant", "SPF 50", "Contour yeux", "Rétinol", "Masque", "Huile de soin", "Exfoliant AHA/BHA", "Traitement local"];

const Routine = () => {
  const [userProducts, setUserProducts] = useState<string[]>(() => {
    const am = localStorage.getItem("local_am_routine");
    const pm = localStorage.getItem("local_pm_routine");
    const amList = am ? JSON.parse(am) : ["Nettoyant", "Hydratant", "SPF 50"];
    const pmList = pm ? JSON.parse(pm) : ["Nettoyant", "Hydratant"];
    return Array.from(new Set([...amList, ...pmList]));
  });
  
  const [customProductInput, setCustomProductInput] = useState("");
  const [userCustomProducts, setUserCustomProducts] = useState<string[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // @ts-ignore
        (supabase as any).from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data, error }) => {
            if (data && !error) {
              const profile = data as any;
              const am = profile.am_routine || [];
              const pm = profile.pm_routine || [];
              const combined = Array.from(new Set([...am, ...pm]));
              setUserProducts(combined);

              setUserCustomProducts(combined.filter((p: string) => !ALL_PRODUCTS.includes(p)));
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

  const syncProductsToSupabase = async (products: string[]) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        // @ts-ignore
        await (supabase as any).from("profiles").update({
          am_routine: products,
          pm_routine: products // Syncing both for now to avoid breaking other parts of the app
        }).eq("id", sessionData.session.user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleProduct = (p: string) => {
    const newList = userProducts.includes(p) ? userProducts.filter(x => x !== p) : [...userProducts, p];
    setUserProducts(newList);
    localStorage.setItem("local_am_routine", JSON.stringify(newList));
    localStorage.setItem("local_pm_routine", JSON.stringify(newList));
    syncProductsToSupabase(newList);
  };

  const addCustomProduct = () => {
    if (!customProductInput.trim()) return;
    const p = customProductInput.trim();
    
    if (!userProducts.includes(p)) {
      const newList = [...userProducts, p];
      setUserProducts(newList);
      localStorage.setItem("local_am_routine", JSON.stringify(newList));
      localStorage.setItem("local_pm_routine", JSON.stringify(newList));
      syncProductsToSupabase(newList);
    }

    if (!ALL_PRODUCTS.includes(p) && !userCustomProducts.includes(p)) {
      setUserCustomProducts(prev => [...prev, p]);
    }

    setCustomProductInput("");
    setDbProducts([]);
  };

  const addProductFromDb = (pName: string, pBrand: string) => {
    const p = `${pBrand} - ${pName}`;
    
    if (!userProducts.includes(p)) {
      const newList = [...userProducts, p];
      setUserProducts(newList);
      localStorage.setItem("local_am_routine", JSON.stringify(newList));
      localStorage.setItem("local_pm_routine", JSON.stringify(newList));
      syncProductsToSupabase(newList);
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
        <h1 className="text-3xl font-display text-foreground leading-tight">Mes Produits</h1>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-2">Votre inventaire skincare</p>
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
                onKeyDown={e => { if (e.key === 'Enter') addCustomProduct() }} 
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
                        onClick={() => addProductFromDb(p.product_name, p.brand)}
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
                  const isActive = userProducts.includes(p);
                  return (
                    <div key={p} className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => toggleProduct(p)} 
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
          <p className="text-[10px] font-bold text-foreground/80 tracking-widest mb-6 uppercase">Mes Produits enregistrés</p>
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {userProducts.length > 0 ? (
                userProducts.map((p) =>
                  <motion.div 
                    key={p} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 10 }}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-semibold border border-border bg-background/40 hover:border-primary/30 transition-all shadow-sm"
                  >
                    <span className="text-foreground/90">{p}</span>
                    <button 
                      onClick={() => toggleProduct(p)}
                      className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm"
                    >
                      <Minus size={16} />
                    </button>
                  </motion.div>
                )
              ) : (
                <p className="text-xs text-muted-foreground italic py-6 text-center">Aucun produit dans votre inventaire pour le moment.</p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Routine;
