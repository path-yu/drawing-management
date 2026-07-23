import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Upload,
  Bell,
  User,
  FileText,
  ChevronDown,
  LogOut,
  Settings,
  Users,
  Shield,
  LayoutDashboard,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { PermissionGuard } from './PermissionGuard';

interface HeaderProps {
  onSearch: (keyword: string) => void;
  onCreate?: () => void;
  onBatchUpload?: () => void;
}

export function Header({ onSearch, onCreate, onBatchUpload }: HeaderProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchKeyword);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: '图纸管理', path: '/', icon: LayoutDashboard },
    { label: '用户管理', path: '/users', icon: Users, permission: 'user:manage' },
    { label: '角色权限', path: '/roles', icon: Shield, permission: 'role:manage' },
  ];

  const isDashboard = location.pathname === '/';
  const isUserPage = location.pathname === '/users';
  const isRolePage = location.pathname === '/roles';

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-40 dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">压力容器方案简图管理平台</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Vessel Drawing Management System</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const content = (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
              if (item.permission) {
                return (
                  <PermissionGuard key={item.path} permission={item.permission}>
                    {content}
                  </PermissionGuard>
                );
              }
              return content;
            })}
          </nav>

          <div className="relative ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索物料编码、图号、备注..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleSearch}
              className="w-72 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isDashboard && (
            <>
              <PermissionGuard permission="drawing:create">
                <button
                  onClick={onCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  新建图纸
                </button>
              </PermissionGuard>

              <PermissionGuard permission="drawing:create">
                <button
                  onClick={onBatchUpload}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  <Upload className="w-4 h-4" />
                  批量上传
                </button>
              </PermissionGuard>
            </>
          )}

          {isUserPage && (
            <PermissionGuard permission="user:create">
              <button
                onClick={onCreate}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                新建用户
              </button>
            </PermissionGuard>
          )}

          {isRolePage && (
            <PermissionGuard permission="role:create">
              <button
                onClick={onCreate}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                新建角色
              </button>
            </PermissionGuard>
          )}

          <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-slate-700">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
            title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="relative pl-4 border-l border-slate-200 dark:border-slate-700" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 -m-1.5 rounded-lg transition-colors dark:hover:bg-slate-700"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center dark:bg-primary-900/30">
                <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800 text-sm dark:text-slate-100">
                  {user?.real_name || user?.username || '用户'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role_name || '未分配角色'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''} dark:text-slate-500`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 dark:bg-slate-800 dark:border-slate-700">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="font-semibold text-slate-800 text-sm dark:text-slate-100">
                    {user?.real_name || user?.username}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || user?.username}</p>
                </div>

                <div className="py-1">
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-300 dark:hover:bg-slate-700">
                    <User className="w-4 h-4 text-slate-400" />
                    个人资料
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-300 dark:hover:bg-slate-700">
                    <Settings className="w-4 h-4 text-slate-400" />
                    账号设置
                  </button>
                </div>

                <div className="border-t border-slate-100 py-1 dark:border-slate-700">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
