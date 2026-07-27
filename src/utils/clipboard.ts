/**
 * 复制文本到剪贴板（兼容 HTTPS/HTTP 环境及各类现代/老旧浏览器）
 * @param text 需要复制的文本内容
 * @returns Promise<boolean> 返回复制是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. 优先尝试现代 Clipboard API（仅在 HTTPS 或 localhost 环境下可用）
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API 复制失败，尝试降级方案...', err);
    }
  }

  // 2. 降级方案：HTTP 环境或不支持 Clipboard API 时的传统 DOM 复制方式
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // 防止页面发生抖动或滚动
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    return successful;
  } catch (err) {
    console.error('execCommand 复制失败:', err);
    return false;
  }
}
