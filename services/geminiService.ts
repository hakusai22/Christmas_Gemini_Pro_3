import { GoogleGenAI } from "@google/genai";

// Fallback wishes in case of API error or missing key
const FALLBACK_WISHES = [
  "This year will be huge. Tremendous success is coming your way, believe me.",
  "May your holidays be as gold-plated as the finest towers in the city.",
  "Success. Power. Luxury. That is what I predict for your 2025.",
  "A very classy Christmas to you. Only the best people get wishes this good."
];

export const generateLuxuryWish = async (): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("API Key missing, using fallback wish.");
    return FALLBACK_WISHES[Math.floor(Math.random() * FALLBACK_WISHES.length)];
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Write a short, opulent, 'Trump-style' Christmas wish or prediction for a successful entrepreneur. It should sound confident, luxurious, and use words like 'tremendous', 'huge', 'gold', 'winning'. Maximum 2 sentences.",
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // Minimize latency
        temperature: 0.9,
      }
    });

    return response.text || FALLBACK_WISHES[0];
  } catch (error) {
    console.error("Gemini generation failed:", error);
    return FALLBACK_WISHES[Math.floor(Math.random() * FALLBACK_WISHES.length)];
  }
};