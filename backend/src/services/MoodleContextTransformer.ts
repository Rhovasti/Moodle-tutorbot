import { moodleService } from './MoodleService';
import {
  IQuizAttempt,
  IActivityCompletion,
  IStrugglingTopic,
  IStrength,
  IMoodleContext
} from '../models/MoodleContext';

/**
 * Service to transform raw Moodle API data into structured MoodleContext format
 */
export class MoodleContextTransformer {
  /**
   * Transform Moodle quiz attempts into our format
   */
  private static transformQuizAttempts(
    rawAttempts: any[],
    courseMaterials: any[]
  ): IQuizAttempt[] {
    return rawAttempts
      .filter(attempt => attempt.state === 'finished')
      .map(attempt => {
        // Find quiz name from course materials
        let quizName = `Quiz ${attempt.quiz}`;
        for (const section of courseMaterials) {
          const quizModule = section.modules?.find(
            (m: any) => m.modname === 'quiz' && m.instance === attempt.quiz
          );
          if (quizModule) {
            quizName = quizModule.name;
            break;
          }
        }

        // Calculate percentage
        const percentage = attempt.sumgrades && attempt.sumgrades > 0
          ? (attempt.sumgrades / 100) * 100 // Moodle sumgrades is already a percentage
          : 0;

        return {
          quizId: attempt.quiz,
          quizName,
          attemptNumber: attempt.attempt,
          grade: attempt.sumgrades || 0,
          maxGrade: 100,
          percentage,
          timeStarted: new Date(attempt.timestart * 1000),
          timeFinished: new Date(attempt.timefinish * 1000),
          state: attempt.state
        };
      })
      .sort((a, b) => b.timeFinished.getTime() - a.timeFinished.getTime());
  }

  /**
   * Transform Moodle activity completion data
   */
  private static transformActivityCompletion(
    rawCompletion: any[],
    courseMaterials: any[]
  ): IActivityCompletion[] {
    return rawCompletion
      .filter(comp => comp.state === 1) // Only completed activities
      .map(comp => {
        // Find activity details from course materials
        let activityName = `Activity ${comp.cmid}`;
        let activityType = comp.modname || 'unknown';

        for (const section of courseMaterials) {
          const module = section.modules?.find((m: any) => m.id === comp.cmid);
          if (module) {
            activityName = module.name;
            activityType = module.modname;
            break;
          }
        }

        return {
          activityId: comp.cmid,
          activityName,
          activityType,
          completed: comp.state === 1,
          completedAt: comp.timecompleted ? new Date(comp.timecompleted * 1000) : undefined
        };
      });
  }

  /**
   * Analyze quiz history to identify struggling topics
   */
  private static identifyStrugglingTopics(
    quizHistory: IQuizAttempt[]
  ): IStrugglingTopic[] {
    const STRUGGLING_THRESHOLD = 70; // Below 70% is struggling

    // Group quizzes by name (topic)
    const topicMap = new Map<string, {
      scores: number[];
      quizNames: Set<string>;
    }>();

    quizHistory.forEach(quiz => {
      if (!topicMap.has(quiz.quizName)) {
        topicMap.set(quiz.quizName, {
          scores: [],
          quizNames: new Set()
        });
      }
      const topic = topicMap.get(quiz.quizName)!;
      topic.scores.push(quiz.percentage);
      topic.quizNames.add(quiz.quizName);
    });

    // Calculate averages and identify struggling topics
    const strugglingTopics: IStrugglingTopic[] = [];

    topicMap.forEach((data, topicName) => {
      const average = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;

      if (average < STRUGGLING_THRESHOLD) {
        strugglingTopics.push({
          topic: topicName,
          relatedQuizzes: Array.from(data.quizNames),
          averageScore: average,
          attempts: data.scores.length
        });
      }
    });

    return strugglingTopics.sort((a, b) => a.averageScore - b.averageScore);
  }

  /**
   * Analyze quiz history to identify strengths
   */
  private static identifyStrengths(quizHistory: IQuizAttempt[]): IStrength[] {
    const STRENGTH_THRESHOLD = 85; // Above 85% is a strength

    // Group quizzes by name (topic)
    const topicMap = new Map<string, {
      scores: number[];
      quizNames: Set<string>;
    }>();

    quizHistory.forEach(quiz => {
      if (!topicMap.has(quiz.quizName)) {
        topicMap.set(quiz.quizName, {
          scores: [],
          quizNames: new Set()
        });
      }
      const topic = topicMap.get(quiz.quizName)!;
      topic.scores.push(quiz.percentage);
      topic.quizNames.add(quiz.quizName);
    });

    // Calculate averages and identify strengths
    const strengths: IStrength[] = [];

    topicMap.forEach((data, topicName) => {
      const average = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;

      if (average >= STRENGTH_THRESHOLD) {
        strengths.push({
          topic: topicName,
          relatedQuizzes: Array.from(data.quizNames),
          averageScore: average
        });
      }
    });

    return strengths.sort((a, b) => b.averageScore - a.averageScore);
  }

  /**
   * Calculate overall statistics
   */
  private static calculateStats(
    quizHistory: IQuizAttempt[],
    completedActivities: IActivityCompletion[],
    totalActivities: number
  ) {
    const totalQuizzes = quizHistory.length;
    const averageQuizScore = totalQuizzes > 0
      ? quizHistory.reduce((sum, quiz) => sum + quiz.percentage, 0) / totalQuizzes
      : 0;
    const activitiesCompleted = completedActivities.length;
    const completionRate = totalActivities > 0
      ? (activitiesCompleted / totalActivities) * 100
      : 0;

    return {
      totalQuizzes,
      averageQuizScore,
      activitiesCompleted,
      totalActivities,
      completionRate
    };
  }

  /**
   * Main transformation function: fetch and transform all Moodle data
   */
  static async fetchAndTransform(
    moodleUserId: number,
    courseId: number
  ): Promise<Partial<IMoodleContext>> {
    // Fetch all data from Moodle in parallel
    const contextData = await moodleService.getUserCourseContext(moodleUserId, courseId);

    // Transform user profile
    const profile = {
      username: contextData.user.username || '',
      fullname: contextData.user.fullname || '',
      email: contextData.user.email || '',
      lastAccess: contextData.user.lastaccess
        ? new Date(contextData.user.lastaccess * 1000)
        : new Date(),
      firstAccess: contextData.user.firstaccess
        ? new Date(contextData.user.firstaccess * 1000)
        : new Date()
    };

    // Transform quiz attempts
    const quizHistory = this.transformQuizAttempts(
      contextData.quizAttempts,
      contextData.courseMaterials
    );

    // Transform activity completion
    const completedActivities = this.transformActivityCompletion(
      contextData.activityCompletion,
      contextData.courseMaterials
    );

    // Calculate total activities from course materials
    const totalActivities = contextData.courseMaterials.reduce(
      (count, section) => count + (section.modules?.length || 0),
      0
    );

    // Identify struggling topics and strengths
    const strugglingTopics = this.identifyStrugglingTopics(quizHistory);
    const strengths = this.identifyStrengths(quizHistory);

    // Calculate statistics
    const stats = this.calculateStats(quizHistory, completedActivities, totalActivities);

    return {
      moodleUserId,
      courseId,
      profile,
      quizHistory,
      completedActivities,
      strugglingTopics,
      strengths,
      stats,
      lastSyncedAt: new Date()
    };
  }
}
