import React from "react";
import { supabase } from "@/integrations/supabase/client";

const CLIENT_ID = "225555";
const REDIRECT_URI = "https://skin-nacre.vercel.app/callback";

interface StravaConnectProps {
  compact?: boolean;
}

const StravaConnect: React.FC<StravaConnectProps> = ({ compact }) => {
  const isConnected = !!localStorage.getItem("athleteId");

  const connectStrava = () => {
    const url =
      `https://www.strava.com/oauth/authorize` +
      `?client_id=${CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${REDIRECT_URI}` +
      `&scope=read,activity:read_all`;

    window.location.href = url;
  };

  const disconnectStrava = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await (supabase as any).from("profiles").update({ did_sport: null }).eq("id", session.user.id);
    }

    localStorage.removeItem("athleteId");
    localStorage.removeItem("strava_accessToken");
    localStorage.removeItem("strava_refreshToken");
    // Clear strava data from factors in local storage if we want to be thorough
    const currentData = JSON.parse(localStorage.getItem("dailyCheckinData") || "{}");
    delete currentData.stravaData;
    currentData.didSport = null;
    localStorage.setItem("dailyCheckinData", JSON.stringify(currentData));
    window.location.reload();
  };

  if (isConnected) {
    return (
      <button
        onClick={disconnectStrava}
        className={`${compact ? 'w-full py-4' : 'px-6 py-3'} border border-[#FC4C02] text-[#FC4C02] text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-muted/20 transition-colors`}
      >
        Déconnecter Strava
      </button>
    );
  }

  return (
    <button
      onClick={connectStrava}
      className={`${compact ? 'w-full py-4' : 'px-6 py-3'} bg-[#FC4C02] text-white text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-[#E34402] transition-colors`}
    >
      Connecter Strava
    </button>
  );
};

export default StravaConnect;