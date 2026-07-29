import { VesselDrawing } from '../types';

export const mockDrawings: VesselDrawing[] = [
  
    
];

export const materialOptions = ['Q235B', 'Q245R', 'Q345R', 'S30408', 'S30403', 'S31608', 'S31603'];

// 材质分类映射
export const materialCategoryMap: Record<string, 'carbon' | 'stainless'> = {
  Q235B: 'carbon',
  Q245R: 'carbon',
  Q345R: 'carbon',
  S30408: 'stainless',
  S30403: 'stainless',
  S31608: 'stainless',
  S31603: 'stainless',
};

export const mediumOptions = ['压缩空气', '氮气', '天然气', '化工原料', '腐蚀性介质', '蒸汽', '水'];

export const connectionOptions = ['DN20 PN10', 'DN25 PN16', 'DN32 PN16', 'DN40 PN25', 'DN50 PN16', 'DN65 PN10', 'DN80 PN25', 'DN100 PN16', 'DN150 PN16', 'DN200 PN20'];
