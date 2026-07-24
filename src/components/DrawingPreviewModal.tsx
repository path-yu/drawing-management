import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, Copy, FileText, Layers, Ruler, ChevronLeft, ChevronRight, FileImage } from 'lucide-react';
import { VesselDrawing } from '../types';
import { Modal } from './Modal';
import { PDFPreview } from './PDFPreview';

interface DrawingPreviewModalProps {
  drawing: VesselDrawing | null;
  onClose: () => void;
}

export function DrawingPreviewModal({ drawing, onClose }: DrawingPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'params' | 'connections' | 'history'>('params');
  const [previewMode, setPreviewMode] = useState<'svg' | 'pdf'>('svg');
  const [zoom, setZoom] = useState(100);

  const tabs = [
    { id: 'params', label: '完整技术参数' },
    { id: 'connections', label: '接管表与接口规格' },
    { id: 'history', label: '历史版本与变更记录' },
  ] as const;

  const versionHistory = [
    { version: 'V1.2', date: '2024-02-15', operator: '赵六', changes: '更新设计压力参数' },
    { version: 'V1.1', date: '2024-02-01', operator: '张三', changes: '修正壁厚尺寸' },
    { version: 'V1.0', date: '2024-01-15', operator: '张三', changes: '初始版本创建' },
  ];

  if (!drawing) return null;

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
            <span className="badge badge-gray">{drawing.version}</span>
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
          <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 dark:bg-slate-700">
                  <button
                    onClick={() => setPreviewMode('svg')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      previewMode === 'svg'
                        ? 'bg-white shadow-sm text-primary-600 dark:bg-slate-600 dark:text-primary-400'
                        : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <FileImage className="w-4 h-4" />
                    图形预览
                  </button>
                  <button
                    onClick={() => setPreviewMode('pdf')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      previewMode === 'pdf'
                        ? 'bg-white shadow-sm text-primary-600 dark:bg-slate-600 dark:text-primary-400'
                        : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    PDF 预览
                  </button>
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
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-700" title="全屏">
                <Maximize2 className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8">
              {previewMode === 'svg' ? (
                <div className="flex items-center justify-center h-full">
                  <div className={`transition-transform duration-200 ${drawing.structure_type === '立式' ? 'w-[400px]' : 'w-[500px]'}`} style={{ transform: `scale(${zoom / 100})` }}>
                    <svg viewBox="0 0 400 500" fill="none" className="border border-slate-300 rounded-lg bg-white">
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
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <PDFPreview drawing={drawing} />
                </div>
              )}
            </div>
          </div>

          <div className="w-100 border-l border-slate-200 flex flex-col dark:border-slate-700">
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:text-primary-400 dark:border-primary-500 dark:bg-primary-900/30'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
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
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{drawing.working_pressure.toFixed(2)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">MPa</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">设计压力</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{drawing.design_pressure.toFixed(2)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">MPa</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">设计温度</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{drawing.design_temperature} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">℃</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">容积</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{drawing.volume.toFixed(2)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">m³</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">公称直径</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{drawing.nominal_diameter} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mm</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">壁厚</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{drawing.wall_thickness.toFixed(1)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mm</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">设备总高/总长</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{drawing.total_height_or_length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mm</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 mb-1 dark:text-slate-400">重量</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{drawing.weight.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">kg</span></p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">介质</span>
                      <span className="text-slate-800 font-medium dark:text-slate-100">{drawing.medium}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">设计使用年限</span>
                      <span className="text-slate-800 font-medium dark:text-slate-100">{drawing.design_life} 年</span>
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
                    <p className="text-xs text-orange-500 mt-1 dark:text-orange-400">{drawing.inlet_count} 进</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 dark:bg-green-900/30">
                    <p className="text-sm font-medium text-green-800 mb-2 dark:text-green-400">出口连接</p>
                    <p className="text-sm text-green-600 dark:text-green-300">{drawing.outlet_connection}</p>
                    <p className="text-xs text-green-500 mt-1 dark:text-green-400">{drawing.outlet_count} 出</p>
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
                  {versionHistory.map((item, index) => (
                    <div key={index} className="bg-slate-50 rounded-lg p-4 dark:bg-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{item.version}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{item.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-600 dark:text-slate-400">操作人:</span>
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400">{item.operator}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{item.changes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
              <FileText className="w-4 h-4" />
              一键生成客户报价 PDF（带水印）
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
              <Download className="w-4 h-4" />
              下载 DWG 原图
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
              <Copy className="w-4 h-4" />
              复制分享链接
            </button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            文件路径: {drawing.file_path}
          </div>
        </div>
      </div>
    </Modal>
  );
}
