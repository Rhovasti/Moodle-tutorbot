
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from '@google/genai';
import useLocalStorage from '../hooks/useLocalStorage';
import { startChat, enrichMessageWithRAG, createRagStore, uploadToRagStore, listRagStores } from '../services/geminiService';
import type { User, ChatMessage, RagStore } from '../types';
import { MessageAuthor } from '../types';

interface ChatbotProps {
  user: User;
  onLogout: () => void;
}

const BotIcon = () => (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        AI
    </div>
);

const UserIcon = ({ username }: { username: string }) => (
    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {username.charAt(0).toUpperCase()}
    </div>
);


const Chatbot: React.FC<ChatbotProps> = ({ user, onLogout }) => {
  const [memories, setMemories] = useLocalStorage<string>(`moodle-tutorbot-memories-${user.username}`, '');
  const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>(`moodle-tutorbot-history-${user.username}`, []);
  const [ragStoreName, setRagStoreName] = useLocalStorage<string | null>(`moodle-tutorbot-rag-store-${user.username}`, null);
  const [tempMemories, setTempMemories] = useState<string>(memories);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMemories, setShowMemories] = useState(true);
  const [showMaterials, setShowMaterials] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [availableStores, setAvailableStores] = useState<RagStore[]>([]);

  const chatRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatRef.current = startChat(memories, chatHistory);
  }, [memories, chatHistory]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  // Load available RAG stores on component mount
  useEffect(() => {
    const loadStores = async () => {
      try {
        const stores = await listRagStores();
        setAvailableStores(stores);
      } catch (error) {
        console.error('Failed to load RAG stores:', error);
      }
    };
    loadStores();
  }, []);

  const handleCreateStore = async () => {
    const storeName = prompt('Enter a name for your study materials collection:');
    if (!storeName) return;

    try {
      setUploadProgress('Creating store...');
      const newStoreName = await createRagStore(storeName);
      setRagStoreName(newStoreName);
      const stores = await listRagStores();
      setAvailableStores(stores);
      setUploadProgress('');
      alert(`Store "${storeName}" created successfully!`);
    } catch (error) {
      console.error('Failed to create store:', error);
      setUploadProgress('');
      alert('Failed to create store. Please try again.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !ragStoreName) return;

    try {
      setIsUploadingFile(true);
      setUploadProgress(`Uploading ${file.name}...`);

      await uploadToRagStore(ragStoreName, file);

      setUploadProgress('');
      setIsUploadingFile(false);
      alert(`File "${file.name}" uploaded successfully!`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('File upload failed:', error);
      setUploadProgress('');
      setIsUploadingFile(false);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSelectStore = (storeName: string) => {
    setRagStoreName(storeName);
    alert('RAG store selected! Your questions will now use these study materials.');
  };

  const handleSaveMemories = () => {
    setMemories(tempMemories);
    setChatHistory([]); // Reset chat history when memories are updated
    alert('Memories saved! The chat has been reset to apply the new context.');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { author: MessageAuthor.USER, text: input };
    const currentInput = input;
    setChatHistory(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        if (!chatRef.current) {
            chatRef.current = startChat(memories, chatHistory);
        }

        // COMBINED RAG + MEMORIES FIX:
        // Enrich the user message with RAG context from study materials
        // If ragStoreName is set, this queries the RAG store and prepends relevant context
        // The chat already has memories in system instruction, so both work together
        const enrichedMessage = await enrichMessageWithRAG(currentInput, ragStoreName);

        // FIX: sendMessageStream now expects an object with a `message` property.
        const result = await chatRef.current.sendMessageStream({ message: enrichedMessage });

        let modelResponse = '';
        setChatHistory(prev => [...prev, { author: MessageAuthor.MODEL, text: '...' }]);

        // FIX: The result of sendMessageStream is the async iterator directly, no `.stream` property.
        for await (const chunk of result) {
          // FIX: The response chunk has a `.text` property, not a `.text()` method.
          const chunkText = chunk.text;
          modelResponse += chunkText;
          setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { author: MessageAuthor.MODEL, text: modelResponse };
            return newHistory;
          });
        }

    } catch (error) {
      console.error('Gemini API error:', error);
      const errorMessage: ChatMessage = { author: MessageAuthor.MODEL, text: "Sorry, I encountered an error. Please try again." };
      // FIX: Improved error handling to avoid removing the user's message if the API call fails immediately.
      setChatHistory(prev => {
        // If the last message is a model message (placeholder or partial), replace it.
        if (prev.length > 0 && prev[prev.length - 1].author === MessageAuthor.MODEL) {
          return [...prev.slice(0, -1), errorMessage];
        }
        // Otherwise, append the error message.
        return [...prev, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Sidebar for Memories */}
      <div className={`flex flex-col bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${showMemories ? 'w-1/3' : 'w-12'}`}>
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className={`font-bold text-lg text-gray-900 dark:text-white transition-opacity ${showMemories ? 'opacity-100' : 'opacity-0'}`}>Student Memories</h2>
            <button onClick={() => setShowMemories(!showMemories)} className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                 {showMemories ? '<<' : '>>'}
            </button>
        </div>
        <div className={`p-4 flex-grow flex flex-col overflow-hidden ${!showMemories && 'hidden'}`}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Paste survey answers, quiz results, and course notes here. This provides context for the tutorbot.</p>
          <textarea
            value={tempMemories}
            onChange={(e) => setTempMemories(e.target.value)}
            className="w-full flex-grow p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Example:&#10;Survey Q1: I'm new to programming.&#10;Quiz 1 Score: 65% - Struggled with loops."
          />
          <button onClick={handleSaveMemories} className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
            Save Memories & Reset Chat
          </button>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex flex-col flex-grow">
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Moodle Tutorbot</h1>
            <div className="flex items-center gap-4">
                {ragStoreName && (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                    📚 Study Materials Active
                  </span>
                )}
                <button
                  onClick={() => setShowMaterials(!showMaterials)}
                  className="py-2 px-4 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition"
                >
                  📚 Study Materials
                </button>
                <span className="text-sm font-medium">Welcome, {user.username}</span>
                <button onClick={onLogout} className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition">
                    Logout
                </button>
            </div>
        </header>
        
        <main ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto">
          <div className="space-y-6">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex items-start gap-4 ${msg.author === MessageAuthor.USER ? 'justify-end' : ''}`}>
                {msg.author === MessageAuthor.MODEL && <BotIcon />}
                <div className={`max-w-xl p-4 rounded-2xl ${msg.author === MessageAuthor.USER ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'}`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                 {msg.author === MessageAuthor.USER && <UserIcon username={user.username} />}
              </div>
            ))}
            {isLoading && chatHistory[chatHistory.length -1]?.author === MessageAuthor.USER && (
              <div className="flex items-start gap-4">
                <BotIcon />
                <div className="max-w-xl p-4 rounded-2xl bg-gray-200 dark:bg-gray-700">
                  <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <form onSubmit={handleSubmit} className="flex items-center gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your tutorbot a question..."
              className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition" disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </footer>
      </div>

      {/* Study Materials Sidebar */}
      {showMaterials && (
        <div className="w-96 bg-white dark:bg-gray-800 shadow-lg border-l dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">Study Materials (RAG)</h2>
            <button
              onClick={() => setShowMaterials(false)}
              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="p-4 flex-grow flex flex-col overflow-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload course materials (PDFs, documents) for AI to reference when answering questions.
            </p>

            {/* Create Store Section */}
            {!ragStoreName && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Step 1: Create Collection</h3>
                <button
                  onClick={handleCreateStore}
                  className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                  disabled={isUploadingFile}
                >
                  + Create New Collection
                </button>
              </div>
            )}

            {/* Upload Files Section */}
            {ragStoreName && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Upload Files</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  disabled={isUploadingFile}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
                  disabled={isUploadingFile}
                >
                  {isUploadingFile ? 'Uploading...' : '📤 Upload File'}
                </button>
                {uploadProgress && (
                  <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">{uploadProgress}</p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Supported: PDF, DOC, DOCX, TXT, MD (Max 100MB)
                </p>
              </div>
            )}

            {/* Available Stores */}
            {availableStores.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Your Collections</h3>
                <div className="space-y-2">
                  {availableStores.map((store) => (
                    <div
                      key={store.name}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                        ragStoreName === store.name
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-500'
                      }`}
                      onClick={() => handleSelectStore(store.name)}
                    >
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {store.displayName || 'Unnamed Collection'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {ragStoreName === store.name ? '✓ Active' : 'Click to activate'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-auto p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                💡 <strong>How it works:</strong> Upload study materials here. When you ask questions, the AI will search these materials AND use your student memories to provide personalized, accurate answers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
