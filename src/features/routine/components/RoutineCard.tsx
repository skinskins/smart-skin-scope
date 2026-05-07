import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  product_type: string | null;
  morning_use: boolean;
  evening_use: boolean;
}

const today = () => new Date().toISOString().split("T")[0];

export default function RoutineCard() {
  const navigate = useNavigate();
  const [time, setTime] = useState<"am" | "pm">(
    new Date().getHours() < 14 ? "am" : "pm"
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [{ data: prods }, { data: log }] = await Promise.all([
        (supabase as any)
          .from("user_products")
          .select("id, product_type, morning_use, evening_use")
          .eq("user_id", session.user.id)
          .eq("is_active", true),
        (supabase as any)
          .from("routine_logs")
          .select("morning_routine_done, evening_routine_done")
          .eq("user_id", session.user.id)
          .eq("date", today())
          .maybeSingle(),
      ]);

      setProducts(prods ?? []);
      if (log) {
        setMorningDone(log.morning_routine_done ?? false);
        setEveningDone(log.evening_routine_done ?? false);
      }
    };
    load();
  }, []);

  const isDone = time === "am" ? morningDone : eveningDone;

  const handleLog = async () => {
    if (isDone || saving) return;
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const field = time === "am" ? "morning_routine_done" : "evening_routine_done";
    const { error } = await (supabase as any)
      .from("routine_logs")
      .upsert(
        { user_id: session.user.id, date: today(), [field]: true },
        { onConflict: "user_id,date" }
      );

    if (error) {
      toast.error("Erreur lors de l'enregistrement.");
    } else {
      if (time === "am") setMorningDone(true);
      else setEveningDone(true);
      toast.success("Routine enregistrée !");
    }
    setSaving(false);
  };

  const visible = products.filter((p) =>
    time === "am" ? p.morning_use : p.evening_use
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-card p-4 mb-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">Ma Routine</p>
          <button
            onClick={() => navigate("/routine/products")}
            className="p-1 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-primary"
            title="Gérer mes produits"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex bg-muted rounded-full p-0.5">
          <button
            onClick={() => setTime("am")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${time === "am" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            ☀️ Matin
          </button>
          <button
            onClick={() => setTime("pm")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${time === "pm" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            🌙 Soir
          </button>
        </div>
      </div>

      {/* Product type pills */}
      <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Aucun produit — <button onClick={() => navigate("/routine/products")} className="underline">ajouter</button>
          </p>
        ) : (
          visible.map((p) => (
            <span
              key={p.id}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-accent-foreground capitalize"
            >
              {p.product_type ?? "produit"}
            </span>
          ))
        )}
      </div>

      {/* CTA */}
      <button
        onClick={handleLog}
        disabled={isDone || saving}
        className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
          isDone
            ? "bg-accent text-primary cursor-default"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {isDone ? (
          <span className="flex items-center justify-center gap-1.5">
            <Check size={12} /> Routine enregistrée
          </span>
        ) : saving ? (
          "Enregistrement..."
        ) : (
          "Routine réalisée"
        )}
      </button>
    </motion.div>
  );
}
