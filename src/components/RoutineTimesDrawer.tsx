import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export const toHHMM = (t: string | null): string | null => (t ? t.slice(0, 5) : null);

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  initialMorning: string | null;
  initialEvening: string | null;
  onSaved: (morning: string, evening: string) => void;
}

const RoutineTimesDrawer = ({ open, onClose, userId, initialMorning, initialEvening, onSaved }: Props) => {
  const [draftMorning, setDraftMorning] = useState("07:30");
  const [draftEvening, setDraftEvening] = useState("21:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftMorning(initialMorning ?? "07:30");
      setDraftEvening(initialEvening ?? "21:00");
    }
  }, [open, initialMorning, initialEvening]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ morning_routine_time: draftMorning, evening_routine_time: draftEvening })
      .eq("id", userId);
    setSaving(false);
    if (!error) {
      onSaved(draftMorning, draftEvening);
      onClose();
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent className="px-6 pb-10">
        <DrawerHeader className="text-left px-0 pt-2 pb-4">
          <DrawerTitle className="text-xl font-display text-foreground">Horaires de routine</DrawerTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            On pourra bientôt t'envoyer un rappel à ces heures-là.
          </p>
        </DrawerHeader>

        <div className="space-y-4 mb-8">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Routine du matin
            </label>
            <input
              type="time"
              value={draftMorning}
              onChange={(e) => setDraftMorning(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-muted/30 border-none text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Routine du soir
            </label>
            <input
              type="time"
              value={draftEvening}
              onChange={(e) => setDraftEvening(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-muted/30 border-none text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button
            onClick={onClose}
            className="w-full h-12 text-muted-foreground text-sm font-medium"
          >
            Annuler
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default RoutineTimesDrawer;
