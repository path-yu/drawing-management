import { Request } from 'express';

// 用户信息（脱敏）
export interface SafeUser {
  id: number;
  username: string;
  real_name: string | null;
  email: string | null;
  phone: string | null;
  role_id: number | null;
  role_name: string | null;
  role_code: string | null;
  status: number;
  avatar: string | null;
  permissions: string[];
}

// 扩展 Request 类型，携带用户信息
export interface AuthRequest extends Request {
  user?: SafeUser;
}

// 统一响应结构
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
}

// 图纸数据
export interface VesselDrawing {
  id: number;
  material_code: string;
  version: string;
  file_path: string;
  file_name: string;
  created_by: string | null;
  updated_by: string | null;
  remark: string | null;
  working_pressure: number;
  design_pressure: number;
  design_temperature: number;
  volume: number;
  structure_type: string;
  material: string;
  design_life: number;
  medium: string;
  nominal_diameter: number;
  wall_thickness: number;
  total_height_or_length: number;
  weight: number;
  safety_valve_connection: string | null;
  drain_connection: string | null;
  inlet_connection: string | null;
  outlet_connection: string | null;
  inlet_count: number;
  outlet_count: number;
  created_at: string;
  updated_at: string;
}
