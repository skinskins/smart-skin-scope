import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Lightbulb, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const BUG_GUIDE = [
  "Comment/quand le bug est apparu : quelle action avez-vous faite juste avant ?",
  "À quel endroit précis dans l'application : quelle page/quel écran ?",
  "Est-ce que ça arrive à chaque fois, ou c'est arrivé une seule fois ?",
];

type Tab = "bug" | "suggestion";

const ProfileFeedback = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("bug");
  const [bugDescription, setBugDescription] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [sending, setSending] = useState(false);
  const [bugPhoto, setBugPhoto] = useState<File | null>(null);
  const [bugPhotoPreview, setBugPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValid = tab === "bug" ? bugDescription.trim().length > 0 : suggestion.trim().length > 0;

  const handlePhotoSelect = (file: File) => {
    setPhotoError(null);
    setBugPhoto(file);
    setBugPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoRemove = () => {
    setBugPhoto(null);
    setBugPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!isValid || sending) return;
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Vous devez être connecté(e) pour envoyer un message");
      setSending(false);
      return;
    }

    let photoPath: string | null = null;
    if (tab === "bug" && bugPhoto) {
      const ext = bugPhoto.name.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("feedback-photos")
        .upload(path, bugPhoto);
      if (uploadError) {
        console.error(uploadError);
        setPhotoError("Erreur lors de l'envoi de la photo, réessayez");
        setSending(false);
        return;
      }
      photoPath = path;
    }

    const { error } = await (supabase as any).from("feedback").insert({
      user_id: session.user.id,
      type: tab,
      message: tab === "bug" ? bugDescription : suggestion,
      photo_path: photoPath,
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
            <div className="flex flex-col gap-4">
              <div className="premium-card p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} strokeWidth={1.5} className="text-primary shrink-0" />
                  <p className="text-sm font-medium text-foreground">Pour nous aider à comprendre le problème</p>
                </div>
                <ul className="flex flex-col gap-1.5 pl-1">
                  {BUG_GUIDE.map((tip) => (
                    <li key={tip} className="flex gap-2 text-sm text-muted-foreground leading-snug">
                      <span className="text-primary/60 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Textarea
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                placeholder="Que s'est-il passé, et qu'attendiez-vous à la place ?"
                className="h-[138px] rounded-[6px] resize-none text-base"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-foreground">Photo ou capture d'écran (optionnel)</label>
              {bugPhotoPreview ? (
                <div className="relative rounded-[6px] overflow-hidden border border-border/40 w-fit">
                  <img src={bugPhotoPreview} alt="Aperçu du bug" className="max-h-48 object-contain" />
                  <button
                    type="button"
                    onClick={handlePhotoRemove}
                    aria-label="Retirer la photo"
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-background/90 hover:bg-background transition-colors"
                  >
                    <X size={14} strokeWidth={1.5} className="text-foreground" />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="w-full h-[120px] bg-muted/20 rounded-[6px] border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors">
                    <Camera size={22} strokeWidth={1.5} className="text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Joindre une photo</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
                  />
                </label>
              )}
              {photoError && <p className="text-xs text-red-500">{photoError}</p>}
            </div>
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
