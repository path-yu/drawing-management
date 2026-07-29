import { useState } from 'react';
import { Eye, MoreHorizontal, Copy, Check, Trash2, CheckSquare, Square, FileText, FileDown, Image } from 'lucide-react';
import { VesselDrawing } from '../types';
import { PermissionGuard } from './PermissionGuard';
import { downloadFile } from '../utils/download';

interface DrawingCardProps {
  drawing: VesselDrawing;
  onPreview: (drawing: VesselDrawing) => void;
  onDelete: (drawing: VesselDrawing) => void;
  selected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: (drawing: VesselDrawing) => void;
}

export function DrawingCard({
  drawing,
  onPreview,
  onDelete,
  selected = false,
  isSelectionMode = false,
  onToggleSelect,
}: DrawingCardProps) {
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

  const handleDownload = (type: 'pdf' | 'dwg' | 'preview') => {
    const filePath = type === 'pdf' ? drawing.pdf_file_path : type === 'dwg' ? drawing.dwg_file_path : drawing.preview_image;
    const url = `http://localhost:3000${filePath}?download=1`;
    const filename = filePath.split(/[/\\]/).pop() || '';
    downloadFile(url, { filename });
  };

  return (
    <div
      className={`card hover:shadow-lg transition-all cursor-pointer group border-2 ${
        selected ? 'border-primary-500 dark:border-primary-400' : 'border-slate-200 dark:border-slate-700'
      }`}
      onClick={() => {
        if (isSelectionMode && onToggleSelect) {
          onToggleSelect(drawing);
        } else {
          onPreview(drawing);
        }
      }}
    >
      {/* 图片区域 */}
      <div className={`relative w-full bg-slate-100 dark:bg-slate-700 overflow-hidden rounded-t-xl ${!drawing.preview_image ? 'h-32 flex items-center justify-center' : ''}`}>
        {drawing.preview_image ? (
          <img
            src={`http://localhost:3000${drawing.preview_image}`}
            alt={drawing.file_name}
            className="w-full h-auto block"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <svg className="w-16 h-12" viewBox="0 0 80 60" fill="none">
            <rect x="5" y="10" width="70" height="40" rx="4" stroke="#94a3b8" strokeWidth="1.5" className="dark:stroke-slate-500" />
            <circle cx="40" cy="25" r="12" stroke="#64748b" strokeWidth="1.5" fill="none" className="dark:stroke-slate-400" />
            <line x1="40" y1="25" x2="40" y2="48" stroke="#94a3b8" strokeWidth="1" className="dark:stroke-slate-500" />
          </svg>
        )}
        {/* 结构形式标签 */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
              drawing.structure_type === '立式'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
            }`}
          >
            {drawing.structure_type}
          </span>
        </div>
      </div>

      {/* 信息区域 */}
      <div className="p-2.5">
        {/* 文件名和版本 */}
        <div className="flex items-center justify-between mb-1.5">
          <h3
            className="font-semibold text-slate-800 dark:text-slate-100 truncate text-xs"
            title={drawing.file_name}
          >
            {drawing.file_name}
          </h3>
           {/* 物料编码 */}
           <div className='flex'>
           {drawing.material_code && (
          <div className="flex items-center gap-1 mb-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyCode();
              }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors dark:text-primary-400 dark:bg-primary-900/20 dark:hover:bg-primary-900/40"
              title={copiedCode ? '已复制' : '点击复制物料编码'}
            >
              {copiedCode ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
              {drawing.material_code}
            </button>
          </div>
        )}
          <span
            className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 ml-1 shrink-0"
          >
            V{drawing.version}
          </span>
           </div>
     
        </div>

       

        {/* 参数标签 */}
        <div className="flex flex-wrap gap-1 mb-2">
          <span
            className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            {drawing.volume}m³
          </span>
          <span
            className="px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          >
            {drawing.design_pressure}MPa
          </span>
          <span
            className="px-1.5 py-0.5 text-[10px] rounded bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          >
            {drawing.nominal_diameter}mm
          </span>
          <span
            className="px-1.5 py-0.5 text-[10px] rounded bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          >
            {drawing.material}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-0.5">
            {/* 选择按钮 - 常驻 */}
            {onToggleSelect && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(drawing);
                }}
                className={`p-1 rounded-md transition-colors ${
                  selected
                    ? 'text-primary-500 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
                }`}
                title={selected ? '取消选择' : '选择'}
              >
                {selected ? (
                  <CheckSquare className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(drawing);
              }}
              className="p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
              title="预览"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <PermissionGuard permission="drawing:delete">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(drawing);
                }}
                className="p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </PermissionGuard>
            <PermissionGuard permission="drawing:export">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload('pdf');
                }}
                className="p-1 text-primary-500 hover:bg-primary-50 hover:text-primary-600 rounded-md transition-colors dark:text-primary-400 dark:hover:bg-primary-900/30 dark:hover:text-primary-300"
                title="下载pdf"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </PermissionGuard>
            <PermissionGuard permission="drawing:download">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload('dwg');
                }}
                className="p-1 text-slate-500 hover:bg-green-50 hover:text-green-600 rounded-md transition-colors dark:text-slate-400 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                title="下载DWG原图"
              >
                <FileDown className="w-3.5 h-3.5" />
              </button>
            </PermissionGuard>
            <PermissionGuard permission="drawing:downloadPreview">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload('preview');
                }}
                className="p-1 text-slate-500 hover:bg-purple-50 hover:text-purple-600 rounded-md transition-colors dark:text-slate-400 dark:hover:bg-purple-900/30 dark:hover:text-purple-400"
                title="下载预览图片"
              >
                <Image className="w-3.5 h-3.5" />
              </button>
            </PermissionGuard>
          </div>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-md transition-colors dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
