import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, CalendarDays, ArrowRight } from "lucide-react";
import { useDiagnosisHistory, DiagnosisResult } from "@/hooks/useDiagnosisStore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import diagPrevious from "@/assets/diag-previous.png";
import faceScan from "@/assets/face-scan.png";

// Demo history for when no real data exists
const demoHistory: DiagnosisResult[] = [
  {
    globalScore: 52,
    date: "2026-02-10T10:00:00.000Z",
    zones: [
      { id: "forehead", label: "Front", score: 55, status: "warning" },
      { id: "left-cheek", label: "Joue gauche", score: 38, status: "alert" },
      { id: "right-cheek", label: "Joue droite", score: 42, status: "alert" },
      { id: "tzone", label: "Zone T / Nez", score: 35, status: "alert" },
      { id: "chin", label: "Menton", score: 70, status: "good" },
      { id: "jaw", label: "Mâchoire", score: 68, status: "warning" },
    ],
  },
  {
    globalScore: 58,
    date: "2026-03-01T14:30:00.000Z",
    zones: [
      { id: "forehead", label: "Front", score: 62, status: "warning" },
      { id: "left-cheek", label: "Joue gauche", score: 45, status: "alert" },
      { id: "right-cheek", label: "Joue droite", score: 48, status: "alert" },
      { id: "tzone", label: "Zone T / Nez", score: 40, status: "alert" },
      { id: "chin", label: "Menton", score: 78, status: "good" },
      { id: "jaw", label: "Mâchoire", score: 76, status: "good" },
    ],
  },
];

const ScoreChange = ({ diff }: { diff: number }) => {
  if (diff > 0) return <span className="text-primary font-bold flex items-center gap-1 text-[10px] uppercase tracking-widest"><TrendingUp size={12} />+{diff}</span>;
  if (diff < 0) return <span className="text-foreground font-bold flex items-center gap-1 text-[10px] uppercase tracking-widest"><TrendingDown size={12} />{diff}</span>;
  return <span className="text-muted-foreground/60 font-bold flex items-center gap-1 text-[10px] uppercase tracking-widest"><Minus size={12} />0</span>;
};

const ScoreBar = ({ score, color }: { score: number; color: string }) => (
  <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
    <motion.div
      className="h-full bg-primary"
      initial={{ width: 0 }}
      animate={{ width: `${score}%` }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  </div>
);

const getScoreTextClass = (score: number) => "text-foreground";

const Progress = () => {
  const realHistory = useDiagnosisHistory();
  const history = realHistory.length >= 2 ? realHistory : demoHistory;

  const [selectedIdx, setSelectedIdx] = useState<number>(
    history.length >= 2 ? history.length - 2 : 0
  );

  const latest = history[history.length - 1];
  const compared = history[selectedIdx];

  const globalDiff = latest.globalScore - compared.globalScore;

  const zoneDiffs = useMemo(() => {
    if (!latest.zones.length || !compared.zones.length) return [];
    return latest.zones.map((z) => {
      const prev = compared.zones.find((cz) => cz.id === z.id);
      return {
        ...z,
        prevScore: prev?.score ?? z.score,
        diff: prev ? z.score - prev.score : 0,
      };
    });
  }, [latest, compared]);

  const formatDate = (iso: string) =>
    format(new Date(iso), "d MMM yyyy, HH:mm", { locale: fr });

  const comparableEntries = history.slice(0, -1);

  return (
    <div className="min-h-screen bg-background pb-24 px-5 pt-10 max-w-lg mx-auto relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12 text-center relative z-10">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <TrendingUp size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-display text-foreground leading-tight">Progression</h1>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Évolution dermatologique de votre peau</p>
      </motion.div>

      {history.length < 2 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-card  p-6  text-center">
          <CalendarDays size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-semibold mb-1">Pas encore assez de données</p>
          <p className="text-sm text-muted-foreground">
            Effectuez au moins 2 diagnostics pour voir votre progression.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Date selector */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="premium-card p-6 mb-8 bg-white/60 relative z-10">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-4 mb-3 block">Comparer avec</label>
            <Select value={String(selectedIdx)} onValueChange={(v) => setSelectedIdx(Number(v))}>
              <SelectTrigger className="w-full bg-white border border-border/60 rounded-full h-14 px-6 font-bold text-xs tracking-tight shadow-sm hover:border-primary transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/40">
                {comparableEntries.map((entry, i) => (
                  <SelectItem key={i} value={String(i)} className="rounded-xl">
                    {formatDate(entry.date)} — {entry.globalScore}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Visual comparison */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
            className="premium-card p-8 mb-8 bg-white relative z-10">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-8 text-center">Sessions comparées</h3>
            <div className="flex gap-4 items-center mb-6">
              <div className="flex-1">
                <div className="relative rounded-3xl border border-border/40 aspect-[3/4] bg-muted/15 flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-3 opacity-60">{format(new Date(compared.date), "dd/MM/yy")}</p>
                  <p className="text-4xl font-display text-foreground">{compared.globalScore}</p>
                </div>
              </div>

              <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground">
                <ArrowRight size={18} strokeWidth={1.5} />
              </div>

              <div className="flex-1">
                <div className="relative rounded-3xl border border-primary/20 aspect-[3/4] bg-primary/5 flex flex-col items-center justify-center p-6 text-center premium-shadow">
                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-3">{format(new Date(latest.date), "dd/MM/yy")}</p>
                  <p className="text-4xl font-display text-primary">{latest.globalScore}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-border/40">
              <ScoreChange diff={globalDiff} />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Écart total</span>
            </div>
          </motion.div>

          {/* Global score comparison - summary text */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="premium-card p-8 mb-8 bg-white/40 text-center italic">
            <p className="text-[13px] text-foreground leading-relaxed">
              {globalDiff > 0 ? (
                <>Votre peau montre une <span className="text-primary font-bold">amélioration notable</span> de {globalDiff} points depuis le {format(new Date(compared.date), "d MMMM", { locale: fr })}. Continuez vos rituels actuels.</>
              ) : globalDiff < 0 ? (
                <>Attention, une <span className="text-primary font-bold">baisse de vitalité</span> ({globalDiff} pts) a été détectée. Revoyez vos facteurs de stress et d'hydratation.</>
              ) : (
                <>Votre état cutané est parfaitement <span className="text-primary font-bold">stable</span>. Maintenez vos habitudes de soin.</>
              )}
            </p>
          </motion.div>

          {/* Zone-by-zone comparison */}
          {zoneDiffs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Détail par zone</h3>
                <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Variation</span>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="premium-card p-8 space-y-8 bg-white/60 relative z-10"
              >
                {zoneDiffs.map((z, i) => (
                  <div key={z.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-widest">{z.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] font-bold text-primary">{z.score}<span className="text-[9px] opacity-40 ml-0.5">/100</span></span>
                        <div className="min-w-[40px] flex justify-end">
                            <ScoreChange diff={z.diff} />
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                        <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${z.score}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Progress;
