import { VirtualList } from './VirtualList';
import { VesselDrawing } from '../types';

interface DrawingSplitListProps {
  filteredDrawings: VesselDrawing[];
  splitSelectedDrawing: VesselDrawing | null;
  setSplitSelectedDrawing: (drawing: VesselDrawing) => void;
  height?: number;
}

export function DrawingSplitList({
  filteredDrawings,
  splitSelectedDrawing,
  setSplitSelectedDrawing,
  height = 780,
}: DrawingSplitListProps) {
  // 单个卡片高度 (88px) + 下边距 gap (12px) = 100px
  const ITEM_HEIGHT = 100;
  {/* 左侧虚拟滚动列表容器 */}
  return (
      <div className="h-full min-h-0">
        <VirtualList
          items={filteredDrawings}
          itemHeight={ITEM_HEIGHT}
          height={height}
          overscan={5}
          renderItem={(drawing: VesselDrawing) => {
            const isSelected = splitSelectedDrawing?.id === drawing.id;

            return (
              <div className="pb-3" style={{ height: `${ITEM_HEIGHT}px` }}>
                <div
                  className={`card p-3 cursor-pointer transition-all h-full ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                      : 'hover:border-primary-300'
                  }`}
                  onClick={() => setSplitSelectedDrawing(drawing)}
                >
                  <div className="flex items-center gap-3 h-full">
                    {/* 图纸缩略图/SVG 图标 */}
                    <div
                      className={`w-16 h-12 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${
                        drawing.structure_type === '立式'
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'bg-orange-50 dark:bg-orange-900/20'
                      }`}
                    >
                      {drawing.preview_image ? (
                        <img
                          src={`http://localhost:3000${drawing.preview_image}`}
                          alt={drawing.file_name}
                          className={`max-w-full max-h-full ${
                            drawing.structure_type === '立式'
                              ? 'w-auto h-full'
                              : 'w-full h-auto'
                          }`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              'none';
                          }}
                        />
                      ) : (
                        <svg
                          className="w-12 h-10"
                          viewBox="0 0 80 60"
                          fill="none"
                        >
                          <rect
                            x="5"
                            y="10"
                            width="70"
                            height="40"
                            rx="4"
                            stroke="#475569"
                            strokeWidth="1.5"
                            className="dark:stroke-slate-400"
                          />
                          <circle
                            cx="40"
                            cy="25"
                            r="12"
                            stroke="#2563EB"
                            strokeWidth="1.5"
                            fill="none"
                            className="dark:stroke-blue-400"
                          />
                          <line
                            x1="40"
                            y1="25"
                            x2="40"
                            y2="48"
                            stroke="#64748B"
                            strokeWidth="1"
                            className="dark:stroke-slate-400"
                          />
                        </svg>
                      )}
                    </div>

                    {/* 卡片详细文本属性 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className="font-medium text-slate-800 truncate dark:text-slate-100 text-sm"
                          title={drawing.file_name}
                        >
                          {drawing.file_name}
                        </h4>
                        <span className="badge badge-gray text-xs shrink-0">
                          {drawing.version || '-'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-primary-600 font-medium dark:text-primary-400 truncate">
                          {drawing.material_code || '-'}
                        </span>
                        <span
                          className={`badge text-xs shrink-0 ${
                            drawing.structure_type === '立式'
                              ? 'badge-primary'
                              : 'badge-orange'
                          }`}
                        >
                          {drawing.structure_type || '-'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{drawing.volume != null ? `${drawing.volume} m³` : '-'}</span>
                        <span className="text-slate-300">|</span>
                        <span>{drawing.design_pressure != null ? `${drawing.design_pressure} MPa` : '-'}</span>
                        <span className="text-slate-300">|</span>
                        <span>{drawing.nominal_diameter != null ? `${drawing.nominal_diameter} mm` : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>
  );
}