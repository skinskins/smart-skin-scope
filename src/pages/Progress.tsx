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
  if (diff > 0) return <span className="text-primary font-bold flex items-center gap-0.5"><TrendingUp size={14} />+{diff}</span>;
  if (diff < 0) return <span className="text-destructive font-bold flex items-center gap-0.5"><TrendingDown size={14} />{diff}</span>;
  return <span className="text-muted-foreground font-medium flex items-center gap-0.5"><Minus size={14} />0</span>;
};

const ScoreBar = ({ score, color }: { score: number; color: string }) => (
  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
    <motion.div
      className="h-full rounded-full"
      style={{ backgroundColor: color }}
      initial={{ width: 0 }}
      animate={{ width: `${score}%` }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  </div>
);

const getScoreColor = (score: number) =>
  score >= 70 ? "hsl(var(--primary))" : score >= 50 ? "hsl(var(--skin-oil))" : "hsl(var(--destructive))";

const getScoreTextClass = (score: number) =>
  score >= 70 ? "text-primary" : score >= 50 ? "text-skin-oil" : "text-destructive";

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
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={20} className="text-primary" />
          <h1 className="text-2xl font-display font-semibold text-foreground">Progression</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Comparez vos diagnostics</p>
      </motion.div>

      {history.length < 2 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-card rounded-2xl p-6 shadow-card text-center">
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
            className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Comparer avec</p>
            <Select value={String(selectedIdx)} onValueChange={(v) => setSelectedIdx(Number(v))}>
              <SelectTrigger className="w-full bg-muted border-0 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {comparableEntries.map((entry, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {formatDate(entry.date)} — Score {entry.globalScore}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Photo comparison */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
            className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <h3 className="font-display font-semibold text-foreground mb-3">Comparaison visuelle</h3>
            <div className="flex gap-3">
              {/* Previous photo */}
              <div className="flex-1">
                <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-muted">
                  <img
                    src={diagPrevious}
                    alt="Diagnostic précédent"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
                    <p className="text-white text-[10px] font-medium">
                      {format(new Date(compared.date), "d MMM yyyy", { locale: fr })}
                    </p>
                    <p className={`text-lg font-bold ${compared.globalScore >= 70 ? "text-emerald-400" : compared.globalScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {compared.globalScore}
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <ArrowRight size={20} className="text-muted-foreground" />
              </div>

              {/* Latest photo */}
              <div className="flex-1">
                <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-muted">
                  <img
                    src={faceScan}
                    alt="Diagnostic actuel"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
                    <p className="text-white text-[10px] font-medium">
                      {format(new Date(latest.date), "d MMM yyyy", { locale: fr })}
                    </p>
                    <p className={`text-lg font-bold ${latest.globalScore >= 70 ? "text-emerald-400" : latest.globalScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {latest.globalScore}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center mt-3 gap-2">
              <ScoreChange diff={globalDiff} />
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          </motion.div>

          {/* Global score comparison */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="bg-card rounded-2xl p-5 shadow-card mb-4">
            <h3 className="font-display font-semibold text-foreground mb-4">Score global</h3>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {format(new Date(compared.date), "d MMM", { locale: fr })}
                </p>
                <p className={`text-3xl font-bold ${getScoreTextClass(compared.globalScore)}`}>
                  {compared.globalScore}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ArrowRight size={18} className="text-muted-foreground" />
                <div className="text-lg"><ScoreChange diff={globalDiff} /></div>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {format(new Date(latest.date), "d MMM", { locale: fr })}
                </p>
                <p className={`text-3xl font-bold ${getScoreTextClass(latest.globalScore)}`}>
                  {latest.globalScore}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Zone-by-zone comparison */}
          {zoneDiffs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 className="font-display font-semibold text-foreground mb-3">Détail par zone</h3>
              <div className="space-y-3">
                {zoneDiffs.map((z, i) => (
                  <motion.div key={z.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.05 }}
                    className="bg-card rounded-xl p-4 shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">{z.label}</span>
                      <ScoreChange diff={z.diff} />
                    </div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-xs text-muted-foreground w-8">{z.prevScore}</span>
                      <div className="flex-1">
                        <ScoreBar score={z.prevScore} color="hsl(var(--muted-foreground) / 0.3)" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold w-8 ${getScoreTextClass(z.score)}`}>{z.score}</span>
                      <div className="flex-1">
                        <ScoreBar score={z.score} color={getScoreColor(z.score)} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Summary */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card rounded-xl p-4 shadow-card mt-4">
            <p className="text-sm text-foreground">
              {globalDiff > 0 ? (
                <>Tendance : <span className="text-primary font-semibold">↑ en amélioration</span> (+{globalDiff} pts depuis le {format(new Date(compared.date), "d MMM", { locale: fr })})</>
              ) : globalDiff < 0 ? (
                <>Tendance : <span className="text-destructive font-semibold">↓ en baisse</span> ({globalDiff} pts depuis le {format(new Date(compared.date), "d MMM", { locale: fr })})</>
              ) : (
                <>Tendance : <span className="text-muted-foreground font-semibold">→ stable</span> depuis le {format(new Date(compared.date), "d MMM", { locale: fr })}</>
              )}
            </p>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Progress;
