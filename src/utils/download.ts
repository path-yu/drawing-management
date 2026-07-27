interface DownloadOptions {
  /** 文件名（包含后缀，例如 'data.xlsx', 'image.png'） */
  filename?: string;
  /** 当请求远程 URL 时，是否使用 fetch 转为 Blob 下载（默认 true，强行触发下载） */
  useFetch?: boolean;
}

/**
 * 通用文件下载函数
 * @param source 下载源：支持 URL 字符串、Blob/File 对象
 * @param options 下载配置选项
 */
export async function downloadFile(
  source: string | Blob | File,
  options: DownloadOptions = {}
): Promise<void> {
  const { filename, useFetch = true } = options;

  let url = '';
  let needRevoke = false;

  try {
    // 1. 处理 Blob 或 File 对象
    if (typeof source === 'object' && source instanceof Blob) {
      url = URL.createObjectURL(source);
      needRevoke = true;
    }
    // 2. 处理 URL 字符串
    else if (typeof source === 'string') {
      if (source.startsWith('data:') || source.startsWith('blob:')) {
        url = source;
      }
      else if (useFetch && (source.startsWith('http://') || source.startsWith('https://'))) {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`下载失败，HTTP 状态码: ${response.status}`);
        }
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
        needRevoke = true;
      }
      else {
        url = source;
      }
    } else {
      throw new Error('不支持的下载源格式！');
    }

    // 3. 创建隐藏的 a 标签触发下载
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';

    // 💡 防止全局路由拦截（阻止点击事件冒泡到 window/body）
    a.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // 尝试提取或设置文件名
    if (filename) {
      a.download = filename;
    } else if (typeof source === 'object' && source instanceof File) {
      a.download = source.name;
    } else if (typeof source === 'string' && !source.startsWith('data:')) {
      const urlFileName = source.split('/').pop()?.split('?')[0];
      if (urlFileName) a.download = urlFileName;
    }

    // 4. 将 a 标签挂载到 DOM 并模拟点击
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  } catch (error) {
    console.error('[Download Failure]:', error);
    throw error;
  } finally {
    // 5. 延迟释放内存
    if (needRevoke && url) {
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  }
}