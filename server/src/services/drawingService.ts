import fs from 'fs';
import https from 'https';
import path from 'path';
import 'dotenv/config';
import PDFParser from 'pdf2json';
import { pdf } from 'pdf-to-img'; // 引入 pdf-to-img

// 抑制 pdf.js 的控制台警告
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('Setting up fake worker') ||
    msg.includes('TT: complementing a missing function tail') ||
    msg.includes('Unsupported: field.type of Square') ||
    msg.includes('NOT valid form element')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

// 预览图保存目录
const PREVIEW_DIR = path.join(__dirname, '../../uploads/previews');
if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}



/**
 * 生成 PDF 预览图（第一页）
 */
export async function generatePDFPreview(
  pdfPath: string,
  version: string
): Promise<string> {
  // 确保目录存在
  if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  }

  // 1. 加载 PDF 文件并生成第一页图片 (scale 相当于放大倍率)
  const document = await pdf(pdfPath, { scale: 2 });
  const firstPageBuffer = await document.getPage(1);

  // 2. 拼接输出文件名
  const originalName = path.basename(pdfPath, '.pdf');
  const previewFileName = `${originalName}.png`

  const previewPath = path.join(PREVIEW_DIR, previewFileName);

  // 3. 写入图片磁盘
  await fs.promises.writeFile(previewPath, firstPageBuffer);

  console.log(`[预览图生成成功]: ${previewPath}`);

  return `/uploads/previews/${previewFileName}`;
}

/**
 * 安全的 decodeURIComponent，遇到无效编码时不抛异常，返回最佳解码结果
 */
function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    // 将孤立的 %（后面不是两位十六进制数字）替换为 %25，然后重新解码
    const cleaned = str.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
    try {
      return decodeURIComponent(cleaned);
    } catch {
      // 如果仍然失败，返回将所有 %XX 做逐段解码的结果
      return cleaned.replace(/%[0-9A-Fa-f]{2}/g, (match) => {
        try { return decodeURIComponent(match); } catch { return match; }
      });
    }
  }
}

/**
 * 使用 pdf2json 按坐标排序提取 PDF 文本（无需 pdfjs-dist / Canvas）
 * @param filePath PDF 文件绝对路径
 * @param lineThreshold 同一行 Y 坐标的偏差容差（默认 0.5）
 */
export async function extractTextFromPDF(
  filePath: string,
  lineThreshold: number = 0.5
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(errData.parserError);
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const pagesText: string[] = [];

        // 遍历 PDF 的每一页
        pdfData.Pages.forEach((page: any, pageIndex: number) => {
          const rows: { y: number; items: { str: string; x: number }[] }[] = [];

          // 1. 收集并清洗文本块
          page.Texts.forEach((textItem: any) => {
            const x = Number(textItem.x.toFixed(1));
            const y = Number(textItem.y.toFixed(1));
            const str = safeDecodeURIComponent(
              textItem.R.map((r: any) => r.T).join('')
            ).trim();

            if (!str) return;

            // 查找是否存在同一高度的行 (Y轴容差 lineThreshold)
            let matchingRow = rows.find(r => Math.abs(r.y - y) <= lineThreshold);

            if (!matchingRow) {
              matchingRow = { y, items: [] };
              rows.push(matchingRow);
            }

            matchingRow.items.push({ str, x });
          });

          // 2. 按 Y 轴从上到下排序 (Y 越小越靠顶部)
          rows.sort((a, b) => a.y - b.y);

          // 3. 行内按 X 轴从左到右排序，并生成带坐标文本
          const pageLines: string[] = [];
          for (const row of rows) {
            row.items.sort((a, b) => a.x - b.x);

            // 将整行的文本拼接，格式为: [X:x坐标] 文本内容
            const rowText = row.items
              .map(item => `[X:${item.x}] ${item.str}`)
              .join(' ');

            if (rowText.trim() !== '') {
              // 在行首注入 Y 坐标
              pageLines.push(`[Y:${row.y.toFixed(1)}] ${rowText}`);
            }
          }

          // 4. 组装当前页纯文本，并 push 到数组中
          const fullPageString = `=== 第 ${pageIndex + 1} 页 ===\n` + pageLines.join('\n');
          pagesText.push(fullPageString);
        });

        // 5. 返回字符串数组 Promise<string[]>
        resolve(pagesText);
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.loadPDF(filePath);
  });
}
async function callDeepSeekAPI(messages: any[]): Promise<string> {
    const payload = {
        model: 'deepseek-v4-flash',
        messages: messages
    };

    const options = {
        hostname: 'api.deepseek.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        throw new Error(`HTTP错误: ${res.statusCode}, 响应内容: ${data}`);
                    }
                    
                    if (!data || data.trim() === '') {
                        throw new Error('Chat API返回空响应');
                    }
                    
                    const json = JSON.parse(data);
                    
                    if (!json.choices || !json.choices[0] || !json.choices[0].message || !json.choices[0].message.content) {
                        reject(new Error('API返回内容为空或格式不正确'));
                        return;
                    }
                    
                    resolve(json.choices[0].message.content);
                } catch (e: any) {
                    reject(new Error(`解析AI返回数据失败: ${e.message}, 原始数据: ${data}`));
                }
            });
        });

        req.on('error', (error) => { reject(error); });
        req.write(JSON.stringify(payload));
        req.end();
    });
}

export async function analyzePDFWithDeepSeek(pagesText: string[], filePath: string): Promise<any> {
    const messages: any[] = [
        {
            role: 'system',
            content: `你是一个专业的压力容器图纸数据提取专家。你将收到从压力容器PDF图纸中提取的文本内容，请准确提取技术参数和管口信息，以纯JSON格式返回结果（不要使用markdown代码块包裹，不要输出任何解释性文字）。

## 输出格式

严格按照以下JSON结构返回，字段名必须完全一致，字段顺序保持一致：
{
  "material_code": "物料编码，从图纸标题栏或明细栏中提取，如 0322A00120",
  "version": "版本号，如 V1、V_1，无版本号则填 null",
  "structure_type": "结构类型，必须为 '立式' 或 '卧式'，根据图纸主视图判断：罐体轴线垂直为立式，水平为卧式",
  "standard": "规格型号，通常位于图纸名称右侧，如 CQG20/1.1（其中20为容积，1.1为设计压力）",
  "title": "设备名称，如 储气罐、氧气储罐、空气缓冲罐等",
  "remark": "备注信息，包括图纸日期（如 2026.6.25）、检测要求（如 100%RT）、表面处理（如 酸洗、抛光、脱脂）等特殊要求，无备注则填 null",
  "working_pressure": 工作压力数值（MPa，number类型）,
  "design_pressure": 设计压力数值（MPa，number类型）,
  "design_temperature": 设计温度数值（℃，number类型）,
  "volume": 容积数值（m³，number类型）,
  "material": "主体材料牌号，如 Q345R、S30408、Q245R 等",
  "design_life": 设计使用年限数值（年，number类型）,
  "medium": "工作介质名称，储气罐通常为 '空气'，氧气罐为 '氧气' 等",
  "nominal_diameter": 公称直径数值（mm，number类型），标注格式如 ∅2400、DN2400、φ2200，提取数字部分,
  "wall_thickness": 筒体壁厚数值（mm，number类型）,
  "total_height_or_length": 总高（立式）或总长（卧式）数值（mm，number类型）,
  "weight": 设备重量数值（kg，number类型）,
  "safety_valve_connection": "安全阀接口规格，如 DN50、M36×2 等",
  "drain_connection": "排污口接口规格",
  "inlet_connection": "进气口/进口接口规格",
  "outlet_connection": "出气口/出口接口规格",
  "inlet_count": 进气口数量（number类型，通常为1）,
  "outlet_count": 出气口数量（number类型，通常为1）,
  "flow_direction": "气流方向，必须为 '右进左出' 或 '左进右出'，无法判断则填 null",
  "created_by": "设计/制图人姓名，从标题栏提取，无则填 null",
  "updated_by": "审核/更新人姓名，从标题栏提取，无则填 null",
  "is_simple": "是否为简单容器，必须为 true 或 false"(从图纸提取,如果有简单压力容器文字则为true,否则为false)
}

## 提取规则

### 数值字段通用规则
- 所有数值字段只提取数字部分，去掉单位（MPa、℃、m³、mm、kg等）
- 数值保留原始精度，不要四舍五入
- 无法提取的数值字段填 null

### 规格与容积提取
- 规格型号通常出现在图纸标题栏的"规格"或"图号"栏中，格式如 "CQG20/1.1"
- 从规格型号中可解析：容积为斜杠前的数字（20），设计压力为斜杠后的数字（1.1）
- 如果规格和技术参数表中都有数值，以技术参数表中的数据为准

### 壁厚提取（wall_thickness）
- 壁厚是压力容器筒体或封头的钢板厚度，通常为 3~30 之间的数值（可能是整数或带有小数，如 5.5、6、8、9.5、10、12 等）
- 关键特征与位置：
  - 在横向跨越筒体的公称直径标注（如 DN1200、DN1000、∅1200）的左侧端点或右侧端点处，紧挨着筒体外壁线的数值（如 5.5、6、8）即为壁厚
  - 通常紧靠在直径标注线附近，可能仅有一个数字（如 5.5、6、8）
- 过滤规则：排除管口规格（如 DN50）、高度/定位尺寸（通常 >100mm）、管口编号（N1~N6）
- 提示：如果提取到了 DN1200，请重点检查 DN1200 所在水平线两端的边缘位置，提取对应的壁厚数值（支持带小数的浮点数）

### 总高/总长提取（total_height_or_length）
- 立式容器：提取设备总高度（从支腿底部到顶部法兰/封头顶部）
- 卧式容器：提取设备总长度（从左端封头到右端封头切线或总长度）
- 通常是图纸上最大的线性尺寸标注

### 管口信息提取（利用管口表）
在"管口表"或"接管表"中，按以下规则提取：
- 找到表头包含"序号"、"规格"、"用途"（或"名称"）的表格
- safety_valve_connection：用途为"安全阀口"或"安全阀"对应的规格列值
- drain_connection：用途为"排污口"或"排污"对应的规格列值
- inlet_connection：用途为"进气口"、"进口"或"进气"对应的规格列值
- outlet_connection：用途为"出气口"、"出口"或"出气"对应的规格列值
- inlet_count：统计管口表中用途为进气/进口的行数
- outlet_count：统计管口表中用途为出气/出口的行数
- 如果同一用途有多个管口，规格用逗号分隔（如 "DN50,DN25"）

### 气流方向判断（flow_direction）
1. 先在"管口表"中找到进气口对应的管口序号（如 N6）和出气口对应的管口序号（如 N4）。
2. 再查看"管口方位图"中的文字标注。
3. 允许管口组合标注：图纸中常将同一角度的多个管口合并标注（例如 "N5,N6"、"N5/N6"、"N5 N6"），这代表这些管口都处于该角度方位。
   - 示例：如果看到 "N5,N6" 紧挨着 "90°"，说明 N5 和 N6 的方位均为 90°（右侧）。
4. 角度与方向映射（0°=正上，90°=正右，180°=正下，270°=正左）：
   - 进气口（N6）位于 90°（正右侧）且 出气口（N4）位于 270°（正左侧） → "右进左出"
   - 进气口（N6）位于 270°（正左侧）且 出气口（N4）位于 90°（正右侧） → "左进右出"
5. 若匹配到包含进气口编号的组合词（如包含 N6 的 "N5,N6"），直接视作该管口已定位到对应角度。

**注意：**
- 管口方位图的方位定义：0°=正上, 90°=右侧(进气), 180°=正下, 270°=左侧(出气)。
- 请确保 "进气口" 和 "出气口" 的方向逻辑绝对正确，不要写反！

### 介质判断
- 根据设备名称和用途判断：储气罐→"空气"，氧气储罐→"氧气"，氮气罐→"氮气"
- 如果技术参数表中明确标注了介质，以表中数据为准

## 输出要求
- 必须输出合法的JSON格式，字段名和类型必须符合上述定义
- string类型字段无法提取时填 null，不要填空字符串 ""
- number类型字段无法提取时填 null，不要填 0
- flow_direction 只能填 "右进左出"、"左进右出" 或 null
- structure_type 只能填 "立式" 或 "卧式"
- 不要输出JSON以外的任何文字说明`
        }
    ];

    // 如果只有一页，直接传入
    if (pagesText.length === 1) {
        messages.push({
            role: 'user',
            content: `以下是从压力容器PDF图纸中提取的文本内容。该PDF包含图纸示意图、技术参数表和管口表。请仔细阅读所有文字和表格数据，按照系统提示中的规则提取结构化信息，输出完整的JSON。

PDF文本内容：
${pagesText[0]}`
        });
        
        const content = await callDeepSeekAPI(messages);
        const cleanedContent = content.replace(/```json\s?/g, '').replace(/```/g, '').trim();
        
        let structuredData;
        try {
            structuredData = JSON.parse(cleanedContent);
        } catch {
            const fixedContent = fixJSON(cleanedContent);
            structuredData = JSON.parse(fixedContent);
        }
        
        structuredData.file_path = filePath;
        structuredData.file_name = filePath.split(/[\\/]/).pop();
        structuredData.created_at = new Date().toISOString();
        structuredData.updated_at = new Date().toISOString();
        
        return structuredData;
    }

    // 如果有多页，逐页传入，让AI逐步理解
    for (let i = 0; i < pagesText.length; i++) {
        const isLastPage = i === pagesText.length - 1;
        
        if (isLastPage) {
            // 最后一页：请求最终的结构化输出
            messages.push({
                role: 'user',
                content: `这是PDF的第 ${i + 1} 页（共 ${pagesText.length} 页，最后一页）。现在你已收到全部 ${pagesText.length} 页内容，请综合所有页面的信息（包括技术参数表、管口表、管口方位图等），按照系统提示中的提取规则，输出完整的结构化JSON。

第 ${i + 1} 页内容：
${pagesText[i]}`
            });
        } else {
            // 非最后一页：告知AI这是第几页，让其记住内容
            messages.push({
                role: 'user',
                content: `这是PDF的第 ${i + 1} 页（共 ${pagesText.length} 页）。请仔细阅读本页内容并记住关键信息（包括技术参数、管口规格、方位角度等），后续页面将继续提供。暂时不要输出结果，等待最后一页时再统一输出JSON。

第 ${i + 1} 页内容：
${pagesText[i]}`
            });
            
            // AI回应确认收到
            const content = await callDeepSeekAPI(messages);
            messages.push({
                role: 'assistant',
                content: content
            });
        }
    }

    // 发送最后一页请求，获取最终结果
    const finalContent = await callDeepSeekAPI(messages);
    const cleanedContent = finalContent.replace(/```json\s?/g, '').replace(/```/g, '').trim();
    
    let structuredData;
    try {
        structuredData = JSON.parse(cleanedContent);
    } catch {
        const fixedContent = fixJSON(cleanedContent);
        structuredData = JSON.parse(fixedContent);
    }
    
    structuredData.file_path = filePath;
    structuredData.file_name = filePath.split(/[\\/]/).pop();
    structuredData.created_at = new Date().toISOString();
    structuredData.updated_at = new Date().toISOString();
    
    return structuredData;
}

function fixJSON(str: string): string {
    str = str.replace(/,\s*([}\]])/g, '$1');
    
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    let lastValidIndex = -1;
    
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        
        if (char === '\\') {
            escapeNext = true;
            continue;
        }
        
        if (char === '"') {
            inString = !inString;
            continue;
        }
        
        if (!inString) {
            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0 && bracketCount === 0) {
                    lastValidIndex = i;
                }
            } else if (char === '[') {
                bracketCount++;
            } else if (char === ']') {
                bracketCount--;
            }
        }
    }
    
    if (lastValidIndex !== -1) {
        str = str.substring(0, lastValidIndex + 1);
    }
    
    return str;
}
