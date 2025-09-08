// src/lib/embedding.ts
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function getEmbedding(texts: string) {
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: texts.replace(/\n/g, " "),
    });

    // @ts-expect-error
    return response.embeddings[0].values;
  } catch (error) {
    console.log("error calling google gemini embeddings api", error);
    throw error;
  }
}
// console.log((await getEmbedding("hello"))?.length);

// import { GoogleGenAI } from "@google/genai";
// import dotenv from "dotenv";
// dotenv.config();

// // const config = new GoogleGenAI({
// //   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
// // });

// export async function getEmbedding(text: string) {
//   try {
//     const ai = new GoogleGenAI({
//       apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
//     });
//     const response = await ai.models.embedContent({
//       model: "gemini-embedding-001",
//       contents: text.replace(/\n/g, ""),
//     });

//     const result = response.embeddings?.values;

//     return result;
//   } catch (error) {
//     console.log("Error calling Google Gemini embeddings API:", error);
//     throw error;
//   }
// }

// console.log(await getEmbedding("hello world"));
