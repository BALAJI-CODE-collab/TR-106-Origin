import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';

interface MicButtonProps {
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  isProcessing?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({
  isListening,
  onStartListening,
  onStopListening,
  isProcessing = false,
}) => {
  useEffect(() => {}, [isListening]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Large Microphone Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={isListening ? onStopListening : onStartListening}
        disabled={isProcessing}
        className={`
          relative w-32 h-32 rounded-full flex items-center justify-center
          text-white font-bold text-xl transition-all
          ${isListening 
            ? 'bg-red-500 hover:bg-red-600 shadow-2xl' 
            : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* Pulsing background */}
        {isListening && (
          <>
            <motion.div
              animate={{ scale: [1, 1.3], opacity: [1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-red-400"
            />
            <motion.div
              animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              className="absolute inset-0 rounded-full bg-red-400"
            />
          </>
        )}

        {/* Icon */}
        <div className="relative z-10">
          {isListening ? (
            <Square className="w-12 h-12" fill="white" />
          ) : (
            <Mic className="w-12 h-12" />
          )}
        </div>
      </motion.button>

      {/* Status Text */}
      <div className="text-center">
        <p className="text-lg font-semibold tracking-wide text-slate-800">
          {isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Tap to speak'}
        </p>
        {isListening && (
          <p className="text-sm text-blue-600 mt-2 font-medium animate-pulse">
            Listening for your voice...
          </p>
        )}
      </div>

      {/* Audio Wave Animation */}
      {isListening && (
        <div className="flex gap-1 h-8 items-center">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: [8, 20, 8] }}
              transition={{
                duration: 0.4,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="w-1 bg-blue-600 rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  );
};
