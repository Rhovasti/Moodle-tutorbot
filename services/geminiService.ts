
import { GoogleGenAI, type Chat, GenerateContentResponse } from "@google/genai";
import type { ChatMessage, QueryResult, RagStore } from '../types';
import { MessageAuthor as MAuthor } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Helper function for async delays (used in upload polling)
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function for retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication or permission errors
      if (error.status === 401 || error.status === 403) {
        throw error;
      }

      // Don't retry on client errors (except rate limiting)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate delay with exponential backoff
      const delayMs = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms...`);
      await delay(delayMs);
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

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

// ============================================================================
// File Search (RAG) Service Methods
// ============================================================================

/**
 * Create a new RAG store for file search
 * @param displayName - Human-readable name for the store
 * @returns Promise resolving to the store name (identifier)
 * @throws Error if store creation fails
 */
export async function createRagStore(displayName: string): Promise<string> {
  if (!ai) throw new Error("Gemini AI not initialized");

  return retryWithBackoff(async () => {
    const ragStore = await ai.fileSearchStores.create({
      config: { displayName }
    });

    if (!ragStore.name) {
      throw new Error("Failed to create RAG store: name is missing.");
    }

    return ragStore.name;
  });
}

/**
 * Upload a file to an existing RAG store
 * Polls for completion of the async upload operation
 * @param ragStoreName - The name/identifier of the RAG store
 * @param file - The file to upload (File or Blob)
 * @throws Error if upload fails or times out
 */
export async function uploadToRagStore(
  ragStoreName: string,
  file: File
): Promise<void> {
  if (!ai) throw new Error("Gemini AI not initialized");

  // Validate file size (max 100MB)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 100MB`);
  }

  // Start upload operation
  let op = await retryWithBackoff(async () => {
    return await ai.fileSearchStores.uploadToFileSearchStore({
      fileSearchStoreName: ragStoreName,
      file: file
    });
  });

  // Poll for completion with timeout
  const startTime = Date.now();
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout
  const POLL_INTERVAL_MS = 3000; // 3 seconds

  while (!op.done) {
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error(`Upload operation timed out after ${TIMEOUT_MS / 1000} seconds`);
    }

    await delay(POLL_INTERVAL_MS);

    // Get operation status with retry
    op = await retryWithBackoff(async () => {
      return await ai.operations.get({ operation: op });
    });

    // Check for operation errors
    if (op.error) {
      throw new Error(`Upload failed: ${JSON.stringify(op.error)}`);
    }
  }
}

/**
 * Perform semantic search query against RAG store
 * @param ragStoreName - The name/identifier of the RAG store
 * @param query - The search query
 * @returns Promise resolving to query results with grounding metadata
 * @throws Error if query fails
 */
export async function fileSearch(
  ragStoreName: string,
  query: string
): Promise<QueryResult> {
  if (!ai) throw new Error("Gemini AI not initialized");

  return retryWithBackoff(async () => {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query + " DO NOT ASK THE USER TO READ THE MANUAL, pinpoint the relevant sections in the response itself.",
      config: {
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [ragStoreName],
          }
        }]
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text: response.text,
      groundingChunks: groundingChunks,
    };
  });
}

/**
 * Generate example questions based on RAG store contents
 * Analyzes uploaded documents and creates sample queries
 * @param ragStoreName - The name/identifier of the RAG store
 * @returns Promise resolving to array of example questions
 * @throws Error if generation fails
 */
export async function generateExampleQuestions(
  ragStoreName: string
): Promise<string[]> {
  if (!ai) throw new Error("Gemini AI not initialized");

  try {
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "You are provided some user manuals for some products. Figure out for what product each manual is for, based on the cover page contents. DO NOT GUESS OR HALLUCINATE THE PRODUCT. Then, for each product, generate 4 short and practical example questions a user might ask about it in English. Return the questions as a JSON array of objects. Each object should have a 'product' key with the product name as a string, and a 'questions' key with an array of 4 question strings. For example: ```json[{\"product\": \"Product A\", \"questions\": [\"q1\", \"q2\"]}, {\"product\": \"Product B\", \"questions\": [\"q3\", \"q4\"]}]```",
        config: {
          tools: [{
            fileSearch: {
              fileSearchStoreNames: [ragStoreName],
            }
          }]
        }
      });
    });

    let jsonText = response.text.trim();

    // Extract JSON from markdown code block if present
    const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1];
    } else {
      // Try to extract JSON array if no markdown block
      const firstBracket = jsonText.indexOf('[');
      const lastBracket = jsonText.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonText = jsonText.substring(firstBracket, lastBracket + 1);
      }
    }

    const parsedData = JSON.parse(jsonText);

    if (Array.isArray(parsedData)) {
      if (parsedData.length === 0) {
        return [];
      }
      const firstItem = parsedData[0];

      // Handle new format: array of {product, questions[]}
      if (typeof firstItem === 'object' && firstItem !== null && 'questions' in firstItem && Array.isArray(firstItem.questions)) {
        return parsedData.flatMap(item => (item.questions || [])).filter(q => typeof q === 'string');
      }

      // Handle old format: array of strings
      if (typeof firstItem === 'string') {
        return parsedData.filter(q => typeof q === 'string');
      }
    }

    console.warn("Received unexpected format for example questions:", parsedData);
    return [];
  } catch (error) {
    console.error("Failed to generate or parse example questions:", error);
    return [];
  }
}

/**
 * Delete a RAG store and all its contents
 * @param ragStoreName - The name/identifier of the RAG store
 * @throws Error if deletion fails
 */
export async function deleteRagStore(ragStoreName: string): Promise<void> {
  if (!ai) throw new Error("Gemini AI not initialized");

  return retryWithBackoff(async () => {
    await ai.fileSearchStores.delete({
      name: ragStoreName,
      config: { force: true },
    });
  });
}

/**
 * List all RAG stores
 * @returns Promise resolving to array of RAG stores
 * @throws Error if listing fails
 */
export async function listRagStores(): Promise<RagStore[]> {
  if (!ai) throw new Error("Gemini AI not initialized");

  return retryWithBackoff(async () => {
    const response = await ai.fileSearchStores.list();
    return response.fileSearchStores || [];
  });
}

// ============================================================================
// Combined RAG + Memories Context Helper
// ============================================================================

/**
 * Enrich a user message with RAG context from study materials
 * Queries the RAG store and prepends relevant context to the user's question
 *
 * @param userMessage - The original user question/message
 * @param ragStoreName - Optional RAG store name to query. If null/undefined, returns original message
 * @returns Promise resolving to enriched message with RAG context prepended
 *
 * Usage: Call this before sending message to chat to combine RAG + memories
 * The chat already has memories in system instruction, this adds study materials context
 */
export async function enrichMessageWithRAG(
  userMessage: string,
  ragStoreName?: string | null
): Promise<string> {
  // If no RAG store provided, return original message
  if (!ragStoreName) {
    return userMessage;
  }

  try {
    // Query RAG store for relevant context
    const ragResult = await fileSearch(ragStoreName, userMessage);

    // If we got results, prepend them to the user message
    if (ragResult.text && ragResult.text.trim()) {
      return `[Study Materials Context]:\n${ragResult.text}\n\n[Student Question]:\n${userMessage}`;
    }

    // No relevant context found, return original message
    return userMessage;
  } catch (error) {
    // If RAG query fails, log error but don't break the chat
    // Return original message so chat continues with memories only
    console.error('RAG query failed, continuing with memories only:', error);
    return userMessage;
  }
}
