import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, Volume2 } from 'lucide-react';

interface GameResult {
  type: 'memory' | 'typing';
  score: number;
  accuracy: number;
  timeSpent: number;
}

interface CognitiveGameProps {
  onGameComplete: (result: GameResult) => void;
  isVisible: boolean;
}

const MEMORY_WORDS = [
  'Apple',
  'Elephant',
  'Mountain',
  'Book',
  'Butterfly',
];

export const CognitiveGame: React.FC<CognitiveGameProps> = ({
  onGameComplete,
  isVisible,
}) => {
  const [gameType, setGameType] = useState<'memory' | 'typing' | null>(null);
  const [showWords, setShowWords] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [recalled, setRecalled] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [memoryCountdown, setMemoryCountdown] = useState(5);
  const [showingResult, setShowingResult] = useState(false);

  // Memory Game Timer
  useEffect(() => {
    if (gameType === 'memory' && showWords && memoryCountdown > 0) {
      const timer = setTimeout(() => setMemoryCountdown(memoryCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (memoryCountdown === 0 && showWords) {
      setShowWords(false);
    }
  }, [gameType, showWords, memoryCountdown]);

  // Time counter
  useEffect(() => {
    if (gameStarted && !showingResult) {
      const timer = setInterval(() => setTimeSpent((t) => t + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, showingResult]);

  const startMemoryGame = () => {
    setGameType('memory');
    setGameStarted(true);
    setMemoryCountdown(5);
    setShowWords(true);
  };

  const startTypingGame = () => {
    setGameType('typing');
    setGameStarted(true);
    setTimeSpent(0);
  };

  const submitMemoryRecall = () => {
    const correct = userInput
      .split(',')
      .map((w) => w.trim())
      .filter((word) =>
        MEMORY_WORDS.some((mw) => mw.toLowerCase() === word.toLowerCase())
      ).length;

    const accuracy = Math.round((correct / MEMORY_WORDS.length) * 100);
    const result: GameResult = {
      type: 'memory',
      score: correct,
      accuracy,
      timeSpent,
    };

    setScore(correct);
    setShowingResult(true);
    onGameComplete(result);
  };

  const submitTypingTest = () => {
    const sentence = 'The quick brown fox jumps over the lazy dog';
    const accuracy = Math.round(
      ((userInput.length - countDifferences(userInput, sentence)) /
        sentence.length) *
        100
    );

    const result: GameResult = {
      type: 'typing',
      score: userInput.length,
      accuracy,
      timeSpent,
    };

    setScore(accuracy);
    setShowingResult(true);
    onGameComplete(result);
  };

  const countDifferences = (a: string, b: string): number => {
    let diff = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] !== b[i]) diff++;
    }
    diff += Math.abs(a.length - b.length);
    return diff;
  };

  const resetGame = () => {
    setGameType(null);
    setGameStarted(false);
    setUserInput('');
    setRecalled([]);
    setScore(0);
    setTimeSpent(0);
    setMemoryCountdown(5);
    setShowingResult(false);
    setShowWords(true);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence mode="wait">
      {!gameType ? (
        <motion.div
          key="game-selection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🧠 Brain Training Games
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Memory Game */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startMemoryGame}
              className="bg-gradient-to-br from-purple-400 to-pink-500 text-white p-8 rounded-xl text-center hover:shadow-lg transition"
            >
              <p className="text-5xl mb-4">🧠</p>
              <p className="text-2xl font-bold mb-2">Memory Test</p>
              <p className="text-sm opacity-90">Remember words for 5 seconds</p>
            </motion.button>

            {/* Typing Game */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startTypingGame}
              className="bg-gradient-to-br from-blue-400 to-cyan-500 text-white p-8 rounded-xl text-center hover:shadow-lg transition"
            >
              <p className="text-5xl mb-4">⌨️</p>
              <p className="text-2xl font-bold mb-2">Typing Speed</p>
              <p className="text-sm opacity-90">Type the sentence quickly</p>
            </motion.button>
          </div>
        </motion.div>
      ) : gameType === 'memory' ? (
        <motion.div
          key="memory-game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🧠 Memory Test</h2>

          {showWords ? (
            <div className="text-center">
              <p className="text-gray-600 mb-4 text-lg">
                Remember these words for {memoryCountdown} seconds:
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {MEMORY_WORDS.map((word, idx) => (
                  <motion.div
                    key={word}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.2 }}
                    className="bg-gradient-to-br from-purple-400 to-pink-500 text-white p-6 rounded-lg text-xl font-bold"
                  >
                    {word}
                  </motion.div>
                ))}
              </div>

              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-6xl font-bold text-purple-600"
              >
                {memoryCountdown}
              </motion.div>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-4 text-lg font-semibold">
                How many words can you recall? Type them (comma separated):
              </p>

              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="e.g., Apple, Elephant, Mountain..."
                className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-lg"
              />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={submitMemoryRecall}
                className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-lg text-lg transition"
              >
                Submit Answer
              </motion.button>
            </div>
          )}
        </motion.div>
      ) : gameType === 'typing' ? (
        <motion.div
          key="typing-game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">⌨️ Typing Speed Test</h2>

          <p className="text-gray-700 mb-4 text-lg font-semibold">Type this sentence:</p>

          <div className="bg-blue-50 border-2 border-blue-300 p-6 rounded-lg mb-6">
            <p className="text-2xl font-mono text-gray-800">
              The quick brown fox jumps over the lazy dog
            </p>
          </div>

          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Start typing here..."
            className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
          />

          <div className="mt-4 flex justify-between items-center">
            <p className="text-gray-600 text-lg">⏱ Time: {timeSpent}s</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={submitTypingTest}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition"
            >
              Submit
            </motion.button>
          </div>
        </motion.div>
      ) : null}

      {/* Result Screen */}
      {showingResult && (
        <motion.div
          key="result"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl shadow-xl p-8 text-white text-center mt-6"
        >
          <p className="text-6xl mb-4">🎉</p>
          <h3 className="text-3xl font-bold mb-4">Great job!</h3>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white bg-opacity-20 p-4 rounded-lg">
              <p className="text-sm opacity-90">Score</p>
              <p className="text-4xl font-bold">{score}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-4 rounded-lg">
              <p className="text-sm opacity-90">Time</p>
              <p className="text-4xl font-bold">{timeSpent}s</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetGame}
            className="bg-white text-green-600 font-bold py-3 px-8 rounded-lg text-lg hover:shadow-lg transition flex items-center gap-2 mx-auto"
          >
            <RotateCw className="w-5 h-5" />
            Play Again
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
