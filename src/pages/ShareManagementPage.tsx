import { useState, useEffect } from 'react';
import { Share2, Edit2, Trash2, Copy, Check, ExternalLink, Link2, Lock, Clock, Download } from 'lucide-react';
import { Header } from '../components/Header';
import { Modal, ConfirmModal } from '../components/Modal';
import { api } from '../utils/api';

interface ShareRecord {
  id: string;
  drawing_id: string;
  token: string;
  passcode: string | null;
  type: string;
  allow_download: boolean;
  expire_at: string | null;
  created_by: string;
  created_at: string;
  drawing_name: string;
  material_code: string;
}

export function ShareManagementPage() {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShare, setEditingShare] = useState<ShareRecord | null>(null);
  const [editForm, setEditForm] = useState({
    expire_days: 0,
    allow_download: false,
    need_passcode: false,
    passcode: '',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'primary' | 'danger' | 'success';
  }>({ open: false, title: '', message: '', onConfirm: () => {}, type: 'primary' });

  useEffect(() => {
    fetchShares();
  }, [typeFilter, page]);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }
      const res = await api.get<{ list: ShareRecord[]; total: number }>(`/shares/list?${params}`);
      if (res.code === 200) {
        setShares(res.data.list);
        setTotal(res.data.total);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (share: ShareRecord) => {
    setEditingShare(share);
    setEditForm({
      expire_days: share.expire_at ? Math.ceil((new Date(share.expire_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      allow_download: share.allow_download,
      need_passcode: !!share.passcode,
      passcode: share.passcode || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingShare) return;
    try {
      const res = await api.put(`/shares/${editingShare.id}`, {
        expire_days: editForm.expire_days,
        allow_download: editForm.allow_download,
        need_passcode: editForm.need_passcode,
        passcode: editForm.passcode,
      });
      if (res.code === 200) {
        setShowEditModal(false);
        fetchShares();
      }
    } catch {}
  };

  const handleDelete = (share: ShareRecord) => {
    setConfirmModal({
      open: true,
      title: '删除分享链接',
      message: `确定要删除分享链接 "${share.drawing_name}" 吗？删除后该链接将无法访问。`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await api.delete(`/shares/${share.id}`);
          if (res.code === 200) {
            fetchShares();
          }
        } catch {}
      },
    });
  };

  const handleCopyLink = async (share: ShareRecord) => {
    const url = `${window.location.origin}/#/share/${share.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyPasscode = async (passcode: string, id: string) => {
    try {
      await navigator.clipboard.writeText(passcode);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const isExpired = (expireAt: string | null) => {
    if (!expireAt) return false;
    return new Date(expireAt) < new Date();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header onSearch={() => {}} onCreate={() => {}} onBatchUpload={() => {}} />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Share2 className="w-7 h-7 text-primary-600" />
                分享管理
              </h2>
              <p className="text-sm text-slate-500 mt-1">管理图纸分享链接</p>
            </div>
          </div>

          {/* 类型筛选 */}
          <div className="flex items-center gap-2 mb-4">
            {(['all', 'internal', 'external'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t === 'all' ? '全部' : t === 'internal' ? '内部分享' : '外部分享'}
              </button>
            ))}
            <span className="text-sm text-slate-500 ml-4">共 {total} 条记录</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无分享记录</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">图纸名称</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">类型</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">提取码</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">允许下载</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">过期时间</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">创建时间</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((share) => (
                    <tr key={share.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]" title={share.drawing_name}>
                            {share.drawing_name}
                          </p>
                          {share.material_code && (
                            <p className="text-xs text-slate-400">{share.material_code}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          share.type === 'internal'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {share.type === 'internal' ? <Link2 className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                          {share.type === 'internal' ? '内部' : '外部'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {share.passcode ? (
                          <button
                            onClick={() => handleCopyPasscode(share.passcode!, share.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs font-mono text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            {copiedId === share.id ? <Check className="w-3 h-3 text-green-600" /> : <Lock className="w-3 h-3" />}
                            {share.passcode}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">无</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {share.allow_download ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Download className="w-3 h-3" /> 是
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">否</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {share.expire_at ? (
                          <span className={`inline-flex items-center gap-1 text-xs ${
                            isExpired(share.expire_at) ? 'text-red-600' : 'text-slate-600'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {isExpired(share.expire_at) ? '已过期' : new Date(share.expire_at).toLocaleDateString('zh-CN')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">永不过期</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">
                          {new Date(share.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleCopyLink(share)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                            title="复制链接"
                          >
                            {copiedId === share.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEdit(share)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(share)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <span className="text-sm text-slate-500">
                    第 {page} 页，共 {totalPages} 页
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 编辑分享弹窗 */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑分享链接"
        size="md"
        animation="scale"
        footer={
          <>
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              保存
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">图纸名称</p>
            <p className="text-sm font-medium text-slate-800">{editingShare?.drawing_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">过期天数</label>
            <input
              type="number"
              min={0}
              value={editForm.expire_days}
              onChange={(e) => setEditForm({ ...editForm, expire_days: parseInt(e.target.value) || 0 })}
              placeholder="0 表示永不过期"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">0 表示永不过期</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.allow_download}
                onChange={(e) => setEditForm({ ...editForm, allow_download: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-slate-700">允许下载</span>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={editForm.need_passcode}
                onChange={(e) => setEditForm({ ...editForm, need_passcode: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-slate-700">需要提取码</span>
            </label>
            {editForm.need_passcode && (
              <input
                type="text"
                maxLength={4}
                value={editForm.passcode}
                onChange={(e) => setEditForm({ ...editForm, passcode: e.target.value.toUpperCase() })}
                placeholder="4位提取码（留空自动生成）"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            )}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmType={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
