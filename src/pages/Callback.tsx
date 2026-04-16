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
        window.location.href = "/checkin-advice";
      } catch (err) {
        console.error("Error exchanging token", err);
        window.location.href = "/checkin-advice";
      }
    };

    exchangeToken();
  }, []);

  return null;
};

export default Callback;