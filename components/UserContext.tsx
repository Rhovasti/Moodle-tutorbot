/**
 * UserContext Component
 * Displays user's Moodle learning context including quiz history, struggling topics, and strengths
 */

import React, { useEffect, useState } from 'react';
import { getUserContext, syncMoodleData, type UserLearningContext } from '../services/moodleContextService';
import type { User } from '../types';

interface UserContextProps {
  user: User;
  courseId?: number;
}

const UserContext: React.FC<UserContextProps> = ({ user, courseId }) => {
  const [context, setContext] = useState<UserLearningContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContext = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserContext(user.username, courseId);
      setContext(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, [user.username, courseId]);

  const handleSync = async () => {
    if (!courseId) {
      alert('Please specify a course ID to sync');
      return;
    }

    setIsSyncing(true);
    try {
      await syncMoodleData(user.username, courseId);
      await loadContext(); // Reload after sync
      alert('Moodle data synced successfully!');
    } catch (err) {
      alert('Failed to sync Moodle data');
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-700 dark:text-red-300">⚠️ {error}</p>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
          📚 No Moodle data available yet.
        </p>
        {courseId && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400"
          >
            {isSyncing ? 'Syncing...' : 'Sync Moodle Data'}
          </button>
        )}
      </div>
    );
  }

  const getTrendEmoji = (trend?: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Header with Sync Button */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
          📊 Your Learning Progress
        </h3>
        {courseId && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            title="Sync latest data from Moodle"
          >
            {isSyncing ? '⟳ Syncing...' : '⟳ Sync'}
          </button>
        )}
      </div>

      {/* Overall Performance */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
          Overall Performance
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Average Grade</p>
            <p className={`text-2xl font-bold ${getPerformanceColor(context.overallPerformance.averageGrade)}`}>
              {context.overallPerformance.averageGrade.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Quizzes</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {context.overallPerformance.totalAttempts}
            </p>
          </div>
        </div>
        {context.overallPerformance.improvementTrend && (
          <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
            {getTrendEmoji(context.overallPerformance.improvementTrend)} Trend: {context.overallPerformance.improvementTrend}
          </p>
        )}
      </div>

      {/* Strong Topics */}
      {context.strongTopics.length > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            💪 Strong Areas
          </h4>
          <div className="flex flex-wrap gap-2">
            {context.strongTopics.map((topic, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded-full"
              >
                ✓ {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Struggling Topics */}
      {context.strugglingTopics.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            🎯 Focus Areas
          </h4>
          <div className="flex flex-wrap gap-2">
            {context.strugglingTopics.map((topic, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 rounded-full"
              >
                📌 {topic}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
            💡 The AI will provide extra support on these topics
          </p>
        </div>
      )}

      {/* Recent Quiz Attempts */}
      {context.quizAttempts.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
            📝 Recent Quiz History
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {context.quizAttempts.slice(0, 10).map((attempt, index) => (
              <div
                key={index}
                className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {attempt.quizName}
                  </p>
                  <p className={`text-sm font-bold ${getPerformanceColor(attempt.percentage)}`}>
                    {attempt.percentage.toFixed(1)}%
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{attempt.grade} / {attempt.maxGrade} points</span>
                  <span>{new Date(attempt.timeFinished).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date(context.lastUpdated).toLocaleString()}
      </p>
    </div>
  );
};

export default UserContext;
