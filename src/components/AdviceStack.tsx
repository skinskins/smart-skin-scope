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
  const CARD_H = 340;

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -100) {
      setActiveCard((prev) => (prev + 1) % count);
    } else if (info.offset.x > 100) {
      setActiveCard((prev) => (prev - 1 + count) % count);
    }
  };

  return (
    <div className="relative py-12 flex justify-center items-center" style={{ height: CARD_H + 60 }}>
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
              onDragEnd={handleDragEnd}
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
                height: CARD_H,
                cursor: isTop ? "grab" : "default",
                touchAction: "none"
              }}
              onClick={() => isTop && onSelectAdvice(advice)}
              className={`p-8 rounded-[32px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col justify-between active:cursor-grabbing hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-shadow`}
            >
              <div className="flex items-start gap-6">
                <span className="text-5xl">{advice.iconStr}</span>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-display text-xl text-foreground italic mb-2">{advice.title}</h3>
                  <p className="text-[13px] text-foreground/60 leading-relaxed italic">
                    {advice.text}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-primary/5 pt-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em] opacity-80">
                  Explorer <ChevronRight size={12} strokeWidth={3} />
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
