import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { config } from './config';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import drawingRoutes from './routes/drawingRoutes';
import vesselLogsRoutes from './routes/vesselLogsRoutes';
import shareRoutes from './routes/shareRoutes';
import { success, fail } from './utils/response';
// 启动时自动初始化数据库（如果表不存在）
import './scripts/initDb';
import iconv from 'iconv-lite';
// PDF预览工具模块尚未实现，暂时注释导入
import { analyzePDFWithDeepSeek, extractTextFromPDF, generatePDFPreview } from './services/drawingService';

//文件上传
import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

// -----------------------------------------------------------------------------
// 1. 类型定义 (Type Definitions)
// -----------------------------------------------------------------------------
/** 统一 API 响应格式结构 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

/** 文件上传成功后的响应 Data 类型 */
export interface UploadResultDTO {
  filename: string;
  path: string;
  size: number;
}


const app: express.Application = express();
const PORT: number = Number(process.env.PORT) || 3000;
// -----------------------------------------------------------------------------
// 2. Multer 存储引擎配置
// -----------------------------------------------------------------------------

const storage: StorageEngine = multer.diskStorage({
  destination: (
    _req,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    // 1. 获取文件扩展名 (统一转为小写，如 ".pdf", ".dwg")
    const ext = path.extname(file.originalname).toLowerCase();
    // 2. 根据后缀名动态匹配目标目录
    let subDir = 'OTHERS'; // 默认/兜底目录

    if (ext === '.pdf') {
      subDir = 'pdf';
    } else if (ext === '.dwg') {
      subDir = 'dwg';
    } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      subDir = 'previews';
    }

    // 3. 拼接最终的绝对保存路径 (例如：process.cwd()/uploads/PDF)
    const targetDir = path.join(process.cwd(), 'uploads', subDir);
    // 推荐使用相对于运行目录 (cwd) 的路径，适应 Docker 和各种打包环境
    
    // 递归确保上传目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },

  filename: (
    _req,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    try {
      // 解决 LISP / Windows 命令行上传中文文件名可能产生的 latin1 乱码
      const originalName: string = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, originalName);
    } catch {
      // 容错兜底：若转换失败则回退至原始文件名
      cb(null, file.originalname);
    }
  }
});

// 初始化 Multer 中间件
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 限制 50MB
  }
});

// -----------------------------------------------------------------------------
// 3. Express 应用及路由配置
// -----------------------------------------------------------------------------

// 全局 JSON 中间件 (如需解析其他非文件 Form 字段)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * POST /api/v1/upload
 * 接收来自 CAD / LISP / Curl 等客户端的文件上传
 */
app.post(
  '/api/v1/upload',
  upload.single('file'),
  (req: express.Request, res: express.Response): void => {
    try {
      // 验证是否包含上传文件
      if (!req.file) {
        res.status(400).json({
          code: 400,
          message: '上传失败，未接收到文件数据！'
        });
        return;
      }

      const { originalname, path: filePath, size, filename } = req.file;

      console.log('--- [CAD LISP 文件上传] ---');
      console.log('文件原名:', originalname);
      console.log('保存路径:', filePath);
      console.log('文件大小:', `${(size / 1024).toFixed(2)} KB`);

      // 规范化路径分隔符 (转为 POSIX 标准正斜杠)
      const normalizedPath: string = filePath.replace(/\\/g, '/');

      res.status(200).json({
        code: 200,
        message: '文件上传成功！',
        data: {
          filename,
          path: normalizedPath,
          size
        }
      });
    } catch (error) {
      console.error('上传文件处理异常:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }
);

/**
 * POST /api/v1/upload-raw
 * 接收来自 AutoLISP UploadFileBinary 的原始二进制流
 */
app.post('/api/v1/upload-raw', (req: express.Request, res: express.Response): void => {
  try {
    let rawFileName = req.headers['x-file-name'] as string;
    
    if (!rawFileName) {
      res.status(400).json({ code: 400, message: '缺少文件名 Header' });
      return;
    }

// 将 header 字符串当作 latin1 转换成字节，再用 GBK 格式解码
    const rawHeader = req.headers['x-file-name'] as string;
    const bytes = Buffer.from(rawHeader, 'binary'); // 或者 'latin1'
    const fileName = iconv.decode(bytes, 'gbk'); 


    const ext = path.extname(fileName).toLowerCase();
    let subDir = 'OTHERS';
    if (ext === '.pdf') subDir = 'PDF';
    else if (ext === '.dwg') subDir = 'DWG';

    const uploadDir = path.join(process.cwd(), 'uploads', subDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savePath = path.join(uploadDir, fileName);
    const writeStream = fs.createWriteStream(savePath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.status(200).json({ code: 200, message: '上传成功', path: savePath });
    });

  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});


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
// 静态文件服务 - 支持预览与强制下载
app.use('/uploads', (req, res, next) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const isDownload = url.searchParams.get('download') === '1' || url.searchParams.get('download') === 'true';

  if (isDownload) {
    res.setHeader('Content-Disposition', 'attachment');
  } else {
    res.setHeader('Content-Disposition', 'inline');
  }
  next();
}, express.static(path.join(__dirname, '../uploads')));


// 健康检查
app.get('/api/health', (req, res) => {
  res.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});
app.get('/test', async(req, res) => {
  let pdfPath = 'D:\\GitCode\\drawing-management\\server\\uploads\\PDF\\CQG20-0.88（DN300JC）.pdf';
  try {
    const textContent = await extractTextFromPDF(pdfPath);
    console.log(textContent);
    
    //调用DeepSeek API解析
    const parsedData = await analyzePDFWithDeepSeek(textContent, pdfPath);
    console.log(parsedData);
    
  res.json(success(null, '测试成功'));
  } catch (error: any) {
    console.error('测试失败:', error);
    res.status(500).json(fail(`测试失败: ${error.message}`));
  }
})
// 路由挂载
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/drawings', drawingRoutes);
app.use('/api/v1/logs', vesselLogsRoutes);
app.use('/api/v1/shares', shareRoutes);

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
