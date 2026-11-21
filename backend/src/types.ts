import { Request } from 'express';
import { User } from './entity/User';

export interface KeycloakTokenContent {
  sub: string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  realm_access?: { roles: string[] };
}

export interface KeycloakRequest extends Request {
  kauth?: {
    grant?: {
      access_token?: {
        content?: KeycloakTokenContent;
      };
    };
  };
  dbUser?: User;
}
