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
  if (diff > 0) return <span className="text-[#111111] font-bold flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em]"><TrendingUp size={12} />+{diff}</span>;
  if (diff < 0) return <span className="text-[#111111] font-bold flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em]"><TrendingDown size={12} />{diff}</span>;
  return <span className="text-[#AAAAAA] font-bold flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em]"><Minus size={12} />0</span>;
};

const ScoreBar = ({ score, color }: { score: number; color: string }) => (
  <div className="h-1.5 w-full bg-[#E5E5E5] overflow-hidden">
    <motion.div
      className="h-full bg-[#111111]"
      initial={{ width: 0 }}
      animate={{ width: `${score}%` }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  </div>
);

const getScoreTextClass = (score: number) => "text-[#111111]";

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
    <div className="min-h-screen pb-24 px-5 pt-10 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10 text-center">
        <div className="flex flex-col items-center gap-2 mb-4">
          <TrendingUp size={24} className="text-[#111111]" />
          <h1 className="text-3xl font-bold font-display text-[#111111] uppercase tracking-[0.05em]">PROGRESSION</h1>
        </div>
        <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em]">Compromis dermatologique et évolution</p>
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
            className="bg-white border border-[#E5E5E5] p-6 mb-6">
            <p className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-4">COMPARAISON TEMPORELLE</p>
            <Select value={String(selectedIdx)} onValueChange={(v) => setSelectedIdx(Number(v))}>
              <SelectTrigger className="w-full bg-white border border-[#111111] rounded-none h-12 uppercase font-bold text-xs tracking-tight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-[#111111]">
                {comparableEntries.map((entry, i) => (
                  <SelectItem key={i} value={String(i)} className="rounded-none">
                    {formatDate(entry.date)} — {entry.globalScore}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Visual comparison (Optional/Placeholder since image property is missing in interface) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
            className="bg-white border border-[#111111] p-6 mb-6">
            <h3 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-6">Comparaison des sessions</h3>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative border border-[#E5E5E5] aspect-[3/4] bg-white flex flex-col items-center justify-center p-4">
                  <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mb-2">{format(new Date(compared.date), "dd/MM/yy")}</p>
                  <p className="text-4xl font-bold text-[#111111]">{compared.globalScore}</p>
                </div>
              </div>

              <ArrowRight size={20} className="text-[#AAAAAA]" />

              <div className="flex-1">
                <div className="relative border border-[#111111] aspect-[3/4] bg-white flex flex-col items-center justify-center p-4">
                  <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mb-2">{format(new Date(latest.date), "dd/MM/yy")}</p>
                  <p className="text-4xl font-bold text-[#111111]">{latest.globalScore}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center mt-6 gap-2">
              <ScoreChange diff={globalDiff} />
              <span className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em]">Écart (pts)</span>
            </div>
          </motion.div>

          {/* Global score comparison */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="bg-white border border-[#E5E5E5] p-8 mb-6 text-center">
            <h3 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.1em] mb-8">Score global</h3>
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1 text-center">
                <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mb-2">
                  {format(new Date(compared.date), "d MMM", { locale: fr })}
                </p>
                <p className="text-4xl font-bold text-[#111111]">
                  {compared.globalScore}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ArrowRight size={18} className="text-[#AAAAAA]" />
                <ScoreChange diff={globalDiff} />
              </div>
              <div className="flex-1 text-center">
                <p className="text-[10px] font-mono text-[#AAAAAA] uppercase tracking-[0.1em] mb-2">
                  {format(new Date(latest.date), "d MMM", { locale: fr })}
                </p>
                <p className="text-4xl font-bold text-[#111111]">
                  {latest.globalScore}
                </p>
              </div>
            </div>
            <p className="text-sm text-[#111111] font-bold uppercase tracking-tight leading-snug max-w-xs mx-auto mt-10">
              {globalDiff > 0 ? (
                <>Tendance : AMÉLIORATION (+{globalDiff} pts)</>
              ) : globalDiff < 0 ? (
                <>Tendance : BAISSE ({globalDiff} pts)</>
              ) : (
                <>Tendance : STABLE</>
              )}
            </p>
          </motion.div>

          {/* Zone-by-zone comparison */}
          {zoneDiffs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 className="text-[10px] font-mono font-bold text-[#AAAAAA] uppercase tracking-[0.2em] mb-4 px-1">Détail des zones</h3>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="bg-white border border-[#E5E5E5] p-6 space-y-6"
              >
                {zoneDiffs.map((z, i) => (
                  <div key={z.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111111] uppercase tracking-tight">{z.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold text-[#111111]">{z.score}</span>
                        <ScoreChange diff={z.diff} />
                      </div>
                    </div>
                    <ScoreBar score={z.score} color="" />
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
