import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Heart, Footprints, Flame, Activity, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { registerPlugin } from '@capacitor/core';

const HealthKit = registerPlugin<{
  requestAuthorization: () => Promise<{ authorized: boolean }>;
  getSteps: () => Promise<{ value: number }>;
  getHeartRate: () => Promise<{ value: number }>;
  getCalories: () => Promise<{ value: number }>;
}>('HealthKit');

const READ_PERMISSIONS = [
  "steps",
  "calories",
  "heart_rate",
  "sleep_analysis",
  "distance",
  "activity",
];

export default function HealthKitPage() {
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState<{
    steps: number | string;
    calories: number | string;
    heartRate: number | string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initHealthKit();
  }, []);

  async function initHealthKit() {
  try {
    setLoading(true);
    await HealthKit.requestAuthorization();
    await fetchHealthData();
  } catch (e) {
    console.error("HealthKit Error:", e);
    setError("Accès à Apple Health refusé ou non configuré");
    setLoading(false);
  }
}

async function fetchHealthData() {
  try {
    const [steps, calories, heartRate] = await Promise.all([
      HealthKit.getSteps(),
      HealthKit.getCalories(),
      HealthKit.getHeartRate(),
    ]);

    setHealthData({
      steps: steps.value,
      calories: calories.value,
      heartRate: heartRate.value || "—",
    });
  } catch (e) {
    console.error("Fetch error:", e);
    setError("Erreur lors de la lecture des données");
  } finally {
    setLoading(false);
  }
}

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Synchronisation Apple Health...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 px-6 pt-12 max-w-lg mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-12 flex items-center gap-4"
      >
        <button 
          onClick={() => navigate("/profile")} 
          className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-white transition-all active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.3em] opacity-80">Données Bio</p>
          <h1 className="text-4xl font-display text-foreground italic">Santé</h1>
        </div>
      </motion.div>

      {error ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="premium-card p-8 text-center space-y-6"
        >
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mx-auto">
            <ShieldCheck size={32} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display italic">Accès requis</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pour une analyse personnalisée, nous avons besoin d'accéder à vos données Apple Health. 
              Veuillez autoriser l'accès dans les réglages de votre iPhone.
            </p>
          </div>
          <button 
            onClick={initHealthKit}
            className="w-full h-14 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest premium-shadow active:scale-95 transition-all"
          >
            Réessayer
          </button>
        </motion.div>
      ) : healthData && (
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="premium-card p-8 flex justify-between items-center group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <Footprints size={80} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Activité</p>
              <h3 className="text-3xl font-display italic">{healthData.steps} <span className="text-sm font-body not-italic opacity-40 uppercase tracking-widest ml-1">pas</span></h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Footprints size={24} strokeWidth={1.5} />
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="premium-card p-6 space-y-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FF4B4B]/10 flex items-center justify-center text-[#FF4B4B]">
                <Flame size={20} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Calories</p>
                <p className="text-2xl font-display italic">{healthData.calories} <span className="text-[10px] font-body not-italic opacity-40 uppercase ml-1">kcal</span></p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="premium-card p-6 space-y-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FF4B4B]/10 flex items-center justify-center text-[#FF4B4B]">
                <Heart size={20} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Cœur</p>
                <p className="text-2xl font-display italic">{healthData.heartRate} <span className="text-[10px] font-body not-italic opacity-40 uppercase ml-1">bpm</span></p>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="premium-card p-8 bg-gradient-to-br from-primary/5 to-transparent border-primary/20"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Activity size={20} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Le saviez-vous ?</p>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "Votre activité physique et votre fréquence cardiaque influencent directement l'oxygénation de votre peau et son renouvellement cellulaire."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
