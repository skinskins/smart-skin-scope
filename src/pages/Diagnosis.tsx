import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, RotateCcw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type ScanState = "idle" | "analyzing" | "result";

interface Zone {
  id: string; label: string; x: number; y: number; description: string;
}

const faceZones: Zone[] = [
  { id: "forehead", label: "Forehead", x: 50, y: 18, description: "Common area for texture issues, fine lines, and oil buildup." },
  { id: "left-cheek", label: "Left Cheek", x: 25, y: 45, description: "Often shows redness and dryness. Linked to respiratory health." },
  { id: "right-cheek", label: "Right Cheek", x: 75, y: 45, description: "Phone contact area — often shows breakouts and irritation." },
  { id: "nose", label: "T-Zone", x: 50, y: 42, description: "Highest oil production. Pores and blackheads concentrate here." },
  { id: "chin", label: "Chin", x: 50, y: 68, description: "Hormonal breakouts typically appear here, especially during luteal phase." },
  { id: "jaw", label: "Jawline", x: 35, y: 72, description: "Stress and hormonal acne. Often linked to cycle and diet." },
];

const Diagnosis = () => {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
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

  const reset = () => { setScanState("idle"); setUploadedImage(null); setSelectedZone(null); };

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
            {/* Photo with clickable greyed zones */}
            {uploadedImage && (
              <div className="relative rounded-2xl overflow-hidden mb-4 shadow-card">
                <img src={uploadedImage} alt="Analysis" className="w-full aspect-square object-cover" />
                {faceZones.map((zone, i) => (
                  <motion.button
                    key={zone.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedZone(zone)}
                    className="absolute flex flex-col items-center group"
                    style={{ left: `${zone.x}%`, top: `${zone.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/40 bg-muted/50 backdrop-blur-sm flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                      <Lock size={10} className="text-muted-foreground" />
                    </div>
                    <span className="text-[9px] font-medium mt-0.5 px-1.5 py-0.5 rounded bg-card/80 backdrop-blur-sm text-muted-foreground">
                      {zone.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Info banner */}
            <div className="bg-accent rounded-xl p-3 mb-4 flex items-start gap-2">
              <Lock size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                AI analysis not yet available. Tap any zone to learn what it tracks.
              </p>
            </div>

            {/* Comparison text */}
            <div className="bg-card rounded-xl p-4 shadow-card mb-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">vs. last scan:</span> Photo saved for comparison. Full analysis coming soon.
              </p>
            </div>

            <Button onClick={reset} variant="outline" className="w-full rounded-xl py-5">
              <RotateCcw size={16} className="mr-2" />Scan Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone detail dialog */}
      <Dialog open={!!selectedZone} onOpenChange={() => setSelectedZone(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selectedZone?.label}</DialogTitle>
            <DialogDescription>{selectedZone?.description}</DialogDescription>
          </DialogHeader>
          <div className="bg-accent rounded-xl p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Lock size={12} /> Detailed analysis will be available when AI scanning is enabled.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Diagnosis;
