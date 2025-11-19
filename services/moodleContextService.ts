/**
 * Moodle Context Service
 * Handles fetching user learning context from the backend API
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface QuizAttempt {
  quizId: number;
  quizName: string;
  attemptId: number;
  grade: number;
  maxGrade: number;
  percentage: number;
  timeFinished: Date;
  questionsData?: any[];
}

export interface UserLearningContext {
  userId: string;
  courseId: number;
  quizAttempts: QuizAttempt[];
  strugglingTopics: string[];
  strongTopics: string[];
  overallPerformance: {
    averageGrade: number;
    totalAttempts: number;
    improvementTrend?: 'improving' | 'stable' | 'declining';
  };
  lastUpdated: Date;
}

/**
 * Fetch user's Moodle learning context
 */
export async function getUserContext(userId: string, courseId?: number): Promise<UserLearningContext | null> {
  try {
    const params = new URLSearchParams({ userId });
    if (courseId) {
      params.append('courseId', courseId.toString());
    }

    const response = await fetch(`${API_URL}/api/moodle-context?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No context found yet
      }
      throw new Error(`Failed to fetch user context: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated),
      quizAttempts: data.quizAttempts?.map((attempt: any) => ({
        ...attempt,
        timeFinished: new Date(attempt.timeFinished),
      })) || [],
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    throw error;
  }
}

/**
 * Trigger manual sync of Moodle data for a user
 */
export async function syncMoodleData(userId: string, courseId: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/moodle-context/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ userId, courseId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync Moodle data: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error syncing Moodle data:', error);
    throw error;
  }
}

/**
 * Get user's uploaded study materials info
 */
export async function getStudyMaterials(userId: string): Promise<any> {
  try {
    const response = await fetch(`${API_URL}/api/moodle-context/materials?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch study materials: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching study materials:', error);
    throw error;
  }
}
