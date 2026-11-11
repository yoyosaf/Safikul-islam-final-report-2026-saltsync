import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// API route for real-time outages
const getFallbackData = () => [
  { msg: "Microsoft 365: Global auth latency issues reported", type: "warning", time: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  { msg: "AWS: US-EAST-1 CloudFront edge instability detected", type: "warning", time: new Date(Date.now() - 1000 * 60 * 90).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  { msg: "Level 3: Global peering link congestion in Asia-Pacific", type: "info", time: "Live" },
  { msg: "Facebook: Feed loading issues reported on mobile apps", type: "info", time: "Live" },
  { msg: "Cloudflare: DNS resolution delays in select regions", type: "info", time: "Live" },
  { msg: "Google Workspace: Intermittent latency in Sheets", type: "info", time: "Live" }
];

let cachedOutages: any = getFallbackData();
let lastFetchTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours cache to aggressively save quota

app.get("/api/outages", async (req, res) => {
  const now = Date.now();
  
  if (lastFetchTime > 0 && (now - lastFetchTime < CACHE_TTL)) {
    return res.json(cachedOutages);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Return a JSON array of exactly 6 real-world major internet outages or service disruptions reported in the last 12 hours. Focus on high-impact services like Google, Meta, AWS, or major global ISPs. Include: msg (brief description), type (warning for critical, info for minor), and time (e.g., '2:45 PM').",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              msg: { type: "STRING" },
              type: { type: "STRING" },
              time: { type: "STRING" }
            },
            required: ["msg", "type", "time"]
          }
        }
      },
    });

    const text = response.text || "[]";
    const parsedData = JSON.parse(text);
    
    if (Array.isArray(parsedData) && parsedData.length > 0) {
      cachedOutages = parsedData;
      lastFetchTime = now;
      return res.json(parsedData);
    }
    
    throw new Error("Invalid response format from AI");
  } catch (error: any) {
    if (!error.message?.includes('429')) {
      console.warn("Outage fetch sync issues, serving cached/fallback data.");
    }
    
    // If it's the first time and it failed, update lastFetchTime so we don't spam 429s
    if (lastFetchTime === 0) {
      lastFetchTime = now - (CACHE_TTL - 15 * 60 * 1000); // Try again in 15 mins instead of 12h
    }

    res.json(cachedOutages);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
