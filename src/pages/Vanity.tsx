import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Search, Plus, Trash2, SlidersHorizontal, Scan, FileUp } from "lucide-react";
import { ProductPhoto } from "@/components/ProductPhoto";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { useRoutineProducts } from "@/hooks/useRoutineProducts";
import { RoutineCard } from "@/components/RoutineCard";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { PRESET_DEVICES } from "@/data/presetDevices";

type CatalogProduct = {
  id: string;
  product_name: string;
  brand: string;
  photo_url: string | null;
  product_type: string | null;
  user_id: string | null;
  frequency?: string | null;
};

type DiagnosticResult = {
  source: string | null;
  raw_metrics: Record<string, any>;
  summary: string;
};

const renderDiagnosticMetrics = (metrics: Record<string, any>) => {
  const rows: { label: string; value: string }[] = [];
  if (metrics?.hydratation?.score != null) rows.push({ label: "Hydratation", value: `${metrics.hydratation.score}/4` });
  if (metrics?.sebum) {
    const parts: string[] = [];
    if (metrics.sebum.zone_t != null) parts.push(`Zone T ${metrics.sebum.zone_t}/5`);
    if (metrics.sebum.zone_u != null) parts.push(`Zone U ${metrics.sebum.zone_u}/5`);
    if (parts.length) rows.push({ label: "Sébum", value: parts.join(" · ") });
  }
  if (metrics?.pores?.score != null) rows.push({ label: "Pores", value: `${metrics.pores.score}/4` });
  if (metrics?.taches?.score != null) rows.push({ label: "Taches", value: `${metrics.taches.score}/4` });
  if (metrics?.rougeurs?.score != null) rows.push({ label: "Rougeurs", value: `${metrics.rougeurs.score}/4` });
  if (metrics?.rides?.score != null) rows.push({ label: "Rides", value: `${metrics.rides.score}/5` });
  if (metrics?.eclat_global != null) rows.push({ label: "Éclat global", value: `${metrics.eclat_global}/10` });
  return rows;
};

const FREQ_OPTIONS = [
  { value: "daily", label: "Quotidienne", sub: "Utilisé chaque jour" },
  { value: "weekly", label: "Hebdomadaire", sub: "Quelques fois par semaine" },
  { value: "monthly", label: "Mensuelle", sub: "Traitement ponctuel" },
] as const;

const Vanity = () => {
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState<"routines" | "produits">("routines");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);
  const diagnosticFileRef = useRef<HTMLInputElement>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [removeModalProduct, setRemoveModalProduct] = useState<CatalogProduct | null>(null);
  const [removeReason, setRemoveReason] = useState<string | null>(null);
  const [frequencyModal, setFrequencyModal] = useState<{ product: CatalogProduct; mode: "add" | "edit" } | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [deleteMode, setDeleteMode] = useState(false);
  const [activeRoutineTab, setActiveRoutineTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [checkedRoutineProducts, setCheckedRoutineProducts] = useState<Set<string>>(new Set());
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [optimizedMorning, setOptimizedMorning] = useState<{ product_ids: string[]; inci_message: string | null } | null>(null);
  const [optimizedEvening, setOptimizedEvening] = useState<{ product_ids: string[]; inci_message: string | null } | null>(null);
  const [lastRoutineRefresh, setLastRoutineRefresh] = useState<string | null>(null);
  const [refreshingRoutine, setRefreshingRoutine] = useState(false);
  const { products: routineProducts, refetch: refetchRoutine } = useRoutineProducts();
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
        // Lire l'etat de la routine du jour
        const todayStr = new Date().toISOString().split("T")[0];
        (supabase as any)
          .from("routine_logs")
          .select("morning_routine_done, evening_routine_done")
          .eq("user_id", uid)
          .eq("date", todayStr)
          .maybeSingle()
          .then(({ data }: any) => {
            if (data) {
              setMorningDone(!!data.morning_routine_done);
              setEveningDone(!!data.evening_routine_done);
            }
          });
        // Lire la routine optimisee du jour (cache inci-analysis)
        (supabase as any)
          .from("daily_routine_log")
          .select("period, product_ids, inci_message, created_at")
          .eq("user_id", uid)
          .eq("date", todayStr)
          .then(({ data }: any) => {
            if (data && data.length > 0) {
              const morning = data.find((r: any) => r.period === "morning");
              const evening = data.find((r: any) => r.period === "evening");
              if (morning) setOptimizedMorning({ product_ids: morning.product_ids ?? [], inci_message: morning.inci_message });
              if (evening) setOptimizedEvening({ product_ids: evening.product_ids ?? [], inci_message: evening.inci_message });
              const mostRecent = data.reduce((latest: string | null, r: any) =>
                !latest || r.created_at > latest ? r.created_at : latest, null);
              setLastRoutineRefresh(mostRecent);
            }
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

  const cosmetics = userProducts.filter(p => (p as any).product_type !== "device");
  const userDeviceLabels = new Set(
    userProducts.filter(p => (p as any).product_type === "device").map(p => p.product_name)
  );

  const dailyProducts = routineProducts.filter(p => p.frequency === "daily");
  const weeklyProducts = routineProducts.filter(p => p.frequency === "weekly");
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

  const setRoutineDone = async (moment: "morning" | "evening", done: boolean) => {
    if (!userId) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const field = moment === "morning" ? "morning_routine_done" : "evening_routine_done";
    // Optimistic UI
    if (moment === "morning") setMorningDone(done);
    else setEveningDone(done);
    const { error } = await (supabase as any)
      .from("routine_logs")
      .upsert(
        { user_id: userId, date: todayStr, [field]: done },
        { onConflict: "user_id,date" }
      );
    if (error) {
      console.warn("routine_logs upsert:", error.message);
      // Rollback si echec
      if (moment === "morning") setMorningDone(!done);
      else setEveningDone(!done);
    }
  };

  const routineRefreshAvailable = (() => {
    if (!lastRoutineRefresh) return true;
    const last = new Date(lastRoutineRefresh).getTime();
    const now = Date.now();
    return now - last >= 24 * 60 * 60 * 1000;
  })();

  const routineRefreshHoursLeft = (() => {
    if (!lastRoutineRefresh) return 0;
    const last = new Date(lastRoutineRefresh).getTime();
    const now = Date.now();
    const remaining = 24 * 60 * 60 * 1000 - (now - last);
    return Math.max(0, Math.ceil(remaining / (60 * 60 * 1000)));
  })();

  const refreshRoutine = async () => {
    if (!userId || !routineRefreshAvailable || refreshingRoutine) return;
    setRefreshingRoutine(true);
    try {
      const [morningRes, eveningRes] = await Promise.all([
        supabase.functions.invoke("inci-analysis", { body: { user_id: userId, period: "morning" } }),
        supabase.functions.invoke("inci-analysis", { body: { user_id: userId, period: "evening" } }),
      ]);
      if (morningRes.data?.routine) {
        setOptimizedMorning({
          product_ids: morningRes.data.routine.map((p: any) => p.product_id),
          inci_message: morningRes.data.explanation ?? null,
        });
      }
      if (eveningRes.data?.routine) {
        setOptimizedEvening({
          product_ids: eveningRes.data.routine.map((p: any) => p.product_id),
          inci_message: eveningRes.data.explanation ?? null,
        });
      }
      setLastRoutineRefresh(new Date().toISOString());
    } catch (e) {
      console.warn("refreshRoutine:", e);
    } finally {
      setRefreshingRoutine(false);
    }
  };

  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2 && !typeFilter) {
        setCatalogResults([]);
        return;
      }
      setIsSearching(true);
      try {
        if (searchQuery.length >= 2) {
          // Recherche texte -> Open Beauty Facts (catalogue large)
          const { data, error } = await supabase.functions.invoke("product-search", {
            body: { query: searchQuery },
          });
          if (!error && data?.products) {
            setCatalogResults(data.products);
          } else {
            setCatalogResults([]);
          }
        } else if (typeFilter) {
          // Filtre par type seul -> catalogue interne
          const { data, error } = await (supabase as any)
            .from("user_products")
            .select("*")
            .is("user_id", null)
            .eq("product_type", typeFilter)
            .limit(8);
          if (!error && data) setCatalogResults(data);
        }
      } catch (e) {
        console.error(e);
        setCatalogResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(search, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter]);

  const confirmFrequency = async () => {
    if (!frequencyModal || !userId) return;
    const { product, mode } = frequencyModal;

    if (mode === "add") {
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
          frequency: selectedFrequency,
          source: "catalog",
        })
        .select()
        .single();
      if (!error && data) setUserProducts(prev => [...prev, data]);
    } else {
      await (supabase as any)
        .from("user_products")
        .update({ frequency: selectedFrequency })
        .eq("id", product.id)
        .eq("user_id", userId);
      setUserProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, frequency: selectedFrequency } : p)
      );
      refetchRoutine();
    }
    setFrequencyModal(null);
  };

  const insertScannedProduct = async (product: {
    product_name: string;
    brand: string | null;
    product_type: string | null;
    ingredients: string | null;
    open_beauty_facts_id: string | null;
    photo_url: string | null;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Non connecté");
    const { data: inserted, error: dbError } = await (supabase as any)
      .from("user_products")
      .insert({
        product_name: product.product_name,
        brand: product.brand,
        product_type: product.product_type,
        ingredients: product.ingredients,
        open_beauty_facts_id: product.open_beauty_facts_id,
        photo_url: product.photo_url,
        user_id: session.user.id,
        morning_use: true,
        evening_use: true,
        status: "active",
        is_active: true,
        source: "claude_scan",
      })
      .select()
      .single();
    if (dbError) throw dbError;
    if (inserted) setUserProducts(prev => [...prev, inserted]);
    setScanMessage(`${product.product_name} ajouté ✓`);
    setTimeout(() => setScanMessage(null), 4000);
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setScanMessage("Identification du produit en cours…");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("product-scan", {
        body: { imageBase64: base64 },
      });
      if (error) {
        const errorText = error.context
          ? await (error.context as Response).text().catch(() => error.message)
          : error.message;
        throw new Error(errorText);
      }
      if (data?.status === "unrecognized" || !data?.product_name) {
        setScanMessage("Produit non reconnu — essaie une photo plus nette du packaging");
        setTimeout(() => setScanMessage(null), 4000);
        return;
      }
      await insertScannedProduct({
        product_name: data.product_name,
        brand: data.brand ?? null,
        product_type: data.product_type ?? null,
        ingredients: data.ingredients ?? null,
        open_beauty_facts_id: null,
        photo_url: data.photo_url ?? null,
      });
    } catch (err: any) {
      setScanMessage(`Erreur : ${err?.message ?? JSON.stringify(err)}`);
      setTimeout(() => setScanMessage(null), 4000);
    }
  };


  const handleDiagnosticFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.type !== "application/pdf") {
      setScanMessage("Le fichier doit être un PDF");
      setTimeout(() => setScanMessage(null), 4000);
      return;
    }
    setDiagnosticLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("diagnostic-import", {
        body: { pdfBase64: base64 },
      });
      if (error) {
        const errorText = error.context
          ? await (error.context as Response).text().catch(() => error.message)
          : error.message;
        throw new Error(errorText);
      }
      if (!data?.raw_metrics) throw new Error(`Réponse invalide : ${JSON.stringify(data)}`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Non connecté");

      const { error: dbError } = await (supabase as any)
        .from("professional_diagnostics")
        .insert({
          user_id: session.user.id,
          source: data.source ?? null,
          raw_metrics: data.raw_metrics,
          summary: data.summary ?? null,
        });
      if (dbError) throw dbError;

      await (supabase as any)
        .from("profiles")
        .update({
          skin_diagnostic_baseline: data.raw_metrics,
          skin_diagnostic_source: data.source ?? null,
        })
        .eq("id", session.user.id);

      setDiagnosticResult({
        source: data.source ?? null,
        raw_metrics: data.raw_metrics,
        summary: data.summary ?? "",
      });
    } catch (err: any) {
      setScanMessage(`Erreur : ${err?.message ?? JSON.stringify(err)}`);
      setTimeout(() => setScanMessage(null), 4000);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const toggleDevice = async (label: string) => {
    if (!userId) return;
    const existing = userProducts.find(
      p => p.product_name === label && (p as any).product_type === "device"
    );
    if (existing) {
      setUserProducts(prev => prev.filter(p => p.id !== existing.id));
      const { error } = await (supabase as any).from("user_products").delete().eq("id", existing.id);
      if (error) setUserProducts(prev => [...prev, existing]);
    } else {
      const tempId = `temp-device-${label}`;
      const tempItem = { id: tempId, product_name: label, brand: null, product_type: "device", photo_url: null, user_id: userId, frequency: null } as CatalogProduct;
      setUserProducts(prev => [...prev, tempItem]);
      const { data, error } = await (supabase as any)
        .from("user_products")
        .insert({ product_name: label, brand: null, product_type: "device", user_id: userId, is_active: true, morning_use: false, evening_use: false, source: "device" })
        .select()
        .single();
      if (error) {
        setUserProducts(prev => prev.filter(p => p.id !== tempId));
      } else if (data) {
        setUserProducts(prev => prev.map(p => p.id === tempId ? data : p));
      }
    }
  };

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
    <div className="min-h-screen pb-24 px-3 sm:px-5 pt-10 max-w-lg mx-auto">
      <PageHeader title="Mes Produits" onBack={() => navigate(-1)} />

      <div className="flex border-b border-border/20 mb-6">
        {(["routines", "produits"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveMainTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold transition-all relative ${activeMainTab === tab ? "text-foreground" : "text-muted-foreground"
              }`}
          >
            {tab === "routines" ? "Routines" : "Mes produits"}
            {activeMainTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeMainTab === "produits" ? (
        <div className="space-y-8 flex flex-col">
          {/* Search + Filter Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-0 overflow-hidden order-1">
            <div className="p-6 bg-background/50 border-b border-border/50">
              <h2 className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-4"> des produits</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                  onClick={() => scanFileRef.current?.click()}
                  aria-label="Scanner un produit par photo"
                  className="w-full h-12 sm:w-12 rounded-xl bg-muted/20 flex items-center justify-center text-foreground/60 hover:bg-muted/40 transition-colors flex-shrink-0 self-center sm:self-auto"
                >
                  <Scan size={18} strokeWidth={1.5} />
                </button>
                <input
                  ref={scanFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleScanFile}
                />
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Type filter pills */}
              {false && productTypes.length > 0 && ( /* filtre masque en V0 - a rebrancher (backlog 21) */
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
                          className="flex gap-3 p-3 bg-card border border-border rounded-2xl transition-all hover:border-primary/30 shadow-sm sm:flex-row sm:items-center sm:gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-14 max-h-14 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
                              <ProductPhoto url={p.photo_url} name={p.product_name} iconSize={18} />
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
                            onClick={() => {
                              if (alreadyAdded) return;
                              setFrequencyModal({ product: p, mode: "add" });
                              setSelectedFrequency("daily");
                            }}
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
            className="premium-card p-8 order-2"
          >
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase">Mes Produits enregistrés</p>
              <button
                onClick={() => setDeleteMode(d => !d)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${deleteMode
                  ? "bg-destructive text-white shadow-sm"
                  : "bg-muted/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  }`}
              >
                <Trash2 size={15} strokeWidth={1.8} />
              </button>
            </div>
            {cosmetics.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">
                Aucun produit dans votre inventaire pour le moment.
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {(() => {
                  const groups: Record<string, CatalogProduct[]> = {};
                  cosmetics.forEach(p => {
                    const key = (p as any).product_type || "Autres";
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                  });
                  const sorted = Object.entries(groups).sort(([a], [b]) =>
                    a === "Autres" ? 1 : b === "Autres" ? -1 : a.localeCompare(b)
                  );
                  return sorted.map(([type, products]) => (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{type}</p>
                        <span className="text-[10px] font-bold text-primary/60 bg-primary/8 px-2 py-0.5 rounded-full">
                          {products.length}
                        </span>
                      </div>
                      <AnimatePresence mode="popLayout">
                        <div className="flex flex-col gap-2">
                          {products.map(p => (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              onClick={() => {
                                if (deleteMode) return;
                                setFrequencyModal({ product: p, mode: "edit" });
                                setSelectedFrequency((p.frequency as "daily" | "weekly" | "monthly") || "daily");
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all shadow-sm ${deleteMode
                                ? "border-destructive/20 bg-destructive/5"
                                : "border-border bg-background/40 hover:border-primary/30 cursor-pointer"
                                }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center border border-border/50 shrink-0">
                                  <ProductPhoto url={p.photo_url} name={p.product_name} iconSize={14} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate">{p.product_name}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-tighter truncate">{p.brand}</p>
                                  {p.frequency && (
                                    <p className="text-[10px] text-primary/70 font-bold uppercase tracking-widest mt-0.5">
                                      {p.frequency === "daily" ? "Quotidien" : p.frequency === "weekly" ? "Hebdo" : "Mensuel"}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {deleteMode ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setRemoveModalProduct(p); setRemoveReason(null); }}
                                  className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shrink-0"
                                >
                                  <Trash2 size={15} strokeWidth={1.8} />
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFrequencyModal({ product: p, mode: "edit" });
                                    setSelectedFrequency((p.frequency as "daily" | "weekly" | "monthly") || "daily");
                                  }}
                                  className="w-8 h-8 rounded-full bg-muted/30 text-muted-foreground flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                                >
                                  <SlidersHorizontal size={14} strokeWidth={1.8} />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </AnimatePresence>
                    </div>
                  ));
                })()}
              </div>
            )}
          </motion.div>

          {/* Mes accessoires beauté */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="premium-card p-6 order-3"
          >
            <h2 className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-4">
              Mes accessoires beauté
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Sélectionne les appareils que tu utilises pour que ton assistant en tienne compte dans tes conseils.
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_DEVICES.map(({ emoji, label }) => {
                const active = userDeviceLabels.has(label);
                return (
                  <button
                    key={label}
                    onClick={() => toggleDevice(label)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all ${active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border text-foreground/70 hover:border-primary/50 hover:bg-muted/20"
                      }`}
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                    {active && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Import diagnostic professionnel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="premium-card p-6 order-4"
          >
            <h2 className="text-[10px] font-bold text-foreground/80 tracking-widest uppercase mb-2">
              Importer mon diagnostic professionnel
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Importe le rapport PDF de ton dernier diagnostic en institut ou cabinet (Observ, Visia...) pour l'ajouter à ton suivi.
            </p>
            <button
              onClick={() => diagnosticFileRef.current?.click()}
              disabled={diagnosticLoading}
              className="w-full h-12 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-center gap-2 text-sm font-semibold text-foreground/80 hover:bg-muted/40 transition-colors disabled:opacity-60"
            >
              {diagnosticLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <FileUp size={16} strokeWidth={1.5} />
                  Importer un PDF
                </>
              )}
            </button>
            <input
              ref={diagnosticFileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleDiagnosticFile}
            />
          </motion.div>
        </div>
      ) : (
        <div>
          {/* Sous-onglets */}
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
            {([
              { key: "daily", label: "Quotidienne" },
              { key: "weekly", label: "Hebdomadaire" },
              { key: "monthly", label: "Mensuelle" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveRoutineTab(key)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeRoutineTab === key
                  ? "bg-foreground text-background"
                  : "border border-border/40 text-muted-foreground"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contenu */}
          {activeRoutineTab === "daily" ? (
            <div className="space-y-6">
              <div>
                <button
                  onClick={refreshRoutine}
                  disabled={!routineRefreshAvailable || refreshingRoutine}
                  className={`w-full py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${routineRefreshAvailable
                    ? "bg-foreground text-background"
                    : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                    }`}
                >
                  {refreshingRoutine ? "Optimisation en cours..." : "Recharger ma routine avec mes nouveaux produits"}
                </button>
                {!routineRefreshAvailable && (
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    De nouveau disponible dans {routineRefreshHoursLeft}h
                  </p>
                )}
              </div>
              {morningProducts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-base font-bold text-foreground">Routine du matin</p>
                    <p className="text-sm font-semibold text-primary">{morningProducts.length} produit{morningProducts.length > 1 ? "s" : ""}</p>
                  </div>
                  <RoutineCard
                    products={morningProducts}
                    showPhotos
                  />
                  {optimizedMorning?.inci_message && (
                    <div className="bg-primary/5 rounded-2xl p-4 mt-3 border border-primary/10">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5">Conseil d'application</p>
                      <p className="text-[13px] text-foreground/85 leading-relaxed">{optimizedMorning.inci_message}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setRoutineDone("morning", !morningDone)}
                    className={`w-full mt-3 py-3 rounded-2xl text-sm font-bold transition-all ${morningDone
                      ? "bg-primary text-primary-foreground"
                      : "border border-primary/40 text-primary bg-primary/5"
                      }`}
                  >
                    {morningDone ? "Routine du matin faite \u2713" : "J'ai fait ma routine du matin"}
                  </button>
                </div>
              )}
              {eveningProducts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-base font-bold text-foreground">Routine du soir</p>
                    <p className="text-sm font-semibold text-primary">{eveningProducts.length} produit{eveningProducts.length > 1 ? "s" : ""}</p>
                  </div>
                  <RoutineCard
                    products={eveningProducts}
                    showPhotos
                  />
                  {optimizedEvening?.inci_message && (
                    <div className="bg-primary/5 rounded-2xl p-4 mt-3 border border-primary/10">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5">Conseil d'application</p>
                      <p className="text-[13px] text-foreground/85 leading-relaxed">{optimizedEvening.inci_message}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setRoutineDone("evening", !eveningDone)}
                    className={`w-full mt-3 py-3 rounded-2xl text-sm font-bold transition-all ${eveningDone
                      ? "bg-primary text-primary-foreground"
                      : "border border-primary/40 text-primary bg-primary/5"
                      }`}
                  >
                    {eveningDone ? "Routine du soir faite \u2713" : "J'ai fait ma routine du soir"}
                  </button>
                </div>
              )}
              {morningProducts.length === 0 && eveningProducts.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <p className="text-sm text-muted-foreground italic">Aucun produit dans votre routine quotidienne</p>
                  <button
                    onClick={() => setActiveMainTab("produits")}
                    className="text-sm font-semibold text-primary"
                  >
                    Ajouter des produits →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <RoutineCard
              products={activeRoutineTab === "weekly" ? weeklyProducts : monthlyProducts}
              checkedIds={checkedRoutineProducts}
              onToggle={toggleRoutineProduct}
              showPhotos
              emptyMessage="Aucun produit dans cette routine"
            />
          )}
        </div>
      )}
      {/* Bottom sheet fréquence */}
      <Drawer
        open={!!frequencyModal}
        onOpenChange={(open) => { if (!open) setFrequencyModal(null); }}
      >
        <DrawerContent className="px-6 pb-10">
          <DrawerHeader className="text-left px-0 pt-2 pb-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              {frequencyModal?.product.brand}
            </p>
            <DrawerTitle className="text-xl font-display text-foreground">
              {frequencyModal?.mode === "add" ? "Fréquence d'utilisation" : frequencyModal?.product.product_name}
            </DrawerTitle>
          </DrawerHeader>

          <p className="text-sm font-bold text-foreground mb-4">À quelle fréquence utilisez-vous ce produit ?</p>

          <div className="space-y-3 mb-8">
            {FREQ_OPTIONS.map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setSelectedFrequency(value)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedFrequency === value
                  ? "border-primary bg-primary/5"
                  : "border-border/40 bg-background/40"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${selectedFrequency === value ? "border-primary bg-primary" : "border-border"
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
              onClick={confirmFrequency}
              className="w-full h-12 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest transition-all active:scale-95"
            >
              {frequencyModal?.mode === "add" ? "Ajouter le produit" : "Enregistrer"}
            </button>
            <button
              onClick={() => setFrequencyModal(null)}
              className="w-full h-12 text-muted-foreground text-sm font-medium"
            >
              Annuler
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Bottom sheet suppression */}
      <Drawer
        open={!!removeModalProduct}
        onOpenChange={(open) => { if (!open) { setRemoveModalProduct(null); setRemoveReason(null); } }}
      >
        <DrawerContent className="px-6 pb-10">
          <DrawerHeader className="text-left px-0 pt-2 pb-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              {removeModalProduct?.brand}
            </p>
            <DrawerTitle className="text-xl font-display text-foreground">
              {removeModalProduct?.product_name}
            </DrawerTitle>
          </DrawerHeader>

          <p className="text-sm font-bold text-foreground mb-4">Pourquoi retirer ce produit ?</p>

          <div className="space-y-3 mb-8">
            {[
              { value: "terminé", label: "Mon produit est terminé", sub: "Je pourrai le rajouter plus tard" },
              { value: "mauvaise_réaction", label: "J'ai eu une mauvaise réaction", sub: "On notera les ingrédients à éviter" },
              { value: "plus_utilisé", label: "Je ne l'utilise plus", sub: "Il restera dans votre historique" },
            ].map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setRemoveReason(value)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${removeReason === value
                  ? "border-primary bg-primary/5"
                  : "border-border/40 bg-background/40"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${removeReason === value ? "border-primary bg-primary" : "border-border"
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
        </DrawerContent>
      </Drawer>

      {/* Bottom sheet confirmation diagnostic professionnel */}
      <Drawer
        open={!!diagnosticResult}
        onOpenChange={(open) => { if (!open) setDiagnosticResult(null); }}
      >
        <DrawerContent className="px-6 pb-10">
          <DrawerHeader className="text-left px-0 pt-2 pb-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              {diagnosticResult?.source ?? "Diagnostic professionnel"}
            </p>
            <DrawerTitle className="text-xl font-display text-foreground">
              Ton diagnostic est prêt
            </DrawerTitle>
          </DrawerHeader>

          {diagnosticResult?.summary && (
            <p className="text-sm text-foreground/80 mb-4">{diagnosticResult.summary}</p>
          )}

          <div className="space-y-2 mb-6">
            {renderDiagnosticMetrics(diagnosticResult?.raw_metrics ?? {}).map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-3 rounded-2xl border border-border/40 bg-background/40"
              >
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-sm font-bold text-primary">{row.value}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-6">
            <p className="text-xs text-foreground/80 leading-relaxed">
              Cette analyse devient ta référence (J0). Nacre va suivre l'évolution de ta peau à partir de cette baseline.
            </p>
          </div>

          <button
            onClick={() => setDiagnosticResult(null)}
            className="w-full h-12 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest transition-all active:scale-95"
          >
            Compris, c'est ma baseline
          </button>
        </DrawerContent>
      </Drawer>

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
