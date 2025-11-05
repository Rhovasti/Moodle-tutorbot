
import React, { useState, useEffect, useRef } from 'react';
import { sendMessageStream, saveMemories as saveMemoriesAPI, getMemories, getChatHistory as getChatHistoryAPI, clearChatHistory } from '../services/apiService';
import type { User, ChatMessage } from '../types';
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
  const [memories, setMemories] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [tempMemories, setTempMemories] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMemories, setShowMemories] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load data from backend on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load memories
        const memoriesData = await getMemories();
        if (memoriesData.length > 0) {
          const memoriesText = memoriesData.map(m => m.content).join('\n');
          setMemories(memoriesText);
          setTempMemories(memoriesText);
        }

        // Load chat history
        const historyData = await getChatHistoryAPI();
        const formattedHistory = historyData.map(msg => ({
          author: msg.role === 'user' ? MessageAuthor.USER : MessageAuthor.MODEL,
          text: msg.content
        }));
        setChatHistory(formattedHistory);

        setDataLoaded(true);
      } catch (error) {
        console.error('Error loading data from backend:', error);
        // If backend is not available or LTI session is invalid, show error
        alert('Error loading data. Please make sure you launched the tool from Moodle.');
        setDataLoaded(true);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  const handleSaveMemories = async () => {
    try {
      setIsLoading(true);
      await saveMemoriesAPI(tempMemories);
      setMemories(tempMemories);

      // Clear chat history when memories are updated
      await clearChatHistory();
      setChatHistory([]);

      alert('Memories saved! The chat has been reset to apply the new context.');
    } catch (error) {
      console.error('Error saving memories:', error);
      alert('Error saving memories. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
        let modelResponse = '';
        setChatHistory(prev => [...prev, { author: MessageAuthor.MODEL, text: '...' }]);

        // Stream response from backend
        for await (const chunk of sendMessageStream(currentInput)) {
          modelResponse += chunk;
          setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { author: MessageAuthor.MODEL, text: modelResponse };
            return newHistory;
          });
        }

    } catch (error) {
      console.error('API error:', error);
      const errorMessage: ChatMessage = {
        author: MessageAuthor.MODEL,
        text: "Sorry, I encountered an error. Please try again."
      };
      setChatHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].author === MessageAuthor.MODEL) {
          return [...prev.slice(0, -1), errorMessage];
        }
        return [...prev, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!dataLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

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
          <button
            onClick={handleSaveMemories}
            disabled={isLoading}
            className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition">
            Save Memories & Reset Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-grow">
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Moodle Tutorbot</h1>
            <div className="flex items-center gap-4">
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
    </div>
  );
};

export default Chatbot;
