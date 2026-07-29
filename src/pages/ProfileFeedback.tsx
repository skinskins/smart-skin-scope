import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const BUG_TYPES = [
  "L'app fige",
  "Affichage cassé",
  "Un bouton ne répond pas",
  "Connexion ou compte",
  "Problème de sauvegarde",
  "Mon cycle affiche des informations incorrectes",
  "Scan de produits qui échoue",
  "Notification manquante",
  "Autre",
];

type Tab = "bug" | "suggestion";

const ProfileFeedback = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("bug");
  const [bugType, setBugType] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [sending, setSending] = useState(false);

  const isValid = tab === "bug" ? !!bugType && bugDescription.trim().length > 0 : suggestion.trim().length > 0;

  const handleSend = async () => {
    if (!isValid || sending) return;
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Vous devez être connecté(e) pour envoyer un message");
      setSending(false);
      return;
    }
    const { error } = await (supabase as any).from("feedback").insert({
      user_id: session.user.id,
      type: tab,
      bug_type: tab === "bug" ? bugType : null,
      message: tab === "bug" ? bugDescription : suggestion,
    });
    setSending(false);
    if (error) {
      console.error(error);
      toast.error("Erreur lors de l'envoi, réessayez");
      return;
    }
    toast.success("Merci pour votre message");
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-40">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-6 p-3"
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/20 transition-colors shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft size={20} strokeWidth={1.5} className="text-foreground" />
        </button>
        <h1 className="text-2xl font-display text-foreground">Feedback et suggestions</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col gap-8 px-6 pt-4"
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("bug")}
            className={`flex-1 min-h-9 py-2 px-4 rounded border text-base transition-colors ${
              tab === "bug"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-primary/5 text-foreground border-border"
            }`}
          >
            Bug
          </button>
          <button
            type="button"
            onClick={() => setTab("suggestion")}
            className={`flex-1 min-h-9 py-2 px-4 rounded border text-base transition-colors ${
              tab === "suggestion"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-primary/5 text-foreground border-border"
            }`}
          >
            Suggestion
          </button>
        </div>

        {tab === "bug" ? (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-foreground">Type de bug</label>
              <Select value={bugType} onValueChange={setBugType}>
                <SelectTrigger className="h-auto rounded-[6px] px-3 py-3 text-base">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {BUG_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-base focus:bg-muted">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder="Que s'est-il passé, et qu'attendiez-vous à la place ?"
              className="h-[138px] rounded-[6px] resize-none text-base"
            />
          </div>
        ) : (
          <Textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="Quelle amélioration aimeriez-vous voir ?"
            className="h-[138px] rounded-[6px] resize-none text-base"
          />
        )}
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 bg-background px-4 pt-8 pb-8">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleSend}
            disabled={!isValid || sending}
            className="w-full disabled:opacity-100 disabled:bg-border/30 disabled:text-[hsl(var(--text-disabled))] disabled:shadow-none"
          >
            {sending ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileFeedback;
