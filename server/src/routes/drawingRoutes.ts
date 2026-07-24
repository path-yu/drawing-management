import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../database/db';
import { AuthRequest } from '../types';
import { success, fail } from '../utils/response';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { extractTextFromPDF, analyzePDFWithDeepSeek, generatePDFPreview } from '../services/drawingService';

const router = Router();
const now = () => new Date().toISOString();

/**
 * GET /api/v1/drawings/search - 多条件范围检索图纸
 */
router.get('/search', authMiddleware, requirePermission('drawing:view'), (req: AuthRequest, res) => {
  const q = req.query;
  const pageNum = parseInt((q.page as string) || '1', 10);
  const pageSize = parseInt((q.page_size as string) || '20', 10);

  let list = db.vessel_drawings.find((d) => d.is_deleted === 0);

  // 关键词搜索
  if (q.keyword) {
    const kw = (q.keyword as string).toLowerCase();
    list = list.filter((d) =>
      d.material_code.toLowerCase().includes(kw) ||
      d.file_name.toLowerCase().includes(kw) ||
      (d.remark || '').toLowerCase().includes(kw)
    );
  }

  // 精确匹配
  if (q.structure_type) list = list.filter((d) => d.structure_type === q.structure_type);
  if (q.material) list = list.filter((d) => d.material === q.material);
  if (q.inlet_count) list = list.filter((d) => d.inlet_count === parseInt(q.inlet_count as string, 10));
  if (q.outlet_count) list = list.filter((d) => d.outlet_count === parseInt(q.outlet_count as string, 10));

  // 模糊匹配
  if (q.medium) list = list.filter((d) => d.medium.includes(q.medium as string));
  if (q.safety_valve_connection) list = list.filter((d) => (d.safety_valve_connection || '').includes(q.safety_valve_connection as string));
  if (q.drain_connection) list = list.filter((d) => (d.drain_connection || '').includes(q.drain_connection as string));
  if (q.inlet_connection) list = list.filter((d) => (d.inlet_connection || '').includes(q.inlet_connection as string));
  if (q.outlet_connection) list = list.filter((d) => (d.outlet_connection || '').includes(q.outlet_connection as string));

  // 数值范围筛选
  const ranges: [string, string | undefined, string | undefined][] = [
    ['volume', q.volume_min as string, q.volume_max as string],
    ['design_pressure', q.design_pressure_min as string, q.design_pressure_max as string],
    ['nominal_diameter', q.nominal_diameter_min as string, q.nominal_diameter_max as string],
    ['design_temperature', q.design_temperature_min as string, q.design_temperature_max as string],
    ['design_life', q.design_life_min as string, q.design_life_max as string],
    ['wall_thickness', q.wall_thickness_min as string, q.wall_thickness_max as string],
    ['weight', q.weight_min as string, q.weight_max as string],
  ];

  for (const [field, min, max] of ranges) {
    if (min) list = list.filter((d) => d[field] >= parseFloat(min));
    if (max) list = list.filter((d) => d[field] <= parseFloat(max));
  }

  // 排序
  const allowedSort = ['updated_at', 'created_at', 'volume', 'design_pressure', 'nominal_diameter', 'weight'];
  const sortField = allowedSort.includes(q.sort_by as string) ? (q.sort_by as string) : 'updated_at';
  const sortDir = q.sort_order === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    if (a[sortField] < b[sortField]) return -1 * sortDir;
    if (a[sortField] > b[sortField]) return 1 * sortDir;
    return 0;
  });

  const total = list.length;
  const paged = list.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  res.json(success({ total, list: paged, page: pageNum, page_size: pageSize }));
});

/**
 * GET /api/v1/drawings/:id - 获取图纸详情
 */
router.get('/:id', authMiddleware, requirePermission('drawing:view'), (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  const drawing = db.vessel_drawings.get((d) => d.id === id && d.is_deleted === 0);
  if (!drawing) {
    return res.status(404).json(fail('图纸不存在'));
  }
  res.json(success(drawing));
});

/**
 * POST /api/v1/drawings - 新增图纸
 */
router.post('/', authMiddleware, requirePermission('drawing:create'), (req: AuthRequest, res) => {
  const b = req.body;
  const required = ['material_code', 'file_path', 'file_name', 'working_pressure', 'design_pressure',
    'design_temperature', 'volume', 'structure_type', 'material', 'medium',
    'nominal_diameter', 'wall_thickness', 'total_height_or_length', 'weight'];

  for (const field of required) {
    if (b[field] === undefined || b[field] === null) {
      return res.status(400).json(fail(`缺少必填字段: ${field}`));
    }
  }

  const drawing = db.vessel_drawings.insert({
    material_code: b.material_code,
    version: b.version || 'V1.0',
    file_path: b.file_path,
    file_name: b.file_name,
    created_by: req.user!.username,
    updated_by: req.user!.username,
    remark: b.remark || null,
    working_pressure: b.working_pressure,
    design_pressure: b.design_pressure,
    design_temperature: b.design_temperature,
    volume: b.volume,
    structure_type: b.structure_type,
    material: b.material,
    design_life: b.design_life || 20,
    medium: b.medium,
    nominal_diameter: b.nominal_diameter,
    wall_thickness: b.wall_thickness,
    total_height_or_length: b.total_height_or_length,
    weight: b.weight,
    safety_valve_connection: b.safety_valve_connection || null,
    drain_connection: b.drain_connection || null,
    inlet_connection: b.inlet_connection || null,
    outlet_connection: b.outlet_connection || null,
    inlet_count: b.inlet_count || 1,
    outlet_count: b.outlet_count || 1,
    is_deleted: 0,
    created_at: now(),
    updated_at: now(),
    flow_direction: b.flow_direction || '右进左出',
  });

  res.json(success(drawing, '图纸创建成功'));
});

/**
 * PUT /api/v1/drawings/:id - 修改图纸
 */
router.put('/:id', authMiddleware, requirePermission('drawing:edit'), (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  const b = req.body;

  const existing = db.vessel_drawings.get((d) => d.id === id && d.is_deleted === 0);
  if (!existing) {
    return res.status(404).json(fail('图纸不存在'));
  }

  db.vessel_drawings.update((d) => d.id === id, {
    material_code: b.material_code, version: b.version || 'V1.0', file_path: b.file_path,
    file_name: b.file_name, updated_by: req.user!.username, remark: b.remark || null,
    working_pressure: b.working_pressure, design_pressure: b.design_pressure,
    design_temperature: b.design_temperature, volume: b.volume,
    structure_type: b.structure_type, material: b.material, design_life: b.design_life || 20,
    medium: b.medium, nominal_diameter: b.nominal_diameter, wall_thickness: b.wall_thickness,
    total_height_or_length: b.total_height_or_length, weight: b.weight,
    safety_valve_connection: b.safety_valve_connection || null, drain_connection: b.drain_connection || null,
    inlet_connection: b.inlet_connection || null, outlet_connection: b.outlet_connection || null,
    inlet_count: b.inlet_count || 1, outlet_count: b.outlet_count || 1, updated_at: now(),
  });

  const drawing = db.vessel_drawings.get((d) => d.id === id);
  res.json(success(drawing, '图纸更新成功'));
});

/**
 * DELETE /api/v1/drawings/batch - 批量删除图纸（软删除）
 */
router.delete('/batch', authMiddleware, requirePermission('drawing:delete'), (req: AuthRequest, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json(fail('缺少必填字段: ids（数组）'));
  }

  let deletedCount = 0;
  ids.forEach((id: number) => {
    const existing = db.vessel_drawings.get((d) => d.id === id && d.is_deleted === 0);
    if (existing) {
      db.vessel_drawings.update((d) => d.id === id, { is_deleted: 1, updated_at: now() });
      deletedCount++;
    }
  });

  res.json(success({ deleted: deletedCount }, `成功删除 ${deletedCount} 条记录`));
});

/**
 * DELETE /api/v1/drawings/:id - 删除图纸（软删除）
 */
router.delete('/:id', authMiddleware, requirePermission('drawing:delete'), (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.vessel_drawings.get((d) => d.id === id && d.is_deleted === 0);
  if (!existing) {
    return res.status(404).json(fail('图纸不存在'));
  }

  db.vessel_drawings.update((d) => d.id === id, { is_deleted: 1, updated_at: now() });
  res.json(success(null, '图纸删除成功'));
});

/**
 * POST /api/v1/drawings/analyze - 解析图纸内容并入库
 */
router.post('/analyze', async (req: AuthRequest, res) => {
  const { dwg_file_path,file_name,pdfPath} = req.body;
  
  if (!pdfPath) {
    return res.status(400).json(fail('缺少必填字段: pdfPath'));
  }
  
  if (!fs.existsSync(pdfPath)) {
    return res.status(400).json(fail(`文件不存在: ${pdfPath}`));
  }
  
  try {
    // 1. 提取PDF文本内容
    const textContent = await extractTextFromPDF(pdfPath);
    
    // 2. 调用DeepSeek API解析
    const parsedData = await analyzePDFWithDeepSeek(textContent, pdfPath);
    
    // 3. 保存原始PDF文件到服务器
    const pdfDir = path.join(__dirname, '../../uploads/PDF');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    const originalFileName = path.basename(pdfPath);
    const pdfFileName = `${parsedData.material_code}_${Date.now()}_${originalFileName}`;
    const destPdfPath = path.join(pdfDir, pdfFileName);
    fs.copyFileSync(pdfPath, destPdfPath);
    const pdfFilePath = `/uploads/PDF/${pdfFileName}`;
    
    // 4. 生成PDF预览图
    const previewImage = await generatePDFPreview(pdfPath);
    
    // 5. 插入数据库
    const drawing = db.vessel_drawings.insert({
      material_code: parsedData.material_code,
      version: parsedData.version || 'V1.0',
      dwg_file_path: dwg_file_path,
      file_name: file_name,
      pdf_file_path: pdfFilePath,
      preview_image: previewImage,
      created_by: req.user?.username || '',
      updated_by: req.user?.username || '',
      remark: parsedData.remark || null,
      working_pressure: parsedData.working_pressure,
      design_pressure: parsedData.design_pressure,
      design_temperature: parsedData.design_temperature,
      volume: parsedData.volume,
      structure_type: parsedData.structure_type,
      material: parsedData.material,
      design_life: parsedData.design_life || 20,
      medium: parsedData.medium,
      nominal_diameter: parsedData.nominal_diameter,
      wall_thickness: parsedData.wall_thickness,
      total_height_or_length: parsedData.total_height_or_length,
      weight: parsedData.weight,
      safety_valve_connection: parsedData.safety_valve_connection || null,
      drain_connection: parsedData.drain_connection || null,
      inlet_connection: parsedData.inlet_connection || null,
      outlet_connection: parsedData.outlet_connection || null,
      inlet_count: parsedData.inlet_count || 1,
      outlet_count: parsedData.outlet_count || 1,
      is_deleted: 0,
      created_at: now(),
      updated_at: now(),
      flow_direction: parsedData.flow_direction || '右进左出',
    });
    
    res.json(success(drawing, '图纸解析并入库成功'));
  } catch (error: any) {
    console.error('图纸解析失败:', error);
    res.status(500).json(fail(`解析失败: ${error.message}`));
  }
});

export default router;
