import { useState } from 'react';
import { ChevronDown, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { FilterState } from '../types';
import { materialOptions, materialCategoryMap, mediumOptions, connectionOptions } from '../data/mockData';
import { ClearableInput } from './ClearableInput';

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
    process: true,
    geometry: true,
    connection: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filter, [key]: value });
  };

  // 点击材质快捷按钮：选中类别，清空具体材质
  const handleMaterialCategoryChange = (category: '' | 'carbon' | 'stainless') => {
    onFilterChange({ ...filter, material_category: category, material: '' });
  };

  // 选择具体材质：自动识别所属类别并同步
  const handleMaterialChange = (material: string) => {
    const category = material ? (materialCategoryMap[material] || '') : '';
    onFilterChange({ ...filter, material, material_category: category as '' | 'carbon' | 'stainless' });
  };

  // 结构形式按钮样式
  const structBtnClass = (active: boolean) =>
    `flex-1 py-1.5 text-xs rounded-md transition-colors font-medium ${
      active
        ? 'bg-primary-600 text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
    }`;

  if (isCollapsed) {
    return (
      <div className="w-12 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-1 dark:bg-slate-800 dark:border-slate-700">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
          title="展开筛选面板"
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <h2 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5 dark:text-slate-100">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          参数筛选
        </h2>
        <button
          onClick={onToggleCollapse}
          className="p-0.5 hover:bg-slate-100 rounded transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
          title="收起筛选面板"
        >
          <X className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3 scrollbar-hide">
        {/* 结构形式 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 dark:text-slate-300">结构形式</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleChange('structure_type', '')}
              className={structBtnClass(filter.structure_type === '')}
            >
              全部
            </button>
            <button
              onClick={() => handleChange('structure_type', '立式')}
              className={structBtnClass(filter.structure_type === '立式')}
            >
              立式
            </button>
            <button
              onClick={() => handleChange('structure_type', '卧式')}
              className={structBtnClass(filter.structure_type === '卧式')}
            >
              卧式
            </button>
          </div>
        </div>

        {/* 容器规范 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 dark:text-slate-300">容器规范</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleChange('is_simple', '')}
              className={structBtnClass(filter.is_simple === '')}
            >
              全部
            </button>
            <button
              onClick={() => handleChange('is_simple', 'false')}
              className={structBtnClass(filter.is_simple === 'false')}
            >
              固规
            </button>
            <button
              onClick={() => handleChange('is_simple', 'true')}
              className={structBtnClass(filter.is_simple === 'true')}
            >
              简规
            </button>
          </div>
        </div>

        {/* 材质快捷按钮 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 dark:text-slate-300">材质</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleMaterialCategoryChange('')}
              className={structBtnClass(filter.material_category === '' && !filter.material)}
            >
              全部
            </button>
            <button
              onClick={() => handleMaterialCategoryChange('carbon')}
              className={structBtnClass(filter.material_category === 'carbon')}
            >
              碳钢
            </button>
            <button
              onClick={() => handleMaterialCategoryChange('stainless')}
              className={structBtnClass(filter.material_category === 'stainless')}
            >
              不锈钢
            </button>
          </div>
        </div>

  

        {/* 流向 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 dark:text-slate-300">流向</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleChange('flow_direction', '')}
              className={structBtnClass(filter.flow_direction === '')}
            >
              全部
            </button>
            <button
              onClick={() => handleChange('flow_direction', '左进右出')}
              className={structBtnClass(filter.flow_direction === '左进右出')}
            >
              左进右出
            </button>
            <button
              onClick={() => handleChange('flow_direction', '右进左出')}
              className={structBtnClass(filter.flow_direction === '右进左出')}
            >
              右进左出
            </button>
          </div>
        </div>
      {/* 备注模糊搜索 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 dark:text-slate-300">备注</label>
          <ClearableInput
            type="text"
            value={filter.remark}
            onChange={(v) => handleChange('remark', v)}
            placeholder="输入备注关键词"
          />
        </div>
        {/* 容积 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 dark:text-slate-300">容积 (m³)</label>
          <div className="flex items-center gap-1.5">
            <ClearableInput
              type="number"
              step="0.1"
              value={filter.volume_min}
              onChange={(v) => handleChange('volume_min', v)}
              placeholder="最小"
              wrapperClassName="min-w-0 flex-1"
            />
            <span className="text-slate-400 text-xs">-</span>
            <ClearableInput
              type="number"
              step="0.1"
              value={filter.volume_max}
              onChange={(v) => handleChange('volume_max', v)}
              placeholder="最大"
              wrapperClassName="min-w-0 flex-1"
            />
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={filter.volume_max || 50}
            onChange={(e) => handleChange('volume_max', e.target.value)}
            className="input-range mt-1.5 w-full"
          />
        </div>

        {/* 设计压力 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 dark:text-slate-300">设计压力 (MPa)</label>
          <div className="flex items-center gap-1.5">
            <ClearableInput
              type="number"
              step="0.1"
              value={filter.design_pressure_min}
              onChange={(v) => handleChange('design_pressure_min', v)}
              placeholder="最小"
              wrapperClassName="min-w-0 flex-1"
            />
            <span className="text-slate-400 text-xs">-</span>
            <ClearableInput
              type="number"
              step="0.1"
              value={filter.design_pressure_max}
              onChange={(v) => handleChange('design_pressure_max', v)}
              placeholder="最大"
              wrapperClassName="min-w-0 flex-1"
            />
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={filter.design_pressure_max || 10}
            onChange={(e) => handleChange('design_pressure_max', e.target.value)}
            className="input-range mt-1.5 w-full"
          />
        </div>

        {/* 公称直径 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 dark:text-slate-300">公称直径 (mm)</label>
          <div className="flex items-center gap-1.5">
            <ClearableInput
              type="number"
              value={filter.nominal_diameter_min}
              onChange={(v) => handleChange('nominal_diameter_min', v)}
              placeholder="最小"
              wrapperClassName="min-w-0 flex-1"
            />
            <span className="text-slate-400 text-xs">-</span>
            <ClearableInput
              type="number"
              value={filter.nominal_diameter_max}
              onChange={(v) => handleChange('nominal_diameter_max', v)}
              placeholder="最大"
              wrapperClassName="min-w-0 flex-1"
            />
          </div>
          <input
            type="range"
            min="300"
            max="3000"
            step="50"
            value={filter.nominal_diameter_max || 3000}
            onChange={(e) => handleChange('nominal_diameter_max', e.target.value)}
            className="input-range mt-1.5 w-full"
          />
        </div>

        {/* 工艺与设计 */}
        <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
          <button
            onClick={() => toggleSection('process')}
            className="w-full flex items-center justify-between text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <span>工艺与设计</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${expandedSections.process ? 'rotate-180' : ''}`}
            />
          </button>
          {expandedSections.process && (
            <div className="mt-2 space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">具体材质</label>
                <select
                  value={filter.material}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full input-field text-xs py-1"
                >
                  <option value="">不限</option>
                  {materialOptions
                    .filter((m) => {
                      if (!filter.material_category) return true;
                      return materialCategoryMap[m] === filter.material_category;
                    })
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">设计温度 (℃)</label>
                <div className="flex items-center gap-1.5">
                  <ClearableInput
                    type="number"
                    value={filter.design_temperature_min}
                    onChange={(v) => handleChange('design_temperature_min', v)}
                    placeholder="最小"
                    wrapperClassName="min-w-0 flex-1"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <ClearableInput
                    type="number"
                    value={filter.design_temperature_max}
                    onChange={(v) => handleChange('design_temperature_max', v)}
                    placeholder="最大"
                    wrapperClassName="min-w-0 flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">介质</label>
                <select
                  value={filter.medium}
                  onChange={(e) => handleChange('medium', e.target.value)}
                  className="w-full input-field text-xs py-1"
                >
                  <option value="">不限</option>
                  {mediumOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">设计使用年限 (年)</label>
                <div className="flex items-center gap-1.5">
                  <ClearableInput
                    type="number"
                    value={filter.design_life_min}
                    onChange={(v) => handleChange('design_life_min', v)}
                    placeholder="最小"
                    wrapperClassName="min-w-0 flex-1"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <ClearableInput
                    type="number"
                    value={filter.design_life_max}
                    onChange={(v) => handleChange('design_life_max', v)}
                    placeholder="最大"
                    wrapperClassName="min-w-0 flex-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 几何尺寸 */}
        <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
          <button
            onClick={() => toggleSection('geometry')}
            className="w-full flex items-center justify-between text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <span>几何尺寸</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${expandedSections.geometry ? 'rotate-180' : ''}`}
            />
          </button>
          {expandedSections.geometry && (
            <div className="mt-2 space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">壁厚 (mm)</label>
                <div className="flex items-center gap-1.5">
                  <ClearableInput
                    type="number"
                    step="0.5"
                    value={filter.wall_thickness_min}
                    onChange={(v) => handleChange('wall_thickness_min', v)}
                    placeholder="最小"
                    wrapperClassName="min-w-0 flex-1"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <ClearableInput
                    type="number"
                    step="0.5"
                    value={filter.wall_thickness_max}
                    onChange={(v) => handleChange('wall_thickness_max', v)}
                    placeholder="最大"
                    wrapperClassName="min-w-0 flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">设备总高/总长 (mm)</label>
                <div className="flex items-center gap-1.5">
                  <ClearableInput
                    type="number"
                    value={filter.weight_min}
                    onChange={(v) => handleChange('weight_min', v)}
                    placeholder="最小"
                    wrapperClassName="min-w-0 flex-1"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <ClearableInput
                    type="number"
                    value={filter.weight_max}
                    onChange={(v) => handleChange('weight_max', v)}
                    placeholder="最大"
                    wrapperClassName="min-w-0 flex-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 接管与接口 */}
        <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
          <button
            onClick={() => toggleSection('connection')}
            className="w-full flex items-center justify-between text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <span>接管与接口</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${expandedSections.connection ? 'rotate-180' : ''}`}
            />
          </button>
          {expandedSections.connection && (
            <div className="mt-2 space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">安全阀接口</label>
                <select
                  value={filter.safety_valve_connection}
                  onChange={(e) => handleChange('safety_valve_connection', e.target.value)}
                  className="w-full input-field text-xs py-1"
                >
                  <option value="">不限</option>
                  {connectionOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">排污口</label>
                <select
                  value={filter.drain_connection}
                  onChange={(e) => handleChange('drain_connection', e.target.value)}
                  className="w-full input-field text-xs py-1"
                >
                  <option value="">不限</option>
                  {connectionOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">进出口连接</label>
                <select
                  value={filter.inlet_connection}
                  onChange={(e) => handleChange('inlet_connection', e.target.value)}
                  className="w-full input-field text-xs py-1"
                >
                  <option value="">不限</option>
                  {connectionOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">几进</label>
                  <ClearableInput
                    type="number"
                    value={filter.inlet_count}
                    onChange={(v) => handleChange('inlet_count', v)}
                    placeholder="进"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5 dark:text-slate-400">几出</label>
                  <ClearableInput
                    type="number"
                    value={filter.outlet_count}
                    onChange={(v) => handleChange('outlet_count', v)}
                    placeholder="出"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-slate-200 flex gap-2 dark:border-slate-700">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-xs font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          <RotateCcw className="w-3 h-3" />
          重置
        </button>
        <button
          onClick={onApply}
          className="flex-1 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-xs font-medium"
        >
          应用 ({resultCount})
        </button>
      </div>
    </aside>
  );
}
