(vl-load-com)

;; ==========================================================
;; 1. 辅助函数：生成临时调试红框 (带线宽控制)
;; ==========================================================
(defun draw_debug_rect (p1 p2 width / p3 p4) 
  (setq p3 (list (car p2) (cadr p1) 0.0)
        p4 (list (car p1) (cadr p2) 0.0)
  )
  (entmake 
    (list 
      '(0 . "LWPOLYLINE")
      '(100 . "AcDbEntity")
      '(100 . "AcDbPolyline")
      '(90 . 4)
      '(70 . 1)
      '(62 . 1) ; 红色
      (cons 43 width) ; 全局线宽
      (cons 10 p1)
      (cons 10 p3)
      (cons 10 p2)
      (cons 10 p4)
    )
  )
  (entlast)
)

;; ==========================================================
;; 2. 坐标获取：通过顶点避开 Variant 错误
;; ==========================================================
(defun get-polyline-bbox (ent / pts x_list y_list) 
  (setq pts (vl-remove-if 'not 
                          (mapcar '(lambda (x) (if (= (car x) 10) (cdr x))) 
                                  (entget ent)
                          )
            )
  )
  (if pts 
    (progn 
      (setq x_list (mapcar 'car pts)
            y_list (mapcar 'cadr pts)
      )
      (list (list (apply 'min x_list) (apply 'min y_list) 0.0) 
            (list (apply 'max x_list) (apply 'max y_list) 0.0)
      )
    )
    nil
  )
)

;; ==========================================================
;; 3. PDF导出核心函数 (修正版：直接按图框物理尺寸判定横纵向，不进行视图旋转)
;; ==========================================================
(defun export_single_pdf (ent_out p1_out p2_out paper_size custom_name / pdfname path 
                          timestamp box_w box_h is_landscape paper_name plot_dir
                         ) 
  (setvar "CMDECHO" 0)

  ;; 1. 生成文件名
  (if (and custom_name (/= custom_name "")) 
    (setq pdfname (strcat custom_name ".pdf"))
    (progn 
      (setq timestamp (menucmd "M=$(edtime,$(getvar,date),YYYYMMDD_HHMMSS)"))
      (setq pdfname (strcat paper_size 
                            "_"
                            timestamp
                            "_"
                            (substr (rtos (rem (getvar "CPUTICKS") 1e6) 2 0) 1 4)
                            ".pdf"
                    )
      )
    )
  )
  (setq path (strcat (getenv "USERPROFILE") "\\Desktop\\" pdfname))

  ;; 2. 不做无意义的旋转，直接计算图框在 WCS 下的物理宽高判定横纵版
  (setq box_w (abs (- (car p2_out) (car p1_out)))
        box_h (abs (- (cadr p2_out) (cadr p1_out)))
  )

  ;; 3. 根据图纸大小与长宽比例选择合适的尺寸名称和方向参数
  (if (> box_w box_h) 
    (setq is_landscape T)
    (setq is_landscape nil)
  )

  ;; 针对 A4 和 A3 匹配对应的 CAD 页面设置名称（注意：请确保该名称与您电脑里的页面设置/打印机驱动完全匹配）
  (if (= (strcase paper_size) "A4") 
    (progn 
      (setq paper_name (if is_landscape 
                         "ISO full bleed A4 (210.00 x 297.00 毫米)"
                         "ISO full bleed A4 (297.00 x 210.00 毫米)"
                       )
            plot_dir   (if is_landscape "L" "P")
      )
    )
    ;; 默认 A3
    (progn 
      (setq paper_name (if is_landscape 
                         "ISO full bleed A3 (297.00 x 420.00 毫米)"
                         "ISO full bleed A3 (420.00 x 297.00 毫米)"
                       )
            plot_dir   (if is_landscape "L" "P")
      )
    )
  )

  ;; 清理同名文件
  (if (findfile path) (vl-file-delete path))


  ;; 调整 UCS 并直接 Zoom 到图元
  (command "_.UCS" "_W")
  (vl-cmdf "_.ZOOM" "_Object" ent_out "")

  ;; 转换坐标到当前视口
  (setq p1_new (trans p1_out 0 1)
        p2_new (trans p2_out 0 1)
  )
  ;; ==========================================
  ;; ★ 增加 5cm (即 50 个单位) 的边距偏移逻辑
  ;; ==========================================
  (setq margin_offset 15.0) ; 5cm 对应图纸空间单位(毫米或英寸，通常基于CAD当前单位)

  ;; 提取当前视口坐标的最值，确保无论p1与p2方向如何都能正确外扩
  (setq min_x (min (car p1_new) (car p2_new))
        max_x (max (car p1_new) (car p2_new))
        min_y (min (cadr p1_new) (cadr p2_new))
        max_y (max (cadr p1_new) (cadr p2_new))
  )

  ;; 左下角向外偏移（减小X，减小Y）
  ;; 右上角向外偏移（增大X，增大Y）
  (setq p1_new (list (- min_x margin_offset) (- min_y margin_offset) 0.0)
        p2_new (list (+ max_x margin_offset) (+ max_y margin_offset) 0.0)
  )
  ;; ==========================================

  ;; 5. 执行动态打印 (-PLOT 命令)
  (vl-cmdf "-PLOT" "Y" "" "DWG To PDF.pc3" paper_name "M" plot_dir "N" "W" "non" 
           p1_new "non" p2_new "F" "C" "Y" "打印.ctb" "Y" "A" path "N" "Y"
  )

  (princ (strcat "\n[导出成功] " pdfname))
  (princ)
)
;; ==========================================================
;; 4. 智能批量处理逻辑 (支持面域REGION、图块、多段线自适应识别)
;; ==========================================================
(defun smart_batch_plot (target_size / ss i ent coords p1 p2 area box_list final_list 
                         f_box is_inside cx cy temp_frames w h ratio confirm dyn_width 
                         idx custom_name pdf_path_list current_pdf_path pdf24_cmd 
                         timestamp combined_name combined_path obj ll ur
                        ) 
  (princ (strcat "\n请框选 " target_size " 范围..."))

  ;; 【核心修改1】扩充过滤器：支持多段线(LWPOLYLINE)以及面域(REGION)
  (if (setq ss (ssget '((0 . "LWPOLYLINE,REGION")))) 
    (progn 
      (setq box_list '()
            i        0
      )
      (repeat (sslength ss) 
        (setq ent (ssname ss i))
        (setq obj (vlax-ename->vla-object ent))

        ;; 【核心修改2】抛弃原有的组码提取法，用 BoundingBox 完美通吃面域和多段线边界
        (if 
          (not 
            (vl-catch-all-error-p 
              (vl-catch-all-apply 'vla-getboundingbox (list obj 'll 'ur))
            )
          )
          (progn 
            (setq p1    (vlax-safearray->list ll)
                  p2    (vlax-safearray->list ur)
                  w     (abs (- (car p2) (car p1)))
                  h     (abs (- (cadr p2) (cadr p1)))
                  area  (* w h)
                  ratio (if (and (> h 0) (> w 0)) (/ (max w h) (min w h)) 0)
            )
            ;; 保留您原有的过滤：保证是有效的闭合大图框 (宽大于50、高大于50过滤零件小线条)
            (if (and (> area 15000) (> ratio 1.1) (< ratio 1.5) (> w 50) (> h 50)) 
              ;; 保持与原代码结构完全一致：(面积 实体名 左下点 右上点)
              (setq box_list (cons (list area ent p1 p2) box_list))
            )
          )
        )
        (setq i (1+ i))
      )

      ;; 第一阶段：按面积降序排列以进行重叠框剔除
      (setq box_list (vl-sort box_list '(lambda (a b) (> (car a) (car b)))))
      (setq final_list  '()
            temp_frames '()
      )

      (foreach box box_list 
        (setq is_inside nil
              p1        (nth 2 box)
              p2        (nth 3 box)
        )
        (setq cx (/ (+ (car p1) (car p2)) 2.0)
              cy (/ (+ (cadr p1) (cadr p2)) 2.0)
        )
        (foreach f_box final_list 
          (setq f_p1 (nth 2 f_box)
                f_p2 (nth 3 f_box)
          )
          (if 
            (and (> cx (car f_p1)) 
                 (< cx (car f_p2))
                 (> cy (cadr f_p1))
                 (< cy (cadr f_p2))
            )
            (setq is_inside T)
          )
        )
        ;; 如果通过剔除，将中心点 X 坐标 (cx) 追加在数据尾部，方便排序
        (if (not is_inside) 
          (progn 
            (setq final_list (cons (append box (list cx)) final_list))
            (setq dyn_width (/ (sqrt (car box)) 100.0))
            (setq temp_frames (cons (draw_debug_rect p1 p2 dyn_width) temp_frames))
          )
        )
      )

      (if (> (length final_list) 0) 
        (progn 
          ;; 第二阶段：【核心排序】严格按中心点 X 坐标进行升序（从左到右排序）
          (setq final_list (vl-sort final_list 
                                    '(lambda (a b) (< (nth 4 a) (nth 4 b)))
                           )
          )

          (vl-cmdf "_.regen")
          (princ 
            (strcat "\n[识别完成] 已识别 " (itoa (length final_list)) " 个图框，已由左至右完成测算。")
          )

          (initget "Yes No")
          ;; 把描述性中文字移到括号外面
          (setq confirm (getkword "\n确认开始[Y/N]？(将按顺序打印 <Y>: "))

          (if (or (= confirm nil) (= confirm "Yes")) 
            (progn 
              (princ "\n[执行中] 正在输出单页 PDF ...")
              (foreach f temp_frames (if (entget f) (entdel f)))
              (vl-cmdf "_.regen")

              ;; 循环输出单页文件并记录路径
              (setq idx 0)
              (setq pdf_path_list '())

              (foreach box final_list 
                (setq custom_name (itoa idx))
                (setq current_pdf_path (strcat (getenv "USERPROFILE") 
                                               "\\Desktop\\"
                                               custom_name
                                               ".pdf"
                                       )
                )

                (export_single_pdf 
                  (nth 1 box)
                  (nth 2 box)
                  (nth 3 box)
                  target_size
                  custom_name
                )

                (setq pdf_path_list (append pdf_path_list (list current_pdf_path)))
                (setq idx (1+ idx))
              )
            )
            (progn 
              (foreach f temp_frames (if (entget f) (entdel f)))
              (vl-cmdf "_.regen")
              (princ "\n[取消] 用户中止打印。")
            )
          )
        )
        (princ "\n[未识别] 未发现符合要求的图框。")
      )
    )
    (princ "\n[取消] 未选取任何物件。")
  )
  (princ)
)

;; ==========================================================
;; 5. 新增：不旋轉直接列印的核心函數 (適用於 bpdfA3 / bpdfA4)
;; ==========================================================
(defun export_direct_pdf (ent_out p1_out p2_out paper_size / pdfname path paper_name 
                          timestamp
                         ) 
  (setvar "CMDECHO" 0)
  ;; 2. 設定對應的紙張名稱
  ;; 注意：實體印表機的紙張名稱通常與 DWG To PDF 不同，請確保與你印表機支援的 A3/A4 名稱一致
  (setq paper_name (if (= (strcase paper_size) "A4") 
                     "A4" ; 實體機通常直接是 "A4" 或 "ISO A4"
                     "A3" ; 實體機通常直接是 "A3" 或 "ISO A3"
                   )
  )
  ;; 2. 生成時間戳記唯一文件名，防止覆蓋
  (setq timestamp (menucmd "M=$(edtime,$(getvar,date),YYYYMMDD_HHMMSS)"))
  (setq pdfname (strcat paper_size 
                        "_"
                        timestamp
                        "_"
                        (substr (rtos (rem (getvar "CPUTICKS") 1e6) 2 0) 1 4)
                        ".pdf"
                )
  )
  ;; 4. 呼叫列印 (關鍵修正：倒數第二個參數改為 "N"，代表不列印到檔案，直接輸出到印表機)
  ;; 參數順序解讀：
  ;; "Y" (詳細配置) -> "" (預設模型空間) -> printer_name (印表機) -> paper_name (紙張)
  ;; -> "M" (毫米) -> "L" (橫向) -> "N" (不反向) -> "W" (窗口) -> "non" p1_out -> "non" p2_out
  ;; -> "F" (佈滿) -> "C" (居中) -> "Y" (依樣式列印) -> "打印.ctb" -> "Y" (列印線寬)
  ;;着色打印设A置 [按显示(A)/线框(W)/隐藏(H)/视觉样式(V)/渲染(R)] <按显示>: A
  ;; -是否打印到文件  N
  ;; 是否保存对页面设置的修改 Y  (是否继续打印)"Y"

  ;; 3. 確保在世界坐標系下進行窗口捕捉，但不做任何 UCS 旋轉或 PLAN 視圖跳轉
  (vl-cmdf "_.UCS" "_W")


  ;; 4. 呼叫列印 (移除旋轉步驟，直接使用傳入的 WCS 原始坐標 p1_out 和 p2_out)
  ;; 注意：這裡採用橫向 "L" (Landscape) 列印模式，如果一號機橫豎反了，可將下方的 "L" 改為 "P"
  (vl-cmdf "-PLOT" "Y" "" "一号机" paper_name "M" "L" "N" "W" "non" p1_out "non" p2_out 
           "F" "C" "Y" "打印.ctb" "Y" "A" "N" "Y" "Y"
  )

  (princ (strcat "\n[直接導出成功] " pdfname))
)

;; ==========================================================
;; 6. 新增：不旋轉的批量處理外殼邏輯
;; ==========================================================
(defun smart_direct_plot (target_size / ss i ent coords p1 p2 area box_list 
                          final_list f_box is_inside cx cy temp_frames w h ratio 
                          confirm dyn_width
                         ) 
  (princ (strcat "\n[直接列印] 請框选 " target_size " 範圍..."))

  (if (setq ss (ssget '((0 . "LWPOLYLINE") (70 . 1)))) 
    (progn 
      (setq box_list '()
            i        0
      )
      (repeat (sslength ss) 
        (setq ent (ssname ss i))
        (if (setq coords (get-polyline-bbox ent)) 
          (progn 
            (setq p1    (car coords)
                  p2    (cadr coords)
                  w     (abs (- (car p2) (car p1)))
                  h     (abs (- (cadr p2) (cadr p1)))
                  area  (* w h)
                  ratio (if (and (> h 0) (> w 0)) (/ (max w h) (min w h)) 0)
            )
            ;; 保持原有的圖框過濾標準
            (if (and (> area 15000) (> ratio 1.25) (< ratio 1.5)) 
              (setq box_list (cons (list area ent p1 p2) box_list))
            )
          )
        )
        (setq i (1+ i))
      )

      ;; 排序與重疊內框剔除
      (setq box_list (vl-sort box_list '(lambda (a b) (> (car a) (car b)))))
      (setq final_list  '()
            temp_frames '()
      )

      (foreach box box_list 
        (setq is_inside nil
              p1        (nth 2 box)
              p2        (nth 3 box)
        )
        (setq cx (/ (+ (car p1) (car p2)) 2.0)
              cy (/ (+ (cadr p1) (cadr p2)) 2.0)
        )
        (foreach f_box final_list 
          (setq f_p1 (nth 2 f_box)
                f_p2 (nth 3 f_box)
          )
          (if 
            (and (> cx (car f_p1)) 
                 (< cx (car f_p2))
                 (> cy (cadr f_p1))
                 (< cy (cadr f_p2))
            )
            (setq is_inside T)
          )
        )
        (if (not is_inside) 
          (progn 
            (setq final_list (cons box final_list))
            ;; 畫出紅色調試確認框
            (setq dyn_width (/ (sqrt (car box)) 100.0))
            (setq temp_frames (cons (draw_debug_rect p1 p2 dyn_width) temp_frames))
          )
        )
      )

      ;; 標紅確認與直接執行列印
      (if (> (length final_list) 0) 
        (progn 
          (vl-cmdf "_.regen")
          (princ (strcat "\n[識別完成] 已標紅 " (itoa (length final_list)) " 个圖框。"))

          (initget "Yes No")
          (setq confirm (getkword "\n確認直接列印標紅區域？[是(Y)/否(N)] <Y>: "))

          (if (or (= confirm nil) (= confirm "Yes")) 
            (progn 
              (princ "\n[執行中] 正在直接輸出 PDF (不旋轉)...")
              ;; 清理調試紅框
              (foreach f temp_frames (if (entget f) (entdel f)))
              (vl-cmdf "_.regen")
              ;; 執行不旋轉直接列印
              (foreach box final_list 
                (export_direct_pdf (nth 1 box) (nth 2 box) (nth 3 box) target_size)
              )
            )
            (progn 
              ;; 使用者取消時，記得也清理掉紅框
              (foreach f temp_frames (if (entget f) (entdel f)))
              (vl-cmdf "_.regen")
              (princ "\n[取消] 使用者中止直接列印。")
            )
          )
        )
        (princ "\n[未識別] 未發現符合要求的圖框。")
      )
    )
  )
  (princ)
)

;; ==========================================================
;; 8. 靈活秒刷版：手動選取矩形「直接送印」不確認 (適用於 bpA3 / bpA4)
;; ==========================================================
(defun manual_direct_plot (target_size / ss i ent coords p1 p2 w h area ratio 
                           box_list final_list cx cy is_inside f_box f_p1 f_p2
                          ) 
  (princ (strcat "\n[直接送印] 請選取要列印為 " target_size " 的圖框矩形(可多選)..."))

  ;; 讓使用者手動選擇圖面上的閉合多段線
  (if (setq ss (ssget '((0 . "LWPOLYLINE") (70 . 1)))) 
    (progn 
      (setq box_list '()
            i        0
      )
      ;; 1. 遍歷使用者選中的所有矩形
      (repeat (sslength ss) 
        (setq ent (ssname ss i))
        (if (setq coords (get-polyline-bbox ent)) 
          (progn 
            (setq p1    (car coords)
                  p2    (cadr coords)
                  w     (abs (- (car p2) (car p1)))
                  h     (abs (- (cadr p2) (cadr p1)))
                  area  (* w h)
                  ratio (if (and (> h 0) (> w 0)) (/ (max w h) (min w h)) 0)
            )
            ;; 放寬過濾限制，只要是常規比例的框都允許手動列印
            (if (and (> area 15000) (> ratio 1.1)) 
              (setq box_list (cons (list area ent p1 p2) box_list))
            )
          )
        )
        (setq i (1+ i))
      )

      ;; 2. 移除重複選取的內框 (保留大框)
      (setq box_list (vl-sort box_list '(lambda (a b) (> (car a) (car b)))))
      (setq final_list '())

      (foreach box box_list 
        (setq is_inside nil
              p1        (nth 2 box)
              p2        (nth 3 box)
        )
        (setq cx (/ (+ (car p1) (car p2)) 2.0)
              cy (/ (+ (cadr p1) (cadr p2)) 2.0)
        )
        (foreach f_box final_list 
          (setq f_p1 (nth 2 f_box)
                f_p2 (nth 3 f_box)
          )
          (if 
            (and (> cx (car f_p1)) 
                 (< cx (car f_p2))
                 (> cy (cadr f_p1))
                 (< cy (cadr f_p2))
            )
            (setq is_inside T)
          )
        )
        (if (not is_inside) 
          (setq final_list (cons box final_list))
        )
      )

      ;; 3. 【核心修改】不進行彈窗或快顯確認，直接循環呼叫實體列印
      (if (> (length final_list) 0) 
        (progn 
          (princ (strcat "\n[執行中] 正在將 " (itoa (length final_list)) " 個圖框發送至一號機..."))
          (foreach box final_list 
            (export_direct_pdf (nth 1 box) (nth 2 box) (nth 3 box) target_size)
          )
        )
        (princ "\n[未識別] 選取的物體不符合圖框特徵。")
      )
    )
    (princ "\n[取消] 未選取任何物件。")
  )
  (princ)
)
;; ==========================================================
;; 9. 修正与注册快捷命令
;; ==========================================================
(defun c:bpA3 () (manual_direct_plot "A3") (princ))
(defun c:bpA4 () (manual_direct_plot "A4") (princ))

;; 使用无参数的匿名函数或中间层函数对批量打印进行包装，规避参数传递报错
(defun c:BESA3 () 
  (smart_batch_plot "A3")
  (princ)
)

(defun c:BESA4 () 
  (smart_batch_plot "A4")
  (princ)
)

;; 使用无参数的匿名函数或中间层函数对批量打印进行包装，规避参数传递报错
(defun c:bpdfA3 () 
  (smart_direct_plot "A3")
  (princ)
)

(defun c:bpdfA4 () 
  (smart_direct_plot "A4")
  (princ)
)
;; 修复版：安全的从指定图框范围内提取物料编码
;; ==========================================================
(defun GetMaterialCodeInBox (p1 p2 / ss i ent txt pos code clean_code) 
  (setq code "Unknown_Material")

  ;; 在图框范围内 (p1 到 p2) 用交叉窗口 "C" 查找所有的 TEXT 和 MTEXT
  (if (setq ss (ssget "C" p1 p2 '((0 . "TEXT,MTEXT")))) 
    (progn 
      (setq i (sslength ss))
      (while (and (> i 0) (= code "Unknown_Material")) 
        (setq i (1- i))
        (setq ent (ssname ss i))
        (setq txt (cdr (assoc 1 (entget ent))))

        (if txt 
          (progn 
            ;; 1. 尝试匹配 "物料编码：" 或 "物料编码:"
            (setq pos (vl-string-search "物料编码：" txt))
            (if (not pos) 
              (setq pos (vl-string-search "物料编码:" txt))
            )

            ;; 只有当 pos 确实是一个数字索引时才进行截取
            (if (and pos (numberp pos)) 
              (progn 
                ;; 截取关键字后面的内容（"物料编码：" 占 5 个汉字，共 10 字节，加冒号或按实际偏移）
                ;; 这里我们直接从 pos 开始截取，后面统一清洗掉中文和符号
                (setq code (substr txt (+ pos 1 (strlen "物料编码："))))
              )
              ;; 备用方案：如果当前文本本身就是纯编码（例如你图里单独一行的 0322K00015）
              ;; 如果你想让它也能被顺带识别，可以加条件，但目前主要针对带“物料编码”字样的行
            )
          )
        )
      )
    )
  )

  ;; 如果找到了物料编码，进行严格清洗（去掉中文、冒号、空格、MTEXT控制符等）
  (if (/= code "Unknown_Material") 
    (progn 
      (foreach char '("物" "料" "编" "码" "：" ":" " " "\t" "\n" "\\P") 
        (while (vl-string-search char code) 
          (setq code (vl-string-subst "" char code))
        )
      )
    )
  )

  ;; 过滤文件名非法字符
  (setq clean_code (vl-list->string 
                     (vl-remove-if 
                       '(lambda (x) 
                          (vl-position x '(34 47 58 42 63 124 60 62 92))
                        ) ; 过滤 \ / : * ? " < > |
                       (vl-string->list code)
                     )
                   )
  )

  ;; 如果清洗完为空，则返回默认名称
  (if (or (= clean_code "") (= clean_code nil)) "Unknown_Material" clean_code)
)
;; ==========================================================
;; 管接头专属：在图框范围内精准匹配 10 位纯数字物料编码
;; ==========================================================
(defun GetGuanJieTouCode (p1 p2 / ss i ent txt code clean_code) 
  (setq code "Unknown_Material")

  (if (setq ss (ssget "C" p1 p2 '((0 . "TEXT,MTEXT")))) 
    (progn 
      (setq i (sslength ss))
      (while (and (> i 0) (= code "Unknown_Material")) 
        (setq i (1- i))
        (setq ent (ssname ss i))
        (setq txt (cdr (assoc 1 (entget ent))))

        (if txt 
          (progn 
            (while (wcmatch txt "*;*") 
              (setq txt (substr txt (+ (vl-string-search ";" txt) 2)))
            )
            (while (vl-string-search " " txt) 
              (setq txt (vl-string-subst "" " " txt))
            )

            (if 
              (and (= (strlen txt) 10) 
                   (not (vl-catch-all-error-p (vl-catch-all-apply 'read (list txt))))
                   (numberp (read txt))
              )
              (setq code txt)
            )
          )
        )
      )
    )
  )

  (setq clean_code (vl-list->string 
                     (vl-remove-if 
                       '(lambda (x) 
                          (vl-position x '(34 47 58 42 63 124 60 62 92))
                        )
                       (vl-string->list code)
                     )
                   )
  )

  (if (or (= clean_code "") (= clean_code nil)) "Unknown_Material" clean_code)
)

;; ==========================================================
;; 通用批量导出主函数（修复 apply 函数调用）
;; ==========================================================
(defun smart_batch_plot_A4_custom (suffix code_func / ss i ent obj ll ur minpt maxpt 
                                   w h area ratio box_list largest_box base_name 
                                   final_name
                                  ) 
  (vl-load-com)

  (princ (strcat "\n请框选或点选图框对象（将导出 [" suffix "]）..."))

  (if (setq ss (ssget '((0 . "INSERT,LWPOLYLINE,REGION")))) 
    (progn 
      (setq i        (sslength ss)
            box_list '()
      )

      (while (> i 0) 
        (setq i (1- i))
        (setq ent (ssname ss i))
        (setq obj (vlax-ename->vla-object ent))

        (if 
          (not 
            (vl-catch-all-error-p 
              (vl-catch-all-apply 'vla-getboundingbox (list obj 'll 'ur))
            )
          )
          (progn 
            (setq minpt (vlax-safearray->list ll)
                  maxpt (vlax-safearray->list ur)
                  w     (abs (- (car maxpt) (car minpt)))
                  h     (abs (- (cadr maxpt) (cadr minpt)))
                  area  (* w h)
                  ratio (if (and (> h 0) (> w 0)) (/ (max w h) (min w h)) 0)
            )

            (if 
              (and (> area 15000) (> ratio 1.1) (< ratio 1.8) (> w 100) (> h 100))
              (setq box_list (cons (list area ent minpt maxpt) box_list))
            )
          )
        )
      )

      (if (> (length box_list) 0) 
        (progn 
          (setq box_list (vl-sort box_list '(lambda (a b) (> (car a) (car b)))))
          (setq largest_box (car box_list))
          (setq ent   (nth 1 largest_box)
                minpt (nth 2 largest_box)
                maxpt (nth 3 largest_box)
          )

          ;; 使用 apply 动态调用编码提取函数，彻底解决函数错误
          (setq base_name (apply code_func (list minpt maxpt)))

          (if (and base_name (/= base_name "") (/= base_name "Unknown_Material")) 
            (setq final_name (strcat base_name suffix))
            (setq final_name (strcat "Unknown" suffix))
          )

          (export_single_pdf ent minpt maxpt "A4" final_name)
          (princ (strcat "\n[完成] 目标 PDF 已成功导出为: " final_name ".pdf"))
        )
        (princ "\n[未识别] 选中的对象中没有找到符合 A4 比例的有效图框。")
      )
    )
    (princ "\n[取消] 未选择任何对象。")
  )
  (princ)
)

;; ==========================================================
;; 快捷命令注册
;; ==========================================================
(defun c:BESA4_RK () 
  (smart_batch_plot_A4_custom "_人孔" 'GetMaterialCodeInBox)
  (princ)
)

(defun c:BESA4_ZT () 
  (smart_batch_plot_A4_custom "_支腿" 'GetMaterialCodeInBox)
  (princ)
)

(defun c:BESA4_GJT () 
  (smart_batch_plot_A4_custom "_管接头" 'GetGuanJieTouCode)
  (princ)
)



(princ "\n--- 已修复并加载命令：BESA4_RK, BESA4_ZT, BESA4_GJT ---")
(princ)



(princ)
(princ "\n--- bpA3 与 bpA4 命令（手動選框、一號機直接送印模式）加載成功 ---")
(princ "\n--- bpdfA3 與 bpdfA4 命令（批量框选，一號機直接列印、不旋轉模式）加載成功 ---")
(princ "\n--- BESA3 與 BESA4 命令 批量框选，导出A3或A4pdf文件加载成功 ---")
(princ)
;; ==========================================================
;; 10. 智能全图导出命令 (命令: BESA_ALL)
;; 逻辑：1张图纸直接导出桌面；2张及以上自动调用 PDF24 合并
;; ==========================================================
(defun c:BESA_ALL (/ dwg_fullname dwg_name temp_dir pdf_list box_list final_list ss i 
                   ent obj ll ur minpt maxpt w h area ratio target_size cx cy idx 
                   custom_name default_generated temp_pdf output_pdf cmd_line 
                   shell_obj f_box f_p1 f_p2 is_inside page_count box
                  ) 
  (vl-load-com)
  (setvar "CMDECHO" 0)

  ;; 1. 安全获取当前 DWG 主文件名
  (setq dwg_fullname (getvar "DWGNAME"))
  (if 
    (or (= dwg_fullname "") 
        (= dwg_fullname "Drawing1.dwg")
        (= dwg_fullname "Drawing2.dwg")
    )
    (setq dwg_name "未命名图纸")
    (setq dwg_name (vl-filename-base dwg_fullname))
  )

  (princ (strcat "\n[全图扫描中...] 当前文件: " dwg_name "，正在搜寻所有符合要求的图框..."))

  ;; 2. 全局搜寻所有闭合多段线和面域
  (if (setq ss (ssget "X" '((0 . "LWPOLYLINE,REGION")))) 
    (progn 
      (setq box_list '()
            i        (sslength ss)
      )

      (repeat i 
        (setq i (1- i))
        (setq ent (ssname ss i))
        (setq obj (vlax-ename->vla-object ent))

        ;; 计算边界框
        (if 
          (not 
            (vl-catch-all-error-p 
              (vl-catch-all-apply 'vla-getboundingbox (list obj 'll 'ur))
            )
          )
          (progn 
            (setq minpt (vlax-safearray->list ll)
                  maxpt (vlax-safearray->list ur)
                  w     (abs (- (car maxpt) (car minpt)))
                  h     (abs (- (cadr maxpt) (cadr minpt)))
                  area  (* w h)
                  ratio (if (and (> h 0) (> w 0)) (/ (max w h) (min w h)) 0)
            )

            ;; 识别图框特征参数 (过滤小零件，只保留符合图框长宽比的边界)
            (if (and (> area 15000) (> ratio 1.1) (< ratio 1.8) (> w 50) (> h 50)) 
              (progn 
                (setq cx (/ (+ (car minpt) (car maxpt)) 2.0))
                (setq box_list (cons (list area ent minpt maxpt cx) box_list))
              )
            )
          )
        )
      )

      ;; 剔除套件重叠的内框
      (setq box_list (vl-sort box_list '(lambda (a b) (> (car a) (car b)))))
      (setq final_list '())

      (foreach box box_list 
        (setq is_inside nil
              minpt     (nth 2 box)
              maxpt     (nth 3 box)
              cx        (nth 4 box)
              cy        (/ (+ (cadr minpt) (cadr maxpt)) 2.0)
        )
        (foreach f_box final_list 
          (setq f_p1 (nth 2 f_box)
                f_p2 (nth 3 f_box)
          )
          (if 
            (and (> cx (car f_p1)) 
                 (< cx (car f_p2))
                 (> cy (cadr f_p1))
                 (< cy (cadr f_p2))
            )
            (setq is_inside T)
          )
        )
        (if (not is_inside) 
          (setq final_list (cons box final_list))
        )
      )

      ;; 3. 判断扫描到的有效图框数量
      (setq page_count (length final_list))

      (if (> page_count 0) 
        (progn 
          ;; 按中心点 X 坐标升序排列（实现从左到右依次出图）
          (setq final_list (vl-sort final_list 
                                    '(lambda (a b) (< (nth 4 a) (nth 4 b)))
                           )
          )

          ;; ==========================================================
          ;; 情况 A：全局仅有 1 张图纸 —— 直接导出桌面 DWG 同名 PDF，不进行合并
          ;; ==========================================================
          (if (= page_count 1) 
            (progn 
              (princ (strcat "\n[识别成功] 全局识别到 1 张图纸，直接输出为: " dwg_name ".pdf"))

              (setq box   (car final_list)
                    ent   (nth 1 box)
                    minpt (nth 2 box)
                    maxpt (nth 3 box)
                    w     (abs (- (car maxpt) (car minpt)))
                    h     (abs (- (cadr maxpt) (cadr minpt)))
              )

              (if (> (max w h) 350.0) 
                (setq target_size "A3")
                (setq target_size "A4")
              )

              ;; 直接导出桌面同名 PDF
              (export_single_pdf ent minpt maxpt target_size dwg_name)

              (princ "\n==================================================")
              (princ (strcat "\n[导出完成！] 单页 PDF 已直接存至桌面: " dwg_name ".pdf"))
              (princ "\n==================================================\n")
            )

            ;; ==========================================================
            ;; 情况 B：有 2 张及以上图纸 —— 导出多页临时文件并调用 PDF24 合并
            ;; ==========================================================
            (progn 
              (princ 
                (strcat "\n[识别成功] 全局匹配到 " (itoa page_count) " 张图纸，开始逐页导出并合并...")
              )

              ;; 创建独立临时工作文件夹
              (setq temp_dir (strcat (getenv "TEMP") 
                                     "\\cad_pdf_merge_"
                                     (rtos (getvar "CDATE") 2 0)
                                     "\\"
                             )
              )
              (if (not (vl-file-directory-p temp_dir)) (vl-mkdir temp_dir))

              (setq idx      1
                    pdf_list '()
              )

              (foreach box final_list 
                (setq ent   (nth 1 box)
                      minpt (nth 2 box)
                      maxpt (nth 3 box)
                      w     (abs (- (car maxpt) (car minpt)))
                      h     (abs (- (cadr maxpt) (cadr minpt)))
                )

                (if (> (max w h) 350.0) 
                  (setq target_size "A3")
                  (setq target_size "A4")
                )

                (setq custom_name (strcat "temp_page_" 
                                          (if (< idx 10) 
                                            (strcat "00" (itoa idx))
                                            (if (< idx 100) 
                                              (strcat "0" (itoa idx))
                                              (itoa idx)
                                            )
                                          )
                                  )
                )

                (export_single_pdf ent minpt maxpt target_size custom_name)

                (setq default_generated (strcat (getenv "USERPROFILE") 
                                                "\\Desktop\\"
                                                custom_name
                                                ".pdf"
                                        )
                )
                (setq temp_pdf (strcat temp_dir custom_name ".pdf"))

                (if (findfile default_generated) 
                  (progn 
                    (vl-file-copy default_generated temp_pdf)
                    (vl-file-delete default_generated)
                    (setq pdf_list (cons temp_pdf pdf_list))
                  )
                )

                (setq idx (1+ idx))
              )

              (setq pdf_list (reverse pdf_list))

              ;; 调用 PDF24 进行静默合并
              (if (> (length pdf_list) 0) 
                (progn 
                  (setq output_pdf (strcat (getenv "USERPROFILE") 
                                           "\\Desktop\\"
                                           dwg_name
                                           ".pdf"
                                   )
                  )
                  (princ 
                    (strcat "\n[合并中...] 正在调用 PDF24 合并 " 
                            (itoa (length pdf_list))
                            " 页 PDF..."
                    )
                  )

                  (setq cmd_line (strcat "pdf24-DocTool.exe -join -profile none -outputFile \"" 
                                         output_pdf
                                         "\""
                                 )
                  )

                  (foreach pdf pdf_list 
                    (setq cmd_line (strcat cmd_line " \"" pdf "\""))
                  )

                  (setq shell_obj (vlax-create-object "WScript.Shell"))
                  (vlax-invoke-method shell_obj "Run" cmd_line 0 T)
                  (vlax-release-object shell_obj)

                  ;; 清理临时单页文件
                  (foreach pdf pdf_list 
                    (if (findfile pdf) (vl-file-delete pdf))
                  )

                  (princ "\n==================================================")
                  (princ (strcat "\n[全部完成！] 多页合并 PDF 已生成在桌面: " dwg_name ".pdf"))
                  (princ "\n==================================================\n")
                )
                (princ "\n[错误] 临时单页 PDF 生成失败。")
              )
            )
          )
        )
        (princ "\n[未识别] 全局扫描未找到符合标准的图框。")
      )
    )
    (princ "\n[未识别] 图纸中未找到多段线或面域实体。")
  )
  (setvar "CMDECHO" 1)
  (princ)
)

(princ "\n--- BESA_ALL 加载成功，直接输入 BESA_ALL 运行 ---")
(princ)
;; ==========================================================
;; 11. 智能全图 A4 导出并推送接口 (命令: BESA_A4)
;; 逻辑：导出至 D:\GitCode\drawing-management\PDF 
;;      完成完调用后端 API 分析接口
;; ==========================================================
(defun c:BESA_A4 (/ dwg_fullname dwg_name output_dir target_pdf_path temp_dir 
                   pdf_list box_list final_list ss i ent obj ll ur minpt maxpt 
                   w h area ratio target_size cx cy idx custom_name default_generated 
                   temp_pdf output_pdf cmd_line shell_obj f_box f_p1 f_p2 is_inside 
                   page_count box dwg_path file_name
                 ) 
  (vl-load-com)
  (setvar "CMDECHO" 0)

  ;; 1. 获取当前 DWG 信息及设置导出目录
  (setq dwg_path (getvar "DWGPREFIX"))
  (setq dwg_fullname (getvar "DWGNAME"))
  (if (or (= dwg_fullname "") 
          (= dwg_fullname "Drawing1.dwg") 
          (= dwg_fullname "Drawing2.dwg")
      ) 
    (progn 
      (setq dwg_name "未命名图纸")
      (setq file_name "未命名图纸.dwg")
    )
    (progn 
      (setq dwg_name (vl-filename-base dwg_fullname))
      (setq file_name dwg_fullname)
    )
  )

  ;; 设置固定导出目录：D:\GitCode\drawing-management\PDF
  (setq output_dir "D:\\GitCode\\drawing-management\\server\\uploads\\PDF")
  (if (not (vl-file-directory-p output_dir)) 
    (vl-mkdir output_dir)
  )

  ;; 最终导出的 PDF 路径
  (setq target_pdf_path (strcat output_dir "\\" dwg_name ".pdf"))

  (princ (strcat "\n[A4全图扫描中...] 当前文件: " dwg_name "，正在搜寻所有符合要求的图框..."))

  ;; 2. 全局搜寻所有闭合多段线和面域
  (if (setq ss (ssget "X" '((0 . "LWPOLYLINE,REGION")))) 
    (progn 
      (setq box_list '()
            i        (sslength ss)
      )

      (repeat i 
        (setq i (1- i))
        (setq ent (ssname ss i))
        (setq obj (vlax-ename->vla-object ent))

        ;; 计算边界框
        (if 
          (not 
            (vl-catch-all-error-p 
              (vl-catch-all-apply 'vla-getboundingbox (list obj 'll 'ur))
            )
          )
          (progn 
            (setq minpt (vlax-safearray->list ll)
                  maxpt (vlax-safearray->list ur)
                  w     (abs (- (car maxpt) (car minpt)))
                  h     (abs (- (cadr maxpt) (cadr minpt)))
                  area  (* w h)
                  ratio (if (and (> h 0) (> w 0)) (/ (max w h) (min w h)) 0)
            )

            ;; 识别图框特征参数
            (if (and (> area 15000) (> ratio 1.1) (< ratio 1.8) (> w 50) (> h 50)) 
              (progn 
                (setq cx (/ (+ (car minpt) (car maxpt)) 2.0))
                (setq box_list (cons (list area ent minpt maxpt cx) box_list))
              )
            )
          )
        )
      )

      ;; 剔除套件重叠的内框
      (setq box_list (vl-sort box_list '(lambda (a b) (> (car a) (car b)))))
      (setq final_list '())

      (foreach box box_list 
        (setq is_inside nil
              minpt     (nth 2 box)
              maxpt     (nth 3 box)
              cx        (nth 4 box)
              cy        (/ (+ (cadr minpt) (cadr maxpt)) 2.0)
        )
        (foreach f_box final_list 
          (setq f_p1 (nth 2 f_box)
                f_p2 (nth 3 f_box)
          )
          (if 
            (and (> cx (car f_p1)) 
                 (< cx (car f_p2))
                 (> cy (cadr f_p1))
                 (< cy (cadr f_p2))
            )
            (setq is_inside T)
          )
        )
        (if (not is_inside) 
          (setq final_list (cons box final_list))
        )
      )

      ;; 3. 判断扫描到的有效图框数量
      (setq page_count (length final_list))

      (if (> page_count 0) 
        (progn 
          ;; 按中心点 X 坐标升序排列（从左到右）
          (setq final_list (vl-sort final_list 
                                    '(lambda (a b) (< (nth 4 a) (nth 4 b)))
                           )
          )

          (setq target_size "A4")

          ;; ==========================================================
          ;; 情况 A：全局仅有 1 张图纸 —— 直接导出目标目录同名 PDF
          ;; ==========================================================
          (if (= page_count 1) 
            (progn 
              (princ (strcat "\n[识别成功] 识别到 1 张图纸，直接输出 A4 至指定目录..."))

              (setq box   (car final_list)
                    ent   (nth 1 box)
                    minpt (nth 2 box)
                    maxpt (nth 3 box)
              )

              ;; 直接导出至固定目录名称
              (export_single_pdf ent minpt maxpt target_size dwg_name)

              ;; 若出图函数默认导出了桌面，将其移动至指定的目标目录
              (setq default_generated (strcat (getenv "USERPROFILE") "\\Desktop\\" dwg_name ".pdf"))
              (if (findfile default_generated)
                (progn
                  (if (findfile target_pdf_path) (vl-file-delete target_pdf_path))
                  (vl-file-copy default_generated target_pdf_path)
                  (vl-file-delete default_generated)
                )
              )

              (princ "\n==================================================")
              (princ (strcat "\n[导出完成！] 单页 A4 PDF 已保存至: " target_pdf_path))
              (princ "\n==================================================\n")

              ;; 发送 HTTP POST 回调请求
              (send_api_analyze (strcat dwg_path file_name) file_name target_pdf_path)
            )

            ;; ==========================================================
            ;; 情况 B：有 2 张及以上图纸 —— 逐页导出并调用 PDF24 合并至目标目录
            ;; ==========================================================
            (progn 
              (princ 
                (strcat "\n[识别成功] 匹配到 " (itoa page_count) " 张图纸，开始按 A4 逐页导出并合并...")
              )

              ;; 创建独立临时工作文件夹
              (setq temp_dir (strcat (getenv "TEMP") 
                                     "\\cad_pdf_merge_a4_"
                                     (rtos (getvar "CDATE") 2 0)
                                     "\\"
                             )
              )
              (if (not (vl-file-directory-p temp_dir)) (vl-mkdir temp_dir))

              (setq idx      1
                    pdf_list '()
              )

              (foreach box final_list 
                (setq ent   (nth 1 box)
                      minpt (nth 2 box)
                      maxpt (nth 3 box)
                )

                (setq custom_name (strcat "temp_page_" 
                                          (if (< idx 10) 
                                            (strcat "00" (itoa idx))
                                            (if (< idx 100) 
                                              (strcat "0" (itoa idx))
                                              (itoa idx)
                                            )
                                          )
                                  )
                )

                (export_single_pdf ent minpt maxpt target_size custom_name)

                (setq default_generated (strcat (getenv "USERPROFILE") "\\Desktop\\" custom_name ".pdf"))
                (setq temp_pdf (strcat temp_dir custom_name ".pdf"))

                (if (findfile default_generated) 
                  (progn 
                    (vl-file-copy default_generated temp_pdf)
                    (vl-file-delete default_generated)
                    (setq pdf_list (cons temp_pdf pdf_list))
                  )
                )

                (setq idx (1+ idx))
              )

              (setq pdf_list (reverse pdf_list))

              ;; 调用 PDF24 进行静默合并至指定的 target_pdf_path
              (if (> (length pdf_list) 0) 
                (progn 
                  (princ (strcat "\n[合并中...] 正在合并 " (itoa (length pdf_list)) " 页 A4 PDF..."))

                  (setq cmd_line (strcat "pdf24-DocTool.exe -join -profile none -outputFile \"" target_pdf_path "\""))

                  (foreach pdf pdf_list 
                    (setq cmd_line (strcat cmd_line " \"" pdf "\""))
                  )

                  (setq shell_obj (vlax-create-object "WScript.Shell"))
                  (vlax-invoke-method shell_obj "Run" cmd_line 0 T)
                  (vlax-release-object shell_obj)

                  ;; 清理临时单页文件
                  (foreach pdf pdf_list 
                    (if (findfile pdf) (vl-file-delete pdf))
                  )

                  (princ "\n==================================================")
                  (princ (strcat "\n[全部完成！] A4 多页合并 PDF 已保存至: " target_pdf_path))
                  (princ "\n==================================================\n")

                  ;; 发送 HTTP POST 回调请求
                  (send_api_analyze (strcat dwg_path file_name) file_name target_pdf_path)
                )
                (princ "\n[错误] 临时单页 PDF 生成失败。")
              )
            )
          )
        )
        (princ "\n[未识别] 全局扫描未找到符合标准的图框。")
      )
    )
    (princ "\n[未识别] 图纸中未找到多段线或面域实体。")
  )
  (setvar "CMDECHO" 1)
  (princ)
)

;; ==========================================================
;; 辅助函数：发送 HTTP POST 请求推送分析数据
;; ==========================================================
(defun send_api_analyze (dwg_file_path file_name pdf_path / http_obj url json_body response_text)
  (vl-load-com)
  (setq url "http://192.168.110.188:3000/api/v1/drawings/analyze")

  ;; 过滤并转义路径中的反斜杠 (适应 JSON 格式)
  (setq dwg_file_path (vl-string-translate "\\" "/" dwg_file_path))
  (setq pdf_path (vl-string-translate "\\" "/" pdf_path))

  ;; 拼接 JSON 请求体
  (setq json_body 
        (strcat "{"
                "\"dwg_file_path\":\"" dwg_file_path "\","
                "\"file_name\":\"" file_name "\","
                "\"pdfPath\":\"" pdf_path "\""
                "}"
        )
  )

  (princ "\n[API 接口请求中...] 正在推送到后台接口...")

  ;; 使用 WinHTTP 发起同步 POST 请求
  (setq http_obj (vl-catch-all-apply 'vlax-create-object '("MSXML2.ServerXMLHTTP.6.0")))
  (if (vl-catch-all-error-p http_obj)
    (setq http_obj (vlax-create-object "WinHttp.WinHttpRequest.5.1"))
  )

  (if http_obj
    (progn
      (vl-catch-all-apply
        '(lambda ()
           ;; 打开 POST 链接
           (vlax-invoke-method http_obj 'open "POST" url :vlax-false)
           ;; 设置 RequestHeader
           (vlax-invoke-method http_obj 'setRequestHeader "Content-Type" "application/json; charset=utf-8")
           ;; 发送 Body 数据
           (vlax-invoke-method http_obj 'send json_body)
           ;; 获取返回响应
           (setq response_text (vlax-get-property http_obj 'responseText))
           (princ (strcat "\n[API 请求成功] 接口返回: " response_text))
         )
      )
      (vlax-release-object http_obj)
    )
    (princ "\n[API 请求失败] 无法创建 HTTP 请求组件。")
  )
)

(princ "\n--- BESA_A4 命令加载成功 (包含新路径导出与接口推送功能) ---")
(princ)
;; ==========================================================
;; 浩辰 CAD 超高速批量遍历文件夹导出 PDF (SCR 脚本版)
;; 命令: BATCH_BESA
;; ==========================================================
(defun c:BATCH_BESA (/ folderPath fileList scrPath fileHandle dwgFile oldFidia) 
  (vl-load-com)

  ;; 1. 获取文件夹
  (setq folderPath (getfolder "请选择包含 DWG 图纸的文件夹:"))

  (if (and folderPath (/= folderPath "")) 
    (progn 
      (setq fileList (vl-directory-files folderPath "*.dwg" 1))

      (if fileList 
        (progn 
          (setq scrPath (strcat folderPath "\\~batch_process.scr"))
          (setq fileHandle (open scrPath "w"))

          ;; 2. 写入脚本内容
          (foreach fileName fileList 
            ;; 处理路径斜杠转换
            (setq dwgFile (vl-string-translate "\\" 
                                               "/"
                                               (strcat folderPath "\\" fileName)
                          )
            )

            ;; 脚本逻辑：打开图纸 -> 执行命令 -> 关闭图纸(不保存)
            (write-line (strcat "OPEN \"" dwgFile "\"") fileHandle)
            (write-line "(c:BESA_ALL)" fileHandle)
            (write-line "CLOSE N" fileHandle)
          )

          (close fileHandle)

          ;; 3. 关闭系统弹窗干扰并运行脚本
          (setq oldFidia (getvar "FILEDIA"))
          (setvar "FILEDIA" 0)
          (command "_.SCRIPT" scrPath)
          (setvar "FILEDIA" oldFidia)

          (princ 
            (strcat "\n[批量处理] 已构建并开始执行 " (itoa (length fileList)) " 个文件的导出任务。")
          )
        )
        (princ "\n[提示] 该文件夹内未找到 DWG 文件。")
      )
    )
    (princ "\n[取消] 未选择文件夹。")
  )
  (princ)
)

;; 辅助函数：弹出 Windows 文件夹选择框
(defun getfolder (msg / shell folder self path) 
  (setq shell (vlax-create-object "Shell.Application"))
  (setq folder (vlax-invoke-method shell 'BrowseForFolder 0 msg 0))
  (if folder 
    (progn 
      (setq self (vlax-get-property folder 'Self))
      (setq path (vlax-get-property self 'Path))
      (vlax-release-object self)
      (vlax-release-object folder)
    )
  )
  (vlax-release-object shell)
  path
)

(princ "\n--- 浩辰 CAD 批量文件夹导出命令 [ BATCH_BESA ] 加载成功 ---")
(princ)