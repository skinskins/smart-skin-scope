import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RoutineTimesDrawer, { toHHMM } from "@/components/RoutineTimesDrawer";

interface Props {
  userId: string | null;
}

const RoutineTimesCard = ({ userId }: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [morningTime, setMorningTime] = useState<string | null>(null);
  const [eveningTime, setEveningTime] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (supabase as any)
      .from("profiles")
      .select("morning_routine_time, evening_routine_time")
      .eq("id", userId)
      .single()
      .then(({ data }: any) => {
        if (data) {
          setMorningTime(toHHMM(data.morning_routine_time));
          setEveningTime(toHHMM(data.evening_routine_time));
        }
        setLoaded(true);
      });
  }, [userId]);

  // Une fois les deux horaires renseignés, la carte n'a plus lieu d'être dans le Vanity —
  // le réglage reste modifiable depuis le profil.
  if (!userId || !loaded || (morningTime && eveningTime)) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setOpen(true)}
        className="w-full premium-card p-5 flex items-center gap-4 text-left hover:border-primary/40 transition-all mb-6"
      >
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-muted/40 text-muted-foreground">
          <Clock size={18} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Renseigne l'heure de tes routines</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Pour qu'on puisse bientôt te rappeler au bon moment
          </p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </motion.button>

      <RoutineTimesDrawer
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        initialMorning={morningTime}
        initialEvening={eveningTime}
        onSaved={(morning, evening) => {
          setMorningTime(morning);
          setEveningTime(evening);
        }}
      />
    </>
  );
};

export default RoutineTimesCard;
