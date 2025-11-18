import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// TypeScript Types for Moodle API Responses
// ============================================================================

export interface MoodleSiteInfo {
  sitename: string;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  lang: string;
  userid: number;
  siteurl: string;
  userpictureurl: string;
  functions: Array<{ name: string; version: string }>;
  downloadfiles: number;
  uploadfiles: number;
  release: string;
  version: string;
  mobilecssurl: string;
  advancedfeatures: Array<{ name: string; value: number }>;
  usercanmanageownfiles: boolean;
  userquota: number;
  usermaxuploadfilesize: number;
  userhomepage: number;
}

export interface MoodleUser {
  id: number;
  username?: string;
  firstname?: string;
  lastname?: string;
  fullname?: string;
  email?: string;
  department?: string;
  institution?: string;
  idnumber?: string;
  firstaccess?: number;
  lastaccess?: number;
  auth?: string;
  suspended?: boolean;
  confirmed?: boolean;
  lang?: string;
  theme?: string;
  timezone?: string;
  description?: string;
  descriptionformat?: number;
  profileimageurlsmall?: string;
  profileimageurl?: string;
}

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname: string;
  enrolledusercount?: number;
  idnumber?: string;
  visible?: number;
  summary?: string;
  summaryformat?: number;
  format?: string;
  showgrades?: boolean;
  lang?: string;
  enablecompletion?: boolean;
  category?: number;
  progress?: number;
  completed?: boolean;
  startdate?: number;
  enddate?: number;
}

export interface MoodleQuizAttempt {
  id: number;
  quiz: number;
  userid: number;
  attempt: number;
  uniqueid: number;
  layout: string;
  currentpage: number;
  preview: number;
  state: string;
  timestart: number;
  timefinish: number;
  timemodified: number;
  timecheckstate: number;
  sumgrades: number;
  gradednotificationsenttime?: number;
}

export interface MoodleActivityCompletion {
  cmid: number;
  modname: string;
  instance: number;
  state: number;
  timecompleted: number;
  tracking: number;
  overrideby?: number;
  valueused?: boolean;
}

export interface MoodleCourseContent {
  id: number;
  name: string;
  visible?: number;
  summary: string;
  summaryformat: number;
  section?: number;
  hiddenbynumsections?: number;
  uservisible?: boolean;
  modules: MoodleModule[];
}

export interface MoodleModule {
  id: number;
  url?: string;
  name: string;
  instance?: number;
  contextid?: number;
  visible?: number;
  uservisible?: boolean;
  visibleoncoursepage?: number;
  modicon: string;
  modname: string;
  modplural: string;
  indent: number;
  onclick?: string;
  afterlink?: string;
  customdata?: string;
  noviewlink?: boolean;
  completion?: number;
  completiondata?: {
    state: number;
    timecompleted: number;
    overrideby?: number;
    valueused?: boolean;
    hascompletion?: boolean;
    isautomatic?: boolean;
    istrackeduser?: boolean;
    uservisible?: boolean;
    details?: any[];
  };
  contents?: MoodleModuleContent[];
  description?: string;
}

export interface MoodleModuleContent {
  type: string;
  filename: string;
  filepath?: string;
  filesize: number;
  fileurl: string;
  content?: string;
  timecreated: number;
  timemodified: number;
  sortorder?: number;
  mimetype?: string;
  isexternalfile?: boolean;
  userid?: number;
  author?: string;
  license?: string;
}

export interface MoodleCourseNote {
  id: number;
  courseid: number;
  userid: number;
  content: string;
  format: number;
  created: number;
  lastmodified: number;
  usermodified: number;
  publishstate: string;
}

export interface MoodleErrorResponse {
  exception: string;
  errorcode: string;
  message: string;
  debuginfo?: string;
}

// ============================================================================
// MoodleService Class
// ============================================================================

export class MoodleService {
  private wsToken: string;
  private wsEndpoint: string;
  private wsFormat: string;

  constructor() {
    this.wsToken = process.env.MOODLE_WS_TOKEN || '';
    this.wsEndpoint = process.env.MOODLE_WS_ENDPOINT || '';
    this.wsFormat = process.env.MOODLE_WS_FORMAT || 'json';

    if (!this.wsToken) {
      throw new Error('MOODLE_WS_TOKEN environment variable is not set');
    }
    if (!this.wsEndpoint) {
      throw new Error('MOODLE_WS_ENDPOINT environment variable is not set');
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Helper function for async delays (used in retry logic)
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry logic with exponential backoff
   * Similar to geminiService retryWithBackoff pattern
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry on authentication or permission errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw error;
        }

        // Don't retry on client errors (except rate limiting)
        if (
          error.response?.status >= 400 &&
          error.response?.status < 500 &&
          error.response?.status !== 429
        ) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          break;
        }

        // Calculate delay with exponential backoff
        const delayMs = baseDelay * Math.pow(2, attempt);
        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms...`
        );
        await this.delay(delayMs);
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Call Moodle Web Service API
   * @param functionName - Moodle web service function name
   * @param params - Parameters for the function
   * @returns Promise resolving to API response
   */
  private async callMoodleAPI<T>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    return this.retryWithBackoff(async () => {
      try {
        // Build query parameters
        const queryParams = new URLSearchParams({
          wstoken: this.wsToken,
          wsfunction: functionName,
          moodlewsrestformat: this.wsFormat,
        });

        // Add function-specific parameters
        Object.entries(params).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            // Handle array parameters (e.g., values[0]=1, values[1]=2)
            value.forEach((item, index) => {
              queryParams.append(`${key}[${index}]`, String(item));
            });
          } else if (typeof value === 'object' && value !== null) {
            // Handle nested object parameters
            Object.entries(value).forEach(([subKey, subValue]) => {
              queryParams.append(`${key}[${subKey}]`, String(subValue));
            });
          } else {
            queryParams.append(key, String(value));
          }
        });

        const url = `${this.wsEndpoint}?${queryParams.toString()}`;

        const response = await axios.get<T | MoodleErrorResponse>(url, {
          timeout: 30000, // 30 second timeout
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        });

        // Check if response is an error
        if (this.isMoodleError(response.data)) {
          const errorData = response.data as MoodleErrorResponse;
          throw new Error(
            `Moodle API Error: ${errorData.errorcode} - ${errorData.message}`
          );
        }

        return response.data as T;
      } catch (error: any) {
        // Handle axios errors
        if (error.response) {
          // Server responded with error status
          const errorData = error.response.data as any;
          if (errorData?.exception) {
            throw new Error(
              `Moodle API Error: ${errorData.errorcode || 'unknown'} - ${
                errorData.message || 'Unknown error'
              }`
            );
          }
          throw new Error(
            `HTTP Error: ${error.response.status} - ${error.message}`
          );
        } else if (error.request) {
          // Request was made but no response received
          throw new Error(`Network Error: No response from server - ${error.message}`);
        } else {
          // Something else happened
          throw error;
        }
      }
    });
  }

  /**
   * Type guard to check if response is a Moodle error
   */
  private isMoodleError(data: any): data is MoodleErrorResponse {
    return data && typeof data === 'object' && 'exception' in data;
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Get site information including available functions
   * @returns Promise resolving to site info
   */
  async getSiteInfo(): Promise<MoodleSiteInfo> {
    return this.callMoodleAPI<MoodleSiteInfo>('core_webservice_get_site_info');
  }

  /**
   * Get user profile information
   * @param userId - Moodle user ID
   * @returns Promise resolving to user details
   */
  async getUserProfile(userId: number): Promise<MoodleUser> {
    const response = await this.callMoodleAPI<MoodleUser[]>(
      'core_user_get_users_by_field',
      {
        field: 'id',
        values: [userId],
      }
    );

    if (!response || response.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return response[0];
  }

  /**
   * Get user's quiz attempts for a specific course
   * @param userId - Moodle user ID
   * @param courseId - Moodle course ID
   * @returns Promise resolving to array of quiz attempts
   */
  async getQuizAttempts(
    userId: number,
    courseId: number
  ): Promise<{ attempts: MoodleQuizAttempt[] }> {
    return this.callMoodleAPI<{ attempts: MoodleQuizAttempt[] }>(
      'mod_quiz_get_user_attempts',
      {
        userid: userId,
        courseid: courseId,
      }
    );
  }

  /**
   * Get user's activity completion status for a course
   * @param userId - Moodle user ID
   * @param courseId - Moodle course ID
   * @returns Promise resolving to completion status
   */
  async getActivityCompletion(
    userId: number,
    courseId: number
  ): Promise<{
    statuses: MoodleActivityCompletion[];
    warnings?: any[];
  }> {
    return this.callMoodleAPI<{
      statuses: MoodleActivityCompletion[];
      warnings?: any[];
    }>('core_completion_get_activities_completion_status', {
      userid: userId,
      courseid: courseId,
    });
  }

  /**
   * Get course contents (materials, modules, resources)
   * @param courseId - Moodle course ID
   * @returns Promise resolving to course contents
   */
  async getCourseMaterials(courseId: number): Promise<MoodleCourseContent[]> {
    return this.callMoodleAPI<MoodleCourseContent[]>(
      'core_course_get_contents',
      {
        courseid: courseId,
      }
    );
  }

  /**
   * Get list of courses
   * @param userId - Optional user ID to filter enrolled courses
   * @returns Promise resolving to array of courses
   */
  async getCourses(userId?: number): Promise<MoodleCourse[]> {
    if (userId) {
      // Get courses enrolled by user
      const response = await this.callMoodleAPI<MoodleCourse[]>(
        'core_enrol_get_users_courses',
        {
          userid: userId,
        }
      );
      return response;
    } else {
      // Get all courses
      return this.callMoodleAPI<MoodleCourse[]>('core_course_get_courses');
    }
  }

  /**
   * Get course notes for a specific user
   * @param userId - Moodle user ID
   * @param courseId - Moodle course ID
   * @returns Promise resolving to array of notes
   */
  async getCourseNotes(
    userId: number,
    courseId: number
  ): Promise<{ sitenotes: MoodleCourseNote[]; coursenotes: MoodleCourseNote[]; personalnotes: MoodleCourseNote[] }> {
    return this.callMoodleAPI<{
      sitenotes: MoodleCourseNote[];
      coursenotes: MoodleCourseNote[];
      personalnotes: MoodleCourseNote[];
    }>('core_notes_get_course_notes', {
      userid: userId,
      courseid: courseId,
    });
  }

  /**
   * Get comprehensive user context for a course
   * Combines user profile, quiz attempts, activity completion, and course materials
   * @param userId - Moodle user ID
   * @param courseId - Moodle course ID
   * @returns Promise resolving to comprehensive user context
   */
  async getUserCourseContext(userId: number, courseId: number): Promise<{
    user: MoodleUser;
    quizAttempts: MoodleQuizAttempt[];
    activityCompletion: MoodleActivityCompletion[];
    courseMaterials: MoodleCourseContent[];
    courseNotes: {
      sitenotes: MoodleCourseNote[];
      coursenotes: MoodleCourseNote[];
      personalnotes: MoodleCourseNote[];
    };
  }> {
    // Fetch all data in parallel for performance
    const [user, quizAttemptsResponse, completionResponse, courseMaterials, courseNotes] =
      await Promise.all([
        this.getUserProfile(userId),
        this.getQuizAttempts(userId, courseId),
        this.getActivityCompletion(userId, courseId),
        this.getCourseMaterials(courseId),
        this.getCourseNotes(userId, courseId),
      ]);

    return {
      user,
      quizAttempts: quizAttemptsResponse.attempts || [],
      activityCompletion: completionResponse.statuses || [],
      courseMaterials,
      courseNotes,
    };
  }
}

// Export singleton instance
export const moodleService = new MoodleService();
