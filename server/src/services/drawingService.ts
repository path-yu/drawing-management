import fs from 'fs';
import https from 'https';
import path from 'path';
import 'dotenv/config';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

// 预览图保存目录
const PREVIEW_DIR = path.join(__dirname, '../../uploads/previews');
if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}



// 生成PDF预览图（第一页）
export async function generatePDFPreview(pdfPath: string): Promise<string> {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    
    // 获取第一页
    const page = await pdf.getPage(1);
    
    // 设置缩放比例，生成合适大小的预览图
    const viewport = page.getViewport({ scale: 2 });
    
    // 创建canvas并渲染（使用@napi-rs/canvas跨平台版本）
    const { createCanvas } = await import('@napi-rs/canvas');
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    
    // 渲染页面到canvas
    await page.render({
        canvas: canvas,
        viewport: viewport
    }).promise;
    
    // 生成文件名（使用时间戳和原始文件名）
    const originalName = path.basename(pdfPath, '.pdf');
    const previewFileName = `${originalName}_${Date.now()}.png`;
    const previewPath = path.join(PREVIEW_DIR, previewFileName);
    
    // 保存为PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(previewPath, buffer);
    
    // 返回相对路径，供前端访问
    return `/uploads/previews/${previewFileName}`;
}

export async function extractTextFromPDF(filePath: string): Promise<string[]> {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    
    const pagesText: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const rowsMap = new Map<number, { str: string; x: number }[]>();
        
        textContent.items.forEach((item) => {
            if ('str' in item && 'transform' in item) {
            const y = Math.round(item.transform[5] * 100) / 100;
            if (!rowsMap.has(y)) {
                rowsMap.set(y, []);
            }
            rowsMap.get(y)!.push({
                    str: item.str,
                    x: item.transform[4]
                });
            }
        });

        const sortedRows: string[] = [];
        const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);
        
        sortedY.forEach(y => {
            const rowItems = rowsMap.get(y)!;
            rowItems.sort((a, b) => a.x - b.x);
            const rowText = rowItems.map(item => item.str).join(' ');
            if (rowText.trim() !== '') {
                sortedRows.push(rowText);
            }
        });

        const pageText = sortedRows.join('\n');
        pagesText.push(`=== 第 ${i} 页 ===\n${pageText}`);
    }
    
    return pagesText;
}

async function callDeepSeekAPI(messages: any[]): Promise<string> {
    const payload = {
        model: 'deepseek-chat',
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
  "title": "名称（从图纸中提取，如储气罐或者氧气储罐之类）",
  "remark": "备注（从图纸中提取，包含图纸日期等信息，例如2026.6.25，例如100%RT，酸洗，抛光，脱脂之类的特殊处理）",
  "working_pressure": 工作压力数值（number类型）,
  "design_pressure": 设计压力数值（number类型）,
  "design_temperature": 设计温度数值（number类型）,
  "volume": 容积数值（number类型,从图纸中提取,例如CQG20/1.1,其中20为容积数值,1.1为设计压力）,
  "material": "材料名称，例如Q345R or S30408",
  "design_life": 使用年限数值（number类型）,
  "medium": "介质名称",
  "nominal_diameter": 公称直径mm（number类型）,
  "wall_thickness": 壁厚mm（number类型）,
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

1. medium: 介质名称，储气罐通常为"空气"
2. wall_thickness: 壁厚，公称直径尺寸线立式（左侧or右侧），卧式（上面or下面）附近查找板厚标注，提取该具体数值
3. remark: 备注，包含图纸日期等信息

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
