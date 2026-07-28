import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../database/db';
import { AuthRequest } from '../types';
import { success, fail } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const router: Router = Router();

/**
 * 生成随机 token (16位)
 */
function generateToken(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * 生成4位随机提取码
 */
function generatePasscode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * POST /api/v1/shares/create - 创建分享链接 (需认证)
 */
router.post('/create', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { drawing_id, expire_days, need_passcode, allow_download, custom_passcode } = req.body;

    if (!drawing_id) {
      return res.status(400).json(fail('缺少图纸ID'));
    }

    // 验证书纸是否存在
    const drawing = db.vessel_drawings.get((d) => d.id === drawing_id && d.is_deleted === 0);
    if (!drawing) {
      return res.status(404).json(fail('图纸不存在'));
    }

    // 生成 token
    const token = generateToken();

    // 生成提取码 (如果需要)
    let passcode: string | null = null;
    if (need_passcode) {
      passcode = custom_passcode && custom_passcode.length === 4 ? custom_passcode.toUpperCase() : generatePasscode();
    }

    // 计算过期时间
    let expire_at: string | null = null;
    if (expire_days && expire_days > 0) {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + expire_days);
      expire_at = expireDate.toISOString();
    }

    // 插入分享记录
    const share = db.shares.insert({
      drawing_id,
      token,
      passcode,
      allow_download: allow_download || false,
      expire_at,
      created_by: req.user!.id,
      created_at: new Date().toISOString(),
    });

    // 构建分享链接
    const share_url = `http://localhost:8081/#/share/${token}`;

    res.json(success({
      id: share.id,
      token,
      passcode,
      share_url,
      expire_at,
      allow_download,
    }));
  } catch (error: any) {
    console.error('创建分享失败:', error);
    res.status(500).json(fail('创建分享失败'));
  }
});

/**
 * GET /api/v1/shares/public/:token - 获取分享信息 (公开)
 */
router.get('/public/:token', (req, res) => {
  try {
    const { token } = req.params;

    // 查询分享记录
    const share = db.shares.get((s) => s.token === token);
    if (!share) {
      return res.status(404).json(fail('分享链接不存在或已失效'));
    }

    // 检查是否过期
    let is_expired = false;
    if (share.expire_at) {
      is_expired = new Date(share.expire_at) < new Date();
    }

    // 获取图纸信息 (不暴露敏感信息)
    const drawing = db.vessel_drawings.get((d) => d.id === share.drawing_id && d.is_deleted === 0);
    if (!drawing) {
      return res.status(404).json(fail('图纸不存在'));
    }

    res.json(success({
      need_passcode: !!share.passcode,
      is_expired,
      drawing_name: drawing.file_name,
      structure_type: drawing.structure_type,
    }));
  } catch (error: any) {
    console.error('获取分享信息失败:', error);
    res.status(500).json(fail('获取分享信息失败'));
  }
});

/**
 * POST /api/v1/shares/public/:token/verify - 验证提取码 (公开)
 */
router.post('/public/:token/verify', (req, res) => {
  try {
    const { token } = req.params;
    const { passcode } = req.body;

    // 查询分享记录
    const share = db.shares.get((s) => s.token === token);
    if (!share) {
      return res.status(404).json(fail('分享链接不存在或已失效'));
    }

    // 检查是否过期
    if (share.expire_at && new Date(share.expire_at) < new Date()) {
      return res.status(400).json(fail('分享链接已过期'));
    }

    // 验证提取码
    const inputPasscode = (passcode || '').trim().toUpperCase();
    if (share.passcode && share.passcode !== inputPasscode) {
      return res.status(400).json(fail('提取码错误'));
    }

    // 获取图纸详细信息
    const drawing = db.vessel_drawings.get((d) => d.id === share.drawing_id && d.is_deleted === 0);
    if (!drawing) {
      return res.status(404).json(fail('图纸不存在'));
    }

    // 返回图纸信息和技术参数 (不暴露物理路径)
    res.json(success({
      drawing_id: drawing.id,
      file_name: drawing.file_name,
      structure_type: drawing.structure_type,
      material: drawing.material,
      working_pressure: drawing.working_pressure,
      design_pressure: drawing.design_pressure,
      design_temperature: drawing.design_temperature,
      volume: drawing.volume,
      nominal_diameter: drawing.nominal_diameter,
      wall_thickness: drawing.wall_thickness,
      total_height_or_length: drawing.total_height_or_length,
      weight: drawing.weight,
      medium: drawing.medium,
      design_life: drawing.design_life,
      pdf_file_path: drawing.pdf_file_path,
      preview_image: drawing.preview_image,
      allow_download: share.allow_download,
      dwg_file_path: share.allow_download ? drawing.dwg_file_path : null,
    }));
  } catch (error: any) {
    console.error('验证提取码失败:', error);
    res.status(500).json(fail('验证失败'));
  }
});

// ==================== 分享管理接口 (需认证) ====================

/**
 * GET /api/v1/shares/list - 获取分享列表 (需认证)
 */
router.get('/list', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { page = 1, pageSize = 20, type } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const size = parseInt(pageSize as string) || 20;

    let shares = db.shares.all();

    // 按类型筛选: internal / external
    if (type === 'internal') {
      shares = shares.filter((s) => s.type === 'internal');
    } else if (type === 'external') {
      shares = shares.filter((s) => s.type !== 'internal');
    }

    // 按创建时间降序
    shares.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = shares.length;
    const offset = (pageNum - 1) * size;
    const pagedShares = shares.slice(offset, offset + size);

    // 关联图纸信息
    const enrichedShares = pagedShares.map((share) => {
      const drawing = db.vessel_drawings.get((d) => d.id === share.drawing_id);
      return {
        ...share,
        drawing_name: drawing ? drawing.file_name : '未知图纸',
        material_code: drawing ? drawing.material_code : '',
      };
    });

    res.json(success({
      list: enrichedShares,
      total,
      page: pageNum,
      pageSize: size,
    }));
  } catch (error: any) {
    console.error('获取分享列表失败:', error);
    res.status(500).json(fail('获取分享列表失败'));
  }
});

/**
 * PUT /api/v1/shares/:id - 更新分享记录 (需认证)
 */
router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { expire_days, allow_download, passcode, need_passcode } = req.body;

    const share = db.shares.get((s) => s.id === id);
    if (!share) {
      return res.status(404).json(fail('分享记录不存在'));
    }

    const updates: any = {};

    if (expire_days !== undefined) {
      if (expire_days > 0) {
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + expire_days);
        updates.expire_at = expireDate.toISOString();
      } else {
        updates.expire_at = null;
      }
    }

    if (allow_download !== undefined) {
      updates.allow_download = allow_download;
    }

    if (need_passcode !== undefined) {
      if (need_passcode) {
        if (passcode && passcode.length === 4) {
          updates.passcode = passcode.toUpperCase();
        } else if (!share.passcode) {
          updates.passcode = generatePasscode();
        }
      } else {
        updates.passcode = null;
      }
    }

    db.shares.update((s) => s.id === id, updates);

    res.json(success(null, '更新成功'));
  } catch (error: any) {
    console.error('更新分享失败:', error);
    res.status(500).json(fail('更新分享失败'));
  }
});

/**
 * DELETE /api/v1/shares/:id - 删除分享记录 (需认证)
 */
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const count = db.shares.delete((s) => s.id === id);
    if (count === 0) {
      return res.status(404).json(fail('分享记录不存在'));
    }
    res.json(success(null, '删除成功'));
  } catch (error: any) {
    console.error('删除分享失败:', error);
    res.status(500).json(fail('删除分享失败'));
  }
});

/**
 * POST /api/v1/shares/create-internal - 创建内部分享链接 (需认证)
 */
router.post('/create-internal', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { drawing_id } = req.body;

    if (!drawing_id) {
      return res.status(400).json(fail('缺少图纸ID'));
    }

    const drawing = db.vessel_drawings.get((d) => d.id === drawing_id && d.is_deleted === 0);
    if (!drawing) {
      return res.status(404).json(fail('图纸不存在'));
    }

    const token = generateToken();

    const share = db.shares.insert({
      drawing_id,
      token,
      passcode: null,
      type: 'internal',
      allow_download: false,
      expire_at: null,
      created_by: req.user!.id,
      created_at: new Date().toISOString(),
    });

    const share_url = `http://localhost:8081/#/share/internal/${drawing_id}`;

    res.json(success({
      id: share.id,
      token,
      share_url,
      type: 'internal',
    }));
  } catch (error: any) {
    console.error('创建内部分享失败:', error);
    res.status(500).json(fail('创建内部分享失败'));
  }
});

export default router;
