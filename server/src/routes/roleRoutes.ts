import { Router } from 'express';
import { db } from '../database/db';
import { AuthRequest } from '../types';
import { success, fail } from '../utils/response';
import { authMiddleware, requirePermission } from '../middleware/auth';

const router = Router();
const now = () => new Date().toISOString();

/**
 * GET /api/v1/roles - 获取角色列表
 */
router.get('/', authMiddleware, requirePermission('role:view'), (req: AuthRequest, res) => {
  const roles = db.roles.all().map((r) => ({
    ...r,
    permission_count: db.role_permissions.count((rp) => rp.role_id === r.id),
    user_count: db.users.count((u) => u.role_id === r.id),
  }));
  res.json(success(roles));
});

/**
 * GET /api/v1/roles/:id/permissions - 获取角色的权限列表
 */
router.get('/:id/permissions', authMiddleware, requirePermission('role:view'), (req: AuthRequest, res) => {
  const roleId = parseInt(req.params.id, 10);
  const role = db.roles.get((r) => r.id === roleId);
  if (!role) {
    return res.status(404).json(fail('角色不存在'));
  }

  const rpList = db.role_permissions.find((rp) => rp.role_id === roleId);
  const permissions = rpList
    .map((rp) => db.permissions.get((p) => p.id === rp.permission_id))
    .filter(Boolean);

  res.json(success({ role, permissions }));
});

/**
 * POST /api/v1/roles - 新增角色
 */
router.post('/', authMiddleware, requirePermission('role:create'), (req: AuthRequest, res) => {
  const { name, code, description } = req.body;

  if (!name || !code) {
    return res.status(400).json(fail('角色名称和编码不能为空'));
  }
  if (db.roles.get((r) => r.code === code)) {
    return res.status(409).json(fail('角色编码已存在'));
  }

  const result = db.roles.insert({ name, code, description: description || null, created_at: now() });
  res.json(success(result, '角色创建成功'));
});

/**
 * PUT /api/v1/roles/:id - 编辑角色信息
 */
router.put('/:id', authMiddleware, requirePermission('role:edit'), (req: AuthRequest, res) => {
  const roleId = parseInt(req.params.id, 10);
  const { name, code, description } = req.body;

  const role = db.roles.get((r) => r.id === roleId);
  if (!role) {
    return res.status(404).json(fail('角色不存在'));
  }
  if (role.code === 'super_admin' && code !== 'super_admin') {
    return res.status(400).json(fail('超级管理员角色编码不可修改'));
  }

  db.roles.update((r) => r.id === roleId, { name, code, description: description || null });
  res.json(success(null, '角色更新成功'));
});

/**
 * PUT /api/v1/roles/:id/permissions - 分配角色权限
 */
router.put('/:id/permissions', authMiddleware, requirePermission('role:edit'), (req: AuthRequest, res) => {
  const roleId = parseInt(req.params.id, 10);
  const { permission_ids } = req.body;

  if (!Array.isArray(permission_ids)) {
    return res.status(400).json(fail('permission_ids 必须为数组'));
  }

  const role = db.roles.get((r) => r.id === roleId);
  if (!role) {
    return res.status(404).json(fail('角色不存在'));
  }
  if (role.code === 'super_admin') {
    return res.status(403).json(fail('超级管理员权限不可修改'));
  }

  // 先删除旧权限，再插入新权限
  db.role_permissions.delete((rp) => rp.role_id === roleId);
  for (const permId of permission_ids) {
    db.role_permissions.insert({ role_id: roleId, permission_id: permId });
  }

  res.json(success(null, '权限分配成功'));
});

/**
 * DELETE /api/v1/roles/:id - 删除角色
 */
router.delete('/:id', authMiddleware, requirePermission('role:delete'), (req: AuthRequest, res) => {
  const roleId = parseInt(req.params.id, 10);
  const role = db.roles.get((r) => r.id === roleId);
  if (!role) {
    return res.status(404).json(fail('角色不存在'));
  }
  if (role.code === 'super_admin') {
    return res.status(403).json(fail('超级管理员角色不可删除'));
  }

  const userCount = db.users.count((u) => u.role_id === roleId);
  if (userCount > 0) {
    return res.status(400).json(fail(`该角色下还有 ${userCount} 个用户，无法删除`));
  }

  db.role_permissions.delete((rp) => rp.role_id === roleId);
  db.roles.delete((r) => r.id === roleId);
  res.json(success(null, '角色删除成功'));
});

/**
 * GET /api/v1/roles/permissions/all - 获取全部权限列表
 */
router.get('/permissions/all', authMiddleware, requirePermission('role:view'), (req: AuthRequest, res) => {
  res.json(success(db.permissions.all()));
});

export default router;
