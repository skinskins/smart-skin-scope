import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateCyclePhaseForDate } from "@/utils/cycle";
import { PageHeader } from "@/components/PageHeader";

const PHASE_GRADIENTS: Record<string, string> = {
  Folliculaire: "linear-gradient(145deg, #B8D4E8 0%, #7EB3D4 45%, #4A8AB8 100%)",
  Ovulatoire:   "linear-gradient(145deg, #F5E6A3 0%, #F0C060 45%, #E89020 100%)",
  Lutéale:      "linear-gradient(145deg, #C4A882 0%, #A07850 45%, #785030 100%)",
  Menstruelle:  "linear-gradient(145deg, #E8A4A8 0%, #D06070 45%, #A83050 100%)",
};

function PearlDot({ phase, size = 36 }: { phase: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: PHASE_GRADIENTS[phase] ?? "#D3D1C7",
    }} />
  );
}

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

const buildMonths = (): Date[] => {
  const months: Date[] = [];
  for (let offset = -3; offset <= 1; offset++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    months.push(d);
  }
  return months;
};
const MONTHS = buildMonths();

const Suivi = () => {
  const navigate = useNavigate();
  const [lastPeriodDate, setLastPeriodDate] = useState<string>("");
  const [cycleDuration, setCycleDuration] = useState<number>(28);
  const [periodDuration, setPeriodDuration] = useState<number>(5);
  const [userId, setUserId] = useState<string | null>(null);
  const [analysedDates, setAnalysedDates] = useState<Set<string>>(new Set());
  const [hasAnalysisToday, setHasAnalysisToday] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);

      // Profil
      const { data } = await (supabase as any)
        .from("profiles")
        .select("last_period_date, cycle_duration, period_duration")
        .eq("id", session.user.id)
        .single();
      if (data?.last_period_date) setLastPeriodDate(data.last_period_date);
      if (data?.cycle_duration) setCycleDuration(data.cycle_duration);
      if (data?.period_duration) setPeriodDuration(data.period_duration);

      // Analyses existantes
      const { data: photos } = await (supabase as any)
        .from("skin_photos")
        .select("date, analysis_json")
        .eq("user_id", session.user.id);

      if (photos) {
        const dates = new Set<string>(photos.map((p: any) => p.date));
        setAnalysedDates(dates);
        const todayAnalysis = photos.find((p: any) => p.date === todayStr && p.analysis_json);
        setHasAnalysisToday(!!todayAnalysis);

        // Pas d'analyse du tout → afficher l'invitation
        if (photos.length === 0) {
          setTimeout(() => setShowInviteModal(true), 800);
        }
      }
    };
    init();
  }, []);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = "";
    setIsAnalysing(true);
    setScanMessage("Analyse de votre peau en cours…");

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 1200;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
        };
        img.onerror = reject;
        img.src = url;
      });

      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("skin-analysis", {
        body: { user_id: userId, imageBase64: base64 },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw new Error(error.message);

      if (data?.rejected) {
        setScanMessage(`📸 ${data.reason}`);
        setTimeout(() => setScanMessage(null), 6000);
        return;
      }

      if (data?.analysis) {
        setHasAnalysisToday(true);
        setAnalysedDates(prev => new Set([...prev, todayStr]));
        setScanMessage("Analyse enregistrée ✓");
        setTimeout(() => setScanMessage(null), 3000);
      }

    } catch (err: any) {
      setScanMessage(`Erreur : ${err?.message ?? "Réessayez"}`);
      setTimeout(() => setScanMessage(null), 4000);
    } finally {
      setIsAnalysing(false);
    }
  };

  const renderMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
    const monthName = monthDate.toLocaleDateString("fr-FR", { month: "long" });

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    return (
      <div key={`${year}-${month}`}>
        <p className="text-center text-lg font-display font-bold text-foreground py-4 capitalize">
          {monthName}
        </p>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-border/15 py-1">
            {week.map((dayNum, di) => {
              if (!dayNum) return <div key={di} />;
              const date = new Date(year, month, dayNum); date.setHours(0, 0, 0, 0);
              const isToday = date.getTime() === today.getTime();
              const isFuture = date > today;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const phase = calculateCyclePhaseForDate(lastPeriodDate, cycleDuration, periodDuration, dateStr);
              const hasAnalysis = analysedDates.has(dateStr);

              return (
                <div
                  key={di}
                  onClick={() => !isFuture && navigate(`/suivi/${dateStr}`)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 relative ${!isFuture ? "cursor-pointer active:opacity-70" : ""}`}
                >
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-foreground" : ""}`}>
                    <span className={`text-[11px] font-medium leading-none ${isToday ? "text-background font-bold" : "text-muted-foreground/60"}`}>
                      {dayNum}
                    </span>
                  </div>
                  <div className={`relative ${isFuture ? "opacity-20" : ""}`}>
                    <PearlDot phase={phase ?? ""} size={32} />
                    {hasAnalysis && !isFuture && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border border-white" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto">

      {/* Header sticky avec bouton analyse */}
      <div className="sticky top-0 bg-background z-10 border-b border-border/20">
        <div className="flex items-center justify-between pr-4">
          <PageHeader title="Suivi" onBack={() => navigate(-1)} />
          <button
            onClick={() => {
              if (hasAnalysisToday) {
                setScanMessage("Analyse déjà faite aujourd'hui ✓");
                setTimeout(() => setScanMessage(null), 3000);
                return;
              }
              photoInputRef.current?.click();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${hasAnalysisToday
              ? "bg-primary/10 text-primary cursor-default"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
          >
            {hasAnalysisToday
              ? <><Check size={12} /> Analysée</>
              : <><Camera size={12} /> Analyser ma peau</>
            }
          </button>
        </div>
        <div className="grid grid-cols-7 px-5 pb-2">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="flex justify-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Input photo caché */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handlePhotoCapture}
      />

      {/* Mois */}
      <div className="px-5">
        {MONTHS.map(renderMonth)}
      </div>

      {/* Modal invitation première analyse */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-sm"
            >
              <button
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-muted-foreground"
              >
                <X size={18} />
              </button>
              <div className="text-4xl mb-4 text-center">✨</div>
              <h2 className="text-xl font-bold text-foreground text-center mb-2">
                Analysez votre peau
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
                Prenez une photo de votre visage pour obtenir une analyse personnalisée.
                Visage démaquillé, face à une fenêtre, bonne lumière.
              </p>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setTimeout(() => photoInputRef.current?.click(), 300);
                }}
                className="w-full h-12 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest"
              >
                Prendre une photo
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full h-10 text-sm text-muted-foreground/70 mt-2"
              >
                Plus tard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast message */}
      <AnimatePresence>
        {scanMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-4 right-4 max-w-sm mx-auto bg-foreground text-background text-sm rounded-2xl px-4 py-3 text-center z-40"
          >
            {scanMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Suivi;