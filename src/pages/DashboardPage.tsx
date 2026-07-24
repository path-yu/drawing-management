import { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, List, SplitSquareVertical, X, Trash2, CheckSquare, Square, AlertTriangle, RefreshCw, Search, Maximize2 } from 'lucide-react';
import { Header } from '../components/Header';
import { FilterSidebar } from '../components/FilterSidebar';
import { DrawingCard } from '../components/DrawingCard';
import { DataTable } from '../components/DataTable';
import { DrawingPreviewModal } from '../components/DrawingPreviewModal';
import { VesselDrawing, FilterState, ViewMode } from '../types';
import { api } from '../utils/api';

interface DrawingSearchResponse {
  total: number;
  list: VesselDrawing[];
  page: number;
  page_size: number;
}

const initialFilter: FilterState = {
  structure_type: '',
  volume_min: '',
  volume_max: '',
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
};

export function DashboardPage() {
  const [drawings, setDrawings] = useState<VesselDrawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>(initialFilter);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewDrawing, setPreviewDrawing] = useState<VesselDrawing | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'batch'>('single');
  const [deleteDrawing, setDeleteDrawing] = useState<VesselDrawing | null>(null);
  const [splitSelectedDrawing, setSplitSelectedDrawing] = useState<VesselDrawing | null>(null);

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
      params.append('page_size', '100');
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
  }, [viewMode, filteredDrawings, splitSelectedDrawing]);

  const handleResetFilter = () => {
    setFilter(initialFilter);
    setAppliedFilters([]);
  };

  const handleApplyFilter = () => {
    const activeFilters: string[] = [];
    if (filter.structure_type) activeFilters.push(filter.structure_type);
    if (filter.volume_min || filter.volume_max)
      activeFilters.push(`容积 ${filter.volume_min || '0'}-${filter.volume_max || '∞'} m³`);
    if (filter.design_pressure_min || filter.design_pressure_max)
      activeFilters.push(`压力 ${filter.design_pressure_min || '0'}-${filter.design_pressure_max || '∞'} MPa`);
    if (filter.nominal_diameter_min || filter.nominal_diameter_max)
      activeFilters.push(`直径 ${filter.nominal_diameter_min || '0'}-${filter.nominal_diameter_max || '∞'} mm`);
    if (filter.material) activeFilters.push(filter.material);
    if (filter.medium) activeFilters.push(filter.medium);
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
      setFilter((prev) => ({ ...prev, material: '' }));
    } else if (filterText.includes('介质')) {
      setFilter((prev) => ({ ...prev, medium: '' }));
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

  const handleBatchDelete = () => {
    setDeleteTarget('batch');
    setDeleteDrawing(null);
    setShowConfirmModal(true);
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

      <div className="flex-1 flex overflow-hidden">
        <FilterSidebar
          filter={filter}
          onFilterChange={setFilter}
          onReset={handleResetFilter}
          onApply={handleApplyFilter}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          resultCount={filteredDrawings.length}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 rounded-lg p-1 dark:bg-slate-700">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'card' ? 'bg-white shadow-sm text-primary-600 dark:bg-slate-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title="卡片视图"
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

              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索物料编码、文件名..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="input-field pl-10 pr-4 py-2 w-64 text-sm"
                />
              </div>

              {/* 刷新按钮 */}
              <button
                onClick={fetchDrawings}
                disabled={loading}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  loading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>

              <div className="flex flex-wrap gap-2">
                {appliedFilters.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm dark:bg-primary-900/30 dark:text-primary-400"
                  >
                    {f}
                    <button onClick={() => removeFilter(f)} className="hover:text-primary-900 dark:hover:text-primary-300">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {searchKeyword && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm dark:bg-orange-900/30 dark:text-orange-400">
                    搜索: {searchKeyword}
                    <button onClick={() => setSearchKeyword('')} className="hover:text-orange-900 dark:hover:text-orange-300">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  删除选中 ({selectedIds.size})
                </button>
              )}
              <button
                onClick={handleSelectAll}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  selectedIds.size === filteredDrawings.length && filteredDrawings.length > 0
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {selectedIds.size === filteredDrawings.length && filteredDrawings.length > 0 ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                全选
              </button>
              <select className="input-field text-sm w-40">
                <option>按更新时间排序</option>
                <option>按容积排序</option>
                <option>按设计压力排序</option>
                <option>按公称直径排序</option>
              </select>

              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Trash2 className="w-4 h-4" />
                <span>共 {filteredDrawings.length} 条记录</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
              </div>
            ) : (
              <>
                {viewMode === 'card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredDrawings.map((drawing) => (
                      <DrawingCard
                        key={drawing.id}
                        drawing={drawing}
                        onPreview={handlePreview}
                        onExport={handleExport}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        selected={selectedIds.has(drawing.id)}
                        onToggleSelect={handleToggleSelect}
                        showCheckbox={selectedIds.size > 0}
                      />
                    ))}
                  </div>
                )}

                {viewMode === 'table' && (
                  <div className="card">
                    <DataTable
                      drawings={filteredDrawings}
                      onPreview={handlePreview}
                      onExport={handleExport}
                      onEdit={handleEdit}
                    />
                  </div>
                )}

                {viewMode === 'split' && (
                  <div className="grid grid-cols-2 gap-4 h-full">
                    <div className="grid grid-cols-1 gap-3 overflow-auto">
                      {filteredDrawings.map((drawing) => (
                        <div
                          key={drawing.id}
                          className={`card p-3 cursor-pointer transition-all ${
                            splitSelectedDrawing?.id === drawing.id
                              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                              : 'hover:border-primary-300'
                          }`}
                          onClick={() => {
                            setSplitSelectedDrawing(drawing);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-16 h-12 rounded-lg flex items-center justify-center overflow-hidden ${
                              drawing.structure_type === '立式' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'
                            }`}>
                              {drawing.preview_image ? (
                                <img
                                  src={`http://localhost:3000${drawing.preview_image}`}
                                  alt={drawing.file_name}
                                  className={`max-w-full max-h-full ${
                                    drawing.structure_type === '立式' ? 'w-auto h-full' : 'w-full h-auto'
                                  }`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <svg className="w-12 h-10" viewBox="0 0 80 60" fill="none">
                                  <rect x="5" y="10" width="70" height="40" rx="4" stroke="#475569" strokeWidth="1.5" className="dark:stroke-slate-400" />
                                  <circle cx="40" cy="25" r="12" stroke="#2563EB" strokeWidth="1.5" fill="none" className="dark:stroke-blue-400" />
                                  <line x1="40" y1="25" x2="40" y2="48" stroke="#64748B" strokeWidth="1" className="dark:stroke-slate-400" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-slate-800 truncate dark:text-slate-100 text-sm">{drawing.file_name}</h4>
                                <span className="badge badge-gray text-xs">{drawing.version}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-primary-600 font-medium dark:text-primary-400">{drawing.material_code}</span>
                                <span
                                  className={`badge text-xs ${
                                    drawing.structure_type === '立式' ? 'badge-primary' : 'badge-orange'
                                  }`}
                                >
                                  {drawing.structure_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span>{drawing.volume} m³</span>
                                <span className="text-slate-300">|</span>
                                <span>{drawing.design_pressure} MPa</span>
                                <span className="text-slate-300">|</span>
                                <span>{drawing.nominal_diameter} mm</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
        <DrawingPreviewModal drawing={previewDrawing} onClose={() => setPreviewDrawing(null)} />
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
