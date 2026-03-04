import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScanState = "idle" | "analyzing" | "result";

interface Marker {
  x: number; y: number; label: string; severity: "clear" | "mild" | "attention";
  color: string;
}

const mockMarkers: Marker[] = [
  { x: 30, y: 25, label: "Redness", severity: "mild", color: "hsl(0, 70%, 60%)" },
  { x: 65, y: 20, label: "Pores", severity: "mild", color: "hsl(280, 30%, 55%)" },
  { x: 45, y: 45, label: "Dryness", severity: "attention", color: "hsl(35, 70%, 55%)" },
  { x: 55, y: 65, label: "Acne", severity: "mild", color: "hsl(0, 70%, 60%)" },
  { x: 35, y: 55, label: "Pigmentation", severity: "clear", color: "hsl(45, 80%, 65%)" },
  { x: 50, y: 35, label: "Texture", severity: "clear", color: "hsl(280, 30%, 55%)" },
];

const mockFindings = [
  { area: "Forehead", status: "clear", note: "No issues" },
  { area: "Cheeks", status: "mild", note: "Slight dryness" },
  { area: "T-Zone", status: "attention", note: "Excess oil" },
  { area: "Chin", status: "clear", note: "Healthy" },
];

const Diagnosis = () => {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
      setScanState("analyzing");
      setTimeout(() => setScanState("result"), 2500);
    };
    reader.readAsDataURL(file);
  };

  const reset = () => { setScanState("idle"); setUploadedImage(null); };

  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-display font-semibold text-foreground mb-1">Skin Scan</h1>
        <p className="text-sm text-muted-foreground mb-5">Upload a photo for AI analysis</p>
      </motion.div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleUpload} />

      <AnimatePresence mode="wait">
        {scanState === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <div className="w-64 h-64 rounded-3xl bg-accent/50 border-2 border-dashed border-primary/30 flex items-center justify-center mb-6">
              <Upload size={60} className="text-primary/40" />
            </div>
            <p className="text-center text-muted-foreground text-sm mb-5">Take or upload a selfie for analysis</p>
            <div className="flex gap-3">
              <Button onClick={() => fileInputRef.current?.click()} className="rounded-full px-6 py-5 bg-primary text-primary-foreground shadow-elevated">
                <Camera size={18} className="mr-2" />Upload Photo
              </Button>
            </div>
          </motion.div>
        )}

        {scanState === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            {uploadedImage && (
              <div className="w-64 h-64 rounded-3xl overflow-hidden mb-6 relative">
                <img src={uploadedImage} alt="Scan" className="w-full h-full object-cover" />
                <motion.div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent"
                  animate={{ y: ["-100%", "100%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-primary" />
              <span className="text-foreground font-medium">Analyzing skin...</span>
            </div>
          </motion.div>
        )}

        {scanState === "result" && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Photo with markers */}
            {uploadedImage && (
              <div className="relative rounded-2xl overflow-hidden mb-4 shadow-card">
                <img src={uploadedImage} alt="Analysis" className="w-full aspect-square object-cover" />
                {mockMarkers.map((m, i) => (
                  <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                    className="absolute flex flex-col items-center" style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -50%)" }}>
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold"
                      style={{ borderColor: m.color, backgroundColor: `${m.color}30`, color: m.color }}>
                      {m.severity === "clear" ? "✓" : "!"}
                    </div>
                    <span className="text-[9px] font-semibold mt-0.5 px-1 rounded bg-card/80 backdrop-blur-sm" style={{ color: m.color }}>
                      {m.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Comparison text */}
            <div className="bg-card rounded-xl p-4 shadow-card mb-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">vs. last scan:</span> Redness ↓12%, Hydration ↑5%. Dryness on cheeks persists.
              </p>
            </div>

            {/* Findings */}
            <h3 className="font-display font-semibold text-foreground mb-2">Findings</h3>
            <div className="space-y-2 mb-4">
              {mockFindings.map((f, i) => (
                <motion.div key={f.area} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  className="bg-card rounded-xl p-3 shadow-card flex items-center gap-3">
                  {f.status === "clear" ? <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                    : <AlertTriangle size={16} className="text-skin-oil flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{f.area}</p>
                    <p className="text-xs text-muted-foreground">{f.note}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button onClick={reset} variant="outline" className="w-full rounded-xl py-5">
              <RotateCcw size={16} className="mr-2" />Scan Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Diagnosis;
