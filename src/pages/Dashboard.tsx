import { motion } from "framer-motion";
import { Droplets, Sun, Flame, Fingerprint, CircleDot, Calendar, CloudSun, Heart, Moon, Wine, Dumbbell, FlaskConical, Thermometer, Bluetooth, BluetoothOff, Check, Stethoscope, ChevronRight, MapPin, Camera } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SkinScoreRing from "@/components/SkinScoreRing";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

const skinMetrics = [
  { label: "Hydratation", value: 72, color: "hsl(200, 60%, 55%)", icon: <Droplets size={18} />, trend: "up" as const, detail: "Estimation basée sur vos apports quotidiens et l'humidité ambiante." },
  { label: "Éclat", value: 65, color: "hsl(45, 80%, 65%)", icon: <Sun size={18} />, trend: "stable" as const, detail: "Calculé à partir du sommeil, des produits et de la luminosité du scan." },
  { label: "Rougeurs", value: 28, color: "hsl(0, 70%, 60%)", icon: <Flame size={18} />, trend: "down" as const, detail: "Plus bas = mieux. Basé sur l'analyse du scan et les facteurs d'inflammation." },
  { label: "Texture", value: 80, color: "hsl(280, 30%, 55%)", icon: <Fingerprint size={18} />, trend: "up" as const, detail: "Indice de lissage issu des scans et de l'utilisation de rétinol." },
  { label: "Sébum", value: 45, color: "hsl(35, 70%, 55%)", icon: <CircleDot size={18} />, trend: "stable" as const, detail: "Production de sébum en zone T. 50 = équilibré." },
];

const defaultDailyLog = {
  weather: { temp: 24, humidity: 55, uv: 6, pollution: "Faible" },
  location: "Montreuil, 93",
  cyclePhase: "Folliculaire",
  heartRate: 72,
  stressLevel: 3,
  waterGlasses: 6,
  sleepHours: 7.5,
  alcohol: false,
  workoutIntensity: "Modéré",
};

const cyclePhases = ["Menstruel", "Folliculaire", "Ovulatoire", "Lutéal"];
const intensities = ["Aucun", "Léger", "Modéré", "Intense"];

const amProducts = ["Nettoyant", "Tonique", "Sérum", "Hydratant", "SPF 50", "Contour yeux"];
const pmProducts = ["Nettoyant", "Tonique", "Sérum", "Hydratant", "Rétinol", "Masque", "Contour yeux"];

const pastDays = [
  { label: "Lun", score: 68, hasDiag: true },
  { label: "Mar", score: 71, hasDiag: false },
];

const hasTodayDiag = false;

const factorDetails: Record<string, { title: string; desc: string }> = {
  temp: { title: "Température", desc: "Les hautes températures augmentent le sébum. Idéal : 18–22°C." },
  humidity: { title: "Humidité", desc: "Faible humidité = peau sèche. Haute = pores obstrués. Idéal : 40–60%." },
  uv: { title: "Indice UV", desc: "UV 6+ : réappliquer SPF toutes les 2h. Cause vieillissement et taches." },
  air: { title: "Qualité de l'air", desc: "La pollution pénètre les pores et cause stress oxydatif et teint terne." },
  location: { title: "Localisation", desc: "Votre position permet d'ajuster les données météo, UV et pollution en temps réel." },
  cycle: { title: "Phase du cycle", desc: "Lutéal = plus gras. Menstruel = sensible. Folliculaire = équilibré." },
  heartStress: { title: "Cœur & Stress", desc: "Le stress augmente le cortisol → plus de boutons. L'exercice améliore l'éclat." },
  water: { title: "Hydratation", desc: "6–8 verres/jour soutiennent la barrière cutanée." },
  sleep: { title: "Sommeil", desc: "La peau se répare pendant le sommeil profond. <6h = collagène altéré." },
  alcohol: { title: "Alcool", desc: "Déshydrate la peau, dilate les vaisseaux et réduit les vitamines A & C." },
  workout: { title: "Sport", desc: "L'exercice modéré améliore la circulation. Intense sans nettoyage = boutons." },
};

const Dashboard = () => {
  const [dailyLog, setDailyLog] = useState(defaultDailyLog);
  const [amSelected, setAmSelected] = useState<string[]>(["Nettoyant", "SPF 50", "Hydratant"]);
  const [pmSelected, setPmSelected] = useState<string[]>(["Nettoyant", "Hydratant"]);
  const [productTime, setProductTime] = useState<"am" | "pm">("am");
  const [productsSaved, setProductsSaved] = useState(false);
  const [deviceConnected] = useState(false);
  const [factorOpen, setFactorOpen] = useState<string | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const navigate = useNavigate();

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
        <p className="text-muted-foreground text-sm font-medium">Bonjour ✨</p>
        <h1 className="text-2xl font-display font-semibold text-foreground mt-1">Votre peau aujourd'hui</h1>
      </motion.div>

      {/* Diagnostic CTA + Score combined panel */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
        className="bg-card rounded-3xl p-6 shadow-card mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/30 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-start gap-5">
          {/* Diagnostic photo placeholder */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden ${
              hasTodayDiag ? 'border-primary' : 'border-muted-foreground/20 bg-muted/50'
            }`}>
              {hasTodayDiag ? (
                <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">Photo</div>
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <Camera size={20} className="text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground">Pas encore</span>
                </div>
              )}
            </div>
            {pastDays.length > 0 && (
              <div className="flex gap-1">
                {pastDays.map((day) => (
                  <button key={day.label}
                    className="flex flex-col items-center bg-muted/50 hover:bg-muted rounded-lg px-1.5 py-0.5 transition-colors"
                    onClick={() => {/* TODO: show past diagnostic */}}>
                    <span className="text-[8px] font-medium text-muted-foreground">{day.label}</span>
                    <span className={`text-[9px] font-semibold ${day.hasDiag ? 'text-primary' : 'text-muted-foreground/40'}`}>
                      {day.score}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Score + info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 cursor-pointer" onClick={() => setScoreOpen(true)}>
                <SkinScoreRing score={74} size={80} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Votre peau est <span className="text-primary font-semibold">belle</span></p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground/60">
                  <Calendar size={10} /><span>Dernier diag : il y a 2h</span>
                </div>
                <button onClick={() => setScoreOpen(true)} className="text-[10px] text-primary font-medium mt-1 underline underline-offset-2">
                  Voir le détail
                </button>
              </div>
            </div>

            <button onClick={() => navigate("/diagnosis")}
              className="mt-3 w-full flex items-center justify-between bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-elevated hover:opacity-90 transition-opacity">
              <div className="flex items-center gap-3">
                <Stethoscope size={18} />
                <div className="text-left">
                  <p className="text-xs font-semibold">Faire un diagnostic</p>
                  <p className="text-[9px] opacity-80">Analysez votre peau en 30s</p>
                </div>
              </div>
              <ChevronRight size={16} className="opacity-60" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Détail du score */}
      <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Détail du score</DialogTitle>
            <DialogDescription>Comment votre score de 74/100 est calculé</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {skinMetrics.map(m => (
              <div key={m.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">{m.icon}{m.label}</span>
                <span className="font-semibold text-foreground">{m.value}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Moyenne pondérée</span>
              <span className="font-semibold text-primary">74</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Score = moyenne pondérée. Rougeurs inversées (bas = mieux).</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appareil connecté */}
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
              {deviceConnected ? "Apple Watch connectée" : "Aucun appareil connecté"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {deviceConnected ? "Sport et rythme cardiaque synchronisés" : "Rythme cardiaque, sport et sommeil en saisie manuelle"}
            </p>
          </div>
        </div>
        <button className="text-[10px] font-medium text-primary px-2 py-1 rounded-full bg-accent">
          {deviceConnected ? "Réglages" : "Connecter"}
        </button>
      </motion.div>

      {/* Facteurs quotidiens */}
      <h2 className="text-lg font-display font-semibold text-foreground mb-3">Facteurs du jour</h2>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-2xl p-4 shadow-card mb-4">
        {/* Location row */}
        <FactorButton id="location">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
            <MapPin size={16} className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Localisation</p>
              <p className="text-sm font-semibold text-foreground">{dailyLog.location}</p>
            </div>
            <span className="ml-auto flex items-center gap-1 text-[9px] text-primary/60">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              En direct
            </span>
          </div>
        </FactorButton>
        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          {[
            { id: "temp", icon: <Thermometer size={16} className="text-skin-redness" />, val: `${dailyLog.weather.temp}°C`, sub: "Temp" },
            { id: "humidity", icon: <Droplets size={16} className="text-skin-hydration" />, val: `${dailyLog.weather.humidity}%`, sub: "Humidité" },
            { id: "uv", icon: <Sun size={16} className="text-skin-glow" />, val: `${dailyLog.weather.uv}`, sub: "UV" },
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
                <p className="text-xs text-muted-foreground">Cœur / Stress</p>
                <p className="text-sm font-semibold text-foreground">{dailyLog.heartRate} bpm · {dailyLog.stressLevel}/5</p>
                {!deviceConnected && <p className="text-[9px] text-muted-foreground/60">Manuel</p>}
              </div>
            </div>
          </FactorButton>
          <FactorButton id="water">
            <div className="flex items-center gap-2 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
              <Droplets size={16} className="text-skin-hydration" />
              <div>
                <p className="text-xs text-muted-foreground">Eau</p>
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
                <p className="text-xs text-muted-foreground">Sommeil</p>
                <p className="text-sm font-semibold text-foreground">{dailyLog.sleepHours}h</p>
                {!deviceConnected && <p className="text-[9px] text-muted-foreground/60">Manuel</p>}
              </div>
            </div>
          </FactorButton>
          <FactorButton id="alcohol">
            <div className="flex items-center gap-2 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
              <Wine size={16} className="text-skin-oil" />
              <div>
                <p className="text-xs text-muted-foreground">Alcool</p>
                <button onClick={(e) => { e.stopPropagation(); setDailyLog(d => ({ ...d, alcohol: !d.alcohol })); }}
                  className={`text-sm font-semibold ${dailyLog.alcohol ? 'text-skin-redness' : 'text-primary'}`}>
                  {dailyLog.alcohol ? "Oui" : "Non"}
                </button>
              </div>
            </div>
          </FactorButton>
          <FactorButton id="workout">
            <div className="flex items-center gap-2 hover:bg-accent/50 rounded-xl p-1.5 transition-colors">
              <Dumbbell size={16} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Sport</p>
                <select value={dailyLog.workoutIntensity} onClick={e => e.stopPropagation()}
                  onChange={e => setDailyLog(d => ({ ...d, workoutIntensity: e.target.value }))}
                  className="text-sm font-semibold text-foreground bg-transparent border-none p-0 focus:outline-none">
                  {intensities.map(i => <option key={i}>{i}</option>)}
                </select>
                {!deviceConnected && <p className="text-[9px] text-muted-foreground/60">Manuel</p>}
              </div>
            </div>
          </FactorButton>
        </div>
      </motion.div>

      {/* Dialogue facteur */}
      <Dialog open={!!factorOpen} onOpenChange={() => setFactorOpen(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{factorOpen ? factorDetails[factorOpen]?.title : ""}</DialogTitle>
            <DialogDescription>{factorOpen ? factorDetails[factorOpen]?.desc : ""}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Produits utilisés */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card rounded-2xl p-4 shadow-card mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Produits utilisés</p>
          <div className="flex bg-muted rounded-full p-0.5">
            <button onClick={() => { setProductTime("am"); setProductsSaved(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${productTime === "am" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              ☀️ Matin
            </button>
            <button onClick={() => { setProductTime("pm"); setProductsSaved(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${productTime === "pm" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              🌙 Soir
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
            productsSaved ? 'bg-accent text-primary' : 'bg-primary text-primary-foreground'
          }`}>
          {productsSaved ? "✓ Enregistré" : "Enregistrer la routine"}
        </button>
      </motion.div>

      {/* Métriques peau */}
      <h2 className="text-lg font-display font-semibold text-foreground mb-3">Métriques de peau</h2>
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
