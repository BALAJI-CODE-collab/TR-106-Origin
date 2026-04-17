import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';

interface ExternalDementiaGameProps {
  isVisible: boolean;
  onClose: () => void;
  onGameResult: (result: { recall: number; orientation: number; attention: number }) => void;
}

const GAME_ORIGIN = 'http://127.0.0.1:8001';
const GAME_URL = `${GAME_ORIGIN}/dementia-game/`;

export const ExternalDementiaGame: React.FC<ExternalDementiaGameProps> = ({
  isVisible,
  onClose,
  onGameResult,
}) => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== GAME_ORIGIN) return;

      const data = event.data as Partial<{
        type: string;
        recall: number;
        orientation: number;
        attention: number;
      }>;

      if (
        data?.type === 'dementia-game-finished' &&
        typeof data.recall === 'number' &&
        typeof data.orientation === 'number' &&
        typeof data.attention === 'number'
      ) {
        onGameResult({
          recall: data.recall,
          orientation: data.orientation,
          attention: data.attention,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onGameResult]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#08111f] shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white md:px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">External ML Project</p>
              <h3 className="text-lg font-semibold">Dementia Focus Game from ML Folder</h3>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={GAME_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" />
                Open in new tab
              </a>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[#eef4f8]">
            <iframe
              title="Dementia Focus Game"
              src={GAME_URL}
              className="h-full w-full border-0"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
