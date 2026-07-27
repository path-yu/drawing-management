import { Router } from 'express';
import { db } from '../database/db';
import { AuthRequest } from '../types';
import { success, fail } from '../utils/response';
import { authMiddleware, requirePermission } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/logs/list - 获取日志列表（分页）
 */
router.get('/list', (req: AuthRequest, res) => {
  const q = req.query;
  const pageNum = parseInt((q.page as string) || '1', 10);
  const pageSize = parseInt((q.page_size as string) || '20', 10);

    let list = db.vessel_logs.all();
  console.log(list,q);
  // 根据图纸ID筛选
  if (q.drawing_id) {
    list = list.filter((log) => log.drawing_id === q.drawing_id);
  }

  // 根据版本筛选
  if (q.version) {
    list = list.filter((log) => log.version === q.version);
  }

  // 按创建时间倒序
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = list.length;
  const start = (pageNum - 1) * pageSize;
  const end = start + pageSize;
  const paginatedList = list.slice(start, end);

  res.json(success({
    list: paginatedList,
    total,
    page: pageNum,
    page_size: pageSize,
  }));
});

/**
 * GET /api/v1/logs/:drawingId - 根据图纸ID获取所有日志
 */
router.get('/:drawingId', authMiddleware, requirePermission('drawing:view'), (req: AuthRequest, res) => {
  const drawingId = req.params.drawingId;
  
  if (!drawingId) {
    return res.status(400).json(fail('无效的图纸ID'));
  }

  const logs = db.vessel_logs.find((log) => String(log.drawing_id) === drawingId);
  console.log(logs);
  // 按创建时间倒序
  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(success(logs));
});

/**
 * POST /api/v1/logs - 添加日志记录
 */
router.post('/', authMiddleware, requirePermission('drawing:edit'), (req: AuthRequest, res) => {
  const { drawing_id, version, operator, log_message, remark } = req.body;

  if (!drawing_id || !version || !operator || !log_message) {
    return res.status(400).json(fail('缺少必填字段'));
  }

  try {
    const newLog = db.vessel_logs.insert({
      drawing_id,
      version,
      operator,
      log_message,
      remark: remark || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.json(success(newLog));
  } catch (err) {
    res.status(500).json(fail('添加日志失败'));
  }
});
// 更新日志记录
/**
 * PUT /api/v1/logs/:id - 更新日志记录
 */
router.put('/:id', authMiddleware, requirePermission('drawing:edit'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { remark } = req.body;
  if (!remark) {
    return res.status(400).json(fail('缺少必填字段'));
  }
  try {
    db.vessel_logs.update((log) => log.id === id, { remark: remark || '' });
    res.json(success(null, '日志记录备注更新成功'));
  } catch (err) {
    res.status(500).json(fail('日志记录备注更新失败'));
  }
});

export default router;
