import { motion } from "framer-motion";
import { Droplets, Sun, Flame, Fingerprint, CircleDot, Calendar, CloudSun, Heart, Moon, Wine, Dumbbell, FlaskConical, Thermometer } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SkinScoreRing from "@/components/SkinScoreRing";
import { useState } from "react";

const skinMetrics = [
  { label: "Hydration", value: 72, color: "hsl(200, 60%, 55%)", icon: <Droplets size={18} />, trend: "up" as const },
  { label: "Glow", value: 65, color: "hsl(45, 80%, 65%)", icon: <Sun size={18} />, trend: "stable" as const },
  { label: "Redness", value: 28, color: "hsl(0, 70%, 60%)", icon: <Flame size={18} />, trend: "down" as const },
  { label: "Texture", value: 80, color: "hsl(280, 30%, 55%)", icon: <Fingerprint size={18} />, trend: "up" as const },
  { label: "Oiliness", value: 45, color: "hsl(35, 70%, 55%)", icon: <CircleDot size={18} />, trend: "stable" as const },
];

const defaultDailyLog = {
  weather: { temp: 24, humidity: 55, uv: 6, pollution: "Low" },
  cyclePhase: "Follicular",
  heartRate: 72,
  stressLevel: 3,
  waterGlasses: 6,
  sleepHours: 7.5,
  alcohol: false,
  workoutIntensity: "Moderate",
  products: ["Cleanser", "SPF 50", "Moisturizer"],
};

const cyclePhases = ["Menstrual", "Follicular", "Ovulatory", "Luteal"];
const intensities = ["None", "Light", "Moderate", "Intense"];
const productOptions = ["Cleanser", "Toner", "Serum", "Moisturizer", "SPF 50", "Retinol", "Mask", "Eye Cream"];

const Dashboard = () => {
  const [dailyLog, setDailyLog] = useState(defaultDailyLog);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(dailyLog.products);

  const toggleProduct = (p: string) => {
    setSelectedProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-muted-foreground text-sm font-medium">Good morning ✨</p>
        <h1 className="text-2xl font-display font-semibold text-foreground mt-1">Your Skin Today</h1>
      </motion.div>

      {/* Overall Score */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        className="flex flex-col items-center bg-card rounded-3xl p-6 shadow-card mb-5">
        <SkinScoreRing score={74} />
        <p className="mt-3 text-sm text-muted-foreground">Skin looks <span className="text-primary font-semibold">good</span> today</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Calendar size={14} /><span>Last scan: 2h ago</span>
        </div>
      </motion.div>

      {/* Environment & Body */}
      <h2 className="text-lg font-display font-semibold text-foreground mb-3">Daily Factors</h2>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-2xl p-4 shadow-card mb-4">
        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          <div className="flex flex-col items-center gap-1">
            <Thermometer size={16} className="text-skin-redness" />
            <span className="font-semibold text-foreground">{dailyLog.weather.temp}°C</span>
            <span className="text-muted-foreground">Temp</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Droplets size={16} className="text-skin-hydration" />
            <span className="font-semibold text-foreground">{dailyLog.weather.humidity}%</span>
            <span className="text-muted-foreground">Humidity</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Sun size={16} className="text-skin-glow" />
            <span className="font-semibold text-foreground">{dailyLog.weather.uv}</span>
            <span className="text-muted-foreground">UV Index</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <CloudSun size={16} className="text-muted-foreground" />
            <span className="font-semibold text-foreground">{dailyLog.weather.pollution}</span>
            <span className="text-muted-foreground">Air</span>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl p-4 shadow-card mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-skin-texture" />
            <div>
              <p className="text-xs text-muted-foreground">Cycle</p>
              <select value={dailyLog.cyclePhase} onChange={e => setDailyLog(d => ({ ...d, cyclePhase: e.target.value }))}
                className="text-sm font-semibold text-foreground bg-transparent border-none p-0 focus:outline-none">
                {cyclePhases.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-skin-redness" />
            <div>
              <p className="text-xs text-muted-foreground">Heart / Stress</p>
              <p className="text-sm font-semibold text-foreground">{dailyLog.heartRate} bpm · {dailyLog.stressLevel}/5</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets size={16} className="text-skin-hydration" />
            <div>
              <p className="text-xs text-muted-foreground">Water</p>
              <div className="flex gap-0.5">
                {[...Array(8)].map((_, i) => (
                  <button key={i} onClick={() => setDailyLog(d => ({ ...d, waterGlasses: i + 1 }))}
                    className={`w-3 h-4 rounded-sm ${i < dailyLog.waterGlasses ? 'bg-skin-hydration' : 'bg-muted'}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Moon size={16} className="text-skin-texture" />
            <div>
              <p className="text-xs text-muted-foreground">Sleep</p>
              <p className="text-sm font-semibold text-foreground">{dailyLog.sleepHours}h</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wine size={16} className="text-skin-oil" />
            <div>
              <p className="text-xs text-muted-foreground">Alcohol</p>
              <button onClick={() => setDailyLog(d => ({ ...d, alcohol: !d.alcohol }))}
                className={`text-sm font-semibold ${dailyLog.alcohol ? 'text-skin-redness' : 'text-primary'}`}>
                {dailyLog.alcohol ? "Yes" : "No"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dumbbell size={16} className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Workout</p>
              <select value={dailyLog.workoutIntensity} onChange={e => setDailyLog(d => ({ ...d, workoutIntensity: e.target.value }))}
                className="text-sm font-semibold text-foreground bg-transparent border-none p-0 focus:outline-none">
                {intensities.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Products Used */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card rounded-2xl p-4 shadow-card mb-5">
        <p className="text-sm font-semibold text-foreground mb-2">Products Used</p>
        <div className="flex flex-wrap gap-2">
          {productOptions.map(p => (
            <button key={p} onClick={() => toggleProduct(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedProducts.includes(p) ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Skin Metrics */}
      <h2 className="text-lg font-display font-semibold text-foreground mb-3">Skin Metrics</h2>
      <div className="grid grid-cols-2 gap-3">
        {skinMetrics.map((metric, i) => (
          <motion.div key={metric.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
            <MetricCard {...metric} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
