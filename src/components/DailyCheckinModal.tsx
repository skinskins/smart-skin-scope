import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Check, ChevronRight, Moon, Heart, GlassWater, 
  Sparkles, Wine, Dumbbell, Calendar, FlaskRound,
  CircleDot, Flame, Droplets, Sun, Fingerprint, Activity, Waves
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { calculateCyclePhase } from "@/utils/cycle";

interface DailyCheckinModalProps {
  open: boolean;
  onClose: () => void;
  initialLog: any;
  userConcerns: string[];
  onSave: (updatedLog: any) => void;
}

const STRESS_LABELS = ["", "Zen", "Calme", "Modéré", "Élevé", "Extrême"];

const SYMPTOMS_CONFIG = [
  { id: "acné", label: "Acné", icon: <CircleDot size={20} />, problem: "Acné" },
  { id: "rougeurs", label: "Rougeurs", icon: <Flame size={20} />, problem: "Rougeurs" },
  { id: "sécheresse", label: "Sécheresse", icon: <Droplets size={20} />, problem: "Déshydratation" },
  { id: "taches", label: "Taches", icon: <Sun size={20} />, problem: "Taches" },
  { id: "points_noirs", label: "Points noirs", icon: <Fingerprint size={20} />, problem: "Points noirs" },
  { id: "rides", label: "Rides", icon: <Activity size={20} />, problem: "Rides" },
  { id: "cernes", label: "Cernes", icon: <Moon size={20} />, problem: "Cernes" },
  { id: "eczéma", label: "Eczéma", icon: <Waves size={20} />, problem: "Eczéma" },
];

export default function DailyCheckinModal({ open, onClose, initialLog, userConcerns, onSave }: DailyCheckinModalProps) {
  const [step, setStep] = useState(1);
  const [log, setLog] = useState(initialLog);

  // Filter symptoms based on user concerns
  const relevantSymptoms = SYMPTOMS_CONFIG.filter(s => userConcerns.length === 0 || userConcerns.includes(s.problem));
  
  const totalSteps = relevantSymptoms.length;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else {
      onSave(log);
      onClose();
    }
  };

  const updateLog = (key: string, value: any) => {
    setLog((prev: any) => ({ ...prev, [key]: value }));
  };

  const updateSymptom = (id: string, trend: string) => {
    setLog((prev: any) => ({
      ...prev,
      symptoms: { ...(prev.symptoms || {}), [id]: trend }
    }));
  };

  // Steps definition
  // 1 to N: Symptoms
  // N+1: Sleep
  // N+2: Stress
  // N+3: Water
  // N+4: Alcohol
  // N+5: Makeup
  // N+6: Sport

  const renderStep = () => {
    // Symptom steps
    if (step <= relevantSymptoms.length) {
      const symptom = relevantSymptoms[step - 1];
      const currentTrend = log.symptoms?.[symptom.id] || "pareil";
      
      return (
        <div className="space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
              {symptom.icon}
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-50">État de votre peau</p>
              <h3 className="text-xl font-display text-foreground capitalize">{symptom.label}</h3>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center italic">Comment évolue ce symptôme aujourd'hui ?</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: "moins", label: "Amélioration", icon: "↓", color: "text-primary bg-primary/5 border-primary/20" },
              { id: "pareil", label: "Stable / Normal", icon: "→", color: "text-muted-foreground bg-muted/5 border-border/40" },
              { id: "plus", label: "Poussée / Aggravation", icon: "↑", color: "text-[#C08484] bg-[#C08484]/5 border-[#C08484]/20" }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => { updateSymptom(symptom.id, opt.id); handleNext(); }}
                className={`flex items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${currentTrend === opt.id ? opt.color + ' border-primary' : 'bg-white border-border/40'}`}
              >
                <span className="text-sm font-bold">{opt.label}</span>
                <span className={`text-xl font-display italic ${currentTrend === opt.id ? '' : 'opacity-20'}`}>{opt.icon}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-[40px] border-none bg-[#fdfdfd] p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted/20">
          <motion.div 
            className="h-full bg-primary" 
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-8 pt-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-8 pb-8 flex justify-between items-center">
          <button 
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            className={`text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors ${step === 1 ? 'invisible' : ''}`}
          >
            Précédent
          </button>
          <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em]">Étape {step} / {totalSteps}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
