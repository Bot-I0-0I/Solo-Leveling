import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/analyze-nutrition", async (req, res) => {
    try {
      const { query, type } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let prompt = "";
      if (type === "food") {
        prompt = `Analyze the following food/meal description and estimate its nutritional value. 
        Return ONLY a JSON object with the following keys:
        - name: A short, clean name for the food (string)
        - calories: Estimated total calories (number)
        - protein: Estimated protein in grams (number)
        - carbs: Estimated carbohydrates in grams (number)
        - fat: Estimated fat in grams (number)
        
        Description: "${query}"`;
      } else if (type === "exercise") {
        prompt = `Analyze the following exercise/workout description and estimate its energy expenditure and primary muscle group.
        Return ONLY a JSON object with the following keys:
        - name: A short, clean name for the exercise (string)
        - calories: Estimated calories burned (number)
        - duration: Estimated duration in minutes (number, default to 30 if not specified)
        - muscleGroup: The primary muscle group targeted. MUST be one of: "chest", "back", "legs", "arms", "shoulders", "core", "cardio", or "" if full body/unknown.
        
        Description: "${query}"`;
      } else {
        return res.status(400).json({ error: "Invalid type" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
      });

      let text = response.text || "";
      // Clean up markdown formatting if present
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const data = JSON.parse(text);
      res.json(data);
    } catch (error) {
      console.error("Error analyzing nutrition:", error);
      res.status(500).json({ error: "Failed to analyze" });
    }
  });

  app.post("/api/generate-quests", async (req, res) => {
    try {
      const { goal } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Based on the user's goal: "${goal}", generate 3-5 daily quests to help them achieve it.
      Return ONLY a JSON object with a "quests" array. Each quest object must have:
      - title: A short, actionable title (string)
      - attribute: The primary attribute this improves. MUST be one of: "STR", "VIT", "AGI", "INT", "SEN"
      - targetValue: The number of times to do this (number, usually 1, but could be higher for reps/minutes)
      - baseReward: XP reward (number, usually 50-100)
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
      });

      let text = response.text || "";
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const data = JSON.parse(text);
      res.json(data);
    } catch (error) {
      console.error("Error generating quests:", error);
      res.status(500).json({ error: "Failed to generate quests" });
    }
  });

  app.post("/api/generate-tasks", async (req, res) => {
    try {
      const { goal, date } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Based on the user's goal: "${goal}", break it down into 3-5 actionable tasks.
      Return ONLY a JSON object with a "tasks" array. Each task object must have:
      - title: A short, actionable title (string)
      - date: Use this exact date string: "${date}"
      - time: A suggested time in HH:MM format (e.g., "09:00", "14:30")
      - priority: MUST be one of: "low", "medium", "high"
      - xpReward: XP reward (number, usually 20-50 based on difficulty)
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
      });

      let text = response.text || "";
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const data = JSON.parse(text);
      res.json(data);
    } catch (error) {
      console.error("Error generating tasks:", error);
      res.status(500).json({ error: "Failed to generate tasks" });
    }
  });

  app.post("/api/generate-review", async (req, res) => {
    try {
      const { stats } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `You are an AI assistant analyzing a user's weekly performance data:
      ${JSON.stringify(stats, null, 2)}
      
      Based on this data, generate a weekly review.
      Return ONLY a JSON object with the following keys:
      - accomplishments: A bulleted list of what went well (string)
      - challenges: A bulleted list of what blocked them or went poorly (string)
      - intentions: A bulleted list of focus areas for next week (string)
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
      });

      let text = response.text || "";
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const data = JSON.parse(text);
      res.json(data);
    } catch (error) {
      console.error("Error generating review:", error);
      res.status(500).json({ error: "Failed to generate review" });
    }
  });

  // Vite middleware for development
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
