import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Callback from "./Callback";

const CLIENT_ID = "TON_CLIENT_ID";
const REDIRECT_URI = "http://localhost:8080/callback";

const App: React.FC = () => {
  const connectStrava = () => {
    const url =
      `https://www.strava.com/oauth/authorize` +
      `?client_id=${CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${REDIRECT_URI}` +
      `&scope=read,activity:read_all`;

    window.location.href = url;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <button onClick={connectStrava}>
              Connect Strava
            </button>
          }
        />

        <Route path="/callback" element={<Callback />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;