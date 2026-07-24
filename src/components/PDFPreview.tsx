import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomIn, ZoomOut, RotateCcw, FileText, Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { VesselDrawing } from '../types';

// 设置 pdfjs-dist worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFPreviewProps {
  drawing: VesselDrawing;
}

export function PDFPreview({ drawing }: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 加载并渲染 PDF
  const renderPage = useCallback(async () => {
    if (!canvasRef.current || !drawing.pdf_file_path) {
      setError('无法加载PDF文件');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 使用 fetch 获取 PDF 文件
      const response = await fetch(drawing.pdf_file_path);
      if (!response.ok) {
        throw new Error('无法获取PDF文件');
      }
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      setNumPages(pdf.numPages);

      // 确保页码在有效范围内
      const pageNum = Math.min(Math.max(pageNumber, 1), pdf.numPages);
      setPageNumber(pageNum);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom, rotation });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法获取Canvas上下文');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvas: canvasRef.current,
        viewport: viewport
      }).promise;

    } catch (err) {
      console.error('PDF渲染错误:', err);
      setError('PDF渲染失败');
    } finally {
      setLoading(false);
    }
  }, [drawing.pdf_file_path, pageNumber, zoom, rotation]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const handleDownload = async () => {
    if (!drawing.pdf_file_path) return;
    
    try {
      const response = await fetch(drawing.pdf_file_path);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = drawing.file_name.replace('.dwg', '.pdf');
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载失败:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">PDF 预览</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4 text-slate-500" />
          </button>
          <span className="text-sm text-slate-600 w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={() => setRotation((rotation + 90) % 360)}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
            title="旋转"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            下载 PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-sm"
          >
            <Printer className="w-4 h-4" />
            打印
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-slate-100">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>{error}</p>
              <p className="text-sm mt-1">请检查PDF文件是否存在</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="bg-white shadow-lg max-w-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-2 bg-white border-t border-slate-200">
        <button
          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
          disabled={pageNumber <= 1 || loading}
          className="flex items-center gap-1 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          上一页
        </button>
        <span className="text-sm text-slate-500">
          {pageNumber} / {numPages}
        </span>
        <button
          onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
          disabled={pageNumber >= numPages || loading}
          className="flex items-center gap-1 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
