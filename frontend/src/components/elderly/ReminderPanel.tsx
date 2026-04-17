import React from 'react';
import { motion } from 'framer-motion';
import { Pill, Droplets, Zap, Clock, CheckCircle } from 'lucide-react';

interface Reminder {
  id: string;
  title: string;
  category: 'medicine' | 'water' | 'exercise' | 'meal';
  time: string;
  completed: boolean;
}

interface ReminderPanelProps {
  reminders: Reminder[];
  onCompleteReminder: (id: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'medicine':
      return <Pill className="w-6 h-6" />;
    case 'water':
      return <Droplets className="w-6 h-6" />;
    case 'exercise':
      return <Zap className="w-6 h-6" />;
    default:
      return <Clock className="w-6 h-6" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'medicine':
      return 'from-red-400 to-pink-500';
    case 'water':
      return 'from-blue-400 to-cyan-500';
    case 'exercise':
      return 'from-orange-400 to-yellow-500';
    default:
      return 'from-gray-400 to-gray-600';
  }
};

export const ReminderPanel: React.FC<ReminderPanelProps> = ({
  reminders,
  onCompleteReminder,
}) => {
  const pendingReminders = reminders.filter((r) => !r.completed);
  const completedCount = reminders.filter((r) => r.completed).length;
  const progressPercent = reminders.length > 0 ? (completedCount / reminders.length) * 100 : 0;

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Daily Check-ins</p>
        <h3 className="mb-2 mt-1 text-2xl font-bold tracking-wide text-slate-800">Friendly Reminders</h3>
        <p className="text-sm text-slate-600">
          {completedCount} of {reminders.length} completed
        </p>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <motion.div
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-green-400 to-blue-600"
          />
        </div>
      </div>

      {/* Reminders List */}
      <div className="grid gap-3">
        {pendingReminders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-slate-200 bg-slate-50 py-8 text-center"
          >
            <p className="text-lg font-semibold text-slate-700">All done for today. Nice work.</p>
          </motion.div>
        ) : (
          pendingReminders.map((reminder, idx) => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`
                flex items-center gap-4 rounded-2xl p-4 text-white shadow-md transition
                bg-gradient-to-r ${getCategoryColor(reminder.category)}
                cursor-pointer hover:-translate-y-0.5 hover:shadow-xl
              `}
              onClick={() => onCompleteReminder(reminder.id)}
            >
              {/* Icon */}
              <div className="text-white flex-shrink-0">
                {getCategoryIcon(reminder.category)}
              </div>

              {/* Content */}
              <div className="flex-1">
                <p className="text-lg font-bold">{reminder.title}</p>
                <p className="text-sm opacity-90">{reminder.time}</p>
              </div>

              {/* Tap to Complete */}
              <motion.div
                whileHover={{ scale: 1.2 }}
                className="text-white flex-shrink-0 text-xs uppercase tracking-widest"
              >
                Tap
              </motion.div>
            </motion.div>
          ))
        )}

        {/* Completed Reminders */}
        {completedCount > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="mb-3 text-sm font-semibold tracking-wide text-slate-600">Completed Today</p>
            <div className="space-y-2">
              {reminders
                .filter((r) => r.completed)
                .map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center gap-3 text-slate-500 opacity-80"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm line-through">{reminder.title}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
