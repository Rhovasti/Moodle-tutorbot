import mongoose, { Document, Schema, Types, Model } from 'mongoose';

// Type definitions for structured Moodle data
export interface IQuizAttempt {
  quizId: number;
  quizName: string;
  attemptNumber: number;
  grade: number;
  maxGrade: number;
  percentage: number;
  timeStarted: Date;
  timeFinished: Date;
  state: string; // 'finished', 'inprogress', 'abandoned'
}

export interface IActivityCompletion {
  activityId: number;
  activityName: string;
  activityType: string; // 'quiz', 'assign', 'resource', etc.
  completed: boolean;
  completedAt?: Date;
  grade?: number;
}

export interface IStrugglingTopic {
  topic: string;
  relatedQuizzes: string[];
  averageScore: number;
  attempts: number;
}

export interface IStrength {
  topic: string;
  relatedQuizzes: string[];
  averageScore: number;
}

// Instance methods interface
export interface IMoodleContextMethods {
  isSyncStale(): boolean;
  toPromptContext(): string;
}

// Document interface with methods
export interface IMoodleContext extends Document, IMoodleContextMethods {
  userId: Types.ObjectId; // Internal user ID
  moodleUserId: number; // Moodle user ID
  courseId: number; // Moodle course ID

  // User profile data from Moodle
  profile: {
    username: string;
    fullname: string;
    email: string;
    lastAccess: Date;
    firstAccess: Date;
  };

  // Quiz history
  quizHistory: IQuizAttempt[];

  // Activity completion
  completedActivities: IActivityCompletion[];

  // Derived insights
  strugglingTopics: IStrugglingTopic[];
  strengths: IStrength[];

  // Overall statistics
  stats: {
    totalQuizzes: number;
    averageQuizScore: number;
    activitiesCompleted: number;
    totalActivities: number;
    completionRate: number;
  };

  // Last sync timestamp
  lastSyncedAt: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Model type
type MoodleContextModel = Model<IMoodleContext, {}, IMoodleContextMethods>;

const MoodleContextSchema = new Schema<IMoodleContext, MoodleContextModel, IMoodleContextMethods>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    moodleUserId: {
      type: Number,
      required: true,
      index: true
    },
    courseId: {
      type: Number,
      required: true,
      index: true
    },
    profile: {
      username: { type: String, required: true },
      fullname: { type: String, required: true },
      email: { type: String, required: true },
      lastAccess: { type: Date },
      firstAccess: { type: Date }
    },
    quizHistory: [{
      quizId: { type: Number, required: true },
      quizName: { type: String, required: true },
      attemptNumber: { type: Number, required: true },
      grade: { type: Number, required: true },
      maxGrade: { type: Number, required: true },
      percentage: { type: Number, required: true },
      timeStarted: { type: Date, required: true },
      timeFinished: { type: Date, required: true },
      state: {
        type: String,
        enum: ['finished', 'inprogress', 'abandoned'],
        required: true
      }
    }],
    completedActivities: [{
      activityId: { type: Number, required: true },
      activityName: { type: String, required: true },
      activityType: { type: String, required: true },
      completed: { type: Boolean, required: true },
      completedAt: { type: Date },
      grade: { type: Number }
    }],
    strugglingTopics: [{
      topic: { type: String, required: true },
      relatedQuizzes: [{ type: String }],
      averageScore: { type: Number, required: true },
      attempts: { type: Number, required: true }
    }],
    strengths: [{
      topic: { type: String, required: true },
      relatedQuizzes: [{ type: String }],
      averageScore: { type: Number, required: true }
    }],
    stats: {
      totalQuizzes: { type: Number, default: 0 },
      averageQuizScore: { type: Number, default: 0 },
      activitiesCompleted: { type: Number, default: 0 },
      totalActivities: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 }
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient lookups by user and course
MoodleContextSchema.index({ userId: 1, courseId: 1 }, { unique: true });
MoodleContextSchema.index({ moodleUserId: 1, courseId: 1 });

// Instance method to check if sync is stale (older than 15 minutes)
MoodleContextSchema.methods.isSyncStale = function(): boolean {
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  return Date.now() - this.lastSyncedAt.getTime() > FIFTEEN_MINUTES;
};

// Instance method to get formatted context for AI prompt
MoodleContextSchema.methods.toPromptContext = function(): string {
  const ctx = this as IMoodleContext;

  let prompt = `Student Profile:
- Name: ${ctx.profile.fullname}
- Email: ${ctx.profile.email}
- Last Active: ${ctx.profile.lastAccess?.toLocaleDateString() || 'Unknown'}

Learning Progress:
- Quizzes Completed: ${ctx.stats.totalQuizzes}
- Average Quiz Score: ${ctx.stats.averageQuizScore.toFixed(1)}%
- Activities Completed: ${ctx.stats.activitiesCompleted}/${ctx.stats.totalActivities} (${ctx.stats.completionRate.toFixed(1)}%)
`;

  if (ctx.strugglingTopics.length > 0) {
    prompt += `\nStruggling Topics:\n`;
    ctx.strugglingTopics.forEach(topic => {
      prompt += `- ${topic.topic} (avg score: ${topic.averageScore.toFixed(1)}%, ${topic.attempts} attempts)\n`;
    });
  }

  if (ctx.strengths.length > 0) {
    prompt += `\nStrengths:\n`;
    ctx.strengths.forEach(strength => {
      prompt += `- ${strength.topic} (avg score: ${strength.averageScore.toFixed(1)}%)\n`;
    });
  }

  if (ctx.quizHistory.length > 0) {
    prompt += `\nRecent Quiz Activity:\n`;
    ctx.quizHistory.slice(0, 5).forEach(quiz => {
      prompt += `- ${quiz.quizName}: ${quiz.percentage.toFixed(1)}% (attempt ${quiz.attemptNumber})\n`;
    });
  }

  return prompt;
};

const MoodleContext = mongoose.model<IMoodleContext, MoodleContextModel>('MoodleContext', MoodleContextSchema);

export default MoodleContext;
