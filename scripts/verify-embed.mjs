import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const r = await ai.models.embedContent({
  model,
  contents: ["Knovora builds AI chatbots.", "The sky is blue."],
  config: { outputDimensionality: 768, taskType: "RETRIEVAL_DOCUMENT" },
});

console.log("embeddings count:", r.embeddings?.length);
console.log("dim[0]:", r.embeddings?.[0]?.values?.length);
console.log("sample:", r.embeddings?.[0]?.values?.slice(0, 3));
