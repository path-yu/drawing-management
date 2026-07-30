import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { LayoutGrid, List, SplitSquareVertical, X, Trash2, CheckSquare, Square, AlertTriangle, RefreshCw, Search, Maximize2, Columns, Download, Layers } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Header } from '../components/Header';
import { FilterSidebar } from '../components/FilterSidebar';
import { DrawingCard } from '../components/DrawingCard';
import { DataTable } from '../components/DataTable';
import { DrawingPreviewModal } from '../components/DrawingPreviewModal';
import { PermissionGuard } from '../components/PermissionGuard';
import { ClearableInput } from '../components/ClearableInput';
import { Waterfall } from '../components/Waterfall';
import { VesselDrawing, FilterState, ViewMode } from '../types';
import { api } from '../utils/api';
import { downloadFile } from '../utils/download';
import { DrawingSplitList } from '@/components/DrawingSplitList';
import { useAuth } from '../context/AuthContext';

interface DrawingSearchResponse {
  total: number;
  list: VesselDrawing[];
  page: number;
  page_size: number;
}

const FILTER_STORAGE_KEY = 'vessel_drawing_filter_state';

function loadPersistedState(): Partial<{
  filter: FilterState;
  searchKeyword: string;
  viewMode: ViewMode;
  columnCount: number;
  sidebarCollapsed: boolean;
}> {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

const initialFilter: FilterState = {
  structure_type: '',
  volume_min: '',
  volume_max: '',
  material_category: '',
  design_pressure_min: '',
  design_pressure_max: '',
  nominal_diameter_min: '',
  nominal_diameter_max: '',
  material: '',
  design_temperature_min: '',
  design_temperature_max: '',
  medium: '',
  design_life_min: '',
  design_life_max: '',
  wall_thickness_min: '',
  wall_thickness_max: '',
  weight_min: '',
  weight_max: '',
  safety_valve_connection: '',
  drain_connection: '',
  inlet_connection: '',
  outlet_connection: '',
  inlet_count: '',
  outlet_count: '',
  remark: '',
  flow_direction: '',
  is_simple: '',
};

export function DashboardPage() {
  const { id: shareId } = useParams<{ id: string }>();
  const { hasAnyPermission } = useAuth();
  const persisted = shareId ? {} : loadPersistedState();

  // 是否有批量操作权限（删除、下载PDF、下载DWG、合并导出任意一个即可）
  const canBatchOperate = hasAnyPermission(['drawing:delete', 'drawing:export', 'drawing:download']);

  const [drawings, setDrawings] = useState<VesselDrawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>({ ...initialFilter, ...(persisted.filter || {}) });
  const [searchKeyword, setSearchKeyword] = useState(persisted.searchKeyword || '');
  const [viewMode, setViewMode] = useState<ViewMode>(persisted.viewMode || 'preview');
  const [columnCount, setColumnCount] = useState(persisted.columnCount || 4);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(persisted.sidebarCollapsed || false);
  const [previewDrawing, setPreviewDrawing] = useState<VesselDrawing | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<string[]>(() => {
    const f = { ...initialFilter, ...(persisted.filter || {}) };
    const tags: string[] = [];
    if (f.structure_type) tags.push(f.structure_type);
    if (f.material_category && !f.material) {
      tags.push(`材质: ${f.material_category === 'carbon' ? '碳钢' : f.material_category === 'stainless' ? '不锈钢' : '全部'}`);
    }
    if (f.material) tags.push(`材质: ${f.material}`);
    if (f.volume_min || f.volume_max) tags.push(`容积 ${f.volume_min || '0'}-${f.volume_max || '∞'} m³`);
    if (f.design_pressure_min || f.design_pressure_max) tags.push(`压力 ${f.design_pressure_min || '0'}-${f.design_pressure_max || '∞'} MPa`);
    if (f.nominal_diameter_min || f.nominal_diameter_max) tags.push(`直径 ${f.nominal_diameter_min || '0'}-${f.nominal_diameter_max || '∞'} mm`);
    if (f.medium) tags.push(f.medium);
    if (f.remark) tags.push(`备注: ${f.remark}`);
    if (f.flow_direction) tags.push(`流向: ${f.flow_direction}`);
    if (f.is_simple) tags.push(`规范: ${f.is_simple === 'true' ? '简规' : '固规'}`);
    return tags;
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'batch'>('single');
  const [deleteDrawing, setDeleteDrawing] = useState<VesselDrawing | null>(null);
  const [splitSelectedDrawing, setSplitSelectedDrawing] = useState<VesselDrawing | null>(null);
  // 记录用户是否手动关闭了内部分享的预览弹窗
  const sharePreviewClosedRef = useRef(false);

  // 持久化筛选状态到 localStorage
  useEffect(() => {
    if (shareId) return;
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
        filter,
        searchKeyword,
        viewMode,
        columnCount,
        sidebarCollapsed,
      }));
    } catch {}
  }, [filter, searchKeyword, viewMode, columnCount, sidebarCollapsed, shareId]);

  useEffect(() => {
    fetchDrawings();
  }, [filter, searchKeyword]);

  const fetchDrawings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.append('keyword', searchKeyword);
      Object.entries(filter).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
      params.append('page_size', '200');
      const res = await api.get<DrawingSearchResponse>(`/drawings/search?${params.toString()}`);
      if (res.code === 200) {
        setDrawings(res.data.list);
      }
    } catch {
      setDrawings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrawings = useMemo(() => drawings, [drawings]);

  // 分屏视图首次打开时自动选中第一个图纸
  useEffect(() => {
    if (viewMode === 'split' && filteredDrawings.length > 0 && !splitSelectedDrawing) {
      setSplitSelectedDrawing(filteredDrawings[0]);
    }
  }, [viewMode, filteredDrawings]);

  // 内部分享链接：识别 URL 中的 id，自动拉取并选中该图纸，开启预览 Modal
  useEffect(() => {
    if (!shareId || loading || filteredDrawings.length === 0) return;
    
    // 如果用户已手动关闭预览，不再自动打开
    if (sharePreviewClosedRef.current) return;
    
    const target = filteredDrawings.find((d) => String(d.id) === shareId);
    if (target) {
      setPreviewDrawing(target);
    }
  }, [shareId, loading, filteredDrawings]);

  // 无批量操作权限时清空选中状态
  useEffect(() => {
    if (!canBatchOperate && selectedIds.size > 0) {
      setSelectedIds(new Set());
    }
  }, [canBatchOperate]);

  const handleResetFilter = () => {
    setFilter(initialFilter);
    setSearchKeyword('');
    setAppliedFilters([]);
  };

  const handleApplyFilter = () => {
    const activeFilters: string[] = [];
    if (filter.structure_type) activeFilters.push(filter.structure_type);
    if (filter.material_category && !filter.material) {
      const catLabel = filter.material_category === 'carbon' ? '碳钢' : filter.material_category === 'stainless' ? '不锈钢' : '全部';
      activeFilters.push(`材质: ${catLabel}`);
    }
    if (filter.material) {
      activeFilters.push(`材质: ${filter.material}`);
    }
    if (filter.volume_min || filter.volume_max)
      activeFilters.push(`容积 ${filter.volume_min || '0'}-${filter.volume_max || '∞'} m³`);
    if (filter.design_pressure_min || filter.design_pressure_max)
      activeFilters.push(`压力 ${filter.design_pressure_min || '0'}-${filter.design_pressure_max || '∞'} MPa`);
    if (filter.nominal_diameter_min || filter.nominal_diameter_max)
      activeFilters.push(`直径 ${filter.nominal_diameter_min || '0'}-${filter.nominal_diameter_max || '∞'} mm`);
    if (filter.medium) activeFilters.push(filter.medium);
    if (filter.remark) activeFilters.push(`备注: ${filter.remark}`);
    if (filter.flow_direction) activeFilters.push(`流向: ${filter.flow_direction}`);
    if (filter.is_simple) activeFilters.push(`规范: ${filter.is_simple === 'true' ? '简规' : '固规'}`);
    setAppliedFilters(activeFilters);
  };

  const removeFilter = (filterText: string) => {
    setAppliedFilters((prev) => prev.filter((f) => f !== filterText));
    if (filterText.includes('立式') || filterText.includes('卧式')) {
      setFilter((prev) => ({ ...prev, structure_type: '' }));
    } else if (filterText.includes('容积')) {
      setFilter((prev) => ({ ...prev, volume_min: '', volume_max: '' }));
    } else if (filterText.includes('压力')) {
      setFilter((prev) => ({ ...prev, design_pressure_min: '', design_pressure_max: '' }));
    } else if (filterText.includes('直径')) {
      setFilter((prev) => ({ ...prev, nominal_diameter_min: '', nominal_diameter_max: '' }));
    } else if (filterText.includes('材质')) {
      setFilter((prev) => ({ ...prev, material: '', material_category: '' }));
    } else if (filterText.includes('介质')) {
      setFilter((prev) => ({ ...prev, medium: '' }));
    } else if (filterText.includes('备注')) {
      setFilter((prev) => ({ ...prev, remark: '' }));
    } else if (filterText.includes('流向')) {
      setFilter((prev) => ({ ...prev, flow_direction: '' }));
    } else if (filterText.includes('规范')) {
      setFilter((prev) => ({ ...prev, is_simple: '' }));
    }
  };

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
  };

  const handlePreview = (drawing: VesselDrawing) => {
    setPreviewDrawing(drawing);
  };

  const handleExport = (_drawing: VesselDrawing) => {
    alert('导出客户 PDF 功能开发中...');
  };

  const handleEdit = (_drawing: VesselDrawing) => {
    alert('编辑图纸功能开发中...');
  };

  const handleDelete = (drawing: VesselDrawing) => {
    setDeleteTarget('single');
    setDeleteDrawing(drawing);
    setShowConfirmModal(true);
  };

  const handleToggleSelect = (drawing: VesselDrawing) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(drawing.id)) {
        newSet.delete(drawing.id);
      } else {
        newSet.add(drawing.id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredDrawings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDrawings.map((d) => d.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    setDeleteTarget('batch');
    setDeleteDrawing(null);
    setShowConfirmModal(true);
  };

  const getSelectedDrawings = () => {
    return filteredDrawings.filter((d) => selectedIds.has(d.id));
  };

  const handleBatchDownloadPDF = async () => {
    const selectedDrawings = getSelectedDrawings();
    for (let i = 0; i < selectedDrawings.length; i++) {
      const drawing = selectedDrawings[i];
      const url = `http://localhost:3000${drawing.pdf_file_path}?download=1`;
      const filename = drawing.pdf_file_path.split(/[/\\]/).pop() || `${drawing.material_code}.pdf`;
      await downloadFile(url, { filename });
      if (i < selectedDrawings.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  };

  const handleBatchDownloadDWG = async () => {
    const selectedDrawings = getSelectedDrawings();
    for (let i = 0; i < selectedDrawings.length; i++) {
      const drawing = selectedDrawings[i];
      const url = `http://localhost:3000${drawing.dwg_file_path}?download=1`;
      const filename = drawing.dwg_file_path.split(/[/\\]/).pop() || `${drawing.material_code}.dwg`;
      await downloadFile(url, { filename });
      if (i < selectedDrawings.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  };

  const handleBatchMergePDF = async () => {
    const selectedDrawings = getSelectedDrawings();
    if (selectedDrawings.length === 0) {
      alert('请先选择要合并的图纸');
      return;
    }

    try {
      // 创建新的PDF文档
      const mergedPdf = await PDFDocument.create();

      // 逐个加载并合并PDF
      for (let i = 0; i < selectedDrawings.length; i++) {
        const drawing = selectedDrawings[i];
        const url = `http://localhost:3000${drawing.pdf_file_path}`;
        
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`无法加载文件: ${drawing.file_name}`);
            continue;
          }
          const pdfBytes = await response.arrayBuffer();
          const pdf = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
          });
        } catch (err) {
          console.error(`合并文件 ${drawing.file_name} 失败:`, err);
        }
      }

      // 保存合并后的PDF
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      
      // 生成文件名：使用当前时间戳
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `合并图纸_${timestamp}_${selectedDrawings.length}个文件.pdf`;
      
      // 下载文件
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('合并PDF失败:', error);
      alert('合并PDF失败，请重试');
    }
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    try {
      if (deleteTarget === 'single' && deleteDrawing) {
        await api.delete(`/drawings/${deleteDrawing.id}`);
      } else if (deleteTarget === 'batch') {
        await api.delete('/drawings/batch', { ids: Array.from(selectedIds) });
      }
      setSelectedIds(new Set());
      fetchDrawings();
    } catch {
      alert('删除失败');
    }
  };

  const handleCreate = () => {
    alert('新建图纸功能开发中...');
  };

  const handleBatchUpload = () => {
    alert('批量上传功能开发中...');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header onSearch={handleSearch} onCreate={handleCreate} onBatchUpload={handleBatchUpload} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <FilterSidebar
          filter={filter}
          onFilterChange={setFilter}
          onReset={handleResetFilter}
          onApply={handleApplyFilter}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          resultCount={filteredDrawings.length}
        />

        <main className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
          <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 overflow-hidden min-w-0 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex bg-slate-100 rounded-lg p-1 dark:bg-slate-700">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'preview' ? 'bg-white shadow-sm text-primary-600 dark:bg-slate-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title="预览布局"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'table' ? 'bg-white shadow-sm text-primary-600 dark:bg-slate-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title="列表视图"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'split' ? 'bg-white shadow-sm text-primary-600 dark:bg-slate-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title="分屏预览"
                >
                  <SplitSquareVertical className="w-4 h-4" />
                </button>
              </div>

              {/* 列数滑块（仅预览模式显示） */}
              {viewMode === 'preview' && (
                <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <Columns className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="range"
                    min={2}
                    max={8}
                    value={columnCount}
                    onChange={(e) => setColumnCount(Number(e.target.value))}
                    className="w-24 h-1 accent-primary-500 cursor-pointer h-1"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 w-4 text-center font-mono">{columnCount}</span>
                </div>
              )}

              {/* 搜索框 */}
              <ClearableInput
                type="text"
                value={searchKeyword}
                onChange={setSearchKeyword}
                placeholder="搜索物料编码、文件名..."
                wrapperClassName="flex-1 min-w-0 max-w-56"
                prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
              />

              {/* 刷新按钮 */}
              <button
                onClick={fetchDrawings}
                disabled={loading}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors text-xs font-medium ${
                  loading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>

              <div className="flex flex-wrap gap-1.5 min-w-0">
                {appliedFilters.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs dark:bg-primary-900/30 dark:text-primary-400"
                  >
                    {f}
                    <button onClick={() => removeFilter(f)} className="hover:text-primary-900 dark:hover:text-primary-300">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {searchKeyword && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs dark:bg-orange-900/30 dark:text-orange-400">
                    搜索: {searchKeyword}
                    <button onClick={() => setSearchKeyword('')} className="hover:text-orange-900 dark:hover:text-orange-300">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {canBatchOperate && selectedIds.size > 0 && (
                <>
                  <PermissionGuard permission="drawing:delete">
                    <button
                      onClick={handleBatchDelete}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除选中 ({selectedIds.size})
                    </button>
                  </PermissionGuard>
                  <PermissionGuard permission="drawing:export">
                    <button
                      onClick={handleBatchDownloadPDF}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      批量下载PDF
                    </button>
                  </PermissionGuard>
                  <PermissionGuard permission="drawing:download">
                    <button
                      onClick={handleBatchDownloadDWG}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-xs font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      <Download className="w-3.5 h-3.5" />
                      批量下载DWG
                    </button>
                  </PermissionGuard>
                  <PermissionGuard permission="drawing:export">
                    <button
                      onClick={handleBatchMergePDF}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors text-xs font-medium"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      合并导出PDF
                    </button>
                  </PermissionGuard>
                  <button
                    onClick={handleClearSelection}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-xs font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    title="取消所有选择"
                  >
                    <X className="w-3.5 h-3.5" />
                    取消选择
                  </button>
                </>
              )}
              {canBatchOperate && (
                <button
                  onClick={handleSelectAll}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors text-xs font-medium ${
                    selectedIds.size === filteredDrawings.length && filteredDrawings.length > 0
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {selectedIds.size === filteredDrawings.length && filteredDrawings.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  {selectedIds.size === filteredDrawings.length && filteredDrawings.length > 0 ? '取消全选' : '全选'}
                </button>
              )}
              <select className="px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white w-36">
                <option>按更新时间排序</option>
                <option>按容积排序</option>
                <option>按设计压力排序</option>
                <option>按公称直径排序</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>共 {filteredDrawings.length} 条</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <div className="animate-spin w-7 h-7 border-3 border-primary-200 border-t-primary-600 rounded-full"></div>
              </div>
            ) : (
              <>
                {viewMode === 'preview' && (
                  <Waterfall.Container
                    columns={columnCount}
                    gap={12}
                    virtual={true}
                    overscan={300}
                    scrollMode="container"
                    height="100%"
                    className="w-full h-full flex-1 min-h-0 p-2"
                  >
                    {filteredDrawings.map((drawing) => (
                      <Waterfall.Item key={drawing.id} id={drawing.id}>
                        <DrawingCard
                          drawing={drawing}
                          onPreview={handlePreview}
                          onDelete={handleDelete}
                          selected={canBatchOperate && selectedIds.has(drawing.id)}
                          isSelectionMode={canBatchOperate && selectedIds.size > 0}
                          onToggleSelect={canBatchOperate ? handleToggleSelect : undefined}
                        />
                      </Waterfall.Item>
                    ))}
                  </Waterfall.Container>
                )}

                {viewMode === 'table' && (
                  <div className="card flex-1 overflow-auto m-2">
                    <DataTable
                      drawings={filteredDrawings}
                      onPreview={handlePreview}
                      onExport={handleExport}
                      onEdit={handleEdit}
                    />
                  </div>
                )}

                {viewMode === 'split' && (
                  <div className="grid grid-cols-2 gap-4 h-full m-2">
                      <DrawingSplitList
                      filteredDrawings={filteredDrawings}
                      splitSelectedDrawing={splitSelectedDrawing}
                      setSplitSelectedDrawing={setSplitSelectedDrawing}
                      height={780}
                    />
                 
                    <div className="bg-slate-100 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
                      {splitSelectedDrawing ? (
                        <div className="h-full flex flex-col">
                          <div className="px-4 py-3 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                                  {splitSelectedDrawing.file_name}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {splitSelectedDrawing.material_code} | {splitSelectedDrawing.structure_type}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handlePreview(splitSelectedDrawing)}
                                  className="p-2 text-slate-600 hover:bg-blue-50 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-blue-900/30"
                                  title="全屏预览"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 overflow-auto p-2 pdf-scrollbar">
                            <div className="min-h-full flex items-start justify-center">
                              {splitSelectedDrawing.preview_image ? (
                                <img
                                  src={`http://localhost:3000${splitSelectedDrawing.preview_image}`}
                                  alt={splitSelectedDrawing.file_name}
                                  className="border border-slate-300 rounded-lg bg-white shadow-sm"
                                  style={{ 
                                    ...(splitSelectedDrawing.structure_type === '卧式' 
                                      ? { maxWidth: '100%', height: 'auto' } 
                                      : { maxHeight: '100%', width: 'auto' }
                                    )
                                  }}
                                />
                              ) : (
                                <svg 
                                  viewBox={splitSelectedDrawing.structure_type === '立式' ? "0 0 400 500" : "0 0 500 300"} 
                                  fill="none" 
                                  className="border border-slate-300 rounded-lg bg-white"
                                  style={{ 
                                    ...(splitSelectedDrawing.structure_type === '卧式' 
                                      ? { maxWidth: '100%', height: 'auto' } 
                                      : { maxHeight: '100%', width: 'auto' }
                                    )
                                  }}
                                >
                                  {splitSelectedDrawing.structure_type === '立式' ? (
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
                                        {splitSelectedDrawing.material_code} - {splitSelectedDrawing.file_name}
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
                                      <rect x="450" y="150" width="40" height="60" rx="5" stroke="#F97316" strokeWidth="2" fill="white" />
                                      <text x="470" y="185" textAnchor="middle" fill="#F97316" fontSize="10" fontWeight="bold">进口</text>
                                      <rect x="450" y="250" width="40" height="60" rx="5" stroke="#F97316" strokeWidth="2" fill="white" />
                                      <text x="470" y="285" textAnchor="middle" fill="#F97316" fontSize="10" fontWeight="bold">出口</text>
                                      <rect x="450" y="350" width="40" height="40" rx="5" stroke="#EF4444" strokeWidth="2" fill="white" />
                                      <text x="470" y="375" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold">排污</text>
                                      <text x="250" y="480" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="bold">
                                        {splitSelectedDrawing.material_code} - {splitSelectedDrawing.file_name}
                                      </text>
                                    </>
                                  )}
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="px-4 py-3 bg-white border-t border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-slate-500 dark:text-slate-400">容积:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-100">{splitSelectedDrawing.volume} m³</span>
                              <span className="text-slate-500 dark:text-slate-400">压力:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-100">{splitSelectedDrawing.design_pressure} MPa</span>
                              <span className="text-slate-500 dark:text-slate-400">直径:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-100">{splitSelectedDrawing.nominal_diameter} mm</span>
                              <span className="text-slate-500 dark:text-slate-400">材质:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-100">{splitSelectedDrawing.material}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center p-8">
                          <div className="text-center text-slate-400">
                            <SplitSquareVertical className="w-16 h-16 mx-auto mb-4" />
                            <p>点击左侧图纸卡片进行预览</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {filteredDrawings.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <List className="w-16 h-16 mb-4" />
                    <p className="text-lg">暂无匹配的图纸</p>
                    <p className="text-sm mt-2">请调整筛选条件或搜索关键词</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {previewDrawing && (
        <DrawingPreviewModal
          drawing={previewDrawing}
          onClose={() => {
            setPreviewDrawing(null);
            // 如果是内部分享链接，标记用户已手动关闭预览
            if (shareId) {
              sharePreviewClosedRef.current = true;
            }
          }}
          onDrawingUpdate={fetchDrawings}
        />
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md dark:bg-slate-800">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full dark:bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {deleteTarget === 'single' ? '确认删除' : '批量删除'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {deleteTarget === 'single'
                    ? `确定要删除 "${deleteDrawing?.file_name}" 吗？`
                    : `确定要删除选中的 ${selectedIds.size} 条记录吗？`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
