# 压力容器方案简图管理系统

基于 React + Node.js 的工业级压力容器图纸管理平台，支持多条件检索、权限管理、角色配置等功能。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **路由**: React Router v6

### 后端
- **框架**: Node.js + Express + TypeScript
- **数据库**: JSON 文件存储（跨平台兼容）
- **认证**: JWT (JSON Web Token)
- **密码加密**: bcryptjs
- **权限**: RBAC (基于角色的访问控制)

## 功能特性

- 🔐 **用户认证** - 登录/注册，JWT Token 鉴权
- 👥 **用户管理** - 用户增删改查，启用/禁用，角色分配
- 🎭 **角色权限** - RBAC 权限系统，5 个预设角色，14 项权限
- 📋 **图纸管理** - 多条件范围检索，卡片/列表/分屏视图
- 🔍 **多维筛选** - 结构形式、容积、压力、直径等参数筛选
- 🖼️ **图纸预览** - SVG 可视化预览，参数面板，版本记录
- 🎬 **弹窗动画** - 统一的 Modal 组件，支持 4 种过渡动画

## 项目结构

```
图纸管理/
├── src/                          # 前端源码
│   ├── components/               # 公共组件
│   │   ├── Modal.tsx             # 通用弹窗组件（含过渡动画）
│   │   ├── DrawingPreviewModal.tsx  # 图纸预览弹窗
│   │   ├── Header.tsx            # 顶部导航
│   │   ├── FilterSidebar.tsx     # 筛选侧边栏
│   │   ├── DrawingCard.tsx       # 图纸卡片
│   │   ├── DataTable.tsx         # 数据表格
│   │   ├── ProtectedRoute.tsx    # 路由权限保护
│   │   └── PermissionGuard.tsx   # 组件权限守卫
│   ├── pages/                    # 页面组件
│   │   ├── LoginPage.tsx         # 登录页
│   │   ├── RegisterPage.tsx      # 注册页
│   │   ├── DashboardPage.tsx     # 图纸管理主页
│   │   ├── UserManagementPage.tsx    # 用户管理
│   │   └── RoleManagementPage.tsx    # 角色权限管理
│   ├── context/                  # React Context
│   │   └── AuthContext.tsx       # 认证上下文
│   ├── utils/                    # 工具函数
│   │   └── api.ts                # API 请求封装
│   ├── types/                    # TypeScript 类型
│   └── App.tsx                   # 应用入口
├── server/                       # 后端源码
│   ├── src/
│   │   ├── config/               # 配置
│   │   ├── database/             # 数据库操作
│   │   ├── middleware/           # 中间件（认证/权限）
│   │   ├── routes/               # 路由
│   │   ├── scripts/              # 初始化脚本
│   │   └── index.ts              # 入口文件
│   └── data/                     # JSON 数据文件
├── .gitignore
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 快速开始

### 环境要求
- Node.js >= 16.x
- npm >= 8.x

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server && npm install
```

### 启动开发环境

```bash
# 1. 启动后端服务 (端口 3000)
cd server
npm run dev

# 2. 启动前端开发服务器 (端口 5173)
# 新开一个终端
npm run dev
```

- 前端地址: http://localhost:5173
- 后端地址: http://localhost:3000

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | admin | admin123 |

## 权限系统

### 预设角色

| 角色编码 | 角色名称 | 说明 |
|---------|---------|------|
| super_admin | 超级管理员 | 拥有所有权限，不可删除 |
| admin | 管理员 | 图纸管理 + 用户管理 + 角色管理 |
| engineer | 工程师 | 图纸管理（不含删除） |
| designer | 设计师 | 图纸查看 + 编辑 + 上传 |
| viewer | 访客 | 仅图纸查看权限 |

### 权限列表

| 权限编码 | 权限名称 | 分组 |
|---------|---------|------|
| drawing:view | 图纸查看 | 图纸管理 |
| drawing:create | 图纸创建 | 图纸管理 |
| drawing:edit | 图纸编辑 | 图纸管理 |
| drawing:delete | 图纸删除 | 图纸管理 |
| drawing:upload | 图纸上传 | 图纸管理 |
| drawing:download | 图纸下载 | 图纸管理 |
| drawing:export | 图纸导出 | 图纸管理 |
| user:view | 用户查看 | 用户管理 |
| user:create | 用户创建 | 用户管理 |
| user:edit | 用户编辑 | 用户管理 |
| user:delete | 用户删除 | 用户管理 |
| role:view | 角色查看 | 角色管理 |
| role:create | 角色创建 | 角色管理 |
| role:manage | 角色权限管理 | 角色管理 |

## Modal 组件使用

### 基础用法

```tsx
import { Modal } from './components/Modal';

<Modal
  open={showModal}
  onClose={() => setShowModal(false)}
  title="弹窗标题"
  size="md"
  animation="scale"
  footer={
    <>
      <button onClick={handleClose}>取消</button>
      <button onClick={handleConfirm}>确定</button>
    </>
  }
>
  弹窗内容
</Modal>
```

### Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| open | boolean | - | 是否显示 |
| onClose | function | - | 关闭回调 |
| title | ReactNode | - | 标题 |
| size | 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full' | 'md' | 尺寸 |
| animation | 'fade' \| 'scale' \| 'slide-up' \| 'slide-down' | 'scale' | 动画类型 |
| closeOnOverlayClick | boolean | true | 点击遮罩关闭 |
| closeOnEsc | boolean | true | ESC 键关闭 |
| showCloseButton | boolean | true | 显示关闭按钮 |
| footer | ReactNode | - | 底部操作区 |
| className | string | - | 自定义类名 |

### 确认弹窗

```tsx
import { ConfirmModal } from './components/Modal';

<ConfirmModal
  open={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="确认操作"
  message="确定要执行此操作吗？"
  confirmText="确认"
  cancelText="取消"
  confirmType="danger"  // primary | danger | success
  onConfirm={handleConfirm}
/>
```

## API 接口

### 认证接口
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/register` - 注册
- `GET /api/v1/auth/me` - 获取当前用户信息

### 用户管理
- `GET /api/v1/users` - 用户列表
- `POST /api/v1/users` - 创建用户
- `PUT /api/v1/users/:id` - 更新用户
- `DELETE /api/v1/users/:id` - 删除用户

### 角色管理
- `GET /api/v1/roles` - 角色列表
- `GET /api/v1/roles/permissions/all` - 所有权限
- `GET /api/v1/roles/:id/permissions` - 角色权限
- `POST /api/v1/roles` - 创建角色
- `PUT /api/v1/roles/:id` - 更新角色
- `PUT /api/v1/roles/:id/permissions` - 分配权限
- `DELETE /api/v1/roles/:id` - 删除角色

### 图纸管理
- `POST /api/v1/drawings/search` - 图纸搜索
- `GET /api/v1/drawings/:id` - 图纸详情
- `POST /api/v1/drawings` - 创建图纸
- `PUT /api/v1/drawings/:id` - 更新图纸
- `DELETE /api/v1/drawings/:id` - 删除图纸

## License

MIT
