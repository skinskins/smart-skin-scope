import React, { useEffect } from "react";
import axios from "axios";

const Callback: React.FC = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    const exchangeToken = async () => {
      if (!code) return;

      try {
        const res = await axios.post("https://smart-skin-scope.onrender.com/auth", {
          code,
        });

        const athleteId = res.data.athleteId;

        localStorage.setItem("athleteId", athleteId);
        window.location.href = "/dashboard";
      } catch (err) {
        console.error("Error exchanging token", err);
        window.location.href = "/dashboard";
      }
    };

    exchangeToken();
  }, []);

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#e2e8f0]">
        <div className="h-full bg-[#0052cc] animate-[progress_2s_ease-in-out_infinite]" style={{ width: '30%' }} />
      </div>

      <div className="relative">
        <div className="w-16 h-16 border-2 border-slate-200 border-t-[#0052cc] rounded-full animate-spin mb-8" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-[#0052cc] rounded-full animate-ping" />
        </div>
      </div>

      <div className="text-center space-y-4 max-w-xs">
        <p className="text-[10px] font-mono font-bold text-[#0052cc] uppercase tracking-[0.2em] animate-pulse">
          SYNCHRONIZING_DATA...
        </p>
        <h2 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">
          Connexion à Strava
        </h2>
        <div className="flex flex-col gap-2 p-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono text-slate-400 uppercase font-bold">Protocol</span>
            <span className="text-[8px] font-mono text-slate-900 uppercase font-bold">OAuth_v2.0</span>
          </div>
          <div className="h-[1px] bg-slate-100 w-full" />
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono text-slate-400 uppercase font-bold">Status</span>
            <span className="text-[8px] font-mono text-emerald-500 uppercase font-bold">Fetching_Token</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}} />
    </div>
  );
};

export default Callback;