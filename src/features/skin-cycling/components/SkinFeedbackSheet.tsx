import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";

const ISSUE_PILLS = ["Irritation", "Rougeurs", "Tiraillements", "Sécheresse", "Autre"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const SkinFeedbackSheet = ({ open, onClose, onSaved }: Props) => {
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  const handleClose = () => {
    setSelectedIssues(new Set());
    setSaved(false);
    onClose();
  };

  const toggleIssue = (issue: string) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(issue)) next.delete(issue);
      else next.add(issue);
      return next;
    });
  };

  const save = async () => {
    if (selectedIssues.size === 0) { handleClose(); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { handleClose(); return; }
    const today = new Date().toISOString().split("T")[0];
    await (supabase as any).from("skin_feedback_log").upsert(
      { user_id: session.user.id, date: today, issues: Array.from(selectedIssues) },
      { onConflict: "user_id,date" },
    );
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSelectedIssues(new Set());
      onSaved();
    }, 800);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DrawerContent className="px-6 pb-10">
        <DrawerHeader className="text-left px-0 pt-2 pb-4">
          <DrawerTitle className="text-xl font-display text-foreground">Un souci sur votre peau ?</DrawerTitle>
          <p className="text-[11px] text-muted-foreground mt-1">Juste pour ajuster ta routine.</p>
        </DrawerHeader>

        <div className="flex flex-wrap gap-2 mb-8">
          {ISSUE_PILLS.map((issue) => {
            const active = selectedIssues.has(issue);
            return (
              <button
                key={issue}
                onClick={() => toggleIssue(issue)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/20 border-transparent text-foreground/60 hover:bg-muted/30"
                }`}
              >
                {issue}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="w-full h-12 flex items-center justify-center gap-2 bg-primary/10 rounded-full">
                <Check size={16} className="text-primary" />
                <span className="text-sm font-bold text-primary">Noté !</span>
              </motion.div>
            ) : (
              <motion.button key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={save}
                disabled={selectedIssues.size === 0}
                className="w-full h-12 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Enregistrer
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={handleClose}
            className="w-full h-10 text-[12px] text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            Rien à signaler
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SkinFeedbackSheet;
