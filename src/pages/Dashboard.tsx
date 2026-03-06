import { motion } from "framer-motion";
import { Droplets, Sun, Flame, Fingerprint, CircleDot, Calendar, CloudSun, Heart, Moon, Wine, Dumbbell, FlaskConical, Thermometer, Bluetooth, BluetoothOff, Check, Camera, ImageIcon } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SkinScoreRing from "@/components/SkinScoreRing";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

const skinMetrics = [
  { label: "Hydration", value: 72, color: "hsl(200, 60%, 55%)", icon: <Droplets size={18} />, trend: "up" as const, detail: "Measured via skin capacitance estimation from your daily inputs." },
  { label: "Glow", value: 65, color: "hsl(45, 80%, 65%)", icon: <Sun size={18} />, trend: "stable" as const, detail: "Calculated from sleep, product use, and recent scan luminosity." },
  { label: "Redness", value: 28, color: "hsl(0, 70%, 60%)", icon: <Flame size={18} />, trend: "down" as const, detail: "Lower is better. Based on scan analysis and inflammation factors." },
  { label: "Texture", value: 80, color: "hsl(280, 30%, 55%)", icon: <Fingerprint size={18} />, trend: "up" as const, detail: "Smoothness index from recent scans and retinol/exfoliation use." },
  { label: "Oiliness", value: 45, color: "hsl(35, 70%, 55%)", icon: <CircleDot size={18} />, trend: "stable" as const, detail: "T-zone oil production estimate. 50 = balanced." },
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
};

const cyclePhases = ["Menstrual", "Follicular", "Ovulatory", "Luteal"];
const intensities = ["None", "Light", "Moderate", "Intense"];

const amProducts = ["Cleanser", "Toner", "Serum", "Moisturizer", "SPF 50", "Eye Cream"];
const pmProducts = ["Cleanser", "Toner", "Serum", "Moisturizer", "Retinol", "Mask", "Eye Cream"];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const factorDetails: Record<string, { title: string; desc: string }> = {
  temp: { title: "Temperature", desc: "High temps increase oil production and sweat. Low temps dry skin out. Ideal: 18–22°C." },
  humidity: { title: "Humidity", desc: "Low humidity dehydrates skin. High humidity can clog pores. Ideal: 40–60%." },
  uv: { title: "UV Index", desc: "UV 6+ requires SPF reapplication every 2h. Causes aging and pigmentation." },
  air: { title: "Air Quality", desc: "Pollution particles penetrate pores causing oxidative stress and dullness." },
  cycle: { title: "Cycle Phase", desc: "Hormones affect sebum. Luteal = oilier. Menstrual = more sensitive. Follicular = balanced." },
  heartStress: { title: "Heart Rate & Stress", desc: "High stress raises cortisol → more breakouts. Exercise improves circulation → better glow." },
  water: { title: "Water Intake", desc: "6–8 glasses daily supports skin barrier. Dehydration shows as dullness and fine lines." },
  sleep: { title: "Sleep", desc: "Skin repairs during deep sleep. <6h impairs collagen production and barrier recovery." },
  alcohol: { title: "Alcohol", desc: "Dehydrates skin, dilates blood vessels (redness), and depletes vitamins A & C." },
  workout: { title: "Workout", desc: "Moderate exercise boosts circulation and glow. Intense without cleansing can cause breakouts." },
};

const Dashboard = () => {
  const [dailyLog, setDailyLog] = useState(defaultDailyLog);
  const [amSelected, setAmSelected] = useState<string[]>(["Cleanser", "SPF 50", "Moisturizer"]);
  const [pmSelected, setPmSelected] = useState<string[]>(["Cleanser", "Moisturizer"]);
  const [productTime, setProductTime] = useState<"am" | "pm">("am");
  const [productsSaved, setProductsSaved] = useState(false);
  const [deviceConnected] = useState(false);
  const [factorOpen, setFactorOpen] = useState<string | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const navigate = useNavigate();

  // Mock: today = Wednesday (index 2), with some days having photos
  const todayIndex = 2;
  const weekPhotos: (string | null)[] = [null, null, null, null, null, null, null]; // No real photos

  const currentProducts = productTime === "am" ? amProducts : pmProducts;
  const selected = productTime === "am" ? amSelected : pmSelected;
  const setSelected = productTime === "am" ? setAmSelected : setPmSelected;

  const toggleProduct = (p: string) => {
    setProductsSaved(false);
    setSelected(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const saveProducts = () => setProductsSaved(true);

  const FactorButton = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <button onClick={() => setFactorOpen(id)} className="text-left w-full">
      {children}
    </button>
  );

  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-muted-foreground text-sm font-medium">Good morning ✨</p>
        <h1 className="text-2xl font-display font-semibold text-foreground mt-1">Your Skin Today</h1>
      </motion.div>

      {/* Today's Photo + Week Strip */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
        className="bg-card rounded-2xl p-4 shadow-card mb-4">
        <p className="text-sm font-semibold text-foreground mb-3">Daily Photo</p>
        <div className="flex justify-center mb-3">
          <button onClick={() => navigate("/diagnosis")}
            className="w-32 h-32 rounded-2xl bg-accent/50 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-2">
            <Camera size={28} className="text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">Take today's photo</span>
          </button>
        </div>
        <div className="flex gap-2 justify-between">
          {weekDays.map((day, i) => (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-medium ${i === todayIndex ? 'text-primary' : 'text-muted-foreground'}`}>{day}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                i === todayIndex ? 'ring-2 ring-primary' : ''
              } ${weekPhotos[i] ? 'bg-accent' : 'bg-muted'}`}>
                {weekPhotos[i] ? (
                  <img src={weekPhotos[i]!} alt={day} className="w-full h-full rounded-lg object-cover" />
                ) : (
                  <ImageIcon size={12} className="text-muted-foreground/40" />
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Overall Score */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        className="flex flex-col items-center bg-card rounded-3xl p-6 shadow-card mb-5 cursor-pointer hover:shadow-elevated transition-shadow"
        onClick={() => setScoreOpen(true)}>
        <SkinScoreRing score={74} />
        <p className="mt-3 text-sm text-muted-foreground">Skin looks <span className="text-primary font-semibold">good</span> today</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Calendar size={14} /><span>Last scan: 2h ago</span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground/60">Tap for breakdown</p>
      </motion.div>

      {/* Score detail dialog */}
      <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Skin Score Breakdown</DialogTitle>
            <DialogDescription>How your overall 74/100 is calculated</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {skinMetrics.map(m => (
              <div key={m.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">{m.icon}{m.label}</span>
                <span className="font-semibold text-foreground">{m.value}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Weighted Average</span>
              <span className="font-semibold text-primary">74</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Score = weighted avg of all metrics. Redness is inverted (lower = better).</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Device Connection Banner */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
        className="bg-card rounded-xl p-3 shadow-card mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {deviceConnected ? (
            <Bluetooth size={16} className="text-primary" />
          ) : (
            <BluetoothOff size={16} className="text-muted-foreground" />
          )}
          <div>
            <p className="text-xs font-semibold text-foreground">
              {deviceConnected ? "Apple Watch connected" : "No device connected"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {deviceConnected ? "Workout & heart rate sync automatically" : "Heart rate, workout & sleep are manual entry"}
            </p>
          </div>
        </div>
        <button className="text-[10px] font-medium text-primary px-2 py-1 rounded-full bg-accent">
          {deviceConnected ? "Settings" : "Connect"}
        </button>
      </motion.div>

      {/* Environment & Body */}
      <h2 className="text-lg font-display font-semibold text-foreground mb-3">Daily Factors</h2>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-2xl p-4 shadow-card mb-4">
        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          {[
            { id: "temp", icon: <Thermometer size={16} className="text-skin-redness" />, val: `${dailyLog.weather.temp}°C`, sub: "Temp" },
            { id: "humidity", icon: <Droplets size={16} className="text-skin-hydration" />, val: `${dailyLog.weather.humidity}%`, sub: "Humidity" },
            { id: "uv", icon: <Sun size={16} className="text-skin-glow" />, val: `${dailyLog.weather.uv}`, sub: "UV Index" },
            { id: "air", icon: <CloudSun size={16} className="text-muted-foreground" />, val: dailyLog.weather.pollution, sub: "Air" },
          ].map(item => (
            <FactorButton key={item.id} id={item.id}>
              <div className="flex flex-col items-center gap-1 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
                {item.icon}
                <span className="font-semibold text-foreground">{item.val}</span>
                <span className="text-muted-foreground">{item.sub}</span>
              </div>
            </FactorButton>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl p-4 shadow-card mb-4">
        <div className="grid grid-cols-2 gap-3">
          <FactorButton id="cycle">
            <div className="flex items-center gap-2 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
              <FlaskConical size={16} className="text-skin-texture" />
              <div>
                <p className="text-xs text-muted-foreground">Cycle</p>
                <select value={dailyLog.cyclePhase} onClick={e => e.stopPropagation()}
                  onChange={e => setDailyLog(d => ({ ...d, cyclePhase: e.target.value }))}
                  className="text-sm font-semibold text-foreground bg-transparent border-none p-0 focus:outline-none">
                  {cyclePhases.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </FactorButton>
          <FactorButton id="heartStress">
            <div className="flex items-center gap-2 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
              <Heart size={16} className="text-skin-redness" />
              <div>
                <p className="text-xs text-muted-foreground">Heart / Stress</p>
                <p className="text-sm font-semibold text-foreground">{dailyLog.heartRate} bpm · {dailyLog.stressLevel}/5</p>
                {!deviceConnected && <p className="text-[9px] text-muted-foreground/60">Manual</p>}
              </div>
            </div>
          </FactorButton>
          <FactorButton id="water">
            <div className="flex items-center gap-2 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
              <Droplets size={16} className="text-skin-hydration" />
              <div>
                <p className="text-xs text-muted-foreground">Water</p>
                <div className="flex gap-0.5">
                  {[...Array(8)].map((_, i) => (
                    <button key={i} onClick={(e) => { e.stopPropagation(); setDailyLog(d => ({ ...d, waterGlasses: i + 1 })); }}
                      className={`w-3 h-4 rounded-sm ${i < dailyLog.waterGlasses ? 'bg-skin-hydration' : 'bg-muted'}`} />
                  ))}
                </div>
              </div>
            </div>
          </FactorButton>
          <FactorButton id="sleep">
            <div className="flex items-center gap-2 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
              <Moon size={16} className="text-skin-texture" />
              <div>
                <p className="text-xs text-muted-foreground">Sleep</p>
                <p className="text-sm font-semibold text-foreground">{dailyLog.sleepHours}h</p>
                {!deviceConnected && <p className="text-[9px] text-muted-foreground/60">Manual</p>}
              </div>
            </div>
          </FactorButton>
          <FactorButton id="alcohol">
            <div className="flex items-center gap-2 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
              <Wine size={16} className="text-skin-oil" />
              <div>
                <p className="text-xs text-muted-foreground">Alcohol</p>
                <button onClick={(e) => { e.stopPropagation(); setDailyLog(d => ({ ...d, alcohol: !d.alcohol })); }}
                  className={`text-sm font-semibold ${dailyLog.alcohol ? 'text-skin-redness' : 'text-primary'}`}>
                  {dailyLog.alcohol ? "Yes" : "No"}
                </button>
              </div>
            </div>
          </FactorButton>
          <FactorButton id="workout">
            <div className="flex items-center gap-2 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
              <Dumbbell size={16} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Workout</p>
                <select value={dailyLog.workoutIntensity} onClick={e => e.stopPropagation()}
                  onChange={e => setDailyLog(d => ({ ...d, workoutIntensity: e.target.value }))}
                  className="text-sm font-semibold text-foreground bg-transparent border-none p-0 focus:outline-none">
                  {intensities.map(i => <option key={i}>{i}</option>)}
                </select>
                {!deviceConnected && <p className="text-[9px] text-muted-foreground/60">Manual</p>}
              </div>
            </div>
          </FactorButton>
        </div>
      </motion.div>

      {/* Factor detail dialog */}
      <Dialog open={!!factorOpen} onOpenChange={() => setFactorOpen(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{factorOpen ? factorDetails[factorOpen]?.title : ""}</DialogTitle>
            <DialogDescription>{factorOpen ? factorDetails[factorOpen]?.desc : ""}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Products Used */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card rounded-2xl p-4 shadow-card mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Products Used</p>
          <div className="flex bg-muted rounded-full p-0.5">
            <button onClick={() => { setProductTime("am"); setProductsSaved(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${productTime === "am" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              ☀️ AM
            </button>
            <button onClick={() => { setProductTime("pm"); setProductsSaved(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${productTime === "pm" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              🌙 PM
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {currentProducts.map(p => (
            <button key={p} onClick={() => toggleProduct(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selected.includes(p) ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
              }`}>
              {selected.includes(p) && <Check size={10} className="inline mr-1" />}{p}
            </button>
          ))}
        </div>
        <button onClick={saveProducts}
          className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
            productsSaved
              ? 'bg-accent text-primary'
              : 'bg-primary text-primary-foreground'
          }`}>
          {productsSaved ? "✓ Saved" : "Save Routine"}
        </button>
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
