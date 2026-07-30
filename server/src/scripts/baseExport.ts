import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// ==================== 配置区 ====================
// 1. CAD 可执行文件的绝对路径 (备用，当 COM 无法自动启动时使用)
const CAD_PATH: string = `D:\\CAD2026中望\\Zwcadm\\ZwcadmStart.exe`;

// 2.【写死目标路径】包含 DWG 图纸的文件夹路径
const TARGET_DIR: string = `C:\\Users\\z\\Desktop\\BCQG43-0.8（DN3000）&CQG43-0.8（DN3000）`;

// 3. CAD 内部执行的导出命令
const EXPORT_CMD: string = "BESA_A4";

// 4. 等待单个文件导出完成的超时时间（秒）
const CMD_TIMEOUT_SEC: number = 300;

// 5. PDF 文件大小稳定判定阈值（毫秒）- 文件大小连续 N 毫秒不变则认为写入完成
const STABLE_THRESHOLD_MS: number = 4000;

// 6. CAD COM ProgID 列表（按优先级尝试）
const CAD_PROG_IDS: string[] = [
    // "ZwCAD.Application",      // 中望CAD
    // "ZWCAD.Application",      // 中望CAD (大写)
    // "AutoCAD.Application",    // AutoCAD
    // "AutoCAD.Application.24", // AutoCAD 2024
    //   浩辰CAD
    "GstarCAD.Application"
];

// 7. PDF 输出可能的目录（除了 DWG 所在目录外额外扫描的位置）
const EXTRA_PDF_DIRS: string[] = [
    // 如果 BESA_A4 将 PDF 输出到其他固定目录，在这里添加
];
// ===============================================

/**
 * 扫描目录下所有 .dwg 文件（不递归子目录）
 */
function findDwgFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) {
        console.error(`[错误] 目录不存在: ${dir}`);
        process.exit(1);
    }
    const files = fs.readdirSync(dir)
        .filter(f => f.toLowerCase().endsWith('.dwg'))
        .map(f => path.join(dir, f))
        .sort();
    return files;
}

/**
 * 转义 PowerShell 字符串中的特殊字符
 */
function escapePsString(s: string): string {
    return s.replace(/'/g, "''").replace(/`/g, '``');
}

function generatePsScript(dwgFiles: string[]): string {
    const fileList = dwgFiles.map(f => `'${escapePsString(f)}'`).join(', ');

    return `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ErrorActionPreference = "Continue"

$dwgFiles = @(${fileList})
$total = $dwgFiles.Count
$successCount = 0
$failCount = 0

function Send-Escape($doc, $count = 2) {
    for ($e = 0; $e -lt $count; $e++) {
        try {
            $doc.SendCommand([char]27)
            Start-Sleep -Milliseconds 200
        } catch {}
    }
}

function Close-TempDrawings($cadApp, $keepDocName = $null) {
    try {
        for ($d = $cadApp.Documents.Count; $d -ge 1; $d--) {
            try {
                $docItem = $cadApp.Documents.Item($d)
                $docName = $docItem.Name
                $docPath = $docItem.Path
                $isTemp = $false
                if ($docPath -eq "" -or $null -eq $docPath) {
                    if ($docName -match '^Drawing\\d+(\\.[dD][wW][gG])?$') {
                        $isTemp = $true
                    }
                }
                if ($isTemp -and $docName -ne $keepDocName) {
                    Write-Host "  [清理] 关闭临时文档: $docName"
                    $docItem.Close($false)
                    Start-Sleep -Milliseconds 300
                }
            } catch {}
        }
    } catch {}
}

function Suppress-Dialogs($doc) {
    try {
        $doc.SetVariable("FILEDIA", 0)
        $doc.SetVariable("CMDDIA", 0)
        $doc.SetVariable("ISAVEBAK", 0)
        $doc.SetVariable("SAVETIME", 0)
        $doc.SetVariable("STARTUP", 0)
        $doc.SetVariable("NOSHOW", 1)
    } catch {}
}

$cad = $null
foreach ($progId in @(${CAD_PROG_IDS.map(id => `'${id}'`).join(', ')})) {
    try {
        $cad = [Runtime.InteropServices.Marshal]::GetActiveObject($progId)
        Write-Host "[信息] 已连接到运行中的 CAD: $progId"
        break
    } catch {
        try {
            $cad = New-Object -ComObject $progId
            $cad.Visible = $true
            Write-Host "[信息] 已启动新的 CAD 实例: $progId"
            Start-Sleep -Milliseconds 4000
            break
        } catch {}
    }
}

if (-not $cad) {
    Write-Host "[错误] 无法连接或启动 CAD，请确保 CAD 已正确安装"
    exit 1
}

# ---------- 初始化：清理CAD状态 ----------
Write-Host "[信息] 初始化CAD环境，清理残留状态..."
# 多次发送ESC取消任何可能卡住的命令/对话框
try {
    for ($e = 0; $e -lt 8; $e++) {
        try { $cad.ActiveDocument.SendCommand([char]27) } catch {}
        Start-Sleep -Milliseconds 300
    }
} catch {}
# 清理临时文档
Close-TempDrawings $cad
Start-Sleep -Milliseconds 1000
Write-Host "[信息] CAD环境初始化完成"
Write-Host ""

# ---------- 2. 批量处理 ----------
Write-Host "[信息] 共找到 $total 个 DWG 文件，开始批量导出..."
Write-Host "[信息] 完成判定方式: 等待图纸同名 .done 信号文件生成"
Write-Host ""

for ($i = 0; $i -lt $total; $i++) {
    $dwgPath = $dwgFiles[$i]
    $fileName = [System.IO.Path]::GetFileName($dwgPath)
    $index = $i + 1

    $doneFilePath = [System.IO.Path]::ChangeExtension($dwgPath, ".done")

    Write-Host "[$index/$total] 正在处理: $fileName"

    if (Test-Path $doneFilePath) {
        Remove-Item $doneFilePath -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 200
    }

    $doc = $null
    $opened = $false

    Close-TempDrawings $cad

    try {
        $doc = $cad.Documents.Open($dwgPath, $false)
        $opened = $true
        $doc.Activate()
        $cad.ActiveDocument = $doc
        Start-Sleep -Milliseconds 3000
    } catch {
        Write-Host "[错误] 无法打开文件: $fileName - $($_.Exception.Message)"
        $failCount++
        Close-TempDrawings $cad
        continue
    }

    try {
        Suppress-Dialogs $doc
        Close-TempDrawings $cad $fileName

        # 多次发送ESC取消任何挂起的命令/对话框，确保命令行干净
        Send-Escape $doc 5
        Start-Sleep -Milliseconds 800

        # ---------- 2b. 发送导出命令 ----------
        # 注意：只发送单个 CR([char]13) 作为命令结束符，不发送 LF([char]10)
        # 在CAD中，空回车/换行都会重复执行上一个命令，必须避免额外的回车
        $sendCmd = "${EXPORT_CMD}" + [char]13
        $doc.SendCommand($sendCmd)
        Write-Host "  -> 已发送命令: ${EXPORT_CMD}，等待 API 解析及 .done 信号生成..."

        $deadline = (Get-Date).AddSeconds(${CMD_TIMEOUT_SEC})
        $isSuccess = $false

        while ((Get-Date) -lt $deadline) {
            if (Test-Path $doneFilePath) {
                $isSuccess = $true
                break
            }
            Start-Sleep -Milliseconds 500
        }

        if ($isSuccess) {
            Write-Host "[成功] 收到保存完成信号 (.done): $fileName"
            $successCount++
            Remove-Item $doneFilePath -Force -ErrorAction SilentlyContinue
            # 收到成功信号后额外等待，确保PDF写入完成和命令完全退出
            Start-Sleep -Milliseconds 2000
        } else {
            Write-Host "[警告] 等待超时 (${CMD_TIMEOUT_SEC}s)，未收到 .done 信号文件: $fileName"
            $failCount++
            # 超时后尝试发送ESC取消可能卡住的命令
            Send-Escape $doc 3
            Start-Sleep -Milliseconds 500
        }

        # 命令执行完成后等待一会儿再清理，确保命令完全退出回到命令行
        Start-Sleep -Milliseconds 1000

        try {
            $doc.Close($false)
            Write-Host "  [关闭] 已关闭文档: $fileName"
        } catch {
            Write-Host "  [警告] 正常关闭失败，尝试强制清理..."
        }

        Start-Sleep -Milliseconds 800
        Close-TempDrawings $cad

    } catch {
        Write-Host "[错误] 处理异常: $fileName - $($_.Exception.Message)"
        $failCount++
        try { Send-Escape $doc 2 } catch {}
        try { if ($doc) { $doc.Close($false) } } catch {}
        Close-TempDrawings $cad
    }
}

Write-Host ""
Write-Host "=============================================="
Write-Host "[完成] 批量导出结束"
Write-Host "  总计: $total 个文件"
Write-Host "  成功: $successCount 个"
Write-Host "  失败: $failCount 个"
Write-Host "=============================================="
`;
}

function main() {
    console.log('==========================================');
    console.log('  CAD 批量导出工具 (COM 自动化)');
    console.log('==========================================');
    console.log(`目标目录: ${TARGET_DIR}`);
    console.log(`导出命令: ${EXPORT_CMD}`);
    console.log(`超时时间: ${CMD_TIMEOUT_SEC}s`);
    console.log('');

    // 1. 扫描 DWG 文件
    const dwgFiles = findDwgFiles(TARGET_DIR);
    if (dwgFiles.length === 0) {
        console.log('[错误] 目录中没有找到 .dwg 文件');
        process.exit(1);
    }
    console.log(`[信息] 找到 ${dwgFiles.length} 个 DWG 文件`);

    // 2. 生成并执行 PowerShell 脚本
    const psScript = generatePsScript(dwgFiles);

    // 将脚本写入临时文件（写入 UTF-8 BOM，确保 Windows PowerShell 正确识别中文编码）
    const tempScriptPath = path.join(__dirname, '_temp_cad_export.ps1');
    const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
    const scriptBuffer = Buffer.from(psScript, 'utf8');
    fs.writeFileSync(tempScriptPath, Buffer.concat([BOM, scriptBuffer]));

    console.log('[信息] 正在启动 CAD COM 自动化...');
    console.log('');

    // 使用 STA 模式启动 PowerShell（COM 操作需要 STA）
    const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-STA',
        '-File', tempScriptPath
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env }
    });

    // 实时输出 CAD COM 脚本的标准输出
    ps.stdout.on('data', (data: Buffer) => {
        process.stdout.write(data);
    });

    // 实时输出错误
    ps.stderr.on('data', (data: Buffer) => {
        process.stderr.write(data);
    });

    ps.on('close', (code: number) => {
        // 清理临时脚本文件
        try { fs.unlinkSync(tempScriptPath); } catch { }

        if (code === 0) {
            console.log('\n[信息] 脚本执行完成');
        } else {
            console.error(`\n[错误] 脚本退出码: ${code}`);
        }
        process.exit(code ?? 1);
    });

    ps.on('error', (err: Error) => {
        console.error('[错误] 无法启动 PowerShell:', err.message);
        try { fs.unlinkSync(tempScriptPath); } catch { }
        process.exit(1);
    });

    // 处理 Ctrl+C 中断
    process.on('SIGINT', () => {
        console.log('\n[信息] 用户中断，正在停止...');
        try { ps.kill(); } catch { }
        try { fs.unlinkSync(tempScriptPath); } catch { }
        process.exit(0);
    });
}

main();
