import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Pencil, X, ThumbsUp, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWeatherData } from "@/hooks/useWeatherData";

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

  const [amSelected, setAmSelected] = useState<string[]>([]);
  const [pmSelected, setPmSelected] = useState<string[]>([]);
  const [routineSetupOpen, setRoutineSetupOpen] = useState(false);
  const [tempAmProducts, setTempAmProducts] = useState<string[]>([]);
  const [tempPmProducts, setTempPmProducts] = useState<string[]>([]);
  const [customProductInput, setCustomProductInput] = useState("");
  const [setupTimeTab, setSetupTimeTab] = useState<"am" | "pm">("am");
  const [productTime, setProductTime] = useState<"am" | "pm">("am");
  const [productsSaved, setProductsSaved] = useState(false);
  const [productFeedback, setProductFeedback] = useState<{ message: string; tips: { text: string; source?: string }[]; positive: boolean } | null>(null);
  const [userCustomProducts, setUserCustomProducts] = useState<string[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { weather: liveWeather } = useWeatherData(localStorage.getItem("manualLocation") || undefined);

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
  const selected = productTime === "am" ? amSelected : pmSelected;
  const setSelected = productTime === "am" ? setAmSelected : setPmSelected;

  const toggleProduct = (p: string) => {
    setProductsSaved(false);
    setSelected((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const saveProducts = () => {
    setProductsSaved(true);
    const sel = productTime === "am" ? amSelected : pmSelected;
    const time = productTime;

    type Tip = { text: string; source?: string };
    const feedback: { message: string; tips: Tip[]; positive: boolean } = { message: "", tips: [], positive: true };

    const hasSPF = sel.includes("SPF 50");
    const hasHydratant = sel.includes("Hydratant");
    const hasNettoyant = sel.includes("Nettoyant");
    const hasRetinol = sel.includes("Rétinol");
    const hasSerum = sel.includes("Sérum");
    const hasContourYeux = sel.includes("Contour yeux");
    const hasMasque = sel.includes("Masque");

    const uv = liveWeather?.uv ?? 0;
    const humidity = liveWeather?.humidity ?? 50;

    if (time === "am") {
      if (!hasSPF && uv >= 3) {
        feedback.message = "⚠️ Protection solaire manquante";
        feedback.positive = false;
        feedback.tips.push({
          text: `UV à ${uv} aujourd'hui. 80% du vieillissement cutané est dû aux UV. Un SPF 30+ réduit le risque de mélanome de 50%.`,
          source: "Journal of Clinical Oncology, 2011"
        });
      } else if (hasSPF && hasHydratant && hasNettoyant) {
        feedback.message = "Routine matinale exemplaire ! ☀️";
        feedback.positive = true;
        if (hasSerum) {
          feedback.tips.push({
            text: "L'application d'un sérum avant l'hydratant augmente l'absorption des actifs de 20 à 30%.",
            source: "British Journal of Dermatology"
          });
        }
      } else {
        feedback.message = "Routine enregistrée ✓";
        feedback.positive = true;
      }

      if (!hasNettoyant) {
        feedback.tips.push({
          text: "Le nettoyage matinal élimine le sébum nocturne et optimise la pénétration des actifs suivants. Optez pour un nettoyant doux pH 5.5.",
          source: "Skin Research & Technology"
        });
      }

      if (hasSPF && uv >= 6) {
        feedback.tips.push({
          text: `UV élevé (${uv}). Réappliquez votre SPF toutes les 2h en exposition directe.`,
          source: "OMS – Recommandations UV"
        });
      }

      if (humidity < 35 && !hasSerum) {
        feedback.tips.push({
          text: "Air sec détecté. Un sérum à l'acide hyaluronique peut compenser la faible humidité ambiante.",
          source: "Journal of Drugs in Dermatology"
        });
      }

    } else {
      if (hasRetinol && hasSPF) {
        feedback.message = "⚠️ Incompatibilité détectée";
        feedback.positive = false;
        feedback.tips.push({
          text: "Le SPF n'est pas nécessaire le soir et peut interférer avec l'absorption du rétinol.",
          source: "Dermatologic Therapy, 2006"
        });
      } else if (hasRetinol && hasNettoyant) {
        feedback.message = "Routine du soir optimale ! 🌙";
        feedback.positive = true;
        feedback.tips.push({
          text: "Le rétinol stimule le renouvellement cellulaire et la production de collagène.",
          source: "Archives of Dermatology, 2007"
        });
      } else {
        feedback.message = "Routine du soir enregistrée ✓";
        feedback.positive = true;
      }

      if (!hasNettoyant) {
        feedback.tips.push({
          text: "Le double nettoyage du soir retire les particules fines et résidus de SPF qui obstruent les pores.",
          source: "Journal of Dermatological Science"
        });
        feedback.positive = false;
      }

      if (hasContourYeux) {
        feedback.tips.push({
          text: "L'application nocturne de peptides favorise la microcirculation et réduit les cernes.",
          source: "Clinical, Cosmetic & Investigational Dermatology"
        });
      }

      if (hasRetinol && !hasHydratant) {
        feedback.tips.push({
          text: "Le rétinol peut altérer la barrière cutanée. Appliquez toujours un hydratant par-dessus.",
          source: "Journal of the American Academy of Dermatology"
        });
        feedback.positive = false;
      }

      if (hasMasque) {
        feedback.tips.push({
          text: "Les masques de nuit à base de céramides restaurent la barrière cutanée.",
          source: "Experimental Dermatology"
        });
      }
    }

    if (feedback.tips.length === 0 && feedback.positive) {
      feedback.tips.push({
        text: "Routine bien équilibrée pour votre type de peau. La régularité est le facteur n°1 d'efficacité !",
        source: "American Academy of Dermatology"
      });
    }

    setProductFeedback(feedback);
    setTimeout(() => setProductFeedback(null), 8000);
  };

  const saveRoutineConfig = async () => {
    setBaseAmProducts(tempAmProducts);
    setBasePmProducts(tempPmProducts);
    localStorage.setItem("local_am_routine", JSON.stringify(tempAmProducts));
    localStorage.setItem("local_pm_routine", JSON.stringify(tempPmProducts));
    setRoutineSetupOpen(false);

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
    }
  };

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

  return (
    <div className="min-h-screen pb-24 px-5 pt-10 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
        <h1 className="text-3xl font-display text-foreground leading-tight">Ma Routine</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="premium-card p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-foreground/80 tracking-wide">Routine en cours</p>
            <button onClick={() => {
              setTempAmProducts(baseAmProducts);
              setTempPmProducts(basePmProducts);
              setRoutineSetupOpen(true);
            }} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
              <Pencil size={12} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex bg-muted/40 rounded-full p-1 border border-border/20">
            <button onClick={() => { setProductTime("am"); setProductsSaved(false); }}
              className={`px-5 py-1.5 rounded-full text-[10px] font-bold transition-all ${productTime === "am" ? 'bg-primary text-primary-foreground premium-shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              Matin
            </button>
            <button onClick={() => { setProductTime("pm"); setProductsSaved(false); }}
              className={`px-5 py-1.5 rounded-full text-[10px] font-bold transition-all ${productTime === "pm" ? 'bg-primary text-primary-foreground premium-shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              Soir
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 mb-6">
          {currentProducts.map((p) =>
            <button key={p} onClick={() => toggleProduct(p)}
              className={`px-4 py-2 rounded-full text-[11px] font-semibold transition-all border ${selected.includes(p) ? 'bg-primary border-primary text-primary-foreground premium-shadow' : 'bg-background/40 border-border text-muted-foreground hover:border-primary/40'}`
              }>
              {selected.includes(p) && <Check size={10} strokeWidth={2.5} className="inline mr-1.5" />}{p}
            </button>
          )}
        </div>
        <button onClick={saveProducts}
          className={`w-full py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${productsSaved ? 'bg-accent/10 text-accent-foreground border border-accent/20' : 'bg-primary text-primary-foreground premium-shadow hover:opacity-90'}`
          }>
          {productsSaved ? "Routine enregistrée ✓" : "Valider mes soins"}
        </button>

        <AnimatePresence>
          {productFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className={`mt-6 rounded-2xl p-5 border ${productFeedback.positive
                ? "bg-primary/5 border-primary/20"
                : "bg-destructive/5 border-destructive/20"
                }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {productFeedback.positive
                  ? <ThumbsUp size={16} strokeWidth={1.5} className="text-primary" />
                  : <ShieldAlert size={16} strokeWidth={1.5} className="text-destructive" />
                }
                <p className={`text-sm font-semibold ${productFeedback.positive ? "text-primary" : "text-destructive"}`}>
                  {productFeedback.message}
                </p>
              </div>
              {productFeedback.tips.map((tip, i) => (
                <div key={i} className="ml-7 mb-3 last:mb-0">
                  <p className="text-xs text-foreground/70 leading-relaxed">• {tip.text}</p>
                  {tip.source && (
                    <p className="text-[9px] text-muted-foreground/40 italic mt-1 font-medium">— {tip.source}</p>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <Dialog open={routineSetupOpen} onOpenChange={setRoutineSetupOpen}>
        <DialogContent className="max-w-sm rounded-2xl h-[85vh] flex flex-col p-4">
          <DialogHeader className="pt-2">
            <DialogTitle className="text-foreground">Ma Routine</DialogTitle>
            <DialogDescription>Quels produits utilisez-vous habituellement ?</DialogDescription>
          </DialogHeader>

          <div className="flex bg-muted p-1 mb-2">
            <button onClick={() => setSetupTimeTab("am")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${setupTimeTab === "am" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              ☀️ Matin
            </button>
            <button onClick={() => setSetupTimeTab("pm")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${setupTimeTab === "pm" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              🌙 Soir
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 px-1 pb-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Produits standards</p>
              <div className="flex flex-col gap-1.5">
                {Array.from(new Set([...ALL_PRODUCTS, ...userCustomProducts])).map(p => {
                  const isActive = setupTimeTab === "am" ? tempAmProducts.includes(p) : tempPmProducts.includes(p);
                  const isCustom = !ALL_PRODUCTS.includes(p);
                  return (
                    <div key={p} className="flex gap-2">
                      <button onClick={() => toggleSetupProduct(p)} className={`flex-1 flex justify-between items-center px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${isActive ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-foreground/80 hover:bg-accent'}`}>
                        {p}
                        {isActive && <Check size={14} />}
                      </button>
                      {isCustom && (
                        <button onClick={() => {
                          setUserCustomProducts(prev => prev.filter(x => x !== p));
                          setTempAmProducts(prev => prev.filter(x => x !== p));
                          setTempPmProducts(prev => prev.filter(x => x !== p));
                        }} className="px-3 py-2.5 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 hover:bg-destructive/20 transition-colors">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ajouter un produit (ex: Crème VICHY)</p>
              <div className="relative">
                <div className="flex gap-2">
                  <Input value={customProductInput} onChange={e => setCustomProductInput(e.target.value)} placeholder="Nom du produit ou marque" className="text-sm rounded-xl" onKeyDown={e => { if (e.key === 'Enter') addCustomSetupProduct() }} />
                  <button onClick={addCustomSetupProduct} className="bg-primary text-primary-foreground px-4 rounded-xl text-sm font-semibold hover:opacity-90 transition-all">
                    Ajouter
                  </button>
                </div>

                {dbProducts.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {dbProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addProductFromDb(p.product_name, p.brand)}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-accent border-b border-border/50 last:border-0 transition-colors flex flex-col"
                      >
                        <span className="font-semibold text-foreground">{p.product_name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.brand}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {isSearching && (
                  <div className="absolute right-20 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button onClick={saveRoutineConfig} className="w-full py-3.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity">
              Valider ma configuration
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Routine;
