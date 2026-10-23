import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const stream = await ai.models.generateContentStream({
  model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
  contents: [{ role: "user", parts: [{ text: "Say hello in exactly 5 words." }] }],
  config: {
    systemInstruction: "You are a terse assistant.",
    temperature: 0.2,
    maxOutputTokens: 100,
  },
});

let full = "";
let usage = null;
let frames = 0;
for await (const chunk of stream) {
  if (chunk.text) {
    full += chunk.text;
    frames++;
  }
  if (chunk.usageMetadata) usage = chunk.usageMetadata;
}
console.log("frames:", frames);
console.log("text:", JSON.stringify(full));
console.log("usage:", JSON.stringify(usage));
