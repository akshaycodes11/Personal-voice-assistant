import React, { useState } from 'react';
import { ChatMessage } from '@/types';
import { X, Copy, Check, Volume2, Send, Bot, User } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onReplayAudio: (text: string) => void;
  isThinking: boolean;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onReplayAudio,
  isThinking
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-semibold text-white">Conversation Transcript</h2>
            <p className="text-xs text-slate-400">Live dialogue & history</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Bot className="w-12 h-12 mb-3 text-slate-700" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Speak into the mic or tap one of the assessment prompt chips on the main screen to start.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isBot = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isBot
                      ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md'
                      : 'bg-slate-700 text-slate-200'
                      }`}
                  >
                    {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-sm ${isBot
                      ? 'bg-slate-800/90 text-slate-200 border border-slate-700/50'
                      : 'bg-cyan-600 text-white'
                      }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {/* Actions for Bot Responses */}
                    {isBot && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onReplayAudio(msg.content)}
                            title="Replay Audio"
                            className="p-1 hover:text-cyan-400 transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => copyToClipboard(msg.id, msg.content)}
                            title="Copy text"
                            className="p-1 hover:text-white transition-colors"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isThinking && (
            <div className="flex gap-3 items-center text-slate-400 text-xs italic p-2">
              <Bot className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>Formulating thoughts...</span>
            </div>
          )}
        </div>

        {/* Text Input Fallback */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/80 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a question or message..."
            className="flex-1 bg-slate-800 text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl px-4 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

