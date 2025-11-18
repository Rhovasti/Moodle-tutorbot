// Type definitions for ltijs library
declare module 'ltijs' {
  import { Express, Request, Response, NextFunction } from 'express';

  export interface LTIToken {
    user?: string;
    userInfo?: {
      name?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
      roles?: string[];
    };
    platformContext?: {
      context?: {
        id?: string;
        label?: string;
        title?: string;
      };
    };
    platformId?: string;
    clientId?: string;
    deploymentId?: string;
    contextId?: string;
    roles?: string[];
  }

  export interface Platform {
    url: string;
    name: string;
    clientId: string;
    authenticationEndpoint: string;
    accesstokenEndpoint: string;
    authorizationServer?: string;
    authConfig: {
      method: string;
      key: string;
    };
  }

  export interface SetupOptions {
    plugin?: {
      serverless?: boolean;
      connection?: {
        url: string;
      };
    };
    cookies?: {
      secure?: boolean;
      sameSite?: string;
    };
    cors?: boolean;
  }

  export interface DeployOptions {
    appRoute?: string;
    loginRoute?: string;
    sessionTimeoutRoute?: string;
    invalidTokenRoute?: string;
    keysetRoute?: string;
    dynRegRoute?: string;
    https?: boolean;
    ssl?: {
      key: string;
      cert: string;
    };
    staticPath?: string;
    serverAddon?: (app: Express) => void;
    tokenMaxAge?: number;
  }

  interface ProviderInstance {
    onConnect(
      callback: (token: LTIToken, req: Request, res: Response, next: NextFunction) => Promise<any> | void,
      options?: {
        sessionTimeout?: (req: Request, res: Response) => void;
        invalidToken?: (req: Request, res: Response) => void;
      }
    ): void;

    onDeepLinking(
      callback: (token: LTIToken, req: Request, res: Response) => Promise<any> | void
    ): void;

    onGetMembers(
      callback: (token: LTIToken, req: Request, res: Response) => Promise<any> | void
    ): void;

    onDynamicRegistration(
      callback: (req: Request, res: Response) => Promise<any> | void
    ): void;

    app: Express;

    whitelist(...routes: Array<string | { route: string; method: string }>): void;

    registerPlatform(platform: Platform): Promise<Platform>;

    deploy(options?: { port?: number | undefined; serverless?: boolean }): Promise<void>;

    DeepLinking: {
      createDeepLinkingForm(token: LTIToken, resources: any[], options?: { message?: string }): Promise<string>;
    };

    NamesAndRoles: {
      getMembers(token: LTIToken): Promise<any>;
    };

    setup(
      encryptionKey: string,
      setupOptions: SetupOptions,
      deployOptions: DeployOptions
    ): ProviderInstance;
  }

  const lti: ProviderInstance;
  export default lti;
  export { ProviderInstance as Provider };
}
