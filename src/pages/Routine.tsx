import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Search, Plus, Minus, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

type CatalogProduct = {
  id: string;
  product_name: string;
  brand: string;
  photo_url: string | null;
  product_type: string | null;
  user_id: string | null;
};

const Routine = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userProducts, setUserProducts] = useState<CatalogProduct[]>([]);
  const [catalogResults, setCatalogResults] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [productTypes, setProductTypes] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        (supabase as any)
          .from("user_products")
          .select("*")
          .eq("user_id", uid)
          .then(({ data }: any) => {
            if (data) setUserProducts(data);
          });
      }
    });

    (supabase as any)
      .from("user_products")
      .select("product_type")
      .is("user_id", null)
      .not("product_type", "is", null)
      .then(({ data }: any) => {
        if (data) {
          const types = Array.from(
            new Set(data.map((r: any) => r.product_type).filter(Boolean))
          ) as string[];
          setProductTypes(types.sort());
        }
      });
  }, []);

  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2 && !typeFilter) {
        setCatalogResults([]);
        return;
      }
      setIsSearching(true);
      try {
        let query = (supabase as any)
          .from("user_products")
          .select("*")
          .is("user_id", null);

        if (searchQuery.length >= 2) {
          query = query.or(
            `product_name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`
          );
        }
        if (typeFilter) {
          query = query.eq("product_type", typeFilter);
        }

        const { data, error } = await query.limit(8);
        if (!error && data) setCatalogResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter]);

  const addProductToRoutine = async (product: CatalogProduct) => {
    if (!userId) return;
    const alreadyAdded = userProducts.some(
      (p) => p.product_name === product.product_name && p.brand === product.brand
    );
    if (alreadyAdded) return;

    const { data, error } = await (supabase as any)
      .from("user_products")
      .insert({
        product_name: product.product_name,
        brand: product.brand,
        photo_url: product.photo_url,
        product_type: product.product_type,
        user_id: userId,
      })
      .select()
      .single();

    if (!error && data) {
      setUserProducts((prev) => [...prev, data]);
    }
  };

  const removeProductFromRoutine = async (productId: string) => {
    if (!userId) return;
    await (supabase as any)
      .from("user_products")
      .delete()
      .eq("id", productId)
      .eq("user_id", userId);
    setUserProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  return (
    <div className="min-h-screen pb-24 px-3 sm:px-5 pt-10 max-w-lg mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-display text-foreground leading-tight">Mes Produits</h1>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-2">Votre inventaire skincare</p>
      </div>

      <div className="space-y-8 flex flex-col">
        {/* Search + Filter Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-0 overflow-hidden order-1">
          <div className="p-4 sm:p-6 bg-background/50 border-b border-border/50">
            <h2 className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-4">Ajouter des produits</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chercher un produit ou marque..."
                className="pl-10 text-sm rounded-xl py-6 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Type filter pills */}
            {productTypes.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Filtrer par type</p>
                <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar -mx-1 px-1">
                  {productTypes.map((type) => {
                    const hasProductOfType = userProducts.some((p) => p.product_type === type);
                    const isSelected = typeFilter === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(isSelected ? null : type)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-semibold whitespace-nowrap shrink-0 ${hasProductOfType
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-card text-foreground/80 hover:bg-accent"
                          }`}
                      >
                        {type}
                        {hasProductOfType ? (
                          <Check size={12} />
                        ) : isSelected ? (
                          <X size={12} />
                        ) : (
                          <Plus size={12} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Catalog results */}
            {catalogResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                  {typeFilter && !searchQuery ? `Produits "${typeFilter}"` : "Résultats"}
                </p>
                <div className="grid gap-3">
                  {catalogResults.map((p) => {
                    const alreadyAdded = userProducts.some(
                      (u) => u.product_name === p.product_name && u.brand === p.brand
                    );
                    return (
                      <div
                        key={p.id}
                        className="flex flex-col gap-3 p-3 bg-card border border-border rounded-2xl transition-all hover:border-primary/30 shadow-sm sm:flex-row sm:items-center sm:gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-14 h-14 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
                            {p.photo_url ? (
                              <img src={p.photo_url} alt={p.product_name} className="w-full h-full object-contain" />
                            ) : (
                              <ImageOff size={18} className="text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="text-xs font-bold text-foreground break-words">{p.product_name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter break-words">{p.brand}</p>
                            {p.product_type && (
                              <p className="text-[10px] text-primary/70 mt-0.5 break-words">{p.product_type}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => addProductToRoutine(p)}
                          disabled={alreadyAdded}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 self-end sm:self-auto ml-auto sm:ml-0 ${alreadyAdded
                              ? "bg-primary/10 text-primary cursor-default"
                              : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                            }`}
                        >
                          {alreadyAdded ? <Check size={16} /> : <Plus size={16} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* My Products Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-card p-4 sm:p-8 order-2"
        >
          <p className="text-[10px] font-bold text-foreground/80 tracking-widest mb-6 uppercase">Mes Produits enregistrés</p>
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {userProducts.length > 0 ? (
                userProducts.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-border bg-background/40 hover:border-primary/30 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.product_name} className="w-full h-full object-contain" />
                        ) : (
                          <ImageOff size={14} className="text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{p.product_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tighter truncate">{p.brand}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeProductFromRoutine(p.id)}
                      className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm shrink-0"
                    >
                      <Minus size={16} />
                    </button>
                  </motion.div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-6 text-center">
                  Aucun produit dans votre inventaire pour le moment.
                </p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Routine;
