import { Eye, FileText, Edit2, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { VesselDrawing } from '../types';

interface DataTableProps {
  drawings: VesselDrawing[];
  onPreview: (drawing: VesselDrawing) => void;
  onExport: (drawing: VesselDrawing) => void;
  onEdit: (drawing: VesselDrawing) => void;
}

export function DataTable({ drawings, onPreview, onExport, onEdit }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              物料编码
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              文件名
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              结构形式
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              <span className="flex items-center gap-1">
                容积 (m³)
                <ArrowUpDown className="w-3 h-3" />
              </span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              <span className="flex items-center gap-1">
                设计压力 (MPa)
                <ArrowUpDown className="w-3 h-3" />
              </span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              公称直径 (mm)
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              材质
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              介质
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              重量 (kg)
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              版本
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider dark:text-slate-400">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {drawings.map((drawing) => (
            <tr key={drawing.id} className="hover:bg-slate-50 transition-colors dark:hover:bg-slate-700">
              <td className="px-4 py-3 text-sm font-medium text-primary-600 dark:text-primary-400">
                {drawing.material_code}
              </td>
              <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
                {drawing.file_name}
              </td>
              <td className="px-4 py-3">
                <span className={`badge ${drawing.structure_type === '立式' ? 'badge-primary' : 'badge-orange'}`}>
                  {drawing.structure_type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {drawing.volume.toFixed(1)}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {drawing.design_pressure.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {drawing.nominal_diameter}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {drawing.material}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {drawing.medium}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {drawing.weight.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span className="badge badge-gray">{drawing.version}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPreview(drawing)}
                    className="p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                    title="预览"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onExport(drawing)}
                    className="p-1.5 text-slate-500 hover:bg-green-50 hover:text-green-600 rounded transition-colors dark:text-slate-400 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                    title="导出客户 PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(drawing)}
                    className="p-1.5 text-slate-500 hover:bg-orange-50 hover:text-orange-600 rounded transition-colors dark:text-slate-400 dark:hover:bg-orange-900/30 dark:hover:text-orange-400"
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded transition-colors dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
