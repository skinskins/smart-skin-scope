import { useState, useEffect, useCallback } from "react";

interface DiagnosisResult {
  globalScore: number;
  date: string; // ISO string
}

const STORAGE_KEY = "skin-diagnosis-result";

function getStored(): DiagnosisResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDiagnosisResult(globalScore: number) {
  const result: DiagnosisResult = {
    globalScore,
    date: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  window.dispatchEvent(new Event("diagnosis-updated"));
}

export function useDiagnosisResult() {
  const [result, setResult] = useState<DiagnosisResult | null>(getStored);

  useEffect(() => {
    const handler = () => setResult(getStored());
    window.addEventListener("diagnosis-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("diagnosis-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return result;
}
