import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Pill, Utensils, Activity, Lightbulb } from 'lucide-react';

interface HealthScheduleProps {
  nudges: string[];
  upcomingEvents?: Array<{
    category: string;
    title: string;
    time: string;
  }>;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'medication':
    case 'medicine':
      return Pill;
    case 'meals':
    case 'meal':
      return Utensils;
    case 'activity':
    case 'exercise':
      return Activity;
    default:
      return Clock;
  }
};

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'medication':
    case 'medicine':
      return 'from-red-400 to-pink-500';
    case 'meals':
    case 'meal':
      return 'from-green-400 to-emerald-500';
    case 'activity':
    case 'exercise':
      return 'from-blue-400 to-cyan-500';
    default:
      return 'from-gray-400 to-gray-600';
  }
};

export const HealthSchedule: React.FC<HealthScheduleProps> = ({ nudges, upcomingEvents = [] }) => {
  return (
    <div className="space-y-4">
      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 md:p-6 shadow-md"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Upcoming Today
          </h3>

          <div className="space-y-3">
            {upcomingEvents.slice(0, 3).map((event, idx) => {
              const Icon = getCategoryIcon(event.category);
              const colorClass = getCategoryColor(event.category);

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${colorClass} text-white`}
                  whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{event.title}</p>
                    <p className="text-sm opacity-90">{event.time}</p>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-lg"
                  >
                    ⏰
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Daily Nudges */}
      {nudges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 md:p-6 shadow-md"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Daily Reminders
          </h3>

          <div className="space-y-3">
            {nudges.map((nudge, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex gap-3 p-3 bg-amber-50 rounded-lg border-l-4 border-amber-400"
                whileHover={{ backgroundColor: '#fef3c7' }}
              >
                <span className="text-2xl flex-shrink-0">💡</span>
                <p className="text-gray-700 text-sm md:text-base">{nudge}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {nudges.length === 0 && upcomingEvents.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-gray-500"
        >
          <p>No upcoming reminders for now</p>
        </motion.div>
      )}
    </div>
  );
};
