// Extend Express Session interface
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    ltiUserId?: string;
    contextId?: string;
    platformId?: string;
    userInfo?: {
      name?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
    };
    roles?: string[];
  }
}
