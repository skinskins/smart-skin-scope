import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PORT = process.env.PORT || 4000;


// 🧠 stockage temporaire des users
let users = {};

// 🔐 AUTH
app.post("/auth", async (req, res) => {
  try {
    const { code } = req.body;

    const response = await axios.post(
      "https://www.strava.com/oauth/token",
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }
    );

    const accessToken = response.data.access_token;
    const athlete = response.data.athlete;

    // ✅ stockage par utilisateur
    users[athlete.id] = {
      accessToken,
    };

    res.json({
      athleteId: athlete.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "auth failed" });
  }
});


// 👤 PROFIL
app.get("/me", async (req, res) => {
  try {
    const athleteId = req.query.athleteId;
    const user = users[athleteId];

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete",
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "cannot fetch profile" });
  }
});


// 🏃 ACTIVITÉS
app.get("/activities", async (req, res) => {
  try {
    const athleteId = req.query.athleteId;
    const user = users[athleteId];

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "cannot fetch activities" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});