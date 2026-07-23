import { useState } from 'react';
import { ChevronDown, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { FilterState } from '../types';
import { materialOptions, mediumOptions, connectionOptions } from '../data/mockData';

interface FilterSidebarProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onReset: () => void;
  onApply: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  resultCount: number;
}

export function FilterSidebar({
  filter,
  onFilterChange,
  onReset,
  onApply,
  isCollapsed,
  onToggleCollapse,
  resultCount,
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    process: false,
    geometry: false,
    connection: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filter, [key]: value });
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 dark:bg-slate-800 dark:border-slate-700">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
          title="展开筛选面板"
        >
          <SlidersHorizontal className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 dark:text-slate-100">
          <SlidersHorizontal className="w-4 h-4" />
          参数筛选
        </h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-slate-100 rounded transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
          title="收起筛选面板"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">结构形式</label>
          <div className="flex gap-2">
            {['', '立式', '卧式'].map((type) => (
              <button
                key={type}
                onClick={() => handleChange('structure_type', type as '' | '立式' | '卧式')}
                className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                  filter.structure_type === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {type || '全部'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">容积 (m³)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={filter.volume_min}
              onChange={(e) => handleChange('volume_min', e.target.value)}
              placeholder="最小"
              className="flex-1 input-field text-sm"
            />
            <span className="text-slate-400 dark:text-slate-500">-</span>
            <input
              type="number"
              step="0.1"
              value={filter.volume_max}
              onChange={(e) => handleChange('volume_max', e.target.value)}
              placeholder="最大"
              className="flex-1 input-field text-sm"
            />
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={filter.volume_max || 50}
            onChange={(e) => handleChange('volume_max', e.target.value)}
            className="input-range mt-3"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">设计压力 (MPa)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={filter.design_pressure_min}
              onChange={(e) => handleChange('design_pressure_min', e.target.value)}
              placeholder="最小"
              className="flex-1 input-field text-sm"
            />
            <span className="text-slate-400 dark:text-slate-500">-</span>
            <input
              type="number"
              step="0.1"
              value={filter.design_pressure_max}
              onChange={(e) => handleChange('design_pressure_max', e.target.value)}
              placeholder="最大"
              className="flex-1 input-field text-sm"
            />
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={filter.design_pressure_max || 10}
            onChange={(e) => handleChange('design_pressure_max', e.target.value)}
            className="input-range mt-3"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">公称直径 (mm)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={filter.nominal_diameter_min}
              onChange={(e) => handleChange('nominal_diameter_min', e.target.value)}
              placeholder="最小"
              className="flex-1 input-field text-sm"
            />
            <span className="text-slate-400 dark:text-slate-500">-</span>
            <input
              type="number"
              value={filter.nominal_diameter_max}
              onChange={(e) => handleChange('nominal_diameter_max', e.target.value)}
              placeholder="最大"
              className="flex-1 input-field text-sm"
            />
          </div>
          <input
            type="range"
            min="300"
            max="3000"
            step="50"
            value={filter.nominal_diameter_max || 3000}
            onChange={(e) => handleChange('nominal_diameter_max', e.target.value)}
            className="input-range mt-3"
          />
        </div>

        <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            onClick={() => toggleSection('process')}
            className="w-full flex items-center justify-between text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <span>工艺与设计</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedSections.process ? 'rotate-180' : ''}`}
            />
          </button>
          {expandedSections.process && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">材质</label>
                <select
                  value={filter.material}
                  onChange={(e) => handleChange('material', e.target.value)}
                  className="w-full input-field text-sm"
                >
                  <option value="">全部材质</option>
                  {materialOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">设计温度 (℃)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={filter.design_temperature_min}
                    onChange={(e) => handleChange('design_temperature_min', e.target.value)}
                    placeholder="最小"
                    className="flex-1 input-field text-sm"
                  />
                  <span className="text-slate-400 dark:text-slate-500">-</span>
                  <input
                    type="number"
                    value={filter.design_temperature_max}
                    onChange={(e) => handleChange('design_temperature_max', e.target.value)}
                    placeholder="最大"
                    className="flex-1 input-field text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">介质</label>
                <select
                  value={filter.medium}
                  onChange={(e) => handleChange('medium', e.target.value)}
                  className="w-full input-field text-sm"
                >
                  <option value="">全部介质</option>
                  {mediumOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">设计使用年限 (年)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={filter.design_life_min}
                    onChange={(e) => handleChange('design_life_min', e.target.value)}
                    placeholder="最小"
                    className="flex-1 input-field text-sm"
                  />
                  <span className="text-slate-400 dark:text-slate-500">-</span>
                  <input
                    type="number"
                    value={filter.design_life_max}
                    onChange={(e) => handleChange('design_life_max', e.target.value)}
                    placeholder="最大"
                    className="flex-1 input-field text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-4 mt-2 dark:border-slate-700">
          <button
            onClick={() => toggleSection('geometry')}
            className="w-full flex items-center justify-between text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <span>几何尺寸</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedSections.geometry ? 'rotate-180' : ''}`}
            />
          </button>
          {expandedSections.geometry && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">壁厚 (mm)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={filter.wall_thickness_min}
                    onChange={(e) => handleChange('wall_thickness_min', e.target.value)}
                    placeholder="最小"
                    className="flex-1 input-field text-sm"
                  />
                  <span className="text-slate-400 dark:text-slate-500">-</span>
                  <input
                    type="number"
                    step="0.5"
                    value={filter.wall_thickness_max}
                    onChange={(e) => handleChange('wall_thickness_max', e.target.value)}
                    placeholder="最大"
                    className="flex-1 input-field text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">设备总高/总长 (mm)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={filter.weight_min}
                    onChange={(e) => handleChange('weight_min', e.target.value)}
                    placeholder="最小"
                    className="flex-1 input-field text-sm"
                  />
                  <span className="text-slate-400 dark:text-slate-500">-</span>
                  <input
                    type="number"
                    value={filter.weight_max}
                    onChange={(e) => handleChange('weight_max', e.target.value)}
                    placeholder="最大"
                    className="flex-1 input-field text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">重量 (kg)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={filter.weight_min}
                    onChange={(e) => handleChange('weight_min', e.target.value)}
                    placeholder="最小"
                    className="flex-1 input-field text-sm"
                  />
                  <span className="text-slate-400 dark:text-slate-500">-</span>
                  <input
                    type="number"
                    value={filter.weight_max}
                    onChange={(e) => handleChange('weight_max', e.target.value)}
                    placeholder="最大"
                    className="flex-1 input-field text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-4 mt-2 dark:border-slate-700">
          <button
            onClick={() => toggleSection('connection')}
            className="w-full flex items-center justify-between text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <span>接管与接口</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedSections.connection ? 'rotate-180' : ''}`}
            />
          </button>
          {expandedSections.connection && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">安全阀接口</label>
                <select
                  value={filter.safety_valve_connection}
                  onChange={(e) => handleChange('safety_valve_connection', e.target.value)}
                  className="w-full input-field text-sm"
                >
                  <option value="">全部</option>
                  {connectionOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">排污口</label>
                <select
                  value={filter.drain_connection}
                  onChange={(e) => handleChange('drain_connection', e.target.value)}
                  className="w-full input-field text-sm"
                >
                  <option value="">全部</option>
                  {connectionOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">进出口连接</label>
                <select
                  value={filter.inlet_connection}
                  onChange={(e) => handleChange('inlet_connection', e.target.value)}
                  className="w-full input-field text-sm mb-2"
                >
                  <option value="">全部</option>
                  {connectionOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">几进</label>
                  <input
                    type="number"
                    value={filter.inlet_count}
                    onChange={(e) => handleChange('inlet_count', e.target.value)}
                    placeholder="进"
                    className="w-full input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">几出</label>
                  <input
                    type="number"
                    value={filter.outlet_count}
                    onChange={(e) => handleChange('outlet_count', e.target.value)}
                    placeholder="出"
                    className="w-full input-field text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 flex gap-3 dark:border-slate-700">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          <RotateCcw className="w-4 h-4" />
          重置筛选
        </button>
        <button
          onClick={onApply}
          className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          应用筛选 ({resultCount})
        </button>
      </div>
    </aside>
  );
}
