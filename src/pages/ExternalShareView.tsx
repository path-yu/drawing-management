import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, AlertCircle, Download, FileText, Shield } from 'lucide-react';
import { api } from '../utils/api';
import { downloadFile } from '../utils/download';

interface ShareInfo {
  need_passcode: boolean;
  is_expired: boolean;
  drawing_name: string;
  structure_type: string;
}

interface DrawingData {
  drawing_id: number;
  file_name: string;
  structure_type: string;
  material: string;
  working_pressure: number;
  design_pressure: number;
  design_temperature: number;
  volume: number;
  nominal_diameter: number;
  wall_thickness: number;
  total_height_or_length: number;
  weight: number;
  medium: string;
  design_life: number;
  pdf_file_path: string;
  preview_image: string;
  allow_download: boolean;
  dwg_file_path: string | null;
}

export function ExternalShareView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [drawingData, setDrawingData] = useState<DrawingData | null>(null);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // 加载分享信息
  useEffect(() => {
    if (!token) return;
    const fetchShareInfo = async () => {
      try {
        const res = await api.get(`/shares/public/${token}`);
        if (res.code === 200) {
          setShareInfo(res.data);
          if (!res.data.need_passcode && !res.data.is_expired) {
            // 无需提取码且未过期，直接获取图纸数据
            await fetchDrawingData(token, '');
          }
        } else {
          setShareInfo({ need_passcode: false, is_expired: true, drawing_name: '', structure_type: '' });
        }
      } catch {
        setShareInfo({ need_passcode: false, is_expired: true, drawing_name: '', structure_type: '' });
      } finally {
        setLoading(false);
      }
    };
    fetchShareInfo();
  }, [token]);

  const fetchDrawingData = async (tk: string, code: string) => {
    try {
      const res = await api.post(`/shares/public/${tk}/verify`, { passcode: code });
      if (res.code === 200) {
        setDrawingData(res.data);
      } else {
        setPasscodeError(res.message);
      }
    } catch {
      setPasscodeError('验证失败，请重试');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = () => {
    if (!passcode.trim()) {
      setPasscodeError('请输入提取码');
      return;
    }
    setPasscodeError('');
    setVerifying(true);
    fetchDrawingData(token!, passcode.trim().toUpperCase());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  const handleDownloadDwg = () => {
    if (drawingData?.dwg_file_path) {
      downloadFile(`http://localhost:3000${drawingData.dwg_file_path}?download=1`);
    }
  };

  const safeNumber = (value: number | null | undefined, decimals: number = 0): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(decimals);
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  // 已过期或不存在
  if (shareInfo?.is_expired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">该分享链接已失效或已被取消</h1>
          <p className="text-sm text-slate-500">请联系分享者获取新的链接</p>
        </div>
      </div>
    );
  }

  // 需要提取码
  if (shareInfo?.need_passcode && !drawingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Lock className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-lg font-semibold text-slate-800 mb-1">请输入提取码</h1>
            <p className="text-sm text-slate-500 mb-6">该图纸需要提取码才能查看</p>
            <input
              type="text"
              value={passcode}
              onChange={(e) => { setPasscode(e.target.value.toUpperCase()); setPasscodeError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="请输入4位提取码"
              maxLength={4}
              className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 px-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all mb-3"
            />
            {passcodeError && (
              <p className="text-sm text-red-500 mb-3">{passcodeError}</p>
            )}
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {verifying ? '验证中...' : '确认查看'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 图纸预览
  if (!drawingData) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 顶部信息栏 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-800">{drawingData.file_name}</h1>
              <p className="text-xs text-slate-500">{drawingData.structure_type} · {drawingData.material}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {drawingData.allow_download && drawingData.dwg_file_path && (
              <button
                onClick={handleDownloadDwg}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                下载 DWG
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
        {/* 左侧预览区域 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden relative">
            {/* 水印遮罩 */}
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
              <div className="text-slate-300/40 text-2xl font-bold select-none -rotate-30 whitespace-nowrap">
                仅供外部预览 - 严禁外传
              </div>
            </div>
            {/* 预览图 */}
            {drawingData.preview_image ? (
              <div className="p-4 flex items-center justify-center ">
                <img
                  src={`http://localhost:3000${drawingData.preview_image}`}
                  alt={drawingData.file_name}
                  className=" object-contain"
                />
              </div>
            ) : (
              <div className="p-4 flex items-center justify-center min-h-[500px]">
                <div className="text-center text-slate-400">
                  <FileText className="w-16 h-16 mx-auto mb-3" />
                  <p>暂无预览图</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧技术参数 */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-600" />
              核心技术参数
            </h2>
            <div className="space-y-3">
              <ParamItem label="工作压力" value={`${safeNumber(drawingData.working_pressure, 2)} MPa`} />
              <ParamItem label="设计压力" value={`${safeNumber(drawingData.design_pressure, 2)} MPa`} />
              <ParamItem label="设计温度" value={`${safeNumber(drawingData.design_temperature)} ℃`} />
              <ParamItem label="容积" value={`${safeNumber(drawingData.volume, 2)} m³`} />
              <ParamItem label="公称直径" value={`${safeNumber(drawingData.nominal_diameter)} mm`} />
              <ParamItem label="壁厚" value={`${safeNumber(drawingData.wall_thickness, 1)} mm`} />
              <ParamItem label="设备总高/总长" value={`${safeNumber(drawingData.total_height_or_length)} mm`} />
              <ParamItem label="重量" value={`${drawingData.weight?.toLocaleString() ?? '-'} kg`} />
              <ParamItem label="介质" value={drawingData.medium || '-'} />
              <ParamItem label="设计使用年限" value={`${safeNumber(drawingData.design_life)} 年`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ParamItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}
