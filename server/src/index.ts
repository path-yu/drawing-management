import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import drawingRoutes from './routes/drawingRoutes';
import { success, fail } from './utils/response';
// 启动时自动初始化数据库（如果表不存在）
import './scripts/initDb';
const app = express();

// 中间件
app.use(cors({
  origin: (origin, callback) => {
  // 允许任何来源的请求
       callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// 静态文件服务 - 预览图和上传文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// 健康检查
app.get('/api/health', (req, res) => {
  res.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});

// 路由挂载
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/drawings', drawingRoutes);

// 404
app.use((req, res) => {
  res.status(404).json(fail('接口不存在', 404));
});

// 全局错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('未捕获错误:', err);
  res.status(500).json(fail('服务器内部错误', 500));
});

app.listen(config.port, () => {
  console.log(`\n========================================`);
  console.log(`  压力容器方案简图管理系统 - 后端服务`);
  console.log(`========================================`);
  console.log(`  服务地址: http://localhost:${config.port}`);
  console.log(`  API 文档: http://localhost:${config.port}/api/health`);
  console.log(`  数据库: ${config.dbPath}`);
  console.log(`========================================\n`);
});

export default app;
