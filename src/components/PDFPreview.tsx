import { useState, useMemo } from 'react';
import { Document, Page, PDFViewer, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ZoomIn, ZoomOut, RotateCcw, FileText, Download, Printer } from 'lucide-react';
import { VesselDrawing } from '../types';

interface PDFPreviewProps {
  drawing: VesselDrawing;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1E293B',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 120,
    fontSize: 12,
    color: '#64748B',
  },
  value: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#2563EB',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: 5,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
  },
  tableHeader: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
  },
  tableCell: {
    padding: 8,
    fontSize: 11,
    color: '#334155',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
});

export function PDFPreview({ drawing }: PDFPreviewProps) {
  const [numPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleDownload = () => {
    const content = `
${drawing.file_name}
============================================
物料编码: ${drawing.material_code}
版本: ${drawing.version}
结构形式: ${drawing.structure_type}
材质: ${drawing.material}
介质: ${drawing.medium}
============================================
技术参数:
工作压力: ${drawing.working_pressure.toFixed(2)} MPa
设计压力: ${drawing.design_pressure.toFixed(2)} MPa
设计温度: ${drawing.design_temperature} C
容积: ${drawing.volume.toFixed(2)} m3
公称直径: ${drawing.nominal_diameter} mm
壁厚: ${drawing.wall_thickness.toFixed(1)} mm
总高/总长: ${drawing.total_height_or_length} mm
重量: ${drawing.weight.toLocaleString()} kg
设计使用年限: ${drawing.design_life} 年
============================================
接口规格:
安全阀接口: ${drawing.safety_valve_connection}
排污口连接: ${drawing.drain_connection}
进口连接: ${drawing.inlet_connection}
出口连接: ${drawing.outlet_connection}
============================================
创建人: ${drawing.created_by}
创建时间: ${drawing.created_at}
修改人: ${drawing.updated_by}
修改时间: ${drawing.updated_at}
${drawing.remark ? `\n备注: ${drawing.remark}` : ''}
    `.trim();

    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${drawing.material_code}_${drawing.file_name}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const pdfContent = useMemo(() => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{drawing.file_name}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>物料编码:</Text>
          <Text style={styles.value}>{drawing.material_code}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>版本:</Text>
          <Text style={styles.value}>{drawing.version}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>结构形式:</Text>
          <Text style={styles.value}>{drawing.structure_type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>材质:</Text>
          <Text style={styles.value}>{drawing.material}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>介质:</Text>
          <Text style={styles.value}>{drawing.medium}</Text>
        </View>

        <Text style={styles.sectionTitle}>技术参数</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>工作压力:</Text>
          <Text style={styles.value}>{drawing.working_pressure.toFixed(2)} MPa</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>设计压力:</Text>
          <Text style={styles.value}>{drawing.design_pressure.toFixed(2)} MPa</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>设计温度:</Text>
          <Text style={styles.value}>{drawing.design_temperature} C</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>容积:</Text>
          <Text style={styles.value}>{drawing.volume.toFixed(2)} m3</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>公称直径:</Text>
          <Text style={styles.value}>{drawing.nominal_diameter} mm</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>壁厚:</Text>
          <Text style={styles.value}>{drawing.wall_thickness.toFixed(1)} mm</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>总高/总长:</Text>
          <Text style={styles.value}>{drawing.total_height_or_length} mm</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>重量:</Text>
          <Text style={styles.value}>{drawing.weight.toLocaleString()} kg</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>设计使用年限:</Text>
          <Text style={styles.value}>{drawing.design_life} 年</Text>
        </View>

        <Text style={styles.sectionTitle}>接口规格</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>安全阀接口:</Text>
          <Text style={styles.value}>{drawing.safety_valve_connection}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>排污口连接:</Text>
          <Text style={styles.value}>{drawing.drain_connection}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>进口连接:</Text>
          <Text style={styles.value}>{drawing.inlet_connection}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>出口连接:</Text>
          <Text style={styles.value}>{drawing.outlet_connection}</Text>
        </View>

        <Text style={styles.sectionTitle}>文件信息</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>创建人:</Text>
          <Text style={styles.value}>{drawing.created_by}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>创建时间:</Text>
          <Text style={styles.value}>{drawing.created_at}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>修改人:</Text>
          <Text style={styles.value}>{drawing.updated_by}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>修改时间:</Text>
          <Text style={styles.value}>{drawing.updated_at}</Text>
        </View>

        {drawing.remark && (
          <>
            <Text style={styles.sectionTitle}>备注</Text>
            <Text style={styles.value}>{drawing.remark}</Text>
          </>
        )}
      </Page>
    </Document>
  ), [drawing]);

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
        <div 
          className="mx-auto bg-white shadow-lg"
          style={{ 
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            maxWidth: '100%',
          }}
        >
          <PDFViewer style={{ width: '100%', height: '100%', minHeight: '600px' }}>
            {pdfContent}
          </PDFViewer>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-2 bg-white border-t border-slate-200">
        <button
          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
          disabled={pageNumber <= 1}
          className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        <span className="text-sm text-slate-500">
          {pageNumber} / {numPages}
        </span>
        <button
          onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
          disabled={pageNumber >= numPages}
          className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
