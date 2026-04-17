import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface ChatWindowProps {
  messages: Message[];
  onPlayAudio?: (text: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onPlayAudio }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex min-h-[620px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl">
      {/* Chat Header */}
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92))] px-6 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Companion Chat</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h2 className="font-[Orbitron] text-2xl font-bold tracking-wide text-white">Conversation</h2>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">Here with you</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_40%),linear-gradient(180deg,rgba(248,250,252,1),rgba(241,245,249,0.95))] p-6">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/70 text-center text-slate-500"
            >
              <div className="mb-4 h-16 w-16 rounded-full border border-cyan-300/30 bg-cyan-400/10" />
              <p className="max-w-sm text-lg leading-8 text-slate-600">Start speaking whenever you like. I will stay with you and respond gently.</p>
            </motion.div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] lg:max-w-xl px-5 py-4 rounded-2xl text-base leading-relaxed shadow-lg
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-none'
                      : 'border border-slate-200 bg-white text-slate-900 rounded-bl-none'
                    }
                  `}
                >
                  <p>{msg.text}</p>

                  {/* Play Audio Button for AI Response */}
                  {msg.role === 'assistant' && onPlayAudio && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onPlayAudio(msg.text)}
                      className="mt-3 flex items-center gap-2 rounded-lg bg-slate-950/10 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-950/20"
                    >
                      <Volume2 className="w-4 h-4" />
                      Read Aloud
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
