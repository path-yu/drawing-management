# Vessel Drawing Management System

An industrial-grade pressure vessel drawing management platform built with React + Node.js, supporting multi-condition search, permission management, and role configuration.

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router v6

### Backend
- **Framework**: Node.js + Express + TypeScript
- **Database**: JSON file storage (cross-platform compatible)
- **Authentication**: JWT (JSON Web Token)
- **Password Encryption**: bcryptjs
- **Authorization**: RBAC (Role-Based Access Control)

## Features

- 🔐 **User Authentication** - Login/registration with JWT token auth
- 👥 **User Management** - CRUD operations, enable/disable, role assignment
- 🎭 **Role Permissions** - RBAC system with 5 preset roles and 14 permissions
- 📋 **Drawing Management** - Multi-condition range search, card/list/split views
- 🔍 **Multi-dimensional Filtering** - Filter by structure type, volume, pressure, diameter, etc.
- 🖼️ **Drawing Preview** - SVG visualization, parameter panel, version history
- 🎬 **Modal Animations** - Unified Modal component with 4 transition animations
- 🌙 **Dark Mode** - Full dark mode support with theme persistence

## Project Structure

```
vessel-drawing-management/
├── src/                          # Frontend source
│   ├── components/               # Shared components
│   │   ├── Modal.tsx             # Generic modal (with transitions)
│   │   ├── DrawingPreviewModal.tsx  # Drawing preview modal
│   │   ├── Header.tsx            # Top navigation bar
│   │   ├── FilterSidebar.tsx     # Filter sidebar
│   │   ├── DrawingCard.tsx       # Drawing card
│   │   ├── DataTable.tsx         # Data table
│   │   ├── ProtectedRoute.tsx    # Route permission guard
│   │   └── PermissionGuard.tsx   # Component permission guard
│   ├── pages/                    # Page components
│   │   ├── LoginPage.tsx         # Login page
│   │   ├── RegisterPage.tsx      # Registration page
│   │   ├── DashboardPage.tsx     # Drawing management home
│   │   ├── UserManagementPage.tsx    # User management
│   │   └── RoleManagementPage.tsx    # Role permission management
│   ├── context/                  # React Context
│   │   ├── AuthContext.tsx       # Authentication context
│   │   └── ThemeContext.tsx      # Theme context
│   ├── utils/                    # Utility functions
│   │   └── api.ts                # API request wrapper
│   ├── types/                    # TypeScript types
│   └── App.tsx                   # App entry
├── server/                       # Backend source
│   ├── src/
│   │   ├── config/               # Configuration
│   │   ├── database/             # Database operations
│   │   ├── middleware/           # Middleware (auth/permissions)
│   │   ├── routes/               # Routes
│   │   ├── scripts/              # Initialization scripts
│   │   └── index.ts              # Entry file
│   └── data/                     # JSON data files
├── .gitignore
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Quick Start

### Prerequisites
- Node.js >= 16.x
- npm >= 8.x

### Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install
```

### Start Development Environment

```bash
# 1. Start backend server (port 3000)
cd server
npm run dev

# 2. Start frontend dev server (port 5173)
# Open a new terminal
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Default Account

| Role | Username | Password |
|------|----------|----------|
| Super Admin | admin | admin123 |

## Permission System

### Preset Roles

| Role Code | Role Name | Description |
|-----------|-----------|-------------|
| super_admin | Super Admin | Full permissions, cannot be deleted |
| admin | Admin | Drawing management + user management + role management |
| engineer | Engineer | Drawing management (no delete) |
| designer | Designer | Drawing view + edit + upload |
| viewer | Viewer | Drawing view only |

### Permission List

| Permission Code | Permission Name | Group |
|-----------------|-----------------|-------|
| drawing:view | View Drawings | Drawing Management |
| drawing:create | Create Drawing | Drawing Management |
| drawing:edit | Edit Drawing | Drawing Management |
| drawing:delete | Delete Drawing | Drawing Management |
| drawing:upload | Upload Drawing | Drawing Management |
| drawing:download | Download Drawing | Drawing Management |
| drawing:export | Export Drawing | Drawing Management |
| user:view | View Users | User Management |
| user:create | Create User | User Management |
| user:edit | Edit User | User Management |
| user:delete | Delete User | User Management |
| role:view | View Roles | Role Management |
| role:create | Create Role | Role Management |
| role:manage | Manage Role Permissions | Role Management |

## Modal Component Usage

### Basic Usage

```tsx
import { Modal } from './components/Modal';

<Modal
  open={showModal}
  onClose={() => setShowModal(false)}
  title="Modal Title"
  size="md"
  animation="scale"
  footer={
    <>
      <button onClick={handleClose}>Cancel</button>
      <button onClick={handleConfirm}>Confirm</button>
    </>
  }
>
  Modal content
</Modal>
```

### Props

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| open | boolean | - | Whether to show |
| onClose | function | - | Close callback |
| title | ReactNode | - | Title |
| size | 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full' | 'md' | Size |
| animation | 'fade' \| 'scale' \| 'slide-up' \| 'slide-down' | 'scale' | Animation type |
| closeOnOverlayClick | boolean | true | Close on overlay click |
| closeOnEsc | boolean | true | Close on ESC key |
| showCloseButton | boolean | true | Show close button |
| footer | ReactNode | - | Footer action area |
| className | string | - | Custom class name |

### Confirm Modal

```tsx
import { ConfirmModal } from './components/Modal';

<ConfirmModal
  open={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirm Action"
  message="Are you sure you want to perform this action?"
  confirmText="Confirm"
  cancelText="Cancel"
  confirmType="danger"  // primary | danger | success
  onConfirm={handleConfirm}
/>
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register
- `GET /api/v1/auth/me` - Get current user info

### User Management
- `GET /api/v1/users` - User list
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Role Management
- `GET /api/v1/roles` - Role list
- `GET /api/v1/roles/permissions/all` - All permissions
- `GET /api/v1/roles/:id/permissions` - Role permissions
- `POST /api/v1/roles` - Create role
- `PUT /api/v1/roles/:id` - Update role
- `PUT /api/v1/roles/:id/permissions` - Assign permissions
- `DELETE /api/v1/roles/:id` - Delete role

### Drawing Management
- `POST /api/v1/drawings/search` - Search drawings
- `GET /api/v1/drawings/:id` - Drawing details
- `POST /api/v1/drawings` - Create drawing
- `PUT /api/v1/drawings/:id` - Update drawing
- `DELETE /api/v1/drawings/:id` - Delete drawing

## License

MIT
