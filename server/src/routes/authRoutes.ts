import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/db';
import { AuthRequest } from '../types';
import { success, fail } from '../utils/response';
import { generateToken } from '../utils/jwt';
import { authMiddleware, getUserWithPermissions } from '../middleware/auth';

const router = Router();
const now = () => new Date().toISOString();

/**
 * POST /api/v1/auth/register - 用户注册
 */
router.post('/register', (req: AuthRequest, res) => {
  const { username, password, real_name, email, phone } = req.body;

  if (!username || !password) {
    return res.status(400).json(fail('用户名和密码不能为空'));
  }
  if (username.length < 3 || username.length > 32) {
    return res.status(400).json(fail('用户名长度需在3-32个字符之间'));
  }
  if (password.length < 6) {
    return res.status(400).json(fail('密码长度不能少于6位'));
  }

  if (db.users.get((u) => u.username === username)) {
    return res.status(409).json(fail('用户名已被注册'));
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const viewerRole = db.roles.get((r) => r.code === 'viewer');

  const result = db.users.insert({
    username, password: hashedPassword, real_name: real_name || null,
    email: email || null, phone: phone || null, role_id: viewerRole.id,
    status: 1, avatar: null, last_login_at: null, created_at: now(), updated_at: now(),
  });

  const user = getUserWithPermissions(result.id);
  const token = generateToken(user!);
  res.json(success({ token, user }, '注册成功'));
});

/**
 * POST /api/v1/auth/login - 用户登录
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json(fail('用户名和密码不能为空'));
  }

  const userRow = db.users.get((u) => u.username === username);
  if (!userRow) {
    return res.status(401).json(fail('用户名或密码错误'));
  }
  if (userRow.status === 0) {
    return res.status(403).json(fail('账户已被禁用，请联系管理员'));
  }

  if (!bcrypt.compareSync(password, userRow.password)) {
    return res.status(401).json(fail('用户名或密码错误'));
  }

  db.users.update((u) => u.id === userRow.id, { last_login_at: now() });

  const user = getUserWithPermissions(userRow.id);
  const token = generateToken(user!);
  res.json(success({ token, user }, '登录成功'));
});

/**
 * GET /api/v1/auth/profile - 获取当前登录用户信息
 */
router.get('/profile', authMiddleware, (req: AuthRequest, res) => {
  res.json(success(req.user));
});

/**
 * PUT /api/v1/auth/profile - 修改个人信息
 */
router.put('/profile', authMiddleware, (req: AuthRequest, res) => {
  const { real_name, email, phone } = req.body;

  db.users.update((u) => u.id === req.user!.id, {
    real_name: real_name || null, email: email || null, phone: phone || null, updated_at: now(),
  });

  const user = getUserWithPermissions(req.user!.id);
  res.json(success(user, '个人信息更新成功'));
});

/**
 * PUT /api/v1/auth/password - 修改密码
 */
router.put('/password', authMiddleware, (req: AuthRequest, res) => {
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json(fail('请提供旧密码和新密码'));
  }
  if (new_password.length < 6) {
    return res.status(400).json(fail('新密码长度不能少于6位'));
  }

  const userRow = db.users.get((u) => u.id === req.user!.id);
  if (!bcrypt.compareSync(old_password, userRow.password)) {
    return res.status(400).json(fail('旧密码不正确'));
  }

  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.users.update((u) => u.id === req.user!.id, { password: hashedPassword, updated_at: now() });
  res.json(success(null, '密码修改成功'));
});

export default router;
