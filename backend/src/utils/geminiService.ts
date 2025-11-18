import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';
import Memory from '../models/Memory';
import ChatHistory, { IChatMessage } from '../models/ChatHistory';
import MoodleContext from '../models/MoodleContext';
import { Types } from 'mongoose';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  logger.error('GEMINI_API_KEY environment variable is not set');
  throw new Error('GEMINI_API_KEY is required');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Get personalized system prompt with student memories and Moodle context
 */
async function getSystemPrompt(userId: string, contextId: string): Promise<string> {
  try {
    // Extract course ID from contextId (format might be "course-123" or just "123")
    const courseIdMatch = contextId.match(/\d+/);
    const courseId = courseIdMatch ? parseInt(courseIdMatch[0], 10) : null;

    // Fetch student memories
    const memories = await Memory.find({
      userId: new Types.ObjectId(userId),
      contextId
    }).sort({ updatedAt: -1 });

    const memoriesText = memories.length > 0
      ? memories.map(m => m.content).join('\n')
      : 'No student memories available yet.';

    // Fetch Moodle context (learning history, quiz results, etc.)
    let moodleContextText = '';
    if (courseId) {
      const moodleContext = await MoodleContext.findOne({
        userId: new Types.ObjectId(userId),
        courseId
      });

      if (moodleContext) {
        moodleContextText = moodleContext.toPromptContext();
      }
    }

    // Build comprehensive system prompt
    let systemPrompt = `You are a personalized learning assistant integrated with Moodle. Your role is to help students understand course material and answer their questions.

`;

    // Add Moodle learning context if available
    if (moodleContextText) {
      systemPrompt += `=== STUDENT LEARNING HISTORY ===
${moodleContextText}

`;
    }

    // Add student memories
    systemPrompt += `=== STUDENT MEMORIES ===
${memoriesText}

=== INSTRUCTIONS ===
- Use the student's learning history and memories to personalize your responses
- If the student is struggling with a topic, provide extra support and encouragement
- If the student excels in a topic, acknowledge their strength and build on it
- Reference specific quiz results or activities when relevant
- Be encouraging and supportive, especially for struggling topics
- Help the student make connections between new concepts and what they already know
- Keep responses concise but informative
- If you don't know something, be honest about it`;

    return systemPrompt;
  } catch (error) {
    logger.error('Error fetching memories/context for system prompt:', error);
    // Return default prompt if memory fetch fails
    return `You are a personalized learning assistant integrated with Moodle. Your role is to help students understand course material and answer their questions.`;
  }
}

/**
 * Send a message to Gemini and get a response
 */
export async function sendMessage(
  userId: string,
  contextId: string,
  message: string
): Promise<string> {
  try {
    logger.info(`Sending message to Gemini for user ${userId}`);

    // Get system prompt with memories
    const systemPrompt = await getSystemPrompt(userId, contextId);

    // Get chat history from database
    let chatHistory = await ChatHistory.findOne({
      userId: new Types.ObjectId(userId),
      contextId
    });

    if (!chatHistory) {
      chatHistory = await ChatHistory.create({
        userId: new Types.ObjectId(userId),
        contextId,
        messages: []
      });
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: systemPrompt
    });

    // Convert chat history to Gemini format
    const history = chatHistory.messages.map((msg: IChatMessage) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Start chat with history
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7
      }
    });

    // Send message and get response
    const result = await chat.sendMessage(message);
    const response = result.response.text();

    // Save messages to database
    chatHistory.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    chatHistory.messages.push({
      role: 'model',
      content: response,
      timestamp: new Date()
    });

    await chatHistory.save();

    logger.info(`Received response from Gemini for user ${userId}`);

    return response;
  } catch (error) {
    logger.error('Error sending message to Gemini:', error);
    throw error;
  }
}

/**
 * Stream a message response from Gemini
 */
export async function* streamMessage(
  userId: string,
  contextId: string,
  message: string
): AsyncGenerator<string, void, unknown> {
  try {
    logger.info(`Streaming message to Gemini for user ${userId}`);

    // Get system prompt with memories
    const systemPrompt = await getSystemPrompt(userId, contextId);

    // Get chat history from database
    let chatHistory = await ChatHistory.findOne({
      userId: new Types.ObjectId(userId),
      contextId
    });

    if (!chatHistory) {
      chatHistory = await ChatHistory.create({
        userId: new Types.ObjectId(userId),
        contextId,
        messages: []
      });
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: systemPrompt
    });

    // Convert chat history to Gemini format
    const history = chatHistory.messages.map((msg: IChatMessage) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Start chat with history
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7
      }
    });

    // Stream response
    const result = await chat.sendMessageStream(message);

    let fullResponse = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      yield chunkText;
    }

    // Save messages to database after streaming completes
    chatHistory.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    chatHistory.messages.push({
      role: 'model',
      content: fullResponse,
      timestamp: new Date()
    });

    await chatHistory.save();

    logger.info(`Finished streaming response from Gemini for user ${userId}`);
  } catch (error) {
    logger.error('Error streaming message from Gemini:', error);
    throw error;
  }
}
