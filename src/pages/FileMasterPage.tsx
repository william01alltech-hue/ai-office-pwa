import toast from 'react-hot-toast';
import { useAppContext } from '../contexts/AppContext';
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { useFileSystem } from '../contexts/FileSystemContext';
import { ObjectImage } from '../components/ObjectImage';
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { marked } from 'marked';
import { Pdf2Docx } from 'pdf2docx-wasm';
import PptxGenJS from 'pptxgenjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// 定義工具分類與項目
const TOOL_CATEGORIES = [
  {
    id: 'pdf',
    name: 'tools.cat_pdf',
    icon: '📄',
    tools: [
      { id: 'merge_pdf', name: 'tools.pdf_merge', desc: 'tools.pdf_merge_desc' },
      { id: 'split_pdf', name: 'tools.pdf_split', desc: 'tools.pdf_split_desc' },
      { id: 'compress_pdf', name: 'tools.pdf_compress', desc: 'tools.pdf_compress_desc' },
      { id: 'pdf_to_word', name: 'tools.pdf_to_office', desc: 'tools.pdf_to_office_desc' },
      { id: 'ocr_pdf_to_office', name: 'tools.ocr_pdf_to_office', desc: 'tools.ocr_pdf_to_office_desc' },
      { id: 'protect_pdf', name: 'tools.pdf_protect', desc: 'tools.pdf_protect_desc' },
    ]
  },
  {
    id: 'image',
    name: 'tools.cat_image',
    icon: '🖼️',
    tools: [
      { id: 'img_to_table', name: 'tools.img_to_table', desc: 'tools.img_to_table_desc' },
      { id: 'remove_bg', name: 'tools.img_remove_bg', desc: 'tools.img_remove_bg_desc' },
      { id: 'convert_img', name: 'tools.img_convert', desc: 'tools.img_convert_desc' },
    ]
  },
  {
    id: 'office',
    name: 'tools.cat_office',
    icon: '📊',
    tools: [
      { id: 'word_to_pdf', name: 'tools.word_to_pdf', desc: 'tools.word_to_pdf_desc' },
      { id: 'excel_to_pdf', name: 'tools.excel_to_pdf', desc: 'tools.excel_to_pdf_desc' },
      { id: 'ppt_to_pdf', name: 'tools.ppt_to_pdf', desc: 'tools.ppt_to_pdf_desc' },
    ]
  },
  {
    id: 'ai',
    name: 'tools.cat_ai',
    icon: '✨',
    tools: [
      { id: 'ai_format', name: 'tools.ai_format', desc: 'tools.ai_format_desc' },
      { id: 'ai_summary', name: 'tools.ai_summary', desc: 'tools.ai_summary_desc' },
    ]
  }
];

const FileMasterPage: React.FC = () => {
  const { t } = useAppContext();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(TOOL_CATEGORIES[0].id);
  const [activeTool, setActiveTool] = useState(TOOL_CATEGORIES[0].tools[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [compressionReport, setCompressionReport] = useState<{
    originalSize: number;
    compressedSize: number;
    blob: Blob;
    fileName: string;
  } | null>(null);
  const [pendingProtectFile, setPendingProtectFile] = useState<File | null>(null);
  const [pendingConvertFile, setPendingConvertFile] = useState<File | null>(null);
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Library ({t('fm.lib_title')}) State
  const { files: virtualFiles, uploadFiles, getFile } = useFileSystem();
  const [selectedLocalFileId, setSelectedLocalFileId] = useState<string | null>(null);
  const [selectedLocalFile, setSelectedLocalFile] = useState<File | null>(null);
  const [isMounting, setIsMounting] = useState(false);
  const localFileInputRef = useRef<HTMLInputElement>(null);

  // Task Queue State
  const [tasks, setTasks] = useState<{id: string; title: string; progress: number; status: 'processing'|'completed'|'error'|'cancelled'}[]>([]);

  const runWithTask = async (title: string, asyncFunc: () => Promise<void>) => {
    const taskId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random();
    setTasks(prev => [...prev, { id: taskId, title, progress: 0, status: 'processing' }]);
    
    const interval = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.id === taskId && t.status === 'processing' && t.progress < 90) {
          return { ...t, progress: Math.min(90, t.progress + Math.random() * 20 + 5) };
        }
        return t;
      }));
    }, 500);

    try {
      await asyncFunc();
      clearInterval(interval);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: 100, status: 'completed' } : t));
    } catch (e) {
      clearInterval(interval);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t));
      console.error(e);
      throw e;
    }
  };

  const cancelTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t));
  };

  // Resizable Sidebars State
  const [fileLibraryWidth, setFileLibraryWidth] = useState(256); // w-64
  const [previewWidth, setPreviewWidth] = useState(288); // w-72

  // Panel Visibility State
  const [showFileLibrary, setShowFileLibrary] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [showMainWorkspace, setShowMainWorkspace] = useState(true);
  const [targetFormat, setTargetFormat] = useState<'doc' | 'csv' | 'ppt'>('csv');

  // AI Mock States
  const [aiSummaryResult, setAiSummaryResult] = useState<{
    file: File;
    summary: string[];
    tool?: any;
  } | null>(null);

  const handleDragStart = (e: React.MouseEvent, width: number, setter: React.Dispatch<React.SetStateAction<number>>, min: number, max: number, reverse: boolean = false) => {
    e.preventDefault();
    const startX = e.clientX;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = reverse ? width - deltaX : width + deltaX;
      setter(Math.max(min, Math.min(max, newWidth)));
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // {t('fm.mount_folder')}
  const handleMountDirectory = async () => {
    try {
      setIsMounting(true);
            const dirHandle = await window.showDirectoryPicker();
      const files: File[] = [];
      for await (const entry of (dirHandle as unknown as { values: () => AsyncIterableIterator<{ kind: string; getFile: () => Promise<File>; name: string }> }).values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          // 在這裡可以不限制副檔名，或者只限制常見文件與圖片
          if (file.name.match(/\.(png|jpe?g|webp|gif|pdf|docx?|xlsx?|pptx?)$/i)) {
            files.push(file);
          }
        }
      }
      uploadFiles(files);
      if (files.length > 0) {
        setSelectedLocalFile(files[0]);
      }
    } catch (err) {
      console.error(`掛載資料夾失敗或${t('fm.cancel')}:`, err);
    } finally {
      setIsMounting(false);
    }
  };

  // 處理單檔上傳至{t('fm.lib_title')}
  const handleLocalFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      uploadFiles(files);
      setSelectedLocalFile(files[0]);
    }
  };

  // 處理 PDF 合併邏輯
  const mergePdfs = (files: File[]) => {
    if (files.length < 2) {
      toast(t("err.pdf_two"));
      return;
    }

    runWithTask(`${t("task.merge_pdf")}`, async () => {
      const pdfFiles = files.filter(f => f.type === 'application/pdf');
      if (pdfFiles.length === 0) return;

      const fileData = await Promise.all(
        pdfFiles.map(async f => ({
          name: f.name,
          buffer: await f.arrayBuffer()
        }))
      );

      const worker = new Worker(new URL('../workers/pdfWorker.ts', import.meta.url), { type: 'module' });
      const id = crypto.randomUUID();

      worker.onmessage = (e) => {
        const res = e.data;
        if (res.id === id && res.success) {
          triggerDownload(res.data, `Merged_SyncCore_Document_${Date.now()}.pdf`);
        } else if (!res.success) {
          console.error('Worker error:', res.error);
          toast(t("err.merge_fail"));
        }
        worker.terminate();
      };

      worker.postMessage({ id, action: 'merge', files: fileData });
    });
  };

  const splitPdf = (files: File[]) => {
    files.forEach(file => {
      if (file.type !== 'application/pdf') {
        return;
      }

      runWithTask(`${t("task.split_pdf").replace("{0}", file.name)}`, async () => {
        const worker = new Worker(new URL('../workers/pdfWorker.ts', import.meta.url), { type: 'module' });
        const id = crypto.randomUUID();
        
        worker.onmessage = (e) => {
          const res = e.data;
          if (res.id === id && res.success) {
            const folderName = file.name.replace('.pdf', '') + '_split';
            triggerDownload(res.data, `${folderName}.zip`);
          } else if (!res.success) {
            console.error('Worker error:', res.error);
            toast(t("err.split_fail"));
          }
          worker.terminate();
        };

        worker.postMessage({ 
          id, 
          action: 'split', 
          files: [{ name: file.name, buffer: await file.arrayBuffer() }] 
        });
      });
    });
  };

  const compressPdf = (files: File[]) => {
    files.forEach(file => {
      if (file.type !== 'application/pdf') return;

      runWithTask(`${t("task.compress_pdf").replace("{0}", file.name)}`, async () => {
        const worker = new Worker(new URL('../workers/pdfWorker.ts', import.meta.url), { type: 'module' });
        const id = crypto.randomUUID();
        
        worker.onmessage = (e) => {
          const res = e.data;
          if (res.id === id && res.success) {
            triggerDownload(res.data, file.name.replace('.pdf', '') + '_compressed.pdf');
          } else if (!res.success) {
            console.error('Worker error:', res.error);
            toast(t("err.compress_fail"));
          }
          worker.terminate();
        };

        worker.postMessage({ 
          id, 
          action: 'compress', 
          files: [{ name: file.name, buffer: await file.arrayBuffer() }] 
        });
      });
    });
  };

  // 處理 PDF 保全邏輯 (需要密碼輸入)
  const executeProtectPdf = () => {
    if (!pendingProtectFile || !pwd) return;
    
    if (pwd !== pwdConfirm) {
      toast(t("err.pwd_mismatch"));
      return;
    }
    if (pwd.length < 4) {
      toast(t("err.pwd_short"));
      return;
    }

    const file = pendingProtectFile;
    runWithTask(`${t("task.encrypt_pdf").replace("{0}", file.name)}`, async () => {
      // 模擬處理時間
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pdfBytes = await pdf.save(); // fake protection

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.replace('.pdf', '') + '_protected.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setPendingProtectFile(null);
      setPwd('');
      setPwdConfirm('');
    });
  };

  // 處理 Office 轉 PDF 邏輯 (UX 流程模擬)
  const convertOfficeToPdf = (files: File[], type: 'word' | 'excel' | 'ppt') => {
    files.forEach(file => {
      const name = file.name.toLowerCase();
      
      // 防呆驗證
      if (type === 'word' && !name.endsWith('.doc') && !name.endsWith('.docx')) {
        toast(t("err.need_word"));
        return;
      }
      if (type === 'excel' && !name.endsWith('.xls') && !name.endsWith('.xlsx') && !name.endsWith('.csv')) {
        toast(t("err.need_excel"));
        return;
      }
      if (type === 'ppt' && !name.endsWith('.ppt') && !name.endsWith('.pptx')) {
        toast(t("err.need_ppt"));
        return;
      }

      runWithTask(`${t("task.to_pdf").replace("{0}", type.toUpperCase()).replace("{1}", file.name)}`, async () => {
        // 模擬處理時間 (假裝後端正在跑 LibreOffice 轉換)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 產生一份帶有文字的臨時 PDF 檔案作為 Demo 結果
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const page = pdfDoc.addPage([600, 400]);
        
        page.drawText('SyncCore Office Converter', {
          x: 50,
          y: 320,
          size: 30,
          font,
          color: rgb(0.1, 0.5, 0.8),
        });

        page.drawText(`Successfully converted from:`, {
          x: 50,
          y: 260,
          size: 16,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText(file.name, {
          x: 50,
          y: 230,
          size: 20,
          font,
          color: rgb(0.8, 0.2, 0.2),
        });
        
        page.drawText('Note: This is a frontend simulation. Real backend conversion required.', {
          x: 50,
          y: 100,
          size: 12,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name.substring(0, file.name.lastIndexOf('.')) + '_converted.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    });
  };

  // 處理圖片格式轉換 (Canvas & pdf-lib)
  const executeConvertFormat = (targetFormat: 'jpeg' | 'png' | 'webp' | 'pdf') => {
    if (!pendingConvertFile) return;

    const file = pendingConvertFile;
    const originalName = file.name.substring(0, file.name.lastIndexOf('.'));

    runWithTask(`${t("task.convert_img").replace("{0}", file.name)}`, async () => {
      
      if (targetFormat === 'pdf') {
        // 圖片轉 PDF
        const imageBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.create();
        
        // 判斷原圖格式以決定載入方式
        let image;
        if (file.type === 'image/jpeg') {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          // WebP 或其他格式需先轉成 PNG，這裡為求穩定，先使用 Canvas 轉出 PNG blob
          const bmp = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          canvas.width = bmp.width;
          canvas.height = bmp.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(bmp, 0, 0);
          
          const pngBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!pngBlob) throw new Error(t("err.webp_fail"));
          const pngBuffer = await pngBlob.arrayBuffer();
          image = await pdfDoc.embedPng(pngBuffer);
        }

        // 建立與圖片等比例的頁面
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        triggerDownload(blob, `${originalName}_converted.pdf`);
        
      } else {
        // 圖片轉圖片 (透過 Canvas)
        const bmp = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext('2d');
        
        // 如果轉成 jpeg，背景填白以防透明部分變黑
        if (targetFormat === 'jpeg') {
          ctx!.fillStyle = '#ffffff';
          ctx!.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx?.drawImage(bmp, 0, 0);

        const mimeType = `image/${targetFormat}`;
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, 0.92));
        
        if (!blob) throw new Error(t("err.conv_fail"));
        triggerDownload(blob, `${originalName}_converted.${targetFormat === 'jpeg' ? 'jpg' : targetFormat}`);
      }
      
      setPendingConvertFile(null);
    });
  };


  // 真實圖片去背
  const executeRemoveBg = (files: File[]) => {
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast(`${file.name} ${t("err.need_img")}`);
        return;
      }

      runWithTask(`${t("task.remove_bg").replace("{0}", file.name)}`, async () => {
        try {
          const imageBlob = await imglyRemoveBackground(file);
          const outName = file.name.substring(0, file.name.lastIndexOf('.')) + '_nobg.png';
          triggerDownload(imageBlob, outName);
        } catch (e: any) {
          console.error(e);
          toast(t('fm.err_process').replace('{0}', file.name).replace('{1}', e.message));
        }
      });
    });
  };

  // 真實 AI 長文件摘要
  const executeAiSummary = (files: File[]) => {
    files.forEach(file => {
      const isPdf = file.name.match(/\.pdf$/i);
      const isDocx = file.name.match(/\.docx$/i);
      const isTxtCsv = file.name.match(/\.(txt|csv)$/i);

      if (!isPdf && !isDocx && !isTxtCsv) {
        toast(t('fm.err_unsupported_extract').replace('{0}', file.name));
        return;
      }

      runWithTask(`${t("task.ai_summary").replace("{0}", file.name)}`, async () => {
        let extractedText = '';
        
        try {
          if (isTxtCsv) {
            extractedText = await file.text();
          } else if (isDocx) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            extractedText = result.value;
          } else if (isPdf) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            // 最多只讀取前 15 頁，避免瀏覽器當掉
            const maxPages = Math.min(pdfDoc.numPages, 15);
            for (let i = 1; i <= maxPages; i++) {
              const page = await pdfDoc.getPage(i);
              const textContent = await page.getTextContent();
                            const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\\n';
            }
            extractedText = fullText;
          }

          if (!extractedText || extractedText.trim().length === 0) {
            throw new Error(t('fm.err_no_text'));
          }

          // 限制字數，避免 Token 爆掉 (約 6000 字元)
          const textToSummarize = extractedText.substring(0, 6000);
          
          const prompt = `You are a professional assistant. Please summarize the following document content in Traditional Chinese.
Output ONLY a bulleted list of 3 to 5 core conclusions or key points. Do not include introductory phrases.

Document content:
${textToSummarize}`;

          const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'qwen2.5-coder:32b',
              prompt: prompt,
              stream: false
            })
          });

          if (!response.ok) throw new Error(t('fm.err_ai_conn'));
          
          const data = await response.json();
          const summaryText = data.response.trim();
          
          // 解析 AI 回傳的 bullet points
          const summaryLines = summaryText.split('\\n')
            .map((line: string) => line.replace(/^[-*•\\d.]\\s*/, '').trim())
            .filter((line: string) => line.length > 0);

          setAiSummaryResult({
            file,
            summary: summaryLines.length > 0 ? summaryLines : [summaryText]
          });
        } catch (e: any) {
          console.error(e);
          toast(t('fm.err_process').replace('{0}', file.name).replace('{1}', e.message));
        }
      });
    });
  };

  // 真實 原生 PDF 轉 WORD
  const executePdfToWord = (files: File[]) => {
    files.forEach(file => {
      if (file.type !== 'application/pdf' && !file.name.match(/\.pdf$/i)) {
        toast(t('fm.err_pdf_invalid'));
        return;
      }

      runWithTask(t('fm.task_pdf2word').replace('{0}', file.name), async () => {
        try {
          const converter = new Pdf2Docx('/pdf2docx-wasm/');
          const blob = await converter.convert(file, undefined);
          const outName = file.name.substring(0, file.name.lastIndexOf('.')) + '.docx';
          triggerDownload(blob, outName);
        } catch (e: any) {
          console.error(e);
          toast(t('fm.err_convert').replace('{0}', file.name).replace('{1}', e.message));
        }
      });
    });
  };

  // 真實 Python Marker OCR 萃取
  const executeMarkerExtraction = (files: File[], toolId: string) => {
    files.forEach(file => {
      runWithTask(`${toolId === 'img_to_table' ? t('fm.task_img2table') : t('fm.task_pdfimg2word')}: ${file.name}`, async () => {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('http://localhost:8000/api/extract', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || t('fm.err_py_conn'));
          }

          const data = await response.json();
          if (data.status !== 'success') {
            throw new Error(data.message);
          }

          const markdownResult = data.markdown;

          if (toolId === 'img_to_table') {
            if (targetFormat === 'csv') {
              // 嘗試從 Markdown 中提取表格轉為 CSV
              const lines = markdownResult.split('\n');
              let csvLines = [];
              let inTable = false;
              
              for (let line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                  inTable = true;
                  // 忽略分隔線
                  if (trimmed.match(/^\|[\s-:]+\|/)) continue;
                  
                  const cells = trimmed.substring(1, trimmed.length - 1).split('|').map((c: any) => {
                    const val = c.trim().replace(/"/g, '""');
                    return `"${val}"`;
                  });
                  csvLines.push(cells.join(','));
                } else if (inTable && trimmed === '') {
                  inTable = false;
                }
              }

              let finalContent = csvLines.join('\n');
              let outName = file.name.substring(0, file.name.lastIndexOf('.')) + '.csv';
              let blobType = 'text/csv;charset=utf-8';

              if (csvLines.length === 0) {
                finalContent = markdownResult;
                outName = file.name.substring(0, file.name.lastIndexOf('.')) + '.md';
                blobType = 'text/markdown;charset=utf-8';
                toast(t('fm.warn_no_table'));
              } else {
                finalContent = '\uFEFF' + finalContent; // Add UTF-8 BOM
              }

              const blob = new Blob([finalContent], { type: blobType });
              triggerDownload(blob, outName);
            } else if (targetFormat === 'doc') {
              const htmlBody = await marked.parse(markdownResult);
              const htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>OCR Document</title>
  <style>
    table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
    th, td { border: 1px solid black; padding: 8px; text-align: left; }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;
              const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
              const outName = file.name.substring(0, file.name.lastIndexOf('.')) + '.doc';
              triggerDownload(blob, outName);
            } else if (targetFormat === 'ppt') {
              const pres = new PptxGenJS();
              const slide = pres.addSlide();
              slide.addText(t('fm.ai_extract_title'), { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '363636' });

              const lines = markdownResult.split('\n');
              let tableRows = [];
              let nonTableText = [];
              
              for (let line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                  if (trimmed.match(/^\|[\s-:]+\|/)) continue; // 忽略分隔線
                  
                  const cells = trimmed.substring(1, trimmed.length - 1).split('|').map((c: any) => {
                     // 把 <br> 換成真正的換行符號
                     return c.trim().replace(/<br\s*\/?>/gi, '\n');
                  });
                  tableRows.push(cells);
                } else if (trimmed !== '') {
                  nonTableText.push(trimmed);
                }
              }

              if (tableRows.length > 0) {
                 slide.addTable(tableRows, { 
                   x: 0.5, y: 1.2, w: '90%', 
                   border: { pt: 1, color: "000000" }, 
                   fill: { color: "F7F7F7", type: "solid" }, 
                   fontSize: 12,
                   valign: "middle"
                 });
              }
              
              if (nonTableText.length > 0) {
                 // 增加行高的估算值，避免非表格文字覆蓋到表格上方
                 const textY = tableRows.length > 0 ? 1.2 + (tableRows.length * 0.8) : 1.2;
                 slide.addText(nonTableText.join('\n'), { x: 0.5, y: textY, w: '90%', fontSize: 12, color: '666666' });
              }

              const pptxBuf = await pres.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
              const blob = new Blob([pptxBuf], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
              const outName = file.name.substring(0, file.name.lastIndexOf('.')) + '.pptx';
              triggerDownload(blob, outName);
            }

          } else {
            // ocr_pdf_to_office
            const htmlBody = await marked.parse(markdownResult);
            const htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>OCR Document</title>
</head>
<body>
  ${htmlBody}
</body>
</html>`;
            // 輸出 HTML 格式但副檔名為 .doc，讓 Word 原生開啟並渲染排版
            const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
            const outName = file.name.substring(0, file.name.lastIndexOf('.')) + '_ocr.doc';
            triggerDownload(blob, outName);
          }
        } catch (e: any) {
          console.error(e);
          toast(t('fm.err_py_server').replace('{0}', file.name).replace('{1}', e.message));
        }
      });
    });
  };

  // 真實 AI 自動排版
  const executeAiFormat = (files: File[]) => {
    files.forEach(file => {
      const isPdf = file.name.match(/\\.pdf$/i);
      const isDocx = file.name.match(/\\.docx$/i);
      const isTxtCsv = file.name.match(/\\.(txt|csv)$/i);

      if (!isPdf && !isDocx && !isTxtCsv) {
        toast(t('fm.err_unsupported_extract').replace('{0}', file.name));
        return;
      }

      runWithTask(t('fm.task_ai_format').replace('{0}', file.name), async () => {
        let extractedText = '';
        
        try {
          if (isTxtCsv) {
            extractedText = await file.text();
          } else if (isDocx) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            extractedText = result.value;
          } else if (isPdf) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            const maxPages = Math.min(pdfDoc.numPages, 15);
            for (let i = 1; i <= maxPages; i++) {
              const page = await pdfDoc.getPage(i);
              const textContent = await page.getTextContent();
                            const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\\n';
            }
            extractedText = fullText;
          }

          if (!extractedText || extractedText.trim().length === 0) {
            throw new Error(t('fm.err_no_text'));
          }

          // 限制字數，避免 Token 爆掉 (約 8000 字元)
          const textToFormat = extractedText.substring(0, 8000);
          
          const prompt = `You are a professional document formatting assistant. Please reorganize the following text into a clean, highly readable Markdown format in Traditional Chinese.
Add appropriate H1/H2/H3 headings, use bullet points where suitable, format important terms in bold, and fix any obvious typos or missing punctuations.
Do not add any conversational responses like "Here is the formatted text", output ONLY the valid Markdown content.

Original Text:
${textToFormat}`;

          const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'qwen2.5-coder:32b',
              prompt: prompt,
              stream: false
            })
          });

          if (!response.ok) throw new Error(t('fm.err_ai_conn'));
          
          const data = await response.json();
          let markdownResult = data.response.trim();
          
          if (markdownResult.startsWith('```markdown')) {
            markdownResult = markdownResult.replace(/^```markdown\n?/, '').replace(/\n?```$/, '');
          }

          const htmlBody = await marked.parse(markdownResult);

          const htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>{t("doc.ai_layout")}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      background: #f1f5f9;
    }
    .container {
      background: #fff;
      padding: 50px 60px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    h1, h2, h3 { color: #1e3a8a; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0; }
    h2 { margin-top: 30px; }
    ul, ol { padding-left: 24px; }
    li { margin-bottom: 8px; }
    strong { color: #0f172a; }
    p { margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    ${htmlBody}
  </div>
</body>
</html>`;

          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          const outName = file.name.substring(0, file.name.lastIndexOf('.')) + '_formatted.html';
          triggerDownload(blob, outName);

        } catch (e: any) {
          console.error(e);
          toast(t('fm.err_process').replace('{0}', file.name).replace('{1}', e.message));
        }
      });
    });
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processFiles = (files: File[]) => {
    if (activeTool.id === 'merge_pdf') {
      mergePdfs(files);
    } else if (activeTool.id === 'split_pdf') {
      splitPdf(files);
    } else if (activeTool.id === 'compress_pdf') {
      compressPdf(files);
    } else if (activeTool.id === 'protect_pdf') {
      if (files.length !== 1) {
        toast(t('fm.err_single_pdf'));
        return;
      }
      if (files[0].type !== 'application/pdf') {
        toast(t('fm.err_pdf_invalid'));
        return;
      }
      // 攔截：設定為 pending 狀態，觸發密碼輸入 UI
      setPendingProtectFile(files[0]);
    } else if (activeTool.id === 'convert_img') {
      if (files.length !== 1) {
        toast(t('fm.err_single_img'));
        return;
      }
      if (!files[0].type.startsWith('image/')) {
        toast(t('fm.err_invalid_img'));
        return;
      }
      setPendingConvertFile(files[0]);
    } else if (activeTool.id === 'word_to_pdf') {
      convertOfficeToPdf(files, 'word');
    } else if (activeTool.id === 'excel_to_pdf') {
      convertOfficeToPdf(files, 'excel');
    } else if (activeTool.id === 'ppt_to_pdf') {
      convertOfficeToPdf(files, 'ppt');
    } else if (activeTool.id === 'pdf_to_word') {
      executePdfToWord(files);
    } else if (activeTool.id === 'ocr_pdf_to_office' || activeTool.id === 'img_to_table') {
      executeMarkerExtraction(files, activeTool.id);
    } else if (activeTool.id === 'ai_format') {
      executeAiFormat(files);
    } else if (activeTool.id === 'remove_bg') {
      executeRemoveBg(files);
    } else if (activeTool.id === 'ai_summary') {
      executeAiSummary(files);
    } else {
      toast(t('fm.err_not_impl').replace('{0}', String(t(activeTool.name as string))));
    }
  };

  // 處理拖曳事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
      processFiles(Array.from(e.target.files));
    }
    // 重置 input，讓使用者可以重複選取相同的檔案
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getToggleClass = (isActive: boolean) => {
    return isActive 
      ? "px-3 py-1.5 bg-blue-500 text-white font-bold rounded-xl shadow-md ring-2 ring-blue-500 ring-offset-1 flex items-center gap-2 transition-all text-sm"
      : "px-3 py-1.5 bg-[#f4f6f8] text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-200 transition-all flex items-center gap-2 text-sm";
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative flex flex-col">
      
      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight leading-none">FileMaster</h1>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">{t('fm.title_center')}</p>
            </div>
          </div>
          
          <div className="h-5 w-px bg-slate-300/50 mx-2"></div>
          
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-600 dark:text-white hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-bold text-sm mr-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            {t('fm.back_dash')}
          </button>
          
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          
          {/* Dropdown Menus */}
          <nav className="flex items-center gap-2">
            {TOOL_CATEGORIES.map(category => (
              <div key={category.id} className="relative group">
                <button className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${activeCategory === category.id ? 'bg-slate-100 dark:bg-slate-700 text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                  <span>{category.icon}</span> {t(category.name)}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
                
                {/* Dropdown Content */}
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left z-50">
                  <div className="p-2 flex flex-col gap-1">
                    {category.tools.map(tool => {
                      const isAITool = ['ocr_pdf_to_office', 'img_to_table', 'remove_bg', 'ai_format', 'ai_summary'].includes(tool.id);
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setActiveCategory(category.id);
                            setActiveTool(tool);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex flex-col gap-0.5 ${
                            isAITool
                              ? 'bg-gradient-to-r from-[#a05cf5] to-[#7a6df5] shadow-[0_2px_10px_rgba(160,92,245,0.3)] text-white hover:from-[#904ce5] hover:to-[#6a5de5] hover:shadow-[0_4px_12px_rgba(160,92,245,0.4)] border border-white/20'
                              : (activeTool.id === tool.id 
                                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white')
                          }`}
                        >
                          <span className={`font-bold text-sm flex items-center gap-1.5`}>
                            {isAITool && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-300 drop-shadow-md animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                              </svg>
                            )}
                            {isAITool && !t(tool.name).startsWith('AI') ? `AI ${t(tool.name)}` : t(tool.name)}
                          </span>
                          <span className={`text-[10px] ${isAITool ? 'text-indigo-100' : (activeTool.id === tool.id ? 'text-emerald-600/70' : 'text-slate-400')}`}>
                            {t(tool.desc)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </nav>
        </div>
        
        {/* Toggle Buttons */}
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFileLibrary(!showFileLibrary)} className={getToggleClass(showFileLibrary)}>
            <span className="text-lg leading-none">📁</span> {t('fm.lib_title')}
          </button>
          <button onClick={() => setShowPreview(!showPreview)} className={getToggleClass(showPreview)}>
            <span className="text-lg leading-none">👁️</span> {t('fm.preview_import')}
          </button>
          
          <div className="h-6 w-px bg-slate-300 mx-1"></div>
          
          <button onClick={() => setShowMainWorkspace(!showMainWorkspace)} className={getToggleClass(showMainWorkspace)}>
            <span className="text-lg leading-none">🎨</span> {t('fm.main_interactive')}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">

      {/* 第二欄：{t('fm.lib_title')} (File Library) */}
      {showFileLibrary && (
      <aside style={{ width: fileLibraryWidth }} className="bg-[#82aef5] dark:bg-blue-900/40 border-r border-blue-400/30 dark:border-blue-800/50 flex flex-col h-full shadow-sm z-10 shrink-0 relative">
        <div 
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
          onMouseDown={(e) => handleDragStart(e, fileLibraryWidth, setFileLibraryWidth, 200, 500, false)}
        />
        <div className="p-4 border-b border-blue-400/20 dark:border-blue-800/50 text-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight mb-3">{t('fm.lib_title')}</h2>
          <button 
            onClick={handleMountDirectory}
            className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white font-bold py-2 rounded-lg mb-2 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <span className="text-base">📁</span> {t('fm.mount_folder')}
          </button>
          <button 
            onClick={() => localFileInputRef.current?.click()}
            className="w-full bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold py-2 rounded-lg transition-colors border border-blue-400/30 dark:border-blue-800/50 text-sm"
          >
            + {t('fm.single_upload')}
          </button>
          <input type="file" className="hidden" ref={localFileInputRef} onChange={handleLocalFileInput} />
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-700/70 dark:text-white/70 mb-2 uppercase tracking-wider">{t('fm.mounted_dir')}</h3>
          {virtualFiles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-700/50 dark:text-white/50 text-sm font-medium">
              {isMounting ? t('fm.loading') : t('fm.no_file')}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {virtualFiles.map((file) => (
                <button 
                  key={file.id} 
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 truncate transition-colors ${
                    selectedLocalFileId === file.id 
                      ? 'bg-blue-500/20 dark:bg-blue-500/30 text-slate-800 dark:text-white font-bold border border-blue-500/30 shadow-sm' 
                      : 'text-slate-700 dark:text-white hover:bg-white/30 dark:hover:bg-white/10'
                  }`}
                  onClick={async () => {
                    setSelectedLocalFileId(file.id);
                    // Fetch real file
                    const f = await getFile(file.id);
                    if (f) setSelectedLocalFile(f);
                  }}
                  title={file.name}
                >
                  <span className="text-lg shrink-0">
                    {file.type.startsWith('image/') ? '🖼️' : file.name.endsWith('.pdf') ? '📄' : '📝'}
                  </span>
                  <span className="truncate flex-1">{file.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
      )}

      {/* 第三欄：{t('fm.preview_title')} */}
      {showPreview && (
      <aside style={{ width: previewWidth }} className="bg-[#9bbaf5] dark:bg-blue-800/40 border-r border-blue-400/30 dark:border-blue-700/50 flex flex-col h-full shadow-sm z-10 shrink-0 relative">
        <div 
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
          onMouseDown={(e) => handleDragStart(e, previewWidth, setPreviewWidth, 200, 500, false)}
        />
        <div className="p-4 border-b border-blue-400/20 dark:border-blue-700/50 text-center bg-white/10 dark:bg-slate-900/10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{t('fm.preview_title')}</h2>
        </div>
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
          {selectedLocalFile ? (
            <div className="flex flex-col items-center">
              <p className="text-sm font-bold text-slate-800 mb-3 text-center w-full break-all" title={selectedLocalFile.name}>
                {t('fm.file_name').replace('{0}', selectedLocalFile.name)}
              </p>
              
              {/* Actions */}
              <div className="flex flex-col w-full gap-2 mb-6">
                <button 
                  onClick={() => processFiles([selectedLocalFile])}
                  className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white font-bold py-2 rounded-lg shadow-sm transition-colors text-sm"
                >
                  {t('fm.apply_tool')}
                </button>
                <button 
                  onClick={() => {
                    // Generate pseudo-random ID to open Editor
                    const fileId = Date.now().toString();
                    let type = 'excel';
                    if (selectedLocalFile.name.match(/\.(doc|docx)$/i)) type = 'word';
                    if (selectedLocalFile.name.match(/\.(ppt|pptx)$/i)) type = 'ppt';
                    navigate(`/${type}/${fileId}`);
                  }}
                  className="w-full bg-[#06C755] hover:bg-green-600 text-white font-bold py-2 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-1"
                >
                  {t('fm.open_editor')}
                </button>
              </div>

              {/* Preview */}
              <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[200px]">
                {selectedLocalFile.type.startsWith('image/') ? (
                  <ObjectImage file={selectedLocalFile} className="w-full h-auto object-contain" />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
                    <span className="text-4xl mb-2">
                      {selectedLocalFile.name.endsWith('.pdf') ? '📄' : '📝'}
                    </span>
                    <span className="text-xs font-bold uppercase">{t('fm.doc_type').replace('{0}', selectedLocalFile.name.split('.').pop() || '')}</span>
                    <span className="text-xs mt-1">{t('fm.preview_img_only')}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-center text-slate-700/50 text-sm font-medium text-center px-4">
               <span dangerouslySetInnerHTML={{ __html: t('fm.preview_hint') }} />
             </div>
          )}
        </div>
      </aside>
      )}

      {/* 第四欄：{t('fm.main_interactive')} */}
      {showMainWorkspace && (
      <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
        
        {/* 裝飾性背景光暈 */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 blur-[100px] pointer-events-none"></div>

        <div className="flex-1 flex flex-col items-center justify-center p-12 relative z-10">
          
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-4 tracking-tight">{t(activeTool.name)}</h2>
            <p className="text-lg text-slate-500 dark:text-white max-w-xl mx-auto">{t("fm.desc_suffix").replace("{0}", String(t(activeTool.desc)))}</p>
          </div>

          {/* 格式選擇器 (僅當 activeTool 為 img_to_table 時顯示) */}
          {activeTool.id === 'img_to_table' && !compressionReport && !pendingProtectFile && !pendingConvertFile && (
            <div className="flex flex-wrap justify-center gap-4 mb-8 bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 backdrop-blur-sm z-20 relative">
              <button 
                onClick={() => setTargetFormat('doc')}
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${targetFormat === 'doc' ? 'bg-blue-500 text-white shadow-md scale-105' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <span className="text-xl">📄</span> {t('fm.to_doc')}
              </button>
              <button 
                onClick={() => setTargetFormat('csv')}
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${targetFormat === 'csv' ? 'bg-emerald-500 text-white shadow-md scale-105' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <span className="text-xl">📊</span> {t('fm.to_table')}
              </button>
              <button 
                onClick={() => setTargetFormat('ppt')}
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${targetFormat === 'ppt' ? 'bg-orange-500 text-white shadow-md scale-105' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <span className="text-xl">📽️</span> {t('fm.to_ppt')}
              </button>
            </div>
          )}

          {/* 拖曳上傳區 (Drag & Drop Zone) */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-2xl h-80 rounded-3xl border-3 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer
              ${isDragging
                ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 scale-105 shadow-2xl' 
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-400 hover:shadow-xl hover:bg-slate-50/50 dark:hover:bg-slate-700/50'
              }
            `}
          >
            {/* 隱藏的檔案輸入框 */}
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileInput} 
              accept={activeTool.id.includes('pdf') ? '.pdf' : 'image/*, .doc, .docx, .ppt, .pptx, .xls, .xlsx'}
            />

            {compressionReport ? (
              <div className="flex flex-col items-center w-full px-12 z-20">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-6">{t('fm.compress_success')}</h3>
                
                <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 mb-8 flex justify-between items-center relative overflow-hidden">
                  <div className="text-center z-10">
                    <p className="text-sm text-slate-500 dark:text-white font-bold mb-1">{t('fm.original_size')}</p>
                    <p className="text-xl font-black text-slate-700 dark:text-white">{(compressionReport.originalSize / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="z-10 flex flex-col items-center">
                    <span className="text-emerald-500 dark:text-emerald-400 font-bold text-sm bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-full mb-1">
                      {t('fm.reduce_pct').replace('{0}', String(Math.round((1 - compressionReport.compressedSize / compressionReport.originalSize) * 100)))}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-300 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </div>
                  <div className="text-center z-10">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold mb-1">{t('fm.compressed_size')}</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{(compressionReport.compressedSize / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400 dark:bg-emerald-600 opacity-5 dark:opacity-10 rounded-full blur-2xl"></div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompressionReport(null);
                    }} 
                    className="bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-2.5 rounded-full font-bold transition-all"
                  >
                    {t('fm.reupload')}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = URL.createObjectURL(compressionReport.blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = compressionReport.fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      setCompressionReport(null);
                    }} 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-full font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    {t('fm.download_zip')}
                  </button>
                </div>
              </div>
            ) : pendingProtectFile ? (
              <div className="flex flex-col items-center w-full max-w-md px-8 z-20" onClick={(e) => e.stopPropagation()}>
                <div className="w-16 h-16 bg-slate-800 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 shadow-lg text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t('fm.set_pwd_title')}</h3>
                <p className="text-slate-500 dark:text-white text-sm mb-6 max-w-xs text-center truncate">{pendingProtectFile.name}</p>
                
                <div className="w-full space-y-4 mb-8">
                  <div className="relative">
                    <input 
                      type={showPwd ? "text" : "password"} 
                      placeholder={t('fm.pwd_placeholder1')}
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/50 transition-all text-slate-700 dark:text-white"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPwd ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.274 5.943 5.065 3 10 3s8.726 2.943 9.542 7c-.816 4.057-4.606 7-9.542 7S1.274 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showPwd ? "text" : "password"} 
                      placeholder={t('fm.pwd_placeholder2')}
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      className={`w-full bg-slate-50 dark:bg-slate-700/50 border rounded-xl px-4 py-3 outline-none focus:ring-2 transition-all text-slate-700 dark:text-white
                        ${pwdConfirm && pwd !== pwdConfirm ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/50' : 'border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-900/50'}
                      `}
                    />
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => {
                      setPendingProtectFile(null);
                      setPwd('');
                      setPwdConfirm('');
                    }} 
                    className="flex-1 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-full font-bold transition-all"
                  >
                    {t('fm.cancel')}
                  </button>
                  <button 
                    onClick={executeProtectPdf}
                    className={`flex-1 text-white py-3 rounded-full font-bold shadow-lg transition-all
                      ${pwd.length >= 4 && pwd === pwdConfirm ? 'bg-slate-800 hover:bg-slate-900 hover:-translate-y-0.5' : 'bg-slate-300 cursor-not-allowed'}
                    `}
                  >
                    {t('fm.confirm_encrypt')}
                  </button>
                </div>
              </div>
            ) : pendingConvertFile ? (
              <div className="flex flex-col items-center w-full max-w-lg px-8 z-20" onClick={(e) => e.stopPropagation()}>
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4 shadow-inner text-blue-600 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t('fm.select_output')}</h3>
                <p className="text-slate-500 text-sm mb-6 max-w-xs text-center truncate">{pendingConvertFile.name}</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <button onClick={() => executeConvertFormat('jpeg')} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md rounded-2xl p-4 flex flex-col items-center transition-all group">
                    <span className="font-black text-2xl text-slate-700 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1">JPG</span>
                    <span className="text-xs text-slate-500 dark:text-white font-bold">{t('fm.format_compat')}</span>
                  </button>
                  <button onClick={() => executeConvertFormat('png')} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md rounded-2xl p-4 flex flex-col items-center transition-all group">
                    <span className="font-black text-2xl text-slate-700 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1">PNG</span>
                    <span className="text-xs text-slate-500 dark:text-white font-bold">{t('fm.format_transparent')}</span>
                  </button>
                  <button onClick={() => executeConvertFormat('webp')} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md rounded-2xl p-4 flex flex-col items-center transition-all group">
                    <span className="font-black text-2xl text-slate-700 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1">WebP</span>
                    <span className="text-xs text-slate-500 dark:text-white font-bold">{t('fm.format_hd')}</span>
                  </button>
                  <button onClick={() => executeConvertFormat('pdf')} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 hover:shadow-md rounded-2xl p-4 flex flex-col items-center transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-bl-lg">Hot</div>
                    <span className="font-black text-2xl text-slate-700 dark:text-white group-hover:text-red-500 dark:group-hover:text-red-400 mb-1">PDF</span>
                    <span className="text-xs text-slate-500 dark:text-white font-bold">{t('fm.format_print')}</span>
                  </button>
                </div>

                <button 
                  onClick={() => setPendingConvertFile(null)} 
                  className="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 px-8 py-2.5 rounded-full font-bold transition-all text-sm"
                >
                  {t('fm.cancel')}{t('fm.reupload')}
                </button>
              </div>
            ) : (
              <>
                {/* Hover 時的漸層掃光 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-[shimmer_2s_infinite] pointer-events-none -skew-x-12 translate-x-[-100%]"></div>

                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform duration-500 ${isDragging ? 'bg-emerald-100 dark:bg-emerald-900/50 scale-110' : 'bg-emerald-50 dark:bg-emerald-900/30 group-hover:scale-110'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${isDragging ? 'text-emerald-600 dark:text-emerald-400 animate-bounce' : 'text-emerald-500 dark:text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-700 dark:text-white mb-2">
                  {isDragging ? t('fm.drop_upload') : t('fm.drag_upload')}
                </h3>
                <p className="text-slate-400 dark:text-white mb-6 font-medium">{t('fm.click_upload').replace('{0}', activeTool.id === 'merge_pdf' ? t('fm.multi_select') : '')}</p>
                
                <button className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                  {t('fm.select_file')}
                </button>
              </>
            )}
          </div>

          <div className="mt-8 flex items-center gap-6 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> {t('fm.feat_ssl')}</span>
            <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> {t('fm.feat_fast')}</span>
            <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> {t('fm.feat_del')}</span>
          </div>

        </div>
      </main>
      )}
      </div>

      {/* AI Summary Modal */}
      {aiSummaryResult && (
        <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAiSummaryResult(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✨</span>
                <div>
                  <h3 className="font-bold text-white">{t(aiSummaryResult.tool.name)}</h3>
                  <p className="text-indigo-100 text-sm mt-1">{t(aiSummaryResult.tool.desc)}</p>
                </div>
              </div>
              <button onClick={() => setAiSummaryResult(null)} className="text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {aiSummaryResult.summary.map((point, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center shrink-0">{idx + 1}</div>
                    <p className="text-slate-700 dark:text-white leading-relaxed font-medium">{point}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-end">
                <button onClick={() => setAiSummaryResult(null)} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 px-6 py-2 rounded-xl font-bold transition-colors">
                  {t('fm.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Center Floating UI */}
      {tasks.length > 0 && (
        <div className="absolute bottom-6 right-6 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 flex flex-col animate-[slide-up_0.3s_ease-out]">
          <div className="bg-slate-800 dark:bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-bold text-sm">{t('fm.task_center').replace('{0}', String(tasks.filter(t => t.status === 'processing').length))}</h3>
            <button onClick={() => setTasks([])} className="text-slate-300 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto bg-slate-50 dark:bg-slate-800">
            {tasks.map(task => (
              <div key={task.id} className="p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-white truncate max-w-[180px]" title={task.title}>{task.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                    backgroundColor: task.status === 'completed' ? '#d1fae5' : task.status === 'error' ? '#fee2e2' : task.status === 'cancelled' ? '#f1f5f9' : '#e0f2fe',
                    color: task.status === 'completed' ? '#059669' : task.status === 'error' ? '#dc2626' : task.status === 'cancelled' ? '#64748b' : '#0284c7'
                  }}>
                    {task.status === 'processing' ? `${Math.round(task.progress)}%` : task.status}
                  </span>
                </div>
                
                {task.status === 'processing' && (
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 transition-all duration-300 rounded-full" style={{ width: `${task.progress}%` }}></div>
                  </div>
                )}
                {task.status === 'processing' && (
                  <button 
                    onClick={() => cancelTask(task.id)}
                    className="mt-2 text-[10px] text-red-500 hover:text-red-600 font-medium"
                  >
                    {t('fm.cancel_task')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileMasterPage;
