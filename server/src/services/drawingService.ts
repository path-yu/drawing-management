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
            const str = decodeURIComponent(
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
            content: `你是一个专业的工业图纸数据提取专家。请根据用户提供的PDF图纸文本内容，提取以下结构化信息，并以JSON格式返回（不要包含markdown代码块标记）：

请严格按照以下JSON结构返回，字段名必须完全一致：
{
  "material_code": "物料编码（从图纸中提取，例如：0322A00120）",
  "version": "版本号,",
  "created_by": "创建人",
  "updated_by": "更新人",
  "standard": "规格（从图中提取，例如CQG20/1.1）,规格在规格文字的右侧",
  "title": "名称（从图纸中提取，如储气罐或者氧气储罐之类）",
  "remark": "备注（从图纸中提取，包含图纸日期等信息，例如2026.6.25，例如100%RT，酸洗，抛光，脱脂之类的特殊处理）",
  "working_pressure": 工作压力数值（number类型）,
  "design_pressure": 设计压力数值（number类型）,
  "design_temperature": 设计温度数值（number类型）,
  "volume": 容积数值（number类型,从图纸中提取,例如CQG20/1.1,其中20为容积数值,1.1为设计压力）,
  "material": "材料名称，例如Q345R or S30408",
  "design_life": 使用年限数值（number类型）,
  "medium": "介质名称",
  "nominal_diameter": 公称直径mm（number类型）从图中提取，例如∅2400，∅2200之类的,
  "wall_thickness": 壁厚mm（number类型）从图中提取，它在公称直径尺寸线附件,如果是立式则在（左侧or右侧），卧式在（上方or下方）附近查找板厚标注，提取该具体数值,
  "total_height_or_length": 总高或总长mm（number类型）,
  "weight": 重量kg（number类型）,
  "safety_valve_connection": "安全阀接口规格",
  "drain_connection": "排污口接口规格",
  "inlet_connection": "进气口接口规格",
  "outlet_connection": "出气口接口规格",
  "inlet_count": 进气口数量（number类型）,
  "outlet_count": 出气口数量（number类型）,
  "flow_direction": "右进左出" 或 "左进右出" 或 null,
  "created_at": "创建时间",
  "updated_at": "更新时间"
}

字段提取规则：
请利用"序号"、"规格"、"用途"的紧邻关系提取：
- safety_valve_connection: 找到用途是 "安全阀口" 的上一行或下一行（通常是规格）。
- drain_connection: 找到用途是 "排污口" 的上一行或下一行（通常是规格）。
- inlet_connection: 找到用途是 "进气口" 的上一行或下一行（通常是规格）。
- outlet_connection: 找到用途是 "出气口" 的上一行或下一行（通常是规格）。
- inlet_count: 统计用途为 "进气口" 的行数量（通常为1）。
- outlet_count: 统计用途为 "出气口" 的行数量（通常为1）。
. wall_thickness (壁厚):
   - 压力容器筒体壁厚通常为 4~30 之间的较小整数（如 6, 8, 10, 12, 14, 16 等）。
   - 在图纸筒体外侧/上方标注中，若存在孤立的 两位数字（如 12），且不属于管口编号（N1-N6）和定位间距（通常大于50），即为壁厚数值。
. medium: 介质名称，储气罐通常为"空气"

flow_direction的值必须严格判断为 "右进左出" 或 "左进右出"。
1. 先查看"管口表"，找到用途为"进气口"的管口序号（例如 N6）。
2. 再查看"管口方位图"信息，确认该进气口序号对应的角度：如果是 90°，代表右侧；如果是 270°，代表左侧。
3. 同理，找到用途为"出气口"的管口序号（例如 N4），确认其对应的角度。
4. 输出最终结果字段 "flow_direction"，严格为以下两种之一：
   - 如果进气口在右侧(90°)，出气口在左侧(270°)，则输出 "右进左出"
   - 如果进气口在左侧(270°)，出气口在右侧(90°)，则输出 "左进右出"

**注意：**
- 管口方位图的方位定义：0°=正上, 90°=右侧(进气), 180°=正下, 270°=左侧(出气)。
- 请确保 "进气口" 和 "出气口" 的方向逻辑绝对正确，不要写反！

如果某些数据无法从PDF中提取，请填 null。请严格确保输出是合法的JSON格式。`
        }
    ];

    // 如果只有一页，直接传入
    if (pagesText.length === 1) {
        messages.push({
            role: 'user',
            content: `请解析以下PDF文件的文本内容。该文件是一张立式储气罐的示意图和技术参数表。请读取文字和表格内容并输出完整JSON。

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
                content: `这是PDF的第 ${i + 1} 页（共 ${pagesText.length} 页）。请根据前面所有页面的内容和本页内容，综合分析并输出完整的JSON结构化数据。

第 ${i + 1} 页内容：
${pagesText[i]}`
            });
        } else {
            // 非最后一页：告知AI这是第几页，让其记住内容
            messages.push({
                role: 'user',
                content: `这是PDF的第 ${i + 1} 页（共 ${pagesText.length} 页）。请阅读并记住本页内容，后续会继续提供其他页面。

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
