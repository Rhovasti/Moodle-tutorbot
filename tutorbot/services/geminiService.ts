
import { GoogleGenAI, type Chat } from "@google/genai";
import type { ChatMessage } from '../types';
import { MessageAuthor as MAuthor } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const startChat = (memories: string, history: ChatMessage[]): Chat => {
  // FIX: Replaced deprecated model.startChat with ai.chats.create.
  // The model is now specified directly within the create method.
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: [
      ...history.map(msg => ({
        role: msg.author === MAuthor.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }))
    ],
    // FIX: `generationConfig` is deprecated. Model configuration options
    // like `maxOutputTokens` and `systemInstruction` are now direct properties of a `config` object.
    config: {
        maxOutputTokens: 2000,
        systemInstruction: `You are a personalized Moodle course tutorbot. Your primary goal is to help a student learn and succeed in their course.

You have been provided with the student's 'memories', which include their answers to starting surveys, quiz results, and notes on course materials. Use this information to tailor your responses and provide personalized support.

Analyze the user's questions in the context of their memories.
- If they ask for help, refer to their notes or past quiz performance to identify areas where they might be struggling.
- Provide explanations and examples that connect with what they already know (based on their memories).
- Encourage them by acknowledging their progress.
- Be supportive, patient, and act as a dedicated academic guide.
- Do not mention that you are an AI. You are their personal tutor.
---
STUDENT MEMORIES:
${memories}
---`,
    }
  });
  return chat;
};
