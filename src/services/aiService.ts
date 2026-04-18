import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../db/db";
import { format, subDays } from "date-fns";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateWeeklyReview(weekStartDate: string) {
  const startDate = new Date(weekStartDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => 
    format(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );

  // GATHER DATA
  const quests = await db.quests.where('date').anyOf(weekDates).toArray();
  const missions = await db.missionLogs.where('date').anyOf(weekDates).toArray();
  const nutrition = await db.nutritionLogs.where('date').anyOf(weekDates).toArray();
  const vesselLogs = await db.vesselLogs.where('date').anyOf(weekDates).toArray();
  const tactical = await db.tacticalLogs.where('date').anyOf(weekDates).toArray();

  const dataSummary = {
    quests: quests.map(q => ({ title: q.title, completed: q.completed, attr: q.attribute })),
    missions: missions.map(m => ({ title: m.title, result: m.result, cat: m.category, rate: m.completionRate })),
    nutrition: nutrition.map(n => ({ type: n.type, name: n.name, cal: n.calories, muscle: n.muscleGroup })),
    vessel: vesselLogs.map(v => ({ weight: v.weight, sleep: v.sleepHours, stress: v.stressLevel })),
    tactical: tactical.map(t => ({ game: t.game, result: t.result, area: t.focusArea }))
  };

  const prompt = `Generate a weekly summary for a 'Solo Leveling' style system user. 
  Data for the week starting ${weekStartDate}:
  ${JSON.stringify(dataSummary, null, 2)}
  
  Please provide:
  1. Accomplishments: A bulleted list of high-impact successes.
  2. Challenges: A bulleted list of obstacles or areas of regression.
  3. Intentions: 3 specific, actionable goals for next week to optimize the 'Vessel'.
  
  Format the output as JSON. Keep it concise, motivational, and in-character for a cryptic 'System' assistant.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            accomplishments: { type: Type.STRING },
            challenges: { type: Type.STRING },
            intentions: { type: Type.STRING }
          },
          required: ["accomplishments", "challenges", "intentions"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate AI review. The neural link is unstable.");
  }
}
