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
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-50 to-white rounded-xl shadow-lg">
      {/* Chat Header */}
      <div className="bg-blue-600 text-white p-6 rounded-t-xl">
        <h2 className="text-2xl font-bold tracking-wide">Conversation</h2>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center text-gray-500"
            >
              <p className="text-xl">Start speaking to begin!</p>
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
                    max-w-xs lg:max-w-md px-5 py-4 rounded-2xl text-base leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-900 rounded-bl-none'
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
                      className="mt-3 flex items-center gap-2 bg-white bg-opacity-30 hover:bg-opacity-50 px-3 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      <Volume2 className="w-4 h-4" />
                      Read aloud
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
