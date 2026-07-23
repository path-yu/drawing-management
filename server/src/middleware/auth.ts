import { Response, NextFunction } from 'express';
import { db } from '../database/db';
import { AuthRequest, SafeUser } from '../types';
import { verifyToken } from '../utils/jwt';
import { fail } from '../utils/response';

/**
 * 获取用户完整信息（含角色和权限）
 */
export function getUserWithPermissions(userId: number): SafeUser | null {
  const user = db.users.get((u) => u.id === userId);
  if (!user) return null;

  const role = user.role_id ? db.roles.get((r) => r.id === user.role_id) : null;

  // 查询用户权限列表
  let permissions: string[] = [];
  if (user.role_id) {
    const rpList = db.role_permissions.find((rp) => rp.role_id === user.role_id);
    for (const rp of rpList) {
      const perm = db.permissions.get((p) => p.id === rp.permission_id);
      if (perm) permissions.push(perm.code);
    }
  }

  return {
    id: user.id,
    username: user.username,
    real_name: user.real_name,
    email: user.email,
    phone: user.phone,
    role_id: user.role_id,
    role_name: role?.name || null,
    role_code: role?.code || null,
    status: user.status,
    avatar: user.avatar,
    permissions,
  };
}

/**
 * 认证中间件 - 验证 JWT Token
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(fail('未提供认证令牌', 401));
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json(fail('认证令牌无效或已过期', 401));
  }

  const user = getUserWithPermissions(decoded.id);
  if (!user) {
    return res.status(401).json(fail('用户不存在', 401));
  }
  if (user.status === 0) {
    return res.status(403).json(fail('账户已被禁用', 403));
  }

  req.user = user;
  next();
}

/**
 * 权限校验中间件工厂
 */
export function requirePermission(permissionCode: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(fail('未认证', 401));
    }
    if (req.user.role_code === 'super_admin') {
      return next();
    }
    if (!req.user.permissions.includes(permissionCode)) {
      return res.status(403).json(fail(`权限不足，需要: ${permissionCode}`, 403));
    }
    next();
  };
}

/**
 * 多权限校验（满足任意一个即可）
 */
export function requireAnyPermission(permissionCodes: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(fail('未认证', 401));
    }
    if (req.user.role_code === 'super_admin') {
      return next();
    }
    const hasPermission = permissionCodes.some((code) => req.user!.permissions.includes(code));
    if (!hasPermission) {
      return res.status(403).json(fail(`权限不足，需要以下权限之一: ${permissionCodes.join(', ')}`, 403));
    }
    next();
  };
}
