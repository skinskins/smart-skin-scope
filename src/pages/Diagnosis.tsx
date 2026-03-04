import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ScanFace, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScanState = "idle" | "scanning" | "analyzing" | "result";

const mockResults = {
  overallHealth: "Good",
  findings: [
    { area: "Forehead", status: "clear", note: "No issues detected" },
    { area: "Cheeks", status: "mild", note: "Slight dryness detected" },
    { area: "T-Zone", status: "attention", note: "Excess oil production" },
    { area: "Chin", status: "clear", note: "Skin looks healthy" },
  ],
  recommendations: [
    "Apply a hydrating serum to cheeks before moisturizer",
    "Use a gentle clay mask on T-zone 2x per week",
    "Your SPF routine is working well — keep it up!",
  ],
};

const Diagnosis = () => {
  const [scanState, setScanState] = useState<ScanState>("idle");

  const startScan = () => {
    setScanState("scanning");
    setTimeout(() => setScanState("analyzing"), 2000);
    setTimeout(() => setScanState("result"), 4000);
  };

  const reset = () => setScanState("idle");

  return (
    <div className="min-h-screen pb-24 px-5 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-display font-semibold text-foreground mb-2">Skin Diagnosis</h1>
        <p className="text-sm text-muted-foreground mb-6">AI-powered skin analysis</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {scanState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center"
          >
            <div className="w-72 h-72 rounded-full bg-accent/50 border-2 border-dashed border-primary/30 flex items-center justify-center mb-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-primary/10" />
              <ScanFace size={80} className="text-primary/40" />
            </div>
            <p className="text-center text-muted-foreground text-sm mb-6 max-w-xs">
              Position your face in the circle for an AI-powered skin analysis
            </p>
            <Button
              onClick={startScan}
              className="rounded-full px-8 py-6 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-elevated"
            >
              <Camera size={20} className="mr-2" />
              Start Scan
            </Button>
          </motion.div>
        )}

        {(scanState === "scanning" || scanState === "analyzing") && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-72 h-72 rounded-full bg-accent/30 border-2 border-primary/40 flex items-center justify-center mb-8 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent"
                animate={{ y: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <ScanFace size={80} className="text-primary/60" />
            </div>
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-primary" />
              <span className="text-foreground font-medium">
                {scanState === "scanning" ? "Scanning your skin..." : "Analyzing with AI..."}
              </span>
            </div>
          </motion.div>
        )}

        {scanState === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Overall Status */}
            <div className="bg-card rounded-2xl p-5 shadow-card mb-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <CheckCircle2 size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Skin Health</p>
                <p className="text-xl font-display font-semibold text-foreground">{mockResults.overallHealth}</p>
              </div>
            </div>

            {/* Findings */}
            <h3 className="font-display font-semibold text-foreground mb-3 mt-6">Findings</h3>
            <div className="space-y-2">
              {mockResults.findings.map((finding, i) => (
                <motion.div
                  key={finding.area}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-xl p-4 shadow-card flex items-center gap-3"
                >
                  {finding.status === "clear" ? (
                    <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={18} className="text-skin-oil flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{finding.area}</p>
                    <p className="text-xs text-muted-foreground">{finding.note}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recommendations */}
            <h3 className="font-display font-semibold text-foreground mb-3 mt-6">AI Recommendations</h3>
            <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
              {mockResults.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span className="text-foreground">{rec}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={reset}
              variant="outline"
              className="w-full mt-6 rounded-xl py-5"
            >
              Scan Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Diagnosis;
