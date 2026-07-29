import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// ==================== 配置区 ====================
// 1. CAD 可执行文件的绝对路径 (备用，当 COM 无法自动启动时使用)
const CAD_PATH: string = `D:\\CAD2026中望\\Zwcadm\\ZwcadmStart.exe`;

// 2.【写死目标路径】包含 DWG 图纸的文件夹路径
const TARGET_DIR: string = `C:\\Users\\19746\\Desktop\\BCQG43-0.8（DN3000）&CQG43-0.8（DN3000）`;

// 3. CAD 内部执行的导出命令
const EXPORT_CMD: string = "BESA_A4";

// 4. 等待单个文件导出完成的超时时间（秒）
const CMD_TIMEOUT_SEC: number = 300;

// 5. PDF 文件大小稳定判定阈值（毫秒）- 文件大小连续 N 毫秒不变则认为写入完成
const STABLE_THRESHOLD_MS: number = 4000;

// 6. CAD COM ProgID 列表（按优先级尝试）
const CAD_PROG_IDS: string[] = [
  "ZwCAD.Application",      // 中望CAD
  "ZWCAD.Application",      // 中望CAD (大写)
  "AutoCAD.Application",    // AutoCAD
  "AutoCAD.Application.24", // AutoCAD 2024
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

/**
 * 生成 PowerShell COM 自动化脚本
 */
function generatePsScript(dwgFiles: string[]): string {
  const fileList = dwgFiles.map(f => `'${escapePsString(f)}'`).join(', ');
  const extraDirs = EXTRA_PDF_DIRS.map(d => `'${escapePsString(d)}'`).join(', ');
  const targetDir = escapePsString(TARGET_DIR);

  return `
# 设置控制台编码为 UTF-8，避免中文乱码
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8
chcp 65001 | Out-Null

# 强制使用单线程公寓模式(STA)以兼容 COM
$ErrorActionPreference = "Continue"

# 待处理文件列表
$dwgFiles = @(${fileList})
$total = $dwgFiles.Count
$successCount = 0
$failCount = 0
$skipCount = 0

# PDF 监控目录列表
$pdfWatchDirs = @('${targetDir}'${extraDirs ? ', ' + extraDirs : ''})

# ---------- 工具函数 ----------

# 发送 ESC 键取消当前命令/对话框
function Send-Escape($doc, $count = 3) {
    for ($e = 0; $e -lt $count; $e++) {
        try {
            $doc.SendCommand([char]27)
            Start-Sleep -Milliseconds 300
        } catch {}
    }
}

# 尝试强制关闭所有文档（用于错误恢复）
function Close-AllDocs($cadApp) {
    try {
        for ($d = $cadApp.Documents.Count; $d -ge 1; $d--) {
            try {
                $cadApp.Documents.Item($d).Close($false)
                Start-Sleep -Milliseconds 500
            } catch {}
        }
    } catch {}
}

# 关闭临时空白文档（如 Drawing1.dwg、Drawing2.dwg 等）
# 这些通常是 BESA_A4 命令或 PDF 导出时自动创建的临时文档
function Close-TempDrawings($cadApp, $keepDocName = $null) {
    try {
        for ($d = $cadApp.Documents.Count; $d -ge 1; $d--) {
            try {
                $docItem = $cadApp.Documents.Item($d)
                $docName = $docItem.Name
                $docPath = $docItem.Path
                # 匹配 Drawing1, Drawing2, Drawing1.dwg 等未保存的临时文档
                # 未保存文档 Path 通常为空，Name 以 "Drawing" 开头后跟数字
                $isTemp = $false
                if ($docPath -eq "" -or $null -eq $docPath) {
                    if ($docName -match '^Drawing\d+(\.dwg)?$') {
                        $isTemp = $true
                    }
                }
                # 如果不是需要保留的文档，且是临时文档则关闭（不保存）
                if ($isTemp -and $docName -ne $keepDocName) {
                    Write-Host "  [清理] 关闭临时文档: $docName"
                    $docItem.Close($false)
                    Start-Sleep -Milliseconds 500
                }
            } catch {}
        }
    } catch {}
}

# 设置全局变量抑制保存提示和自动保存
function Suppress-Dialogs($doc) {
    try {
        $doc.SetVariable("FILEDIA", 0)      # 禁止文件对话框
        $doc.SetVariable("CMDDIA", 0)       # 禁止命令对话框
        $doc.SetVariable("ISAVEBAK", 0)     # 不创建 .bak 备份
        $doc.SetVariable("SAVETIME", 0)     # 禁用自动保存（避免自动保存触发弹窗）
        $doc.SetVariable("STARTUP", 0)      # 禁止启动对话框
        $doc.SetVariable("NOSHOW", 1)       # 减少界面刷新
    } catch {}
}

# 获取指定目录中所有 PDF 文件及其大小
function Get-PdfSnapshot($dirs) {
    $snapshot = @{}
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) { continue }
        try {
            Get-ChildItem -Path $dir -Filter "*.pdf" -File -ErrorAction SilentlyContinue | ForEach-Object {
                $snapshot[$_.FullName] = $_.Length
            }
        } catch {}
    }
    return $snapshot
}

# 等待 PDF 文件写入完成（大小稳定判定）
function Wait-ForPdf($dirs, $expectedBaseName, $beforeSnapshot, $timeoutSec, $stableMs) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    $stableSince = $null
    $lastFoundPath = $null
    $lastSize = -1
    $checkIntervalMs = 1000
    $idleCount = 0

    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds $checkIntervalMs
        $idleCount++

        $foundNew = $false
        $targetPath = $null
        $currentSize = 0

        foreach ($dir in $dirs) {
            if (-not (Test-Path $dir)) { continue }
            try {
                $pdfs = Get-ChildItem -Path $dir -Filter "*.pdf" -File -ErrorAction SilentlyContinue
                foreach ($pdf in $pdfs) {
                    # 检查是否是新文件（处理前不存在）或大小发生变化
                    $wasThere = $beforeSnapshot.ContainsKey($pdf.FullName)
                    $oldSize = if ($wasThere) { $beforeSnapshot[$pdf.FullName] } else { -1 }

                    if (-not $wasThere -or $pdf.Length -ne $oldSize) {
                        # 优先匹配同名 PDF（DWG 基名 = PDF 基名）
                        $pdfBase = [System.IO.Path]::GetFileNameWithoutExtension($pdf.Name)
                        if ($pdfBase -eq $expectedBaseName) {
                            $targetPath = $pdf.FullName
                            $currentSize = $pdf.Length
                            $foundNew = $true
                            break
                        }
                        # 备用：记录任意新/变化的 PDF
                        if (-not $targetPath) {
                            $targetPath = $pdf.FullName
                            $currentSize = $pdf.Length
                            $foundNew = $true
                        }
                    }
                }
                if ($targetPath) { break }
            } catch {}
        }

        if ($targetPath) {
            if ($currentSize -eq $lastSize -and $currentSize -gt 0) {
                # 文件大小未变化，开始计时稳定性
                if ($null -eq $stableSince) {
                    $stableSince = Get-Date
                }
                $stableFor = ((Get-Date) - $stableSince).TotalMilliseconds
                if ($stableFor -ge $stableMs) {
                    return @{ Success = $true; Path = $targetPath }
                }
            } else {
                # 大小变化了，重置稳定性计时
                $stableSince = $null
                $lastSize = $currentSize
                $lastFoundPath = $targetPath
            }
        } else {
            $stableSince = $null
        }

        # 辅助判断：如果已经找到文件并等待超过10秒且 CMDACTIVE=0，也视为完成
        if ($lastFoundPath -and $idleCount -gt 10) {
            try {
                $cmdActive = $null
                # 尝试从活动文档获取 CMDACTIVE
                if ($script:currentDoc) {
                    $cmdActive = $script:currentDoc.GetVariable("CMDACTIVE")
                }
                if ($cmdActive -eq 0 -and (Test-Path $lastFoundPath)) {
                    Start-Sleep -Milliseconds 1000
                    return @{ Success = $true; Path = $lastFoundPath }
                }
            } catch {}
        }
    }

    return @{ Success = $false; Path = $lastFoundPath }
}

# ---------- 1. 连接 CAD COM 对象 ----------
$cad = $null
foreach ($progId in @(${CAD_PROG_IDS.map(id => `'${id}'`).join(', ')})) {
    try {
        # 先尝试连接已运行的实例
        $cad = [Runtime.InteropServices.Marshal]::GetActiveObject($progId)
        Write-Host "[信息] 已连接到运行中的 CAD: $progId"
        break
    } catch {
        try {
            # 尝试创建新实例
            $cad = New-Object -ComObject $progId
            $cad.Visible = $true
            Write-Host "[信息] 已启动新的 CAD 实例: $progId"
            Start-Sleep -Milliseconds 5000
            break
        } catch {
            # 继续尝试下一个 ProgID
        }
    }
}

if (-not $cad) {
    Write-Host "[错误] 无法连接或启动 CAD (ZwCAD / AutoCAD)，请确保 CAD 已正确安装"
    exit 1
}

# 抑制启动对话框
try { $cad.Preferences.System.ShowStartupDialog = $false } catch {}

# ---------- 2. 批量处理 ----------
Write-Host "[信息] 共找到 $total 个 DWG 文件，开始批量导出..."
Write-Host "[信息] 完成判定方式: 检测同名 PDF 生成且文件大小连续 ${STABLE_THRESHOLD_MS}ms 稳定"
Write-Host ""

for ($i = 0; $i -lt $total; $i++) {
    $dwgPath = $dwgFiles[$i]
    $fileName = [System.IO.Path]::GetFileName($dwgPath)
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($dwgPath)
    $index = $i + 1

    Write-Host "[$index/$total] 正在处理: $fileName"

    $doc = $null
    $script:currentDoc = $null
    $opened = $false

    # 处理前先清理上次可能遗留的临时 Drawing 文档
    Close-TempDrawings $cad

    # 先尝试发送 ESC 取消残留命令状态
    try {
        $activeDoc = $cad.ActiveDocument
        if ($activeDoc) {
            Send-Escape $activeDoc 3
        }
    } catch {}

    # ---------- 2a. 打开 DWG 文件（带重试） ----------
    $openRetries = 0
    $maxOpenRetries = 2
    while (-not $opened -and $openRetries -le $maxOpenRetries) {
        try {
            $doc = $cad.Documents.Open($dwgPath, $false)
            $script:currentDoc = $doc
            $opened = $true
            Start-Sleep -Milliseconds 2000
        } catch {
            $openRetries++
            Write-Host "  [重试] 打开失败 ($openRetries/$maxOpenRetries)，尝试恢复... - $($_.Exception.Message)"

            # 关闭所有可能残留的文档
            Close-AllDocs $cad
            Start-Sleep -Milliseconds 2000

            # 再次尝试 ESC
            try {
                $activeDoc = $cad.ActiveDocument
                if ($activeDoc) { Send-Escape $activeDoc 5 }
            } catch {}
            Start-Sleep -Milliseconds 1000

            if ($openRetries -gt $maxOpenRetries) {
                Write-Host "[错误] 无法打开文件: $fileName"
                $failCount++
            }
        }
    }

    if (-not $opened) {
        # 失败后也清理临时文档
        Close-TempDrawings $cad
        continue
    }

    try {
        # 抑制所有对话框和自动保存
        Suppress-Dialogs $doc
        Start-Sleep -Milliseconds 500

        # 发送命令前再清理一次可能被命令创建的临时文档
        Close-TempDrawings $cad $fileName

        # ---------- 2b. 记录处理前 PDF 快照 ----------
        $beforeSnapshot = Get-PdfSnapshot $pdfWatchDirs

        # ---------- 2c. 发送导出命令 ----------
        $sendCmd = "${EXPORT_CMD}" + [char]13 + [char]10
        $doc.SendCommand($sendCmd)
        Write-Host "  -> 已发送命令: ${EXPORT_CMD}，等待 PDF 生成..."

        # ---------- 2d. 等待 PDF 文件生成并稳定 ----------
        $result = Wait-ForPdf $pdfWatchDirs $baseName $beforeSnapshot ${CMD_TIMEOUT_SEC} ${STABLE_THRESHOLD_MS}

        if ($result.Success) {
            $pdfName = if ($result.Path) { [System.IO.Path]::GetFileName($result.Path) } else { "(unknown)" }
            Write-Host "[成功] 图纸自动保存完成: $fileName -> $pdfName"
            $successCount++
        } else {
            if ($result.Path) {
                Write-Host "[警告] 等待超时 (${CMD_TIMEOUT_SEC}s)，检测到PDF但未稳定: $fileName"
            } else {
                Write-Host "[警告] 等待超时 (${CMD_TIMEOUT_SEC}s)，未检测到PDF生成: $fileName"
            }
            $failCount++
        }

        # ---------- 2e. 额外等待确保 CAD 释放文件锁 ----------
        Start-Sleep -Milliseconds 2000

        # ---------- 2f. 发送 ESC 确保退出命令状态 ----------
        Send-Escape $doc 3
        Start-Sleep -Milliseconds 500

        # ---------- 2g. 先关闭命令执行过程中产生的临时 Drawing 文档（关键！） ----------
        Close-TempDrawings $cad $fileName
        Start-Sleep -Milliseconds 500

        # ---------- 2h. 最后关闭目标文档（不保存） ----------
        try {
            # 再发一次 ESC 保险
            Send-Escape $doc 2
            Start-Sleep -Milliseconds 300
            $doc.Close($false)
            Write-Host "  [关闭] 已关闭文档: $fileName"
        } catch {
            Write-Host "  [警告] 正常关闭失败，尝试强制关闭..."
            try { Close-AllDocs $cad } catch {}
        }
        $script:currentDoc = $null

        # ---------- 2i. 关闭后再清理一次，确保 Drawing1 等被关掉 ----------
        Start-Sleep -Milliseconds 500
        Close-TempDrawings $cad
        Start-Sleep -Milliseconds 800

    } catch {
        Write-Host "[错误] 处理失败: $fileName - $($_.Exception.Message)"
        $failCount++

        # 错误恢复
        try { Send-Escape $doc 3 } catch {}
        Start-Sleep -Milliseconds 500
        try {
            if ($doc) { $doc.Close($false) }
        } catch {
            try { Close-AllDocs $cad } catch {}
        }
        $script:currentDoc = $null

        # 错误后强制清理
        Close-TempDrawings $cad
        Start-Sleep -Milliseconds 2000
    }
}

# ---------- 3. 完成汇总 ----------
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
    try { fs.unlinkSync(tempScriptPath); } catch {}

    if (code === 0) {
      console.log('\n[信息] 脚本执行完成');
    } else {
      console.error(`\n[错误] 脚本退出码: ${code}`);
    }
    process.exit(code ?? 1);
  });

  ps.on('error', (err: Error) => {
    console.error('[错误] 无法启动 PowerShell:', err.message);
    try { fs.unlinkSync(tempScriptPath); } catch {}
    process.exit(1);
  });

  // 处理 Ctrl+C 中断
  process.on('SIGINT', () => {
    console.log('\n[信息] 用户中断，正在停止...');
    try { ps.kill(); } catch {}
    try { fs.unlinkSync(tempScriptPath); } catch {}
    process.exit(0);
  });
}

main();
