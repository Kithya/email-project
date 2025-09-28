// src/lib/embedding.ts
// import { OpenAIApi, Configuration } from "openai-edge";

// const config = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const openai = new OpenAIApi(config);

// export async function getEmbeddings(text: string) {
//   try {
//     const response = await openai.createEmbedding({
//       model: "text-embedding-3-large",
//       input: text.replace(/\n/g, " "),
//     });
//     const result = await response.json();
//     // console.log(result)
//     return result.data[0].embedding as number[];
//   } catch (error) {
//     console.log("error calling openai embeddings api", error);
//     throw error;
//   }
// }

import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export async function getEmbeddings(text: string) {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text input is required and must be a string");
    }

    const cleanText = text.replace(/\n/g, " ").trim();

    if (cleanText.length === 0) {
      throw new Error("Text input cannot be empty");
    }

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-large"),
      value: cleanText,
    });
    return embedding;
  } catch (error) {
    console.log("error calling openai embeddings api", error);
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
