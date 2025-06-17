import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = 'http://localhost:5001/query';

// --- Interfaces ---
interface Source {
  content: string;
  file?: string;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  sources?: Source[];
  timestamp?: number;
}

// --- SVG Icon Components ---
const SendIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const BotIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="8" width="20" height="12" rx="2"/>
    <path d="M12 4v4"/>
    <path d="M8 2h8"/>
    <path d="M12 12v4"/>
    <path d="M8 16h8"/>
  </svg>
);

const LogoIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 5C11.7157 5 5 11.7157 5 20C5 28.2843 11.7157 35 20 35C28.2843 35 35 28.2843 35 20C35 11.7157 28.2843 5 20 5Z" fill="url(#paint0_linear)" />
    <path d="M17 15C17 13.8954 17.8954 13 19 13H21C22.1046 13 23 13.8954 23 15V25C23 26.1046 22.1046 27 21 27H19C17.8954 27 17 26.1046 17 25V15Z" fill="white" />
    <path d="M13 19C13 17.8954 13.8954 17 15 17H25C26.1046 17 27 17.8954 27 19V21C27 22.1046 26.1046 23 25 23H15C13.8954 23 13 22.1046 13 21V19Z" fill="white" />
    <defs>
      <linearGradient id="paint0_linear" x1="5" y1="5" x2="35" y2="35" gradientUnits="userSpaceOnUse">
        <stop stopColor="#a855f7" />
        <stop offset="1" stopColor="#ec4899" />
      </linearGradient>
    </defs>
  </svg>
);

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      sender: 'user', 
      text: input,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post<{ answer?: string; sources?: Source[] }>(API_URL, { query: input });
      const botMessage: Message = {
        sender: 'bot',
        text: response.data.answer || "Sorry, I couldn't get a response.",
        sources: response.data.sources || [],
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = { 
        sender: 'bot', 
        text: `An error occurred: ${(error as Error).message}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

  return (
    <div className="min-h-screen bg-pastel font-sans antialiased relative overflow-hidden">
      {/* Colorful animated circles with gradient colors */}
      <div className="fixed top-[10%] left-[15%] w-[300px] h-[300px] rounded-full gradient-circle-1 blur-3xl floating-circle animation-delay-2000"></div>
      <div className="fixed top-[40%] left-[75%] w-[250px] h-[250px] rounded-full gradient-circle-2 blur-3xl floating-circle"></div>
      <div className="fixed top-[70%] left-[20%] w-[350px] h-[350px] rounded-full gradient-circle-3 blur-3xl floating-circle animation-delay-4000"></div>
      <div className="fixed top-[25%] left-[60%] w-[200px] h-[200px] rounded-full gradient-circle-4 blur-3xl floating-circle animation-delay-3000"></div>
      <div className="fixed top-[85%] left-[50%] w-[180px] h-[180px] rounded-full gradient-circle-5 blur-3xl floating-circle animation-delay-1000"></div>
      <div className="fixed top-[5%] left-[85%] w-[150px] h-[150px] rounded-full gradient-circle-6 blur-3xl floating-circle animation-delay-5000"></div>
      
      <div className="relative flex flex-col h-screen max-w-screen-2xl mx-auto z-10 pt-6">
        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col justify-end">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center max-w-xl mx-auto">
                <div className="mb-8">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pink-500 to-violet-500 rounded-full flex items-center justify-center shadow-glow-lg animate-pulse-slow">
                    <BotIcon className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 animate-gradient mb-4">
                  Ask me anything about your documents
                </h2>
                <p className="text-gray-600 mb-8">I'll analyze your documents and provide accurate answers based on their content.</p>
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {["How do I get started?", "What features are available?", "Can you summarize this document?"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-4 py-2 rounded-full glass-card border border-white/20 text-gray-700 hover:shadow-glow transition-all duration-300 text-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full mb-4">
              <div className="glass-container rounded-3xl shadow-glow overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-violet-500 rounded-full flex items-center justify-center shadow-glow">
                      <BotIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">Document Assistant</h3>
                      <p className="text-xs text-gray-500">Powered by RAG</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {messages.length > 0 && new Date(messages[messages.length - 1].timestamp || Date.now()).toLocaleDateString()}
                  </div>
                </div>
               
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex items-start gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom duration-500 ease-out`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 ${
                        msg.sender === 'user' 
                          ? 'bg-gradient-to-br from-pink-500 to-violet-500'
                          : 'glass-card border border-white/20'
                        } p-2.5 rounded-full shadow-glow w-10 h-10 flex items-center justify-center`}>
                        {msg.sender === 'user' 
                          ? <UserIcon className="w-5 h-5 text-white" />
                          : <BotIcon className="w-5 h-5 text-gray-800" />
                        }
                      </div>

                      {/* Message */}
                      <div className={`group flex-1 max-w-[80%] ${msg.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                        <div className={`px-5 py-4 rounded-2xl message-hover ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-br from-pink-500 to-violet-500 text-white shadow-glow ml-auto'
                            : 'glass-card border border-white/20 text-gray-800 shadow-glow'
                        }`}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            className={`prose ${msg.sender === 'user' ? 'prose-invert' : ''} max-w-none`}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                        {msg.timestamp && (
                          <div className={`text-xs text-gray-500 mt-1 px-2 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-4 animate-in fade-in duration-500">
                      <div className="flex-shrink-0 glass-card border border-white/20 p-2.5 rounded-full shadow-glow w-10 h-10 flex items-center justify-center">
                        <BotIcon className="w-5 h-5 text-gray-800" />
                      </div>
                      <div className="flex-1 max-w-[80%]">
                        <div className="inline-block px-5 py-4 rounded-2xl glass-card border border-white/20 shadow-glow">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area inside chat container */}
                <div className="border-t border-white/10 p-4">
                  <form onSubmit={handleSubmit} className="relative">
                    <div className={`relative transition-all duration-300 ${isFocused ? 'transform -translate-y-1' : ''}`}>
                      <div className="relative flex items-center bg-white/30 rounded-full pl-4 pr-2 py-2">
                        <textarea
                          ref={textareaRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          placeholder="Type your message..."
                          disabled={isLoading}
                          rows={1}
                          className="w-full bg-transparent border-none resize-none transition-all duration-300
                          focus:outline-none focus:ring-0
                          disabled:opacity-50 disabled:cursor-not-allowed
                          placeholder-gray-500 text-gray-800
                          text-base leading-6"
                        />
                        <button 
                          type="submit" 
                          disabled={!input.trim() || isLoading}
                          className={`p-3 rounded-full ml-2
                          ${input.trim() && !isLoading 
                            ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-glow hover:shadow-glow-lg transform hover:scale-105 hover:rotate-12' 
                            : 'glass-card border border-white/20 text-gray-500'
                          } transition-all duration-300 ease-in-out`}
                        >
                          <SendIcon className={`w-5 h-5 ${input.trim() && !isLoading ? 'transform rotate-45' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
