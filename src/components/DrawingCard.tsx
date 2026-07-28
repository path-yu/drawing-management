import { useState } from 'react';
import { Eye, MoreHorizontal, Copy, Check, Trash2, CheckSquare, Square } from 'lucide-react';
import { VesselDrawing } from '../types';
import { PermissionGuard } from './PermissionGuard';

interface DrawingCardProps {
  drawing: VesselDrawing;
  onPreview: (drawing: VesselDrawing) => void;
  onDelete: (drawing: VesselDrawing) => void;
  selected?: boolean;
  onToggleSelect?: (drawing: VesselDrawing) => void;
  showCheckbox?: boolean;
}

export function DrawingCard({ drawing, onPreview, onDelete, selected = false, onToggleSelect, showCheckbox = false }: DrawingCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);



  const handleCopyCode = async () => {
    if (!drawing.material_code) return;
    try {
      await navigator.clipboard.writeText(drawing.material_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = drawing.material_code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };
  return (
    <div className={`card overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${selected ? 'ring-2 ring-primary-500' : ''}`} onClick={() => onPreview(drawing)}>
      <div className="relative bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
        {/* PNG预览图覆盖在SVG上面 */}
        {drawing.preview_image && (
          <img
            src={`http://localhost:3000${drawing.preview_image}`}
            alt={drawing.file_name}
            className="w-full h-auto object-contain max-h-64"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="absolute top-2 right-2">
          <span className={`badge ${drawing.structure_type === '立式' ? 'badge-primary' : 'badge-orange'}`}>
            {drawing.structure_type}
          </span>
        </div>
        {showCheckbox && onToggleSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(drawing); }}
            className={`absolute top-2 left-2 p-1.5 rounded-lg transition-colors ${
              selected
                ? 'bg-primary-500 text-white'
                : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm truncate max-w-[200px] dark:text-slate-100" title={drawing.file_name}>
            {drawing.file_name}
          </h3>
          <span className="badge badge-gray">V_{drawing.version}</span>
        </div>

        {drawing.material_code && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">物料编码:</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopyCode(); }}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors dark:text-primary-400 dark:bg-primary-900/20 dark:hover:bg-primary-900/40"
              title={copiedCode ? '已复制' : '点击复制物料编码'}
            >
              {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {drawing.material_code}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="badge bg-slate-100 text-slate-600 text-xs dark:bg-slate-700 dark:text-slate-300">
            {drawing.volume} m³
          </span>
          <span className="badge bg-blue-50 text-blue-600 text-xs dark:bg-blue-900/30 dark:text-blue-400">
            {drawing.design_pressure} MPa
          </span>
          <span className="badge bg-green-50 text-green-600 text-xs dark:bg-green-900/30 dark:text-green-400">
            {drawing.nominal_diameter} mm
          </span>
          <span className="badge bg-orange-50 text-orange-600 text-xs dark:bg-orange-900/30 dark:text-orange-400">
            {drawing.material}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(drawing); }}
              className="p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
              title="预览"
            >
              <Eye className="w-4 h-4" />
            </button>
            {/* <button
              onClick={(e) => { e.stopPropagation(); onExport(drawing); }}
              className="p-2 text-slate-600 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-green-900/30 dark:hover:text-green-400"
              title="导出客户 PDF"
            >
              <FileText className="w-4 h-4" />
            </button> */}
            {/* <button
              onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
              className={`p-2 rounded-lg transition-colors ${
                copied
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'text-slate-600 hover:bg-purple-50 hover:text-purple-600 dark:text-slate-300 dark:hover:bg-purple-900/30 dark:hover:text-purple-400'
              }`}
              title={copied ? '已复制' : '复制链接'}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button> */}
            {/* <button
            onClick={(e) => { e.stopPropagation(); onEdit(drawing); }}
            className="p-2 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-orange-900/30 dark:hover:text-orange-400"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button> */}
            <PermissionGuard permission="drawing:delete">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(drawing); }}
                className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </PermissionGuard>
        </div>
          <button 
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
