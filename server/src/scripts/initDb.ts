import { db } from '../database/db';
import bcrypt from 'bcryptjs';

/**
 * 数据库初始化脚本
 * 创建初始角色、权限和管理员账户
 */
function initDatabase() {
  console.log('开始初始化数据库...');

  const now = () => new Date().toISOString();

  // ==================== 初始化角色 ====================
  if (db.roles.count() === 0) {
    const roles = [
      { name: '超级管理员', code: 'super_admin', description: '拥有系统全部权限', created_at: now() },
      { name: '系统管理员', code: 'admin', description: '系统管理、用户管理、图纸管理', created_at: now() },
      { name: '技术工程师', code: 'engineer', description: '图纸查看、新增、编辑、导出', created_at: now() },
      { name: '销售人员', code: 'sales', description: '图纸查看、导出客户PDF', created_at: now() },
      { name: '访客', code: 'viewer', description: '仅图纸查看', created_at: now() },
    ];
    for (const role of roles) {
      db.roles.insert(role);
    }
    console.log(`已创建 ${roles.length} 个角色`);
  }

  // ==================== 初始化权限 ====================
  if (db.permissions.count() === 0) {
    const permissions = [
      { name: '查看图纸', code: 'drawing:view', description: '查看图纸列表和详情', created_at: now() },
      { name: '新增图纸', code: 'drawing:create', description: '创建新图纸', created_at: now() },
      { name: '编辑图纸', code: 'drawing:edit', description: '修改图纸信息', created_at: now() },
      { name: '删除图纸', code: 'drawing:delete', description: '删除图纸', created_at: now() },
      { name: '导出PDF', code: 'drawing:export', description: '导出客户报价PDF(带水印)', created_at: now() },
      { name: '下载DWG', code: 'drawing:download', description: '下载DWG原图', created_at: now() },
      { name: '查看用户', code: 'user:view', description: '查看用户列表', created_at: now() },
      { name: '新增用户', code: 'user:create', description: '创建新用户', created_at: now() },
      { name: '编辑用户', code: 'user:edit', description: '修改用户信息', created_at: now() },
      { name: '删除用户', code: 'user:delete', description: '删除用户', created_at: now() },
      { name: '查看角色', code: 'role:view', description: '查看角色列表', created_at: now() },
      { name: '新增角色', code: 'role:create', description: '创建新角色', created_at: now() },
      { name: '编辑角色', code: 'role:edit', description: '修改角色和权限分配', created_at: now() },
      { name: '删除角色', code: 'role:delete', description: '删除角色', created_at: now() },
    ];
    for (const perm of permissions) {
      db.permissions.insert(perm);
    }
    console.log(`已创建 ${permissions.length} 个权限`);
  }

  // ==================== 分配角色权限 ====================
  if (db.role_permissions.count() === 0) {
    const allPerms = db.permissions.all();
    const rolePermMap: Record<string, string[]> = {
      super_admin: allPerms.map((p) => p.code),
      admin: ['drawing:view', 'drawing:create', 'drawing:edit', 'drawing:delete', 'drawing:export', 'drawing:download',
              'user:view', 'user:create', 'user:edit', 'user:delete', 'role:view', 'role:edit'],
      engineer: ['drawing:view', 'drawing:create', 'drawing:edit', 'drawing:export', 'drawing:download', 'user:view'],
      sales: ['drawing:view', 'drawing:export', 'user:view'],
      viewer: ['drawing:view'],
    };

    for (const role of db.roles.all()) {
      const permCodes = rolePermMap[role.code] || [];
      for (const perm of allPerms) {
        if (permCodes.includes(perm.code)) {
          db.role_permissions.insert({ role_id: role.id, permission_id: perm.id });
        }
      }
    }
    console.log('角色权限已分配');
  }

  // ==================== 创建默认管理员 ====================
  const admin = db.users.get((u) => u.username === 'admin');
  if (!admin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const superAdminRole = db.roles.get((r) => r.code === 'super_admin');
    db.users.insert({
      username: 'admin',
      password: hashedPassword,
      real_name: '系统管理员',
      email: 'admin@vessel.com',
      phone: null,
      role_id: superAdminRole.id,
      status: 1,
      avatar: null,
      last_login_at: null,
      created_at: now(),
      updated_at: now(),
    });
    console.log('默认管理员账户已创建:');
    console.log('  用户名: admin');
    console.log('  密码: admin123');
  }

  // ==================== 插入示例图纸数据 ====================
  if (db.vessel_drawings.count() === 0) {
    const sampleDrawings = [
      { material_code: 'VES-2024-001', version: 'V1.0', file_path: '/uploads/drawings/VES-2024-001.pdf', file_name: '立式储气罐方案简图.pdf', created_by: 'admin', updated_by: 'admin', remark: '客户定制方案',
        working_pressure: 1.0, design_pressure: 1.25, design_temperature: 80, volume: 5.0, structure_type: '立式', material: 'Q235B', design_life: 20, medium: '压缩空气', nominal_diameter: 1000, wall_thickness: 8.0, total_height_or_length: 6500, weight: 2800,
        safety_valve_connection: 'DN50 PN16 RF', drain_connection: 'DN25 PN16', inlet_connection: 'DN100 PN16 RF', outlet_connection: 'DN100 PN16 RF', inlet_count: 1, outlet_count: 1, is_deleted: 0, created_at: now(), updated_at: now() },
      { material_code: 'VES-2024-002', version: 'V1.1', file_path: '/uploads/drawings/VES-2024-002.pdf', file_name: '卧式储气罐方案简图.pdf', created_by: 'admin', updated_by: 'admin', remark: '标准型号',
        working_pressure: 0.8, design_pressure: 1.0, design_temperature: 60, volume: 8.0, structure_type: '卧式', material: 'Q235B', design_life: 20, medium: '压缩空气', nominal_diameter: 1200, wall_thickness: 10.0, total_height_or_length: 7800, weight: 4200,
        safety_valve_connection: 'DN65 PN10 RF', drain_connection: 'DN32 PN10', inlet_connection: 'DN150 PN10 RF', outlet_connection: 'DN150 PN10 RF', inlet_count: 1, outlet_count: 2, is_deleted: 0, created_at: now(), updated_at: now() },
      { material_code: 'VES-2024-003', version: 'V1.0', file_path: '/uploads/drawings/VES-2024-003.pdf', file_name: '立式反应釜方案简图.pdf', created_by: 'admin', updated_by: 'admin', remark: '化工行业专用',
        working_pressure: 2.0, design_pressure: 2.5, design_temperature: 150, volume: 3.0, structure_type: '立式', material: '304不锈钢', design_life: 15, medium: '化工原料', nominal_diameter: 800, wall_thickness: 12.0, total_height_or_length: 5200, weight: 3500,
        safety_valve_connection: 'DN40 PN25 RF', drain_connection: 'DN25 PN25', inlet_connection: 'DN80 PN25 RF', outlet_connection: 'DN80 PN25 RF', inlet_count: 2, outlet_count: 1, is_deleted: 0, created_at: now(), updated_at: now() },
      { material_code: 'VES-2024-004', version: 'V1.2', file_path: '/uploads/drawings/VES-2024-004.pdf', file_name: '立式储气罐方案简图.pdf', created_by: 'admin', updated_by: 'admin', remark: '高压型号',
        working_pressure: 3.0, design_pressure: 3.75, design_temperature: 100, volume: 2.0, structure_type: '立式', material: 'Q345R', design_life: 20, medium: '氮气', nominal_diameter: 600, wall_thickness: 16.0, total_height_or_length: 4800, weight: 2600,
        safety_valve_connection: 'DN40 PN40 RF', drain_connection: 'DN20 PN40', inlet_connection: 'DN65 PN40 RF', outlet_connection: 'DN65 PN40 RF', inlet_count: 1, outlet_count: 1, is_deleted: 0, created_at: now(), updated_at: now() },
      { material_code: 'VES-2024-005', version: 'V1.0', file_path: '/uploads/drawings/VES-2024-005.pdf', file_name: '卧式反应釜方案简图.pdf', created_by: 'admin', updated_by: 'admin', remark: '大型卧式反应釜',
        working_pressure: 1.5, design_pressure: 1.8, design_temperature: 180, volume: 15.0, structure_type: '卧式', material: '316不锈钢', design_life: 15, medium: '腐蚀性介质', nominal_diameter: 1800, wall_thickness: 14.0, total_height_or_length: 10500, weight: 8500,
        safety_valve_connection: 'DN80 PN20 RF', drain_connection: 'DN40 PN20', inlet_connection: 'DN200 PN20 RF', outlet_connection: 'DN200 PN20 RF', inlet_count: 2, outlet_count: 2, is_deleted: 0, created_at: now(), updated_at: now() },
    ];
    for (const d of sampleDrawings) {
      db.vessel_drawings.insert(d);
    }
    console.log(`已插入 ${sampleDrawings.length} 条示例图纸数据`);
  }

  console.log('数据库初始化完成!');
}

initDatabase();
