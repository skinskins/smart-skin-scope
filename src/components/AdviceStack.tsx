import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { AdviceItem } from "@/utils/advice";

interface AdviceStackProps {
  adviceList: AdviceItem[];
  onSelectAdvice: (advice: AdviceItem) => void;
}

const AdviceStack: React.FC<AdviceStackProps> = ({ adviceList, onSelectAdvice }) => {
  const [activeCard, setActiveCard] = useState(0);
  const count = adviceList.length;

  if (count === 0) return null;

  const CARD_W = 320;
  const MIN_H = 400;

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -100) {
      setActiveCard((prev) => (prev + 1) % count);
    } else if (info.offset.x > 100) {
      setActiveCard((prev) => (prev - 1 + count) % count);
    }
  };

  return (
    <div className="relative py-12 flex justify-center items-center" style={{ minHeight: MIN_H + 100 }}>
      <AnimatePresence initial={false}>
        {adviceList.map((advice, i) => {
          const rel = ((i - activeCard) + count) % count;
          if (rel > 2 && rel < count - 1) return null; // Show only top 3

          const isTop = rel === 0;
          const xOffset = rel === 0 ? 0 : rel === 1 ? 20 : rel === count - 1 ? -20 : 0;
          const scale = rel === 0 ? 1 : 0.95 - (rel === 1 || rel === count - 1 ? 0.05 : 0.1);
          const rotate = rel === 0 ? 0 : rel === 1 ? 4 : rel === count - 1 ? -4 : 0;
          const zIndex = rel === 0 ? 30 : rel === 1 || rel === count - 1 ? 20 : 10;

          return (
            <motion.div
              key={`${i}-${activeCard}`}
              drag={isTop ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={handleDragEnd}
              whileDrag={{ scale: 1.05, rotate: 0 }}
              animate={{
                x: xOffset,
                rotate: rotate,
                scale: scale,
                opacity: 1,
                zIndex: zIndex
              }}
              exit={{
                opacity: 0,
                scale: 0.8,
                x: xOffset > 0 ? 200 : -200,
                transition: { duration: 0.2 }
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: "absolute",
                width: CARD_W,
                minHeight: MIN_H,
                height: "auto",
                cursor: isTop ? "grab" : "default",
                touchAction: "none"
              }}
              className={`p-10 rounded-[40px] bg-white border border-black/[0.03] shadow-[0_30px_70px_rgba(0,0,0,0.12)] flex flex-col justify-between active:cursor-grabbing hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] transition-shadow`}
            >
              <div className="flex flex-col gap-8">
                <div className="flex items-center gap-4">
                  <span className="text-xl w-11 h-11 flex items-center justify-center bg-primary/5 rounded-2xl shadow-inner">{advice.iconStr}</span>
                  <h3 className="font-display text-xl text-foreground italic leading-tight flex-1 tracking-tight">{advice.title}</h3>
                </div>
                <div className="space-y-5">
                  <p className="text-[16px] text-foreground/80 leading-relaxed italic font-light">
                    {advice.text}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-primary/5 pt-6">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isTop) onSelectAdvice(advice);
                  }}
                  className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em] opacity-80 cursor-pointer hover:opacity-100 transition-opacity"
                >
                  Plus d'infos <ChevronRight size={12} strokeWidth={3} />
                </div>
                <div className="flex gap-1.5">
                  {adviceList.map((_, dotIdx) => (
                    <div
                      key={dotIdx}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${dotIdx === i ? 'bg-primary w-4' : 'bg-primary/10'}`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AdviceStack;
