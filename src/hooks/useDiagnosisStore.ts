import { useState, useEffect } from "react";

export interface ZoneScore {
  id: string;
  label: string;
  score: number;
  status: "good" | "warning" | "alert";
}

export interface DiagnosisResult {
  globalScore: number;
  date: string; // ISO string
  zones: ZoneScore[];
}

const STORAGE_KEY = "skin-diagnosis-history";

function getHistory(): DiagnosisResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migration: check old single-result key
      const old = localStorage.getItem("skin-diagnosis-result");
      if (old) {
        const parsed = JSON.parse(old);
        return [{ ...parsed, zones: parsed.zones || [] }];
      }
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDiagnosisResult(globalScore: number, zones?: ZoneScore[]) {
  const history = getHistory();
  const result: DiagnosisResult = {
    globalScore,
    date: new Date().toISOString(),
    zones: zones || [],
  };
  history.push(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  // Keep legacy key for backward compat
  localStorage.setItem("skin-diagnosis-result", JSON.stringify({ globalScore, date: result.date }));
  window.dispatchEvent(new Event("diagnosis-updated"));
}

export function useDiagnosisHistory() {
  const [history, setHistory] = useState<DiagnosisResult[]>(getHistory);

  useEffect(() => {
    const handler = () => setHistory(getHistory());
    window.addEventListener("diagnosis-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("diagnosis-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return history;
}

export function useDiagnosisResult() {
  const history = useDiagnosisHistory();
  return history.length > 0 ? history[history.length - 1] : null;
}
