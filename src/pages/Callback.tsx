import React, { useEffect } from "react";
import axios from "axios";

const Callback: React.FC = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    const exchangeToken = async () => {
      if (!code) return;

      try {
        await axios.post("http://localhost:4000/auth", {
          code,
        });
      } catch (err) {
        console.error("Error exchanging token", err);
      }
    };

    exchangeToken();
  }, []);

  return (
    <div>
      <h2>Connexion Strava en cours...</h2>
    </div>
  );
};

export default Callback;