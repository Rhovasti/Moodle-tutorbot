import { Application, Request, Response, NextFunction } from 'express';
import lti from 'ltijs';
import { Provider, LTIToken } from 'ltijs';
import path from 'path';
import { logger } from '../utils/logger';
import User from '../models/User';

const { LTI_KEY, MONGODB_URI, LTI_URL, NODE_ENV } = process.env;

export async function setupLTI(_app: Application): Promise<Provider> {
  // Configure LTI provider
  lti.setup(
    LTI_KEY || 'LTIKEY',
    {
      // Use MongoDB for LTI data storage (platforms, keys, tokens)
      plugin: {
        serverless: false,
        connection: {
          url: MONGODB_URI || 'mongodb://localhost:27017/moodle-tutorbot-lti'
        }
      },
      // Cookie settings
      cookies: {
        secure: NODE_ENV === 'production', // Use secure cookies in production
        sameSite: NODE_ENV === 'production' ? 'None' : 'Lax'
      },
      // CORS settings
      cors: true
    },
    {
      // Additional options
      staticPath: path.join(__dirname, '../../../dist'), // Serve frontend
      appRoute: '/', // Main app route after LTI launch
      loginRoute: '/lti/login', // OIDC login route
      keysetRoute: '/lti/keys', // JWKS endpoint
      dynRegRoute: '/lti/register', // Dynamic registration
      invalidTokenRoute: '/lti/invalidtoken',
      sessionTimeoutRoute: '/lti/sessiontimeout'
    }
  );

  // Register LTI launch handler
  lti.onConnect(async (token: LTIToken, req: Request, res: Response, _next: NextFunction) => {
    try {
      logger.info('LTI Launch received');

      // Extract user information from LTI token
      const userInfo = {
        ltiUserId: token.user,
        name: token.userInfo?.name || 'Anonymous',
        email: token.userInfo?.email || '',
        roles: token.userInfo?.roles || [],
        contextId: token.platformContext?.context?.id || '',
        contextLabel: token.platformContext?.context?.label || '',
        contextTitle: token.platformContext?.context?.title || '',
        platformId: token.platformId,
        clientId: token.clientId
      };

      logger.info('User info from LTI:', {
        userId: userInfo.ltiUserId,
        name: userInfo.name,
        contextId: userInfo.contextId,
        roles: userInfo.roles
      });

      // Find or create user in database
      let user = await User.findOne({
        ltiUserId: userInfo.ltiUserId,
        platformId: userInfo.platformId,
        contextId: userInfo.contextId
      });

      if (!user) {
        user = await User.create({
          ltiUserId: userInfo.ltiUserId,
          name: userInfo.name,
          email: userInfo.email,
          roles: userInfo.roles,
          contextId: userInfo.contextId,
          contextLabel: userInfo.contextLabel,
          contextTitle: userInfo.contextTitle,
          platformId: userInfo.platformId,
          clientId: userInfo.clientId
        });
        logger.info(`Created new user: ${user._id}`);
      } else {
        // Update user info in case it changed
        user.name = userInfo.name;
        user.email = userInfo.email;
        user.roles = userInfo.roles;
        user.contextLabel = userInfo.contextLabel;
        user.contextTitle = userInfo.contextTitle;
        await user.save();
        logger.info(`Updated existing user: ${user._id}`);
      }

      // Store user ID in session for API authentication
      if (req.session) {
        req.session.userId = String(user._id);
        req.session.ltiUserId = userInfo.ltiUserId;
        req.session.contextId = userInfo.contextId;
        req.session.platformId = userInfo.platformId;
      }

      // Redirect to main app (React frontend)
      return res.redirect('/');
    } catch (error) {
      logger.error('Error in LTI launch handler:', error);
      return res.status(500).send('Error processing LTI launch');
    }
  });

  // Register Deep Linking handler (for content selection)
  lti.onDeepLinking(async (token: LTIToken, _req: Request, res: Response) => {
    try {
      logger.info('Deep Linking request received');

      // Create a deep link item
      const resource = {
        type: 'ltiResourceLink',
        title: 'Moodle Tutorbot',
        text: 'AI-powered learning assistant',
        url: `${LTI_URL}/lti/launch`,
        custom: {
          tool: 'tutorbot'
        }
      };

      // Build and return deep linking form
      const form = await lti.DeepLinking.createDeepLinkingForm(
        token,
        [resource],
        { message: 'Tutorbot added successfully!' }
      );

      return res.send(form);
    } catch (error) {
      logger.error('Error in Deep Linking handler:', error);
      return res.status(500).send('Error processing Deep Linking request');
    }
  });

  // Note: Names and Role Provisioning Service (onGetMembers) is not available in ltijs v5.9.7
  // If needed, this functionality can be accessed via lti.NamesAndRoles.getMembers() directly

  // Configure dynamic registration
  lti.onDynamicRegistration(async (_req: Request, res: Response) => {
    try {
      logger.info('Dynamic registration request received');

      // Return tool configuration
      return res.json({
        application_type: 'web',
        grant_types: ['client_credentials', 'implicit'],
        response_types: ['id_token'],
        redirect_uris: [`${LTI_URL}/lti/launch`],
        initiate_login_uri: `${LTI_URL}/lti/login`,
        client_name: 'Moodle Tutorbot',
        jwks_uri: `${LTI_URL}/lti/keys`,
        logo_uri: `${LTI_URL}/logo.png`,
        token_endpoint_auth_method: 'private_key_jwt',
        scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
        'https://purl.imsglobal.org/spec/lti-tool-configuration': {
          domain: new URL(LTI_URL || 'http://localhost:3001').hostname,
          description: 'AI-powered personalized learning assistant for Moodle',
          target_link_uri: `${LTI_URL}/lti/launch`,
          custom_parameters: {},
          claims: ['iss', 'sub', 'name', 'email', 'given_name', 'family_name'],
          messages: [
            {
              type: 'LtiDeepLinkingRequest',
              target_link_uri: `${LTI_URL}/lti/deeplink`,
              label: 'Add Tutorbot'
            },
            {
              type: 'LtiResourceLinkRequest',
              target_link_uri: `${LTI_URL}/lti/launch`,
              label: 'Launch Tutorbot'
            }
          ]
        }
      });
    } catch (error) {
      logger.error('Error in dynamic registration:', error);
      return res.status(500).send('Error processing registration');
    }
  });

  // Deploy LTI provider
  await lti.deploy({ port: undefined }); // We handle port in main server

  logger.info('LTI Provider deployed successfully');

  // Register a platform (Moodle instance) - This would typically be done via UI or config
  // For now, this is a placeholder showing how to register a platform programmatically
  if (process.env.MOODLE_URL && process.env.MOODLE_CLIENT_ID) {
    try {
      await lti.registerPlatform({
        url: process.env.MOODLE_URL,
        name: process.env.MOODLE_NAME || 'Moodle Instance',
        clientId: process.env.MOODLE_CLIENT_ID,
        authenticationEndpoint: `${process.env.MOODLE_URL}/mod/lti/auth.php`,
        accesstokenEndpoint: `${process.env.MOODLE_URL}/mod/lti/token.php`,
        authorizationServer: `${process.env.MOODLE_URL}`,
        authConfig: {
          method: 'JWK_SET',
          key: `${process.env.MOODLE_URL}/mod/lti/certs.php`
        }
      });
      logger.info(`Registered Moodle platform: ${process.env.MOODLE_URL}`);
    } catch (error) {
      logger.warn('Could not register platform:', error);
    }
  }

  return lti;
}

export default lti;
