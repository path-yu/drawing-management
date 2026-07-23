import { useState, useEffect } from 'react';
import { Users, Search, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { Header } from '../components/Header';
import { Modal, ConfirmModal } from '../components/Modal';
import { api } from '../utils/api';

interface UserItem {
  id: number;
  username: string;
  real_name: string | null;
  email: string | null;
  phone: string | null;
  role_id: number | null;
  role_name: string | null;
  role_code: string | null;
  status: number;
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  code: string;
}

interface UserListResponse {
  total: number;
  list: UserItem[];
  page: number;
  page_size: number;
}

export function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    real_name: '',
    email: '',
    phone: '',
    role_id: '',
    status: 1,
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
    fetchUsers();
    fetchRoles();
  }, [searchKeyword]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.append('keyword', searchKeyword);
      params.append('page_size', '100');
      const res = await api.get<UserListResponse>(`/users?${params.toString()}`);
      if (res.code === 200) {
        setUsers(res.data.list);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get<Role[]>('/roles');
      if (res.code === 200) {
        setRoles(res.data);
      }
    } catch {}
  };

  const handleCreate = () => {
    setEditingUser(null);
    setForm({
      username: '',
      password: '',
      real_name: '',
      email: '',
      phone: '',
      role_id: '',
      status: 1,
    });
    setError('');
    setShowModal(true);
  };

  const handleEdit = (user: UserItem) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: '',
      real_name: user.real_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role_id: user.role_id ? String(user.role_id) : '',
      status: user.status,
    });
    setError('');
    setShowModal(true);
  };

  const handleToggleStatus = (user: UserItem) => {
    setConfirmModal({
      open: true,
      title: user.status === 1 ? '禁用用户' : '启用用户',
      message: `确定要${user.status === 1 ? '禁用' : '启用'}用户 "${user.real_name || user.username}" 吗？`,
      type: 'primary',
      onConfirm: async () => {
        try {
          const res = await api.put(`/users/${user.id}`, { status: user.status === 1 ? 0 : 1 });
          if (res.code === 200) {
            fetchUsers();
          }
        } catch {}
      },
    });
  };

  const handleDelete = (id: number, name: string) => {
    setConfirmModal({
      open: true,
      title: '删除用户',
      message: `确定要删除用户 "${name}" 吗？此操作不可恢复。`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await api.delete(`/users/${id}`);
          if (res.code === 200) {
            fetchUsers();
          }
        } catch {}
      },
    });
  };

  const handleSubmit = async () => {
    if (!form.username) {
      setError('请输入用户名');
      return;
    }
    if (!editingUser && !form.password) {
      setError('请设置密码');
      return;
    }
    if (form.password && form.password.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }

    setError('');
    try {
      const payload: any = {
        username: form.username,
        real_name: form.real_name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role_id: form.role_id ? parseInt(form.role_id) : null,
        status: form.status,
      };
      if (form.password) {
        payload.password = form.password;
      }

      let res;
      if (editingUser) {
        res = await api.put(`/users/${editingUser.id}`, payload);
      } else {
        res = await api.post('/users', payload);
      }

      if (res.code === 200) {
        setShowModal(false);
        fetchUsers();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    }
  };

  const getRoleBadgeClass = (code?: string | null) => {
    switch (code) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'engineer':
        return 'bg-green-100 text-green-700';
      case 'designer':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header onSearch={() => {}} onCreate={handleCreate} onBatchUpload={() => {}} />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-7 h-7 text-primary-600" />
                用户管理
              </h2>
              <p className="text-sm text-slate-500 mt-1">管理系统用户及其角色权限</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索用户名、姓名、邮箱..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      邮箱
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      手机
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <div className="animate-spin w-6 h-6 border-3 border-primary-200 border-t-primary-600 rounded-full mx-auto"></div>
                        <p className="mt-2 text-sm">加载中...</p>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>暂无用户数据</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-700">
                                {(user.real_name || user.username).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">
                                {user.real_name || user.username}
                              </p>
                              <p className="text-xs text-slate-500">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(
                              user.role_code
                            )}`}
                          >
                            {user.role_name || '未分配'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{user.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{user.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.status === 1
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.status === 1 ? 'bg-green-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            {user.status === 1 ? '正常' : '禁用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title={user.status === 1 ? '禁用' : '启用'}
                            >
                              {user.status === 1 ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user.role_code !== 'super_admin' && (
                              <button
                                onClick={() => handleDelete(user.id, user.real_name || user.username)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? '编辑用户' : '新建用户'}
        size="lg"
        animation="slide-up"
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
              {editingUser ? '保存修改' : '创建用户'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
               密码 {editingUser && <span className="text-xs text-slate-400 font-normal">（不修改留空）</span>}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="不少于6位"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">真实姓名</label>
              <input
                type="text"
                value={form.real_name}
                onChange={(e) => setForm({ ...form, real_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">角色</label>
              <select
                value={form.role_id}
                onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
              >
                <option value="">未分配</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">手机号</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === 1}
                  onChange={() => setForm({ ...form, status: 1 })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-slate-700">启用</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === 0}
                  onChange={() => setForm({ ...form, status: 0 })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-slate-700">禁用</span>
              </label>
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
