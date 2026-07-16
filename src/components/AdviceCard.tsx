import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type Conseil = {
  id: string;
  advice_title: string;
  advice_text: string;
  advice_tip: string;
  advice_group: string;
  priority: string;
};

export const GROUP_ORDER: Record<string, number> = { warning: 0, alerte: 1, astuce: 2, observation: 3 };

export const sortConseils = (list: Conseil[]) =>
  [...list].sort((a, b) => {
    const groupDiff = (GROUP_ORDER[a.advice_group] ?? 4) - (GROUP_ORDER[b.advice_group] ?? 4);
    if (groupDiff !== 0) return groupDiff;
    return (Number(a.priority) || 0) - (Number(b.priority) || 0);
  });

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  observation: { label: "Observation", color: "text-blue-600", bg: "bg-blue-50" },
  astuce:      { label: "Astuce",      color: "text-green-600", bg: "bg-green-50" },
  alerte:      { label: "A surveiller", color: "text-orange-600", bg: "bg-orange-50" },
  warning:     { label: "Attention",   color: "text-red-500",    bg: "bg-red-50" },
};

export const AdviceCard = ({ conseil }: { conseil: Conseil }) => {
  const [open, setOpen] = useState(false);
  const typeConf = TYPE_CONFIG[conseil.advice_group] ?? TYPE_CONFIG["astuce"];

  return (
    <motion.div
      layout
      role="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className="bg-white rounded-2xl p-3 cursor-pointer hover:bg-muted/5 transition-colors border border-border/10"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeConf.bg} ${typeConf.color}`}>
              {typeConf.label}
            </span>
          </div>
          <p className="text-[13px] font-semibold text-foreground leading-snug mb-0.5">
            {conseil.advice_title}
          </p>
          <p className={`text-[12px] text-muted-foreground leading-relaxed ${open ? "" : "line-clamp-1"}`}>
            {conseil.advice_text}
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
          aria-label={open ? "Réduire" : "Développer"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" />
          </svg>
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
                <div className="bg-primary/5 rounded-xl p-3">
                  <p className="text-[11px] font-bold text-primary mb-1">Action suggérée</p>
                  <p className="text-[12px] text-foreground/80 leading-relaxed">
                    {conseil.advice_tip}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
