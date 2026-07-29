import { Eye, ArrowUpDown } from 'lucide-react';
import { VesselDrawing } from '../types';
import { VirtualList } from './VirtualList';

interface DataTableProps {
  drawings: VesselDrawing[];
  onPreview: (drawing: VesselDrawing) => void;
  onExport: (drawing: VesselDrawing) => void;
  onEdit: (drawing: VesselDrawing) => void;
  /** 列表可视区域的高度 (默认 500px) */
  height?: number;
}

export function DataTable({
  drawings,
  onPreview,
  height = 700,
}: DataTableProps) {
  // 单行表格固定的高度 (px)
  const ROW_HEIGHT = 48;

  // 网格列宽比例定义（保证表头和表体行完全对齐）
  const gridTemplateColumns =
    'minmax(120px, 1.2fr) minmax(160px, 1.8fr) minmax(90px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(90px, 1fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(130px, 120px)';

  return (
    <div className="w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-hidden bg-white dark:bg-slate-900 shadow-sm">
      <div className="min-w-[1100px]">
        {/* 1. 固定表头 (Header) */}
        <div
          className="grid bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider items-center"
          style={{ gridTemplateColumns }}
        >
          <div className="px-4 py-3">物料编码</div>
          <div className="px-4 py-3">文件名</div>
          <div className="px-4 py-3">结构形式</div>
          <div className="px-4 py-3 flex items-center gap-1 cursor-pointer select-none">
            容积 (m³)
            <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="px-4 py-3 flex items-center gap-1 cursor-pointer select-none">
            设计压力 (MPa)
            <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="px-4 py-3">公称直径 (mm)</div>
          <div className="px-4 py-3">材质</div>
          <div className="px-4 py-3">介质</div>
          <div className="px-4 py-3">重量 (kg)</div>
          <div className="px-4 py-3">版本</div>
          <div className="px-4 py-3">操作</div>
        </div>

        {/* 2. 虚拟滚动表体 (Virtual Scroll Body) */}
        <VirtualList
          items={drawings}
          itemHeight={ROW_HEIGHT}
          height={height}
          overscan={5}
          renderItem={(drawing: VesselDrawing) => (
            <div
              className="grid items-center border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-sm"
              style={{ gridTemplateColumns, height: `${ROW_HEIGHT}px` }}
            >
              {/* 物料编码 */}
              <div className="px-4 truncate font-medium text-primary-600 dark:text-primary-400">
                {drawing.material_code || '-'}
              </div>

              {/* 文件名 */}
              <div className="px-4 truncate text-slate-800 dark:text-slate-100" title={drawing.file_name}>
                {drawing.file_name}
              </div>

              {/* 结构形式 */}
              <div className="px-4">
                <span className={`badge ${drawing.structure_type === '立式' ? 'badge-primary' : 'badge-orange'}`}>
                  {drawing.structure_type || '-'}
                </span>
              </div>

              {/* 容积 */}
              <div className="px-4 text-slate-600 dark:text-slate-300">
                {drawing.volume != null ? drawing.volume.toFixed(1) : '-'}
              </div>

              {/* 设计压力 */}
              <div className="px-4 text-slate-600 dark:text-slate-300">
                {drawing.design_pressure != null ? drawing.design_pressure.toFixed(2) : '-'}
              </div>

              {/* 公称直径 */}
              <div className="px-4 text-slate-600 dark:text-slate-300">
                {drawing.nominal_diameter != null ? `${drawing.nominal_diameter}` : '-'}
              </div>

              {/* 材质 */}
              <div className="px-4 truncate text-slate-600 dark:text-slate-300">
                {drawing.material || '-'}
              </div>

              {/* 介质 */}
              <div className="px-4 truncate text-slate-600 dark:text-slate-300">
                {drawing.medium || '-'}
              </div>

              {/* 重量 */}
              <div className="px-4 text-slate-600 dark:text-slate-300">
                {drawing.weight != null ? drawing.weight.toLocaleString() : '-'}
              </div>

              {/* 版本 */}
              <div className="px-4">
                <span className="badge badge-gray">{drawing.version || '-'}</span>
              </div>

              {/* 操作 */}
              <div className="px-4 flex items-center gap-1">
                <button
                  onClick={() => onPreview(drawing)}
                  className="p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                  title="预览"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {/* <button
                  onClick={() => onExport(drawing)}
                  className="p-1.5 text-slate-500 hover:bg-green-50 hover:text-green-600 rounded transition-colors dark:text-slate-400 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                  title="导出客户 PDF"
                >
                  <FileText className="w-4 h-4" />
                </button> */}
                {/* <button
                  onClick={() => onEdit(drawing)}
                  className="p-1.5 text-slate-500 hover:bg-orange-50 hover:text-orange-600 rounded transition-colors dark:text-slate-400 dark:hover:bg-orange-900/30 dark:hover:text-orange-400"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button> */}
                {/* <button className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded transition-colors dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                  <MoreHorizontal className="w-4 h-4" />
                </button> */}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}