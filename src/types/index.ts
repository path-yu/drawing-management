export interface VesselDrawing {
  id: number;
  material_code: string;
  version: string;
  file_path: string;
  file_name: string;
  created_by: string;
  updated_by: string;
  remark: string;
  working_pressure: number;
  design_pressure: number;
  design_temperature: number;
  volume: number;
  structure_type: '立式' | '卧式';
  material: string;
  design_life: number;
  medium: string;
  nominal_diameter: number;
  wall_thickness: number;
  total_height_or_length: number;
  weight: number;
  safety_valve_connection: string;
  drain_connection: string;
  inlet_connection: string;
  outlet_connection: string;
  inlet_count: number;
  outlet_count: number;
  created_at: string;
  updated_at: string;
}

export interface FilterState {
  structure_type: '' | '立式' | '卧式';
  volume_min: string;
  volume_max: string;
  design_pressure_min: string;
  design_pressure_max: string;
  nominal_diameter_min: string;
  nominal_diameter_max: string;
  material: string;
  design_temperature_min: string;
  design_temperature_max: string;
  medium: string;
  design_life_min: string;
  design_life_max: string;
  wall_thickness_min: string;
  wall_thickness_max: string;
  weight_min: string;
  weight_max: string;
  safety_valve_connection: string;
  drain_connection: string;
  inlet_connection: string;
  outlet_connection: string;
  inlet_count: string;
  outlet_count: string;
}

export type ViewMode = 'table' | 'card' | 'split';
