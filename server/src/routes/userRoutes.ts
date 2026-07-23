import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/db';
import { AuthRequest } from '../types';
import { success, fail } from '../utils/response';
import { authMiddleware, requirePermission, getUserWithPermissions } from '../middleware/auth';

const router = Router();
const now = () => new Date().toISOString();

/**
 * GET /api/v1/users - 获取用户列表
 */
router.get('/', authMiddleware, requirePermission('user:view'), (req: AuthRequest, res) => {
  const { keyword, role_id, status, page = '1', page_size = '20' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const pageSize = parseInt(page_size as string, 10);

  let users = db.users.all();

  if (keyword) {
    const kw = (keyword as string).toLowerCase();
    users = users.filter((u) =>
      u.username.toLowerCase().includes(kw) ||
      (u.real_name || '').toLowerCase().includes(kw) ||
      (u.email || '').toLowerCase().includes(kw)
    );
  }
  if (role_id) {
    users = users.filter((u) => u.role_id === parseInt(role_id as string, 10));
  }
  if (status !== undefined) {
    users = users.filter((u) => u.status === parseInt(status as string, 10));
  }

  // 关联角色信息
  const list = users.map((u) => {
    const role = u.role_id ? db.roles.get((r) => r.id === u.role_id) : null;
    return {
      id: u.id, username: u.username, real_name: u.real_name, email: u.email,
      phone: u.phone, role_id: u.role_id, status: u.status, avatar: u.avatar,
      last_login_at: u.last_login_at, created_at: u.created_at, updated_at: u.updated_at,
      role_name: role?.name || null, role_code: role?.code || null,
    };
  });

  const total = list.length;
  const paged = list.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  res.json(success({ total, list: paged, page: pageNum, page_size: pageSize }));
});

/**
 * POST /api/v1/users - 新增用户
 */
router.post('/', authMiddleware, requirePermission('user:create'), (req: AuthRequest, res) => {
  const { username, password, real_name, email, phone, role_id } = req.body;

  if (!username || !password) {
    return res.status(400).json(fail('用户名和密码不能为空'));
  }
  if (db.users.get((u) => u.username === username)) {
    return res.status(409).json(fail('用户名已存在'));
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.users.insert({
    username, password: hashedPassword, real_name: real_name || null,
    email: email || null, phone: phone || null, role_id: role_id || null,
    status: 1, avatar: null, last_login_at: null, created_at: now(), updated_at: now(),
  });

  const user = getUserWithPermissions(result.id);
  res.json(success(user, '用户创建成功'));
});

/**
 * PUT /api/v1/users/:id - 编辑用户
 */
router.put('/:id', authMiddleware, requirePermission('user:edit'), (req: AuthRequest, res) => {
  const userId = parseInt(req.params.id, 10);
  const { real_name, email, phone, role_id, status } = req.body;

  const user = db.users.get((u) => u.id === userId);
  if (!user) {
    return res.status(404).json(fail('用户不存在'));
  }

  db.users.update((u) => u.id === userId, {
    real_name: real_name || null, email: email || null, phone: phone || null,
    role_id: role_id || null, status: status !== undefined ? status : 1, updated_at: now(),
  });

  const updatedUser = getUserWithPermissions(userId);
  res.json(success(updatedUser, '用户更新成功'));
});

/**
 * DELETE /api/v1/users/:id - 删除用户
 */
router.delete('/:id', authMiddleware, requirePermission('user:delete'), (req: AuthRequest, res) => {
  const userId = parseInt(req.params.id, 10);

  if (userId === req.user!.id) {
    return res.status(400).json(fail('不能删除当前登录用户'));
  }

  const user = db.users.get((u) => u.id === userId);
  if (!user) {
    return res.status(404).json(fail('用户不存在'));
  }

  const targetRole = user.role_id ? db.roles.get((r) => r.id === user.role_id) : null;
  if (targetRole?.code === 'super_admin' && req.user!.role_code !== 'super_admin') {
    return res.status(403).json(fail('无权删除超级管理员'));
  }

  db.users.delete((u) => u.id === userId);
  res.json(success(null, '用户删除成功'));
});

/**
 * PUT /api/v1/users/:id/reset-password - 重置用户密码
 */
router.put('/:id/reset-password', authMiddleware, requirePermission('user:edit'), (req: AuthRequest, res) => {
  const userId = parseInt(req.params.id, 10);
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json(fail('新密码不能少于6位'));
  }

  const user = db.users.get((u) => u.id === userId);
  if (!user) {
    return res.status(404).json(fail('用户不存在'));
  }

  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.users.update((u) => u.id === userId, { password: hashedPassword, updated_at: now() });
  res.json(success(null, '密码重置成功'));
});

export default router;
