import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, Copy, FileText, Layers, Ruler, ChevronLeft, ChevronRight, FileImage,Globe } from 'lucide-react';
import { VesselDrawing } from '../types';
import { Modal } from './Modal';
import { PDFPreview } from './PDFPreview';
import { api } from '../utils/api';
import { downloadFile } from '@/utils/download';
import { copyToClipboard } from '@/utils/clipboard';
import { showToast } from './Toast';

interface DrawingPreviewModalProps {
  drawing: VesselDrawing | null;
  onClose: () => void;
}

export function DrawingPreviewModal({ drawing, onClose }: DrawingPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'params' | 'connections' | 'history'>('params');
  const [previewMode, setPreviewMode] = useState<'svg' | 'pdf'>('svg');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState('');
  const [currentVersion, setCurrentVersion] = useState('1');
  useEffect(() => {
    setCurrentPreviewUrl(drawing?.preview_image || '');
    setCurrentVersion(drawing?.version || '1');
  }, [drawing]);

  const safeNumber = (value: number | null | undefined, decimals: number = 0): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(decimals);
  };

  const safeLocaleNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString();
  };

  const tabs = [
    { id: 'params', label: '完整技术参数' },
    { id: 'connections', label: '接管表与接口规格' },
    { id: 'history', label: '历史版本与变更记录' },
  ] as const;

  const [versionHistory, setVersionHistory] = useState<any[]>([]);

  // 编辑备注弹窗状态
  const [editingLog, setEditingLog] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRemark, setEditRemark] = useState('');

  // 分享弹窗状态
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [sharePasscode, setSharePasscode] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [customPasscode, setCustomPasscode] = useState('');
  const [shareConfig, setShareConfig] = useState({
    expire_days: 7,
    need_passcode: true,
    allow_download: false,
  });

  if (!drawing) return null;
  // 拖拽移动
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Refs 用来获取 DOM 元素的真实尺寸以计算边界
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ mouseX: number, mouseY: number, startX: number, startY: number }>({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  // 获取历史版本记录
  const getVesselLogList = async () => {
    if (!drawing) return;
    try {
      const response = await api.get(`/logs/list?drawing_id=${drawing.id}`);
      if (response.code === 200 && response.data.list) {
        setVersionHistory(response.data.list);
      }
    } catch (error) {
      console.error('获取日志列表失败:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && drawing) {
      getVesselLogList();
    }
  }, [activeTab, drawing]);

  // 编辑备注
  const handleEditRemark = (log: any) => {
    setEditingLog(log);
    setEditRemark(log.remark ? log.remark || '' : log.log_message || '');
    setShowEditModal(true);
  };

  // 保存备注
  const handleSaveRemark = async () => {
    if (!editingLog) return;
    try {
      const response = await api.put(`/logs/${editingLog.id}`, { remark: editRemark });
      if (response.code === 200) {
        setShowEditModal(false);
        // 更新本地列表
        setVersionHistory(prev => prev.map(item =>
          item.id === editingLog.id ? { ...item, remark: editRemark } : item
        ));
      }
    } catch (error) {
      console.error('更新备注失败:', error);
    }
  };

  // 创建分享链接
  const handleCreateShare = async () => {
    if (!drawing) return;
    setShareLoading(true);
    try {
      const res = await api.post('/shares/create', {
        drawing_id: drawing.id,
        expire_days: shareConfig.expire_days,
        need_passcode: shareConfig.need_passcode,
        allow_download: shareConfig.allow_download,
        custom_passcode: customPasscode || undefined,
      });
      if (res.code === 200) {
        const url = res.data.share_url;
        const passcode = res.data.passcode || '';
        setShareUrl(url);
        setSharePasscode(passcode);
        const text = (shareConfig.need_passcode && passcode) ? `${url}\n提取码: ${passcode}` : url;
        const success = await copyToClipboard(text);
        if (success) {
          showToast('success', '分享链接已复制到剪贴板');
        } else {
          showToast('info', '分享链接创建成功，请手动复制');
        }
      } else {
        showToast('error', res.message || '创建失败');
      }
    } catch (error) {
      console.error('创建分享失败:', error);
      showToast('error', '创建分享链接失败');
    } finally {
      setShareLoading(false);
    }
  };

  // 复制分享链接
  const handleCopyShareLink = async () => {
    const text = (shareConfig.need_passcode && sharePasscode) ? `${shareUrl}\n提取码: ${sharePasscode}` : shareUrl;
    const success = await copyToClipboard(text);
    if (success) {
      showToast('success', '分享链接已复制到剪贴板');
    } else {
      showToast('error', '复制失败，请手动复制');
    }
  };

  // 复制内部链接
  const handleCopyInternalLink = async () => {
    const url = `${window.location.origin}/#/share/internal/${drawing.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      showToast('success', '内部链接已复制到剪贴板');
    } else {
      showToast('error', '复制失败，请手动复制');
    }
  };

  // 1. 鼠标按下：记录起始点（只记录一次，不要在 mousemove 里更新它！）
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    // 记录按下瞬间的：1. 鼠标屏幕坐标  2. 图纸当时的偏移位置
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y
    };
  };
  // 新增：响应鼠标滚轮事件（代替原生 scrollbar 滚动）
  const handleWheel = (e: React.WheelEvent) => {
    // 阻止页面整体滚动
    e.preventDefault();

    if (!containerRef.current || !contentRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();

    // 只有当放大后的内容高度超出容器时，滚轮滚动才生效
    if (contentRect.height <= containerRect.height) return;

    // e.deltaY > 0 表示向下滚动（内容应该向上移，即 position.y 减小）
    // 50 是滚轮滚动的灵敏度系数，可根据习惯调整
    const scrollSpeed = 50;
    const deltaY = e.deltaY > 0 ? -scrollSpeed : scrollSpeed;

    let targetY = position.y + deltaY;

    // 应用与 handleMouseMove 完全一致的精准物理边界限制
    const futureTop = contentRect.top + deltaY;
    const futureBottom = contentRect.bottom + deltaY;

    if (futureTop > containerRect.top) {
      targetY = position.y + (containerRect.top - contentRect.top);
    } else if (futureBottom < containerRect.bottom) {
      targetY = position.y + (containerRect.bottom - contentRect.bottom);
    }

    setPosition((prev) => ({ ...prev, y: targetY }));
  };
  // 2. 鼠标移动：基于真实物理边界计算（彻底解决单侧拖不动、看不到边缘的问题）
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !contentRef.current) return;

    // 1. 鼠标本次想移动到的“理想目标位置”
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    let targetX = dragStartRef.current.startX + deltaX;
    let targetY = dragStartRef.current.startY + deltaY;

    // 2. 获取【容器】和【图纸当前实际渲染位置】的矩形数据
    const containerRect = containerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();

    // ==================== Y 轴物理边界 (解决下方卡死关键) ====================
    if (contentRect.height <= containerRect.height) {
      // 如果整体高度比容器小，不给拖，留在原位
      targetY = 0;
    } else {
      /* 
        关键逻辑：
        - 向上拖（Show Bottom）：图纸底部 (contentRect.bottom) 决不能高于 容器底部 (containerRect.bottom)
        - 向下拖（Show Top）   ：图纸顶部 (contentRect.top)    决不能低于 容器顶部 (containerRect.top)
      */

      // 计算当前 targetY 相对于当前 position.y 的偏差
      const diffY = targetY - position.y;

      // 预判移动后的上/下边缘屏幕坐标
      const futureTop = contentRect.top + diffY;
      const futureBottom = contentRect.bottom + diffY;

      // 限制 1: 下拉过度（导致顶部露白）
      if (futureTop > containerRect.top) {
        targetY = position.y + (containerRect.top - contentRect.top);
      }
      // 限制 2: 上拉过度（导致底部露白，这就是你之前卡死的原因！）
      else if (futureBottom < containerRect.bottom) {
        targetY = position.y + (containerRect.bottom - contentRect.bottom);
      }
    }

    // ==================== X 轴物理边界 ====================
    if (contentRect.width <= containerRect.width) {
      targetX = 0;
    } else {
      const diffX = targetX - position.x;
      const futureLeft = contentRect.left + diffX;
      const futureRight = contentRect.right + diffX;

      if (futureLeft > containerRect.left) {
        targetX = position.x + (containerRect.left - contentRect.left);
      } else if (futureRight < containerRect.right) {
        targetX = position.x + (containerRect.right - contentRect.right);
      }
    }

    setPosition({ x: targetX, y: targetY });
  };
  // 3. 鼠标抬起/离开：结束拖拽
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 双击重置位置
  const handleDoubleClick = () => {
    setPosition({ x: 0, y: 0 });
  };
  // 
  const handlePreviewItemClick = (item: any) => {
    setCurrentVersion(item.version);
    if (item.version == '1') {
      const fileNameWithoutExtension = drawing.dwg_file_path.split('/').pop()!.replace('.dwg', '');
      setCurrentPreviewUrl(`/uploads/previews/${fileNameWithoutExtension}.png`);
    } else {
      // 读取文件名，去掉dwg后缀名
      const fileNameWithoutExtension = drawing.dwg_file_path.split('/').pop()!.replace('.dwg', '');
      setCurrentPreviewUrl(`/uploads/previews/${fileNameWithoutExtension}_v${item.version}.png`);
    }

  };
  //下载当前版本的PDF文件
// 通用文件下载处理函数
const handleDownload = (type: 'pdf' | 'dwg'|'preview' ) => {
  // 1. 兼容斜杠 '/' 和反斜杠 '\' 提取文件名，并去除 .dwg 或 .pdf 后缀
  const rawFileName = drawing.dwg_file_path.split(/[/\\]/).pop() || '';
  const fileNameWithoutExtension = rawFileName.replace(/\.(dwg|pdf)$/i, '');

  // 2. 判断版本：版本为 '1' 时不拼接后缀，非 '1' 时拼接 _v{version}
  const versionSuffix = currentVersion === '1' ? '' : `_v${currentVersion}`;
  const extension = type === 'dwg' ? 'dwg' : type === 'preview' ? 'png' : type === 'pdf' ? 'pdf' : 'pdf';
  
  // 3. 构造完整的文件名 (例: CQG20-0.88.pdf 或 CQG20-0.88_v2.dwg 或 CQG20-0.88_v2.png)
  const filename = `${fileNameWithoutExtension}${versionSuffix}.${extension}`;

  // 4. 根据类型动态拼接后端下载服务 URL (PDF 走 /uploads/pdf/，DWG 走 /uploads/dwg/)
  const subFolder = type === 'pdf' ? 'pdf' : type === 'dwg' ? 'dwg' : 'previews';
  const downloadUrl = `http://localhost:3000/uploads/${subFolder}/${filename}?download=1`;

  // 5. 执行下载
  downloadFile(downloadUrl, { filename });
};
  return (
    <Modal
      open={!!drawing}
      onClose={onClose}
      size="full"
      animation="scale"
      showCloseButton={false}
      className="!p-0"
      title={undefined}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{drawing.file_name}</h2>
            <span className="badge badge-primary">{drawing.material_code}</span>
            <span className="badge badge-gray">当前版本：V_{drawing.version}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors dark:hover:bg-slate-700"
          >
            <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className={`flex flex-col bg-slate-100 dark:bg-slate-800 ${isFullscreen ? '' : 'max-w-[1300px]'}`}>
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 dark:bg-slate-700">
                  <button
                    onClick={() => setPreviewMode('svg')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${previewMode === 'svg'
                      ? 'bg-white shadow-sm text-primary-600 dark:bg-slate-600 dark:text-primary-400'
                      : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                  >
                    <FileImage className="w-4 h-4" />
                    图形预览
                  </button>
                  {/* <button
                    onClick={() => setPreviewMode('pdf')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      previewMode === 'pdf'
                        ? 'bg-white shadow-sm text-primary-600 dark:bg-slate-600 dark:text-primary-400'
                        : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    PDF 预览
                  </button> */}
                </div>
                <div className="w-px h-6 bg-slate-200 mx-2 dark:bg-slate-600" />
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <ZoomOut className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-sm font-medium text-slate-600 w-16 text-center dark:text-slate-300">{zoom}%</span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <ZoomIn className="w-4 h-4 text-slate-600" />
                </button>
                <div className="w-px h-6 bg-slate-200 mx-2 dark:bg-slate-600" />
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-700" title="图层控制">
                  <Layers className="w-4 h-4 text-slate-600" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-700" title="在线测量">
                  <Ruler className="w-4 h-4 text-slate-600" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-700" title="上一页">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-700" title="下一页">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
                title={isFullscreen ? '退出全屏' : '全屏'}
              >
                <Maximize2 className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div
              id="preview-container"
              ref={containerRef}
              className="overflow-hidden relative p-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 dark:scrollbar-thumb-slate-600 dark:scrollbar-track-slate-800 h-full w-full"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {previewMode === 'svg' ? (
                <div className="min-h-full w-full flex items-center justify-center select-none">
                  {/* 拖拽及缩放的目标容器 */}
                  <div
                    ref={contentRef}
                    className={`transition-transform ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
                      transformOrigin: 'center center',
                      // 关键点：isDragging 为 true 时必须完全禁用 transition，否则绝对会抖动！
                      transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                      // 关键点：禁用指针事件穿透，防止子元素（如图片/文本）抢占 mousemove 事件
                      willChange: isDragging ? 'transform' : 'auto'
                    }}
                    onMouseDown={handleMouseDown}
                    onDoubleClick={handleDoubleClick}
                    title="按住鼠标左键拖拽，双击重置位置"
                  >
                    {drawing.preview_image ? (
                      <img
                        src={`http://localhost:3000${currentPreviewUrl}`}
                        alt={drawing.file_name}
                        className="border border-slate-300 rounded-lg bg-white shadow-sm pointer-events-none"
                        style={{ maxWidth: 'none', height: 'auto' }}
                      />
                    ) : (
                      <svg viewBox="0 0 400 500" fill="none" className="border border-slate-300 rounded-lg bg-white pointer-events-none">
                        {drawing.structure_type === '立式' ? (
                          <>
                            <rect x="50" y="30" width="300" height="440" rx="15" stroke="#1E293B" strokeWidth="3" fill="white" />
                            <rect x="70" y="50" width="260" height="400" rx="10" stroke="#64748B" strokeWidth="1.5" fill="none" />
                            <rect x="50" y="30" width="300" height="20" rx="15" stroke="#1E293B" strokeWidth="3" fill="#94A3B8" />
                            <rect x="50" y="450" width="300" height="20" rx="15" stroke="#1E293B" strokeWidth="3" fill="#94A3B8" />
                            <line x1="200" y1="70" x2="200" y2="450" stroke="#64748B" strokeWidth="1" strokeDasharray="4 4" />
                            <circle cx="200" cy="100" r="40" stroke="#2563EB" strokeWidth="2" fill="none" />
                            <rect x="120" y="170" width="160" height="15" rx="3" fill="#F97316" />
                            <rect x="140" y="200" width="120" height="12" rx="2" fill="#64748B" />
                            <rect x="130" y="230" width="140" height="12" rx="2" fill="#64748B" />
                            <rect x="150" y="260" width="100" height="12" rx="2" fill="#64748B" />
                            <rect x="160" y="290" width="80" height="12" rx="2" fill="#64748B" />
                            <rect x="10" y="80" width="30" height="60" rx="5" stroke="#2563EB" strokeWidth="2" fill="white" />
                            <text x="25" y="115" textAnchor="middle" fill="#2563EB" fontSize="10" fontWeight="bold">安全阀</text>
                            <rect x="360" y="200" width="30" height="80" rx="5" stroke="#F97316" strokeWidth="2" fill="white" />
                            <text x="375" y="245" textAnchor="middle" fill="#F97316" fontSize="10" fontWeight="bold">进出口</text>
                            <rect x="360" y="350" width="30" height="40" rx="5" stroke="#EF4444" strokeWidth="2" fill="white" />
                            <text x="375" y="375" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold">排污口</text>
                            <text x="200" y="20" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="bold">
                              {drawing.material_code} - {drawing.file_name}
                            </text>
                          </>
                        ) : (
                          <>
                            <rect x="30" y="100" width="440" height="300" rx="150" stroke="#1E293B" strokeWidth="3" fill="white" />
                            <rect x="50" y="120" width="400" height="260" rx="130" stroke="#64748B" strokeWidth="1.5" fill="none" />
                            <line x1="250" y1="100" x2="250" y2="400" stroke="#64748B" strokeWidth="1" strokeDasharray="4 4" />
                            <circle cx="250" cy="250" r="80" stroke="#2563EB" strokeWidth="2" fill="none" />
                            <rect x="150" y="200" width="200" height="15" rx="3" fill="#F97316" />
                            <rect x="180" y="230" width="140" height="12" rx="2" fill="#64748B" />
                            <rect x="160" y="260" width="180" height="12" rx="2" fill="#64748B" />
                            <rect x="190" y="290" width="120" height="12" rx="2" fill="#64748B" />
                            <rect x="10" y="200" width="40" height="80" rx="5" stroke="#2563EB" strokeWidth="2" fill="white" />
                            <text x="30" y="245" textAnchor="middle" fill="#2563EB" fontSize="10" fontWeight="bold">安全阀</text>
                            <rect x="470" y="200" width="40" height="80" rx="5" stroke="#F97316" strokeWidth="2" fill="white" />
                            <text x="490" y="245" textAnchor="middle" fill="#F97316" fontSize="10" fontWeight="bold">进出口</text>
                            <rect x="230" y="400" width="40" height="30" rx="5" stroke="#EF4444" strokeWidth="2" fill="white" />
                            <text x="250" y="422" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold">排污口</text>
                            <text x="250" y="70" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="bold">
                              {drawing.material_code} - {drawing.file_name}
                            </text>
                          </>
                        )}
                      </svg>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <PDFPreview drawing={drawing} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full border-l border-slate-200 flex flex-col dark:border-slate-700">
            <div className="flex border-b border-slate-200 bg-white/50 dark:border-slate-700 dark:bg-slate-800/50 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-shrink-0 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary-600 rounded-full dark:bg-primary-400" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'params' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`badge ${drawing.structure_type === '立式' ? 'badge-primary' : 'badge-orange'}`}>
                      {drawing.structure_type}
                    </span>
                    <span className="badge badge-gray">{drawing.material}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">工作压力</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{safeNumber(drawing.working_pressure, 2)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">MPa</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">设计压力</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{safeNumber(drawing.design_pressure, 2)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">MPa</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">设计温度</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{safeNumber(drawing.design_temperature)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">℃</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">容积</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{safeNumber(drawing.volume, 2)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">m³</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">公称直径</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{safeNumber(drawing.nominal_diameter)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mm</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">壁厚</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{safeNumber(drawing.wall_thickness, 1)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mm</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">设备总高/总长</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{safeNumber(drawing.total_height_or_length)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mm</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">重量</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{safeLocaleNumber(drawing.weight)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">kg</span></p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">介质</span>
                      <span className="text-slate-800 font-medium dark:text-slate-100">{drawing.medium}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">设计使用年限</span>
                      <span className="text-slate-800 font-medium dark:text-slate-100">{safeNumber(drawing.design_life)} 年</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">创建人</span>
                      <span className="text-slate-800 font-medium dark:text-slate-100">{drawing.created_by}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">修改人</span>
                      <span className="text-slate-800 font-medium dark:text-slate-100">{drawing.updated_by}</span>
                    </div>
                  </div>

                  {drawing.remark && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">备注</p>
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 dark:text-slate-300 dark:bg-slate-700">{drawing.remark}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'connections' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 dark:bg-blue-900/30">
                    <p className="text-sm font-medium text-blue-800 mb-2 dark:text-blue-400">安全阀接口</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">{drawing.safety_valve_connection}</p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4 dark:bg-red-900/30">
                    <p className="text-sm font-medium text-red-800 mb-2 dark:text-red-400">排污口连接</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{drawing.drain_connection}</p>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4 dark:bg-orange-900/30">
                    <p className="text-sm font-medium text-orange-800 mb-2 dark:text-orange-400">进口连接</p>
                    <p className="text-sm text-orange-600 dark:text-orange-300">{drawing.inlet_connection}</p>
                    <p className="text-xs text-orange-500 mt-1 dark:text-orange-400">{safeNumber(drawing.inlet_count)} 进</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 dark:bg-green-900/30">
                    <p className="text-sm font-medium text-green-800 mb-2 dark:text-green-400">出口连接</p>
                    <p className="text-sm text-green-600 dark:text-green-300">{drawing.outlet_connection}</p>
                    <p className="text-xs text-green-500 mt-1 dark:text-green-400">{safeNumber(drawing.outlet_count)} 出</p>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm font-medium text-slate-700 mb-3 dark:text-slate-300">接口示意表</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded p-2 text-center dark:bg-slate-700">
                        <p className="text-slate-500 dark:text-slate-400">接口类型</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2 text-center dark:bg-slate-700">
                        <p className="text-slate-500 dark:text-slate-400">规格</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2 dark:bg-slate-700 dark:text-slate-300">安全阀</div>
                      <div className="bg-slate-50 rounded p-2 dark:bg-slate-700 dark:text-slate-300">{drawing.safety_valve_connection}</div>
                      <div className="bg-slate-50 rounded p-2 dark:bg-slate-700 dark:text-slate-300">排污口</div>
                      <div className="bg-slate-50 rounded p-2 dark:bg-slate-700 dark:text-slate-300">{drawing.drain_connection}</div>
                      <div className="bg-slate-50 rounded p-2 dark:bg-slate-700 dark:text-slate-300">进口</div>
                      <div className="bg-slate-50 rounded p-2 dark:bg-slate-700 dark:text-slate-300">{drawing.inlet_connection}</div>
                      <div className="bg-slate-50 rounded p-2 dark:bg-slate-700 dark:text-slate-300">出口</div>
                      <div className="bg-slate-50 rounded p-2 dark:bg-slate-700 dark:text-slate-300">{drawing.outlet_connection}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {versionHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>暂无历史版本记录</p>
                    </div>
                  ) : (
                    versionHistory.map((item, index) => (
                      <div
                        key={item.id || index}
                        className={`bg-slate-50 rounded-lg p-4 dark:bg-slate-700 ${item.version == currentVersion ? 'bg-blue-300 dark:bg-blue-800' : ''}`}
                      >
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{item.log_message}</p>
                        {item.remark && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded p-2 mb-2">
                            备注: {item.remark}
                          </p>
                        )}
                        <div className="flex items-center justify-between ">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">版本v-{item.version}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : ''}
                            </span>
                            <button
                              onClick={() => handleEditRemark(item)}
                              className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                            >
                              编辑备注
                            </button>
                            {/* 预览按钮 */}
                            <button
                              onClick={() => handlePreviewItemClick(item)}
                              className={`px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors`}
                            >
                              预览
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <button onClick={()=>handleDownload('pdf')} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" />
              下载pdf
            </button>
            <button onClick={()=>handleDownload('dwg')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
              <Download className="w-4 h-4" />
              下载 DWG 原图
            </button>
             <button onClick={()=>handleDownload('preview')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
              <Download className="w-4 h-4" />
              下载预览图片
            </button>
            <button onClick={handleCopyInternalLink} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
              <Copy className="w-4 h-4" />
              复制内部链接
            </button>
            {/* 复制外部分享链接 */}
             <button onClick={() => { setShowShareModal(true); setShareUrl(''); setSharePasscode(''); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
              <Globe className="w-4 h-4" />
              复制外部分享链接
            </button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            文件路径: {drawing.file_path}
          </div>
        </div>

        {/* 编辑备注弹窗 */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">编辑备注</h3>
              <textarea
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                className="w-full h-32 p-3 border border-slate-200 dark:border-slate-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                placeholder="请输入备注内容..."
              />
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveRemark}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 外部分享弹窗 */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary-600" />
                  外部分享
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 分享配置 */}
              <div className="space-y-4 mb-5">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-700 dark:text-slate-300">有效期</span>
                  <select
                    value={shareConfig.expire_days}
                    onChange={(e) => setShareConfig({ ...shareConfig, expire_days: Number(e.target.value) })}
                    className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={0}>永久有效</option>
                    <option value={1}>1 天</option>
                    <option value={7}>7 天</option>
                    <option value={30}>30 天</option>
                    <option value={90}>90 天</option>
                  </select>
                </div>
                <div className="py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-700 dark:text-slate-300">需要提取码</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareConfig.need_passcode}
                        onChange={(e) => setShareConfig({ ...shareConfig, need_passcode: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary-100 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-500 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  {shareConfig.need_passcode && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customPasscode}
                        onChange={(e) => setCustomPasscode(e.target.value.toUpperCase().slice(0, 4))}
                        placeholder="留空则自动生成4位提取码"
                        maxLength={4}
                        className="flex-1 text-center text-lg tracking-[0.3em] font-mono py-2 px-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-xs text-slate-400 whitespace-nowrap">4位字母/数字</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-700 dark:text-slate-300">允许下载 DWG 原图</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareConfig.allow_download}
                      onChange={(e) => setShareConfig({ ...shareConfig, allow_download: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary-100 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-500 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>

              {/* 创建/结果 */}
              {!shareUrl ? (
                <button
                  onClick={handleCreateShare}
                  disabled={shareLoading}
                  className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {shareLoading ? '创建中...' : '创建分享链接'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">分享链接</p>
                    <p className="text-sm text-primary-600 dark:text-primary-400 font-mono break-all">{shareUrl}</p>
                  </div>
                  {sharePasscode && (
                    <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3">
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">提取码</p>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-300 tracking-widest">{sharePasscode}</p>
                    </div>
                  )}
                  <button
                    onClick={handleCopyShareLink}
                    className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    复制分享链接
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
