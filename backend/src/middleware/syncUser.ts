import { Response, NextFunction } from 'express';
import { AppDataSource } from '../db/connection';
import { User, UserRole } from '../entity/User';
import { KeycloakRequest } from '../types';

const KNOWN_ROLES: UserRole[] = ['employee', 'supervisor', 'AO', 'HR'];

function extractRole(roles: string[]): UserRole {
  return KNOWN_ROLES.find((r) => roles.includes(r)) || 'employee';
}

/**
 * Runs after keycloak.protect(). Mirrors the authenticated Keycloak identity
 * into our local User table so requests can join against it, and keeps
 * profile/role fields fresh on every request since Keycloak is the source of truth.
 */
export async function syncUser(req: KeycloakRequest, res: Response, next: NextFunction): Promise<void> {
  const tokenContent = req.kauth?.grant?.access_token?.content;

  if (!tokenContent) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  try {
    const userRepository = AppDataSource.getRepository(User);
    let user = await userRepository.findOne({ where: { keycloakId: tokenContent.sub } });
    const role = extractRole(tokenContent.realm_access?.roles || []);

    if (!user) {
      user = userRepository.create({
        keycloakId: tokenContent.sub,
        email: tokenContent.email || tokenContent.preferred_username || tokenContent.sub,
        firstName: tokenContent.given_name || '',
        lastName: tokenContent.family_name || '',
        displayName: tokenContent.name || tokenContent.preferred_username || tokenContent.sub,
        role,
      });
    } else {
      user.email = tokenContent.email || user.email;
      user.firstName = tokenContent.given_name || user.firstName;
      user.lastName = tokenContent.family_name || user.lastName;
      user.displayName = tokenContent.name || tokenContent.preferred_username || user.displayName;
      user.role = role;
    }

    req.dbUser = await userRepository.save(user);
    next();
  } catch (err) {
    console.error('❌ Error syncing user:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Role-based access control middleware factory. Reads from the synced DB user
 * (req.dbUser), so it must run after syncUser.
 */
export function requireRoles(...roles: UserRole[]) {
  return (req: KeycloakRequest, res: Response, next: NextFunction): void => {
    if (!req.dbUser || !roles.includes(req.dbUser.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions',
        requiredRoles: roles,
        userRole: req.dbUser?.role,
      });
      return;
    }
    next();
  };
}
