import { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, List, SplitSquareVertical, X, Trash2 } from 'lucide-react';
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
                    <div className="grid grid-cols-1 gap-4 overflow-auto">
                      {filteredDrawings.slice(0, 4).map((drawing) => (
                        <div
                          key={drawing.id}
                          className="card p-4 cursor-pointer hover:border-primary-500 transition-colors"
                          onClick={() => handlePreview(drawing)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-16 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-700">
                              <svg className="w-16 h-12" viewBox="0 0 80 60" fill="none">
                                <rect x="5" y="10" width="70" height="40" rx="4" stroke="#475569" strokeWidth="1.5" className="dark:stroke-slate-400" />
                                <circle cx="40" cy="25" r="12" stroke="#2563EB" strokeWidth="1.5" fill="none" className="dark:stroke-blue-400" />
                                <line x1="40" y1="25" x2="40" y2="48" stroke="#64748B" strokeWidth="1" className="dark:stroke-slate-400" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-slate-800 truncate dark:text-slate-100">{drawing.file_name}</h4>
                                <span className="badge badge-gray">{drawing.version}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-primary-600 font-medium dark:text-primary-400">{drawing.material_code}</span>
                                <span
                                  className={`badge ${
                                    drawing.structure_type === '立式' ? 'badge-primary' : 'badge-orange'
                                  }`}
                                >
                                  {drawing.structure_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                <span>{drawing.volume} m³</span>
                                <span>{drawing.design_pressure} MPa</span>
                                <span>{drawing.nominal_diameter} mm</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center p-8 dark:bg-slate-800 dark:border-slate-700">
                      <div className="text-center text-slate-400">
                        <SplitSquareVertical className="w-16 h-16 mx-auto mb-4" />
                        <p>点击左侧图纸卡片进行预览</p>
                      </div>
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
    </div>
  );
}
