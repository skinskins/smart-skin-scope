import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Search, Plus, Minus, ImageOff, Scan } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CatalogProduct = {
  id: string;
  product_name: string;
  brand: string;
  photo_url: string | null;
  product_type: string | null;
  user_id: string | null;
};

type RoutineProduct = {
  id: string;
  product_name: string;
  brand: string;
  photo_url: string | null;
  morning_use: boolean | null;
  evening_use: boolean | null;
  frequency: string | null;
};

const Vanity = () => {
  const [activeMainTab, setActiveMainTab] = useState<"routines" | "produits">("routines");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const [removeModalProduct, setRemoveModalProduct] = useState<CatalogProduct | null>(null);
  const [removeReason, setRemoveReason] = useState<string | null>(null);
  const [activeRoutineTab, setActiveRoutineTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [routineProducts, setRoutineProducts] = useState<RoutineProduct[]>([]);
  const [checkedRoutineProducts, setCheckedRoutineProducts] = useState<Set<string>>(new Set());
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
    if (!userId) return;
    (supabase as any)
      .from("user_products")
      .select("id, product_name, brand, photo_url, morning_use, evening_use, frequency")
      .eq("user_id", userId)
      .eq("is_active", true)
      .then(({ data }: any) => {
        if (data) setRoutineProducts(data);
      });
  }, [userId]);

  const dailyProducts   = routineProducts.filter(p => p.frequency === "daily");
  const weeklyProducts  = routineProducts.filter(p => p.frequency === "weekly");
  const monthlyProducts = routineProducts.filter(p => p.frequency === "monthly");
  const morningProducts = dailyProducts.filter(p => p.morning_use);
  const eveningProducts = dailyProducts.filter(p => p.evening_use);

  const toggleRoutineProduct = (id: string) => {
    setCheckedRoutineProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ProductRow = ({ product }: { product: RoutineProduct }) => {
    const isChecked = checkedRoutineProducts.has(product.id);
    return (
      <button
        onClick={() => toggleRoutineProduct(product.id)}
        className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted/10 transition-all text-left"
      >
        <div className="w-10 h-10 bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
          {product.photo_url ? (
            <img src={product.photo_url} alt={product.product_name} className="w-full h-full object-contain" />
          ) : (
            <ImageOff size={14} className="text-muted-foreground/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium transition-all ${isChecked ? "line-through text-muted-foreground/50" : "text-foreground"}`}>
            {product.product_name}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{product.brand}</p>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isChecked ? "bg-primary border-primary" : "border-border/60"
        }`}>
          {isChecked && <Check size={12} strokeWidth={3} className="text-white" />}
        </div>
      </button>
    );
  };

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
        morning_use: true,
        evening_use: true,
      })
      .select()
      .single();

    if (!error && data) {
      setUserProducts((prev) => [...prev, data]);
    }
  };

  const processBarcode = async (barcode: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const uid = session.user.id;

    const { data: catalogProduct } = await (supabase as any)
      .from("user_products")
      .select("*")
      .is("user_id", null)
      .eq("barcode", barcode)
      .maybeSingle();

    let inserted: any;
    if (catalogProduct) {
      const { data } = await (supabase as any).from("user_products").insert({
        product_name: catalogProduct.product_name,
        brand: catalogProduct.brand,
        photo_url: catalogProduct.photo_url,
        product_type: catalogProduct.product_type,
        user_id: uid,
        barcode,
        status: "pending",
      }).select().single();
      inserted = data;
      setScanMessage("Produit ajouté — en attente de validation ✓");
    } else {
      const { data } = await (supabase as any).from("user_products").insert({
        product_name: "En attente de validation",
        user_id: uid,
        barcode,
        status: "pending",
      }).select().single();
      inserted = data;
      setScanMessage("Produit non reconnu — il sera vérifié avant d'être ajouté");
    }
    if (inserted) setUserProducts(prev => [...prev, inserted]);
    setTimeout(() => setScanMessage(null), 4000);
  };

  useEffect(() => {
    if (!scannerOpen) return;
    let scanner: any;
    const init = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 120 } },
        async (code: string) => {
          await scanner.stop().catch(() => {});
          scannerRef.current = null;
          setScannerOpen(false);
          await processBarcode(code);
        },
        undefined
      );
    };
    init().catch(() => setScannerOpen(false));
    return () => { scannerRef.current?.stop().catch(() => {}); };
  }, [scannerOpen]);

  const confirmRemove = async () => {
    if (!removeModalProduct || !removeReason || !userId) return;
    const today = new Date().toISOString().split("T")[0];
    await (supabase as any)
      .from("user_products")
      .update({ is_active: false, removed_reason: removeReason, removed_at: today })
      .eq("id", removeModalProduct.id)
      .eq("user_id", userId);
    setUserProducts(prev => prev.filter(p => p.id !== removeModalProduct.id));
    setRemoveModalProduct(null);
    setRemoveReason(null);
  };

  return (
    <div className="min-h-screen pb-24 px-5 pt-10 max-w-lg mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-display text-foreground leading-tight">Vanity</h1>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-2">Votre espace skincare</p>
      </div>

      <div className="flex gap-2 mb-8">
        {(["routines", "produits"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveMainTab(tab)}
            className={`flex-1 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
              activeMainTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-border/40 text-muted-foreground"
            }`}
          >
            {tab === "routines" ? "Routines" : "Mes produits"}
          </button>
        ))}
      </div>

      {activeMainTab === "produits" ? (
      <div className="space-y-8 flex flex-col">
        {/* Search + Filter Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-0 overflow-hidden order-1">
          <div className="p-6 bg-background/50 border-b border-border/50">
            <h2 className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-4">Ajouter des produits</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
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
              <button
                onClick={() => setScannerOpen(true)}
                className="w-12 h-12 rounded-xl bg-muted/20 flex items-center justify-center text-foreground/60 hover:bg-muted/40 transition-colors flex-shrink-0 self-center"
              >
                <Scan size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-semibold whitespace-nowrap shrink-0 ${
                          hasProductOfType
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
                        className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl transition-all hover:border-primary/30 shadow-sm"
                      >
                        <div className="w-14 h-14 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt={p.product_name} className="w-full h-full object-contain" />
                          ) : (
                            <ImageOff size={18} className="text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{p.product_name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-tighter truncate">{p.brand}</p>
                          {p.product_type && (
                            <p className="text-[10px] text-primary/70 mt-0.5 truncate">{p.product_type}</p>
                          )}
                        </div>
                        <button
                          onClick={() => addProductToRoutine(p)}
                          disabled={alreadyAdded}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            alreadyAdded
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
          className="premium-card p-8 order-2"
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
                      onClick={() => { setRemoveModalProduct(p); setRemoveReason(null); }}
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
      ) : (
        <div>
          {/* Sous-onglets */}
          <div className="flex gap-2 mb-6">
            {([
              { key: "daily",   label: "Quotidienne"  },
              { key: "weekly",  label: "Hebdomadaire" },
              { key: "monthly", label: "Mensuelle"    },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveRoutineTab(key)}
                className={`flex-1 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeRoutineTab === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-white border border-border/40 text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contenu */}
          {activeRoutineTab === "daily" ? (
            <div className="space-y-6">
              {morningProducts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Matin</p>
                  <div className="premium-card p-4 space-y-1">
                    {morningProducts.map(p => <ProductRow key={p.id} product={p} />)}
                  </div>
                </div>
              )}
              {eveningProducts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Soir</p>
                  <div className="premium-card p-4 space-y-1">
                    {eveningProducts.map(p => <ProductRow key={p.id} product={p} />)}
                  </div>
                </div>
              )}
              {morningProducts.length === 0 && eveningProducts.length === 0 && (
                <p className="text-center py-12 text-sm text-muted-foreground italic">
                  Aucun produit dans votre routine quotidienne
                </p>
              )}
            </div>
          ) : (
            <div className="premium-card p-4 space-y-1">
              {(activeRoutineTab === "weekly" ? weeklyProducts : monthlyProducts).length === 0 ? (
                <p className="text-center py-12 text-sm text-muted-foreground italic">
                  Aucun produit dans cette routine
                </p>
              ) : (
                (activeRoutineTab === "weekly" ? weeklyProducts : monthlyProducts).map(p => (
                  <ProductRow key={p.id} product={p} />
                ))
              )}
            </div>
          )}
        </div>
      )}
      {/* Modale suppression */}
      <Dialog
        open={!!removeModalProduct}
        onOpenChange={(open) => { if (!open) { setRemoveModalProduct(null); setRemoveReason(null); } }}
      >
        <DialogContent className="max-w-sm rounded-[32px] border-none premium-shadow p-8">
          <DialogHeader className="mb-6">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              {removeModalProduct?.brand}
            </p>
            <DialogTitle className="text-xl font-display text-foreground">
              {removeModalProduct?.product_name}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm font-bold text-foreground mb-4">Pourquoi retirer ce produit ?</p>

          <div className="space-y-3 mb-8">
            {[
              { value: "terminé",           label: "Mon produit est terminé",       sub: "Je pourrai le rajouter plus tard" },
              { value: "mauvaise_réaction",  label: "J'ai eu une mauvaise réaction", sub: "On notera les ingrédients à éviter" },
              { value: "plus_utilisé",       label: "Je ne l'utilise plus",          sub: "Il restera dans votre historique" },
            ].map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setRemoveReason(value)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  removeReason === value
                    ? "border-primary bg-primary/5"
                    : "border-border/40 bg-background/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                    removeReason === value ? "border-primary bg-primary" : "border-border"
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{sub}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={confirmRemove}
              disabled={!removeReason}
              className="w-full h-12 bg-destructive text-white rounded-full font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Retirer le produit
            </button>
            <button
              onClick={() => { setRemoveModalProduct(null); setRemoveReason(null); }}
              className="w-full h-12 text-muted-foreground text-sm font-medium"
            >
              Annuler
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scanner overlay */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6">
          <p className="text-white text-sm font-medium tracking-wide">Scannez un code-barres</p>
          <div id="qr-reader" className="w-72 rounded-2xl overflow-hidden" />
          <button
            onClick={() => setScannerOpen(false)}
            className="text-white/60 text-sm hover:text-white transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Toast scan */}
      {scanMessage && (
        <div className="fixed bottom-28 left-4 right-4 max-w-sm mx-auto bg-foreground text-background text-sm rounded-2xl px-4 py-3 text-center z-40">
          {scanMessage}
        </div>
      )}

    </div>
  );
};

export default Vanity;
