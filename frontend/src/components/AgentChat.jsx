import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, User, Activity } from 'lucide-react';

export default function AgentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestionChips = [
    "What triggers layout shifts (CLS)?",
    "How to reduce LCP image delay?",
    "Why does destructuring lodash improve bundle size?",
    "How to clean up event listeners in React?"
  ];

  // Fetch chat log history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/agent/chat/history');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    if (!text.trim() || loading) return;
    
    // Add temporary optimistic user message
    const tempUserMsg = { id: Date.now(), sender: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          content: text
        })
      });
      const data = await response.json();
      
      // Update with backend-saved messages
      fetchHistory();
    } catch (e) {
      console.error(e);
      // Fallback response inside state
      setMessages(prev => [
        ...prev,
        { 
          id: Date.now() + 1, 
          sender: 'agent', 
          content: "I'm having trouble connecting to the local backend. Please verify that the FastAPI server is running on port 8000.", 
          created_at: new Date().toISOString() 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">ComplianceAgent Copilot</h3>
            <p className="text-[10px] text-slate-400">Ask performance compliance advice, debug layout shifts, or optimization steps</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
            <Sparkles className="h-10 w-10 text-indigo-500/40 mb-3 animate-pulse" />
            <h4 className="text-sm font-semibold text-white">AI Auditor Agent Ready</h4>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Ask questions about Core Web Vitals targets, Web performance compliance rules, or optimization methods.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[80%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div className={`h-8 w-8 rounded-full border shrink-0 flex items-center justify-center ${
                  isUser 
                    ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  {isUser ? <User className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5 text-indigo-400" />}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  isUser 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-950 border border-slate-850 text-slate-300 rounded-tl-none font-sans whitespace-pre-line'
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="h-8 w-8 rounded-full bg-slate-950 border border-slate-800 text-slate-400 shrink-0 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-slate-500 rounded-tl-none flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Inputs and Suggestion Chips */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60 shrink-0 space-y-3">
        {/* Suggestion Chips */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                className="text-[10px] font-semibold text-slate-300 hover:text-white border border-slate-800 bg-slate-950/60 hover:bg-slate-950 px-3 py-1.5 rounded-lg transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message about Core Web Vitals optimization..."
            className="flex-1 bg-slate-950 border border-slate-850 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4.5 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/10 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
