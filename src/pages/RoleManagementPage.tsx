import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Users, FileText, Eye, Download, Upload, Settings } from 'lucide-react';
import { Header } from '../components/Header';
import { Modal, ConfirmModal } from '../components/Modal';
import { api } from '../utils/api';

interface Permission {
  id: number;
  code: string;
  name: string;
  group: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  code: string;
  description: string;
  permission_count?: number;
  user_count?: number;
  permissions?: Permission[];
}

const permissionGroups = [
  { key: 'drawing', label: '图纸管理', icon: FileText },
  { key: 'user', label: '用户管理', icon: Users },
  { key: 'role', label: '角色管理', icon: Shield },
];

export function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    permission_ids: [] as number[],
  });
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'primary' | 'danger' | 'success';
  }>({ open: false, title: '', message: '', onConfirm: () => {}, type: 'primary' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get<Role[]>('/roles'),
        api.get<Permission[]>('/roles/permissions/all'),
      ]);
      if (rolesRes.code === 200) setRoles(rolesRes.data);
      if (permsRes.code === 200) setAllPermissions(permsRes.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async (roleId: number): Promise<Permission[]> => {
    try {
      const res = await api.get<{ role: Role; permissions: Permission[] }>(`/roles/${roleId}/permissions`);
      if (res.code === 200) return res.data.permissions;
    } catch {}
    return [];
  };

  const handleCreate = () => {
    setEditingRole(null);
    setForm({
      name: '',
      code: '',
      description: '',
      permission_ids: [],
    });
    setError('');
    setShowModal(true);
  };

  const handleEdit = async (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      code: role.code,
      description: role.description || '',
      permission_ids: [],
    });
    setError('');
    setShowModal(true);
    const perms = await fetchRolePermissions(role.id);
    setForm((prev) => ({ ...prev, permission_ids: perms.map((p) => p.id) }));
  };

  const handleDelete = (id: number, name: string) => {
    setConfirmModal({
      open: true,
      title: '删除角色',
      message: `确定要删除角色 "${name}" 吗？删除后该角色关联的用户将失去角色权限。`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await api.delete(`/roles/${id}`);
          if (res.code === 200) {
            fetchData();
          } else {
            setError(res.message);
          }
        } catch {}
      },
    });
  };

  const togglePermission = (permId: number) => {
    setForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter((id) => id !== permId)
        : [...prev.permission_ids, permId],
    }));
  };

  const toggleGroupPermissions = (groupKey: string) => {
    const groupPerms = allPermissions.filter((p) => p.code.startsWith(groupKey));
    const groupIds = groupPerms.map((p) => p.id);
    const allSelected = groupIds.every((id) => form.permission_ids.includes(id));

    setForm((prev) => ({
      ...prev,
      permission_ids: allSelected
        ? prev.permission_ids.filter((id) => !groupIds.includes(id))
        : [...new Set([...prev.permission_ids, ...groupIds])],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code) {
      setError('请填写角色名称和编码');
      return;
    }

    setError('');
    try {
      if (editingRole) {
        const infoRes = await api.put(`/roles/${editingRole.id}`, {
          name: form.name,
          code: form.code,
          description: form.description,
        });
        if (infoRes.code !== 200) {
          setError(infoRes.message);
          return;
        }
        const permRes = await api.put(`/roles/${editingRole.id}/permissions`, {
          permission_ids: form.permission_ids,
        });
        if (permRes.code !== 200) {
          setError(permRes.message);
          return;
        }
      } else {
        const createRes = await api.post('/roles', {
          name: form.name,
          code: form.code,
          description: form.description,
        });
        if (createRes.code !== 200) {
          setError(createRes.message);
          return;
        }
        const newRole = createRes.data as Role;
        if (form.permission_ids.length > 0 && newRole.id) {
          await api.put(`/roles/${newRole.id}/permissions`, {
            permission_ids: form.permission_ids,
          });
        }
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || '操作失败');
    }
  };

  const getRoleColor = (code: string) => {
    switch (code) {
      case 'super_admin':
        return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', iconBg: 'bg-purple-100', iconText: 'text-purple-600' };
      case 'admin':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconBg: 'bg-blue-100', iconText: 'text-blue-600' };
      case 'engineer':
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', iconBg: 'bg-green-100', iconText: 'text-green-600' };
      case 'designer':
        return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', iconBg: 'bg-orange-100', iconText: 'text-orange-600' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', iconBg: 'bg-slate-100', iconText: 'text-slate-600' };
    }
  };

  const getPermIcon = (code: string) => {
    if (code.includes('view')) return <Eye className="w-3.5 h-3.5" />;
    if (code.includes('create')) return <Plus className="w-3.5 h-3.5" />;
    if (code.includes('edit')) return <Edit2 className="w-3.5 h-3.5" />;
    if (code.includes('delete')) return <Trash2 className="w-3.5 h-3.5" />;
    if (code.includes('download') || code.includes('export')) return <Download className="w-3.5 h-3.5" />;
    if (code.includes('upload')) return <Upload className="w-3.5 h-3.5" />;
    if (code.includes('manage')) return <Settings className="w-3.5 h-3.5" />;
    return <Shield className="w-3.5 h-3.5" />;
  };

  const isSystemRole = (code: string) =>
    ['super_admin', 'admin', 'engineer', 'designer', 'viewer'].includes(code);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header onSearch={() => {}} onCreate={handleCreate} onBatchUpload={() => {}} />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-7 h-7 text-primary-600" />
                角色权限管理
              </h2>
              <p className="text-sm text-slate-500 mt-1">管理系统角色及其权限分配</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => {
                const colors = getRoleColor(role.code);
                const permCount = role.permission_count || 0;
                return (
                  <div
                    key={role.id}
                    className={`${colors.bg} border ${colors.border} rounded-xl p-5 transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
                          <Shield className={`w-6 h-6 ${colors.iconText}`} />
                        </div>
                        <div>
                          <h3 className={`font-semibold ${colors.text}`}>{role.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{role.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isSystemRole(role.code) && (
                          <>
                            <button
                              onClick={() => handleEdit(role)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-md transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(role.id, role.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white/60 rounded-md transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isSystemRole(role.code) && (
                          <span className="text-xs px-2 py-0.5 bg-white/60 text-slate-500 rounded-full font-medium">
                            系统角色
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-4 line-clamp-2 min-h-[2.5rem]">
                      {role.description || '暂无描述'}
                    </p>

                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-slate-500">
                        权限数量：<span className={`font-semibold ${colors.text}`}>{permCount}</span>
                      </span>
                      <span className="text-slate-500">
                        成员：<span className={`font-semibold ${colors.text}`}>{role.user_count || 0}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {allPermissions
                        .filter((p) => p.code.startsWith('drawing:'))
                        .slice(0, 4)
                        .map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 text-slate-600 rounded-md text-xs"
                          >
                            {getPermIcon(p.code)}
                            {p.name}
                          </span>
                        ))}
                      {permCount > 4 && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-white/70 text-slate-500 rounded-md text-xs">
                          +{Math.max(0, permCount - 4)}
                        </span>
                      )}
                    </div>

                    {!isSystemRole(role.code) && (
                      <button
                        onClick={() => handleEdit(role)}
                        className="w-full mt-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-white/60 rounded-lg transition-colors"
                      >
                        编辑权限
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingRole ? '编辑角色' : '新建角色'}
        size="xl"
        animation="scale"
        className="!p-0"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              {editingRole ? '保存修改' : '创建角色'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：项目管理员"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                角色编码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="例如：project_admin"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">角色描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="描述该角色的职责范围..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700">权限分配</label>
              <span className="text-xs text-slate-500">
                已选 {form.permission_ids.length} / {allPermissions.length}
              </span>
            </div>

            <div className="space-y-3 border border-slate-200 rounded-xl p-4 max-h-80 overflow-auto">
              {permissionGroups.map((group) => {
                const groupPerms = allPermissions.filter((p) => p.code.startsWith(group.key));
                const selectedCount = groupPerms.filter((p) => form.permission_ids.includes(p.id)).length;
                const allSelected = groupPerms.length > 0 && selectedCount === groupPerms.length;
                const someSelected = selectedCount > 0 && selectedCount < groupPerms.length;
                const GroupIcon = group.icon;

                return (
                  <div key={group.key} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={() => toggleGroupPermissions(group.key)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <GroupIcon className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-700 text-sm">{group.label}</span>
                        <span className="text-xs text-slate-400">
                          ({selectedCount}/{groupPerms.length})
                        </span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      {groupPerms.map((perm) => (
                        <label
                          key={perm.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            form.permission_ids.includes(perm.id)
                              ? 'bg-primary-50 border border-primary-200'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={form.permission_ids.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="w-3.5 h-3.5 text-primary-600 rounded"
                          />
                          <span className="text-slate-500">{getPermIcon(perm.code)}</span>
                          <span className="text-sm text-slate-700">{perm.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
