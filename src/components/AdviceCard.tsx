import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Lightbulb, AlertCircle, AlertTriangle, Flame, Star, Sparkles, ChevronDown, type LucideIcon } from "lucide-react";

export type Conseil = {
  id: string;
  advice_title: string;
  advice_text: string;
  advice_tip: string;
  advice_group: string;
  priority: string;
};

export const GROUP_ORDER: Record<string, number> = { warning: 0, alerte: 1, astuce: 2, observation: 3 };

// weekly_advice_log n'a pas de colonne advice_group (contrairement à daily_advice_log) —
// on dérive le badge visuel de sa priorité ("1" haute | "2" moyenne | "3" basse), pour que
// les 3-4 piliers de la semaine restent visuellement distincts plutôt que tous identiques.
const PILIER_GROUP_BY_PRIORITY: Record<string, string> = {
  "1": "pilier-haute",
  "2": "pilier-moyenne",
  "3": "pilier-basse",
};

export const pilierGroupFromPriority = (priority: string): string =>
  PILIER_GROUP_BY_PRIORITY[priority] ?? "pilier-basse";

export const sortConseils = (list: Conseil[]) =>
  [...list].sort((a, b) => {
    const groupDiff = (GROUP_ORDER[a.advice_group] ?? 4) - (GROUP_ORDER[b.advice_group] ?? 4);
    if (groupDiff !== 0) return groupDiff;
    return (Number(a.priority) || 0) - (Number(b.priority) || 0);
  });

type TypeConfig = { label: string; icon: LucideIcon; color: string; bg: string; accent: string };

// Palette resserree autour du brun/creme Nacre plutot que les teintes Tailwind par defaut
// (bleu/vert/orange saturés) qui juraient avec le reste de l'app.
const TYPE_CONFIG: Record<string, TypeConfig> = {
  observation:      { label: "Observation",      icon: Eye,           color: "text-stone-600",  bg: "bg-stone-100",   accent: "bg-stone-300" },
  astuce:           { label: "Astuce",            icon: Lightbulb,     color: "text-emerald-700", bg: "bg-emerald-50", accent: "bg-emerald-400" },
  alerte:           { label: "À surveiller",      icon: AlertCircle,   color: "text-amber-700",  bg: "bg-amber-50",    accent: "bg-amber-400" },
  warning:          { label: "Attention",         icon: AlertTriangle, color: "text-purple-600", bg: "bg-purple-50",   accent: "bg-purple-400" },
  "pilier-haute":   { label: "Priorité haute",    icon: Flame,         color: "text-primary",    bg: "bg-primary/10",  accent: "bg-primary" },
  "pilier-moyenne": { label: "Priorité moyenne",  icon: Star,          color: "text-amber-700",  bg: "bg-amber-50",    accent: "bg-amber-400" },
  "pilier-basse":   { label: "Priorité basse",    icon: Sparkles,      color: "text-stone-600",  bg: "bg-stone-100",   accent: "bg-stone-300" },
};

export const AdviceCard = ({ conseil }: { conseil: Conseil }) => {
  const [open, setOpen] = useState(false);
  const typeConf = TYPE_CONFIG[conseil.advice_group] ?? TYPE_CONFIG["astuce"];
  const Icon = typeConf.icon;

  return (
    <motion.div
      layout
      role="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className="relative overflow-hidden bg-white rounded-[20px] p-4 pl-5 cursor-pointer border border-border/10 premium-shadow transition-shadow hover:shadow-md"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${typeConf.accent}`} />

      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${typeConf.bg}`}>
          <Icon size={16} className={typeConf.color} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-wide ${typeConf.color}`}>
            {typeConf.label}
          </span>
          <p className="text-[14px] font-display font-semibold text-foreground leading-snug mt-0.5 mb-1">
            {conseil.advice_title}
          </p>
          <p className={`text-[12.5px] text-muted-foreground leading-relaxed ${open ? "" : "line-clamp-2"}`}>
            {conseil.advice_text}
          </p>
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1 w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center"
          aria-label={open ? "Réduire" : "Développer"}
        >
          <ChevronDown size={13} className="text-muted-foreground" strokeWidth={2} />
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-border/15">
              {conseil.advice_tip && (
                <div className="flex items-start gap-2.5 bg-primary/5 rounded-xl p-3">
                  <Sparkles size={14} className="text-primary shrink-0 mt-0.5" strokeWidth={2} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-primary mb-1">Action suggérée</p>
                    <p className="text-[12px] text-foreground/80 leading-relaxed">
                      {conseil.advice_tip}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
