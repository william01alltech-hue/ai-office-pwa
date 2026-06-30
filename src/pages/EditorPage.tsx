import toast from 'react-hot-toast';
import React, { useRef, useState, useEffect } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import pptxgen from 'pptxgenjs';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

import type { Slide } from '../contexts/AppContext';
import { useAppContext } from '../contexts/AppContext';
import { FileLibrary } from '../components/FileLibrary';
import { PreviewPanel } from '../components/PreviewPanel';
import { Navbar } from '../components/Navbar';
import { ExcelEditor } from '../components/editors/ExcelEditor';
import { WordEditor } from '../components/editors/WordEditor';
import { PptEditor } from '../components/editors/PptEditor';
import { AiSidebar } from '../components/AiSidebar';
// removed Paywall import
import { SettingsModal } from '../components/SettingsModal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useParams } from 'react-router-dom';
import { InterstitialAdModal } from '../components/ads/InterstitialAdModal';

const EditorPage: React.FC = () => {
  const { type } = useParams<{ type: string; id: string }>();
  const [showExportAd, setShowExportAd] = useState(false);
  const [isMultiverseMode, setIsMultiverseMode] = useState(false);
  
  useEffect(() => {
    const handleMultiverseToggle = () => setIsMultiverseMode(prev => !prev);
    window.addEventListener('ai-multiverse-toggle', handleMultiverseToggle);
    return () => window.removeEventListener('ai-multiverse-toggle', handleMultiverseToggle);
  }, []);
  
  const {
    selectedFile,
    wordData, setWordData,
    slides, setSlides,
    setActiveSlideId,
    parsedPptxSlides, setParsedPptxSlides,
    parsedXlsxSheet, setParsedXlsxSheet,
    points,
    userApiKey, showAiSidebar, showFileLibrary, showPreviewPanel,
    activeEditors, setActiveEditors,
    setIsUploading,
    computeMode,
    aiFormulaInput, aiTranslation, setAiTranslation, isTranslating, setIsTranslating,
    selectedCellCoord, setActiveCellValue,
    t
  , customEndpoint } = useAppContext();

  const [docxHtml, setDocxHtml] = useState<string>('');
  const [xlsxHtml, setXlsxHtml] = useState<string>('');
  const [pptxHtml, setPptxHtml] = useState<string>('');

  const univerContainerRef = useRef<HTMLDivElement | null>(null);
  const univerApiRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 用第一個 active 的編輯器作為主要操作對象（供 AI, 匯出等功能使用）
  const activeEditor = activeEditors[0] || null;

  // Initialize editor state based on URL route parameter
  useEffect(() => {
    if (type && ['excel', 'word', 'ppt'].includes(type)) {
      setActiveEditors([type as 'excel' | 'word' | 'ppt']);
    }
  }, [type, setActiveEditors]);

  useEffect(() => {
    let ignore = false;
    if (selectedFile) {
      if (selectedFile.name.endsWith('.docx') || selectedFile.name.endsWith('.doc')) {
        selectedFile.arrayBuffer().then(buffer => {
          mammoth.convertToHtml({ arrayBuffer: buffer })
            .then(result => { if (!ignore) setDocxHtml(result.value); })
            .catch(err => { console.error(err); if (!ignore) setDocxHtml('<p>{t("err.parse_err")}</p>'); });
        });
      } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        selectedFile.arrayBuffer().then(buffer => {
          try {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const html = XLSX.utils.sheet_to_html(worksheet, { header: '', footer: '' });
            if (!ignore) {
              setXlsxHtml(html);
              setParsedXlsxSheet(worksheet);
            }
          } catch (err) {
            if (!ignore) setXlsxHtml('<p>{t("err.parse_err")}</p>');
          }
        });
      } else if (selectedFile.name.endsWith('.pptx')) {
        selectedFile.arrayBuffer().then(async buffer => {
          try {
            const zip = await JSZip.loadAsync(buffer);
            const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
            slideFiles.sort((a, b) => (parseInt(a.replace(/\\D/g, '')) || 0) - (parseInt(b.replace(/\\D/g, '')) || 0));
            let html = '<div class="space-y-4">';
            const parsed: Slide[] = [];
            for (let i = 0; i < slideFiles.length; i++) {
              const xmlText = await zip.files[slideFiles[i]].async('text');
              const matches = xmlText.match(/<a:t>([\s\S]*?)<\/a:t>/g);
              const textContent = matches ? matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ') : '';
              html += `<div class="bg-slate-50 p-4 border border-slate-200 rounded shadow-sm"><div class="text-xs font-bold text-slate-400 mb-2 border-b pb-1">${t("editor.page_n").replace("{0}", String(i + 1))}</div><div class="text-slate-700 whitespace-pre-wrap">${textContent || '<em class="text-slate-400">${t("editor.no_text")}</em>'}</div></div>`;
              parsed.push({ id: String(i + 1), title: `${t("editor.slide_n").replace("{0}", String(i + 1))}`, content: textContent });
            }
            html += '</div>';
            if (!ignore) {
              setPptxHtml(html);
              setParsedPptxSlides(parsed);
            }
          } catch (err) {
            if (!ignore) setPptxHtml('<p>{t("err.parse_err")}</p>');
          }
        });
      }
    }
    return () => { ignore = true; };
  }, [selectedFile, setParsedPptxSlides, setParsedXlsxSheet]);

  const handleLoadSelectedFile = () => {
    if (!selectedFile) return;
    if (selectedFile.name.endsWith('.docx') || selectedFile.name.endsWith('.doc')) {
      setActiveEditors(['word']);
      setWordData(docxHtml);
    } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
      setActiveEditors(['excel']);
      if (parsedXlsxSheet && univerApiRef.current) {
        const rowCount = parsedXlsxSheet['!ref'] ? XLSX.utils.decode_range(parsedXlsxSheet['!ref']).e.r + 1 : 100;
        const colCount = parsedXlsxSheet['!ref'] ? XLSX.utils.decode_range(parsedXlsxSheet['!ref']).e.c + 1 : 30;
        const cellData: any = {};
        for (let R = 0; R < rowCount; ++R) {
          cellData[R] = {};
          for (let C = 0; C < colCount; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = parsedXlsxSheet[cellAddress];
            if (cell && cell.v !== undefined) {
              cellData[R][C] = { v: String(cell.v) };
            }
          }
        }
        univerApiRef.current.createUniverSheet({ id: 'imported-workbook', name: selectedFile.name, sheetOrder: ['sheet-1'], sheets: { 'sheet-1': { id: 'sheet-1', name: 'Sheet1', cellData, rowCount: Math.max(100, rowCount), columnCount: Math.max(30, colCount) } } });
      }
    } else if (selectedFile.name.endsWith('.pptx')) {
      setActiveEditors(['ppt']);
      if (parsedPptxSlides.length > 0) setSlides(parsedPptxSlides);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!userApiKey && points < 3) {
      toast(t("err.no_points"));
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      // 1. 將圖片轉換為 Base64 字串
      const base64Str = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // 只需要逗號後面的 base64 編碼部分
        };
        reader.onerror = error => reject(error);
      });

      // 2. 定義強制輸出的 JSON Schema 格式
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            r: { type: "integer", description: "row index, starting from 0" },
            c: { type: "integer", description: "column index, starting from 0" },
            v: { type: "string", description: "text value of the cell" }
          },
          required: ["r", "c", "v"]
        }
      };

      const prompt = `You are a highly accurate data extraction system. Extract the table data from the provided image.
Return ONLY a JSON array of objects representing the cells in the table. 
- 'r' is the row index starting from 0. 
- 'c' is the column index starting from 0. 
- 'v' is the exact text inside the cell.
Preserve the exact grid layout. If cells are merged, assign the value to the top-left coordinate. Do not output markdown.`;

      // 3. 呼叫本地端 Ollama 視覺模型
      const response = await fetch(`${customEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5vl:7b',
          prompt: prompt,
          stream: false,
          format: schema,
          images: [base64Str]
        }),
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      const cleanedStr = data.response.replace(/```json\n?|```/g, '').trim();
      const cells = JSON.parse(cleanedStr);
      
      if (Array.isArray(cells)) {
        if (activeEditor === 'excel' && univerApiRef.current) {
          const activeWorkbook = univerApiRef.current.getActiveWorkbook();
          if (activeWorkbook) {
            const worksheet = activeWorkbook.getActiveSheet();
            if (worksheet) {
              cells.forEach((cell: any) => {
                worksheet.getRange(cell.r, cell.c, cell.r, cell.c).setValue(cell.v);
              });
            }
          }
        } else if (activeEditor === 'word' || activeEditor === 'ppt') {
          // 轉換成 HTML 表格並插入 Word 或 PPT
          let maxRow = 0;
          let maxCol = 0;
          cells.forEach((cell: any) => {
            if (cell.r > maxRow) maxRow = cell.r;
            if (cell.c > maxCol) maxCol = cell.c;
          });
          
          const tableGrid = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(''));
          cells.forEach((cell: any) => {
            tableGrid[cell.r][cell.c] = cell.v || '';
          });

          let tableHtml = '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 1em;"><tbody>';
          tableGrid.forEach(row => {
            tableHtml += '<tr>';
            row.forEach(cell => {
              tableHtml += `<td style="border: 1px solid #cbd5e1; padding: 8px;">${cell}</td>`;
            });
            tableHtml += '</tr>';
          });
          tableHtml += '</tbody></table><p><br></p>';
          
          if (activeEditor === 'word') {
            setWordData(wordData + tableHtml);
          } else if (activeEditor === 'ppt') {
            const newSlideId = String(Date.now());
            setSlides([...slides, { 
              id: newSlideId, 
              title: t("editor.ai_table"), 
              content: tableHtml 
            }]);
            setActiveSlideId(newSlideId);
          }
        } else {
          toast(t("err.unknown_editor"));
        }
      } else {
        toast(t("err.invalid_array"));
      }
    } catch (err) {
      console.error(err);
      toast(t("err.no_server"));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const performExport = async () => {
    const saveFile = async (blob: Blob, suggestedName: string, accept: Record<string, string[]>) => {
      try {
        if ('showSaveFilePicker' in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName,
            types: [{ description: 'Document', accept }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = suggestedName;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to save file:', err);
          toast(t("err.save_fail"));
        }
      }
    };

    if (activeEditor === 'excel' && univerApiRef.current) {
      const activeSheet = univerApiRef.current.getActiveWorkbook()?.getActiveSheet();
      if (!activeSheet) return;
      const cellData = activeSheet.getCellData();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Sheet1');
      Object.keys(cellData).forEach((rowStr) => {
        const row = parseInt(rowStr, 10);
        Object.keys(cellData[rowStr]).forEach((colStr) => {
          const col = parseInt(colStr, 10);
          const cell = cellData[rowStr][colStr];
          if (cell && cell.v !== undefined) {
            ws.getCell(row + 1, col + 1).value = cell.v;
          }
        });
      });
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await saveFile(blob, 'exported_table.xlsx', { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] });
    } else if (activeEditor === 'word') {
      const blob = new Blob([`<html><body>${wordData}</body></html>`], { type: 'application/msword' });
      await saveFile(blob, 'exported_document.doc', { 'application/msword': ['.doc'] });
    } else if (activeEditor === 'ppt') {
      const pres = new pptxgen();
      slides.forEach(slide => {
        const pptSlide = pres.addSlide();
        pptSlide.addText(slide.title, { x: 1, y: 1, w: '80%', h: 1, fontSize: 36, bold: true, align: 'center' });
        pptSlide.addText(slide.content, { x: 1, y: 2.5, w: '80%', h: 4, fontSize: 18, align: 'center' });
      });
      const buffer = await pres.write({ outputType: 'arraybuffer' });
      const blob = new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      await saveFile(blob, 'exported_presentation.pptx', { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] });
    }
  };

  const handleExportClick = () => {
    if (activeEditor) {
      setShowExportAd(true);
    }
  };

  const handleFormulaBarChange = (val: string) => {
    if (!activeEditors.includes('excel') || !univerApiRef.current) return;
    const activeSheet = univerApiRef.current.getActiveWorkbook()?.getActiveSheet();
    if (activeSheet && selectedCellCoord) {
      const match = selectedCellCoord.match(/([A-Z]+)(\d+)/);
      if (match) {
        const col = match[1].charCodeAt(0) - 65;
        const row = parseInt(match[2], 10) - 1;
        // Univer Facade range.setValue can accept strings, numbers, or boolean.
        // If it starts with '=', Univer parses it as a formula automatically.
        activeSheet.getRange(row, col, row, col).setValue(val);
        setActiveCellValue(val);
      }
    }
  };

  const handleAiSubmit = async () => {
    if (!aiFormulaInput.trim() || isTranslating) return;
    setIsTranslating(true);
    
    let contextData = '';
    // Extract context for Excel
    if (activeEditor === 'excel' && univerApiRef.current) {
      const activeSheet = univerApiRef.current.getActiveWorkbook()?.getActiveSheet();
      if (activeSheet) {
        try {
          const match = selectedCellCoord.match(/([A-Z]+)(\d+)/);
          const currentRow = match ? parseInt(match[2], 10) - 1 : 0;
          const currentCol = match ? match[1].charCodeAt(0) - 65 : 0;
          // Get a small 10x10 block around the current cell or just top-left
          const startRow = Math.max(0, currentRow - 5);
          const startCol = Math.max(0, currentCol - 5);
          const range = activeSheet.getRange(startRow, startCol, startRow + 10, startCol + 10);
          contextData = JSON.stringify(range.getValues());
        } catch (e) {
          console.error("Context extraction failed", e);
        }
      }
    }

    try {
      let result = { formula: '', explanation: '' };
      
      if (computeMode === 'local') {
        await new Promise(r => setTimeout(r, 1500));
        result = { formula: '=SUM(A1:B2)', explanation: t("editor.local_sim") };
      } else if (computeMode === 'byok') {
        if (!userApiKey) throw new Error("Please enter your API Key in Settings.");
        const genAI = new GoogleGenerativeAI(userApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `你是一個精通 Excel 公式的小幫手。
當前選取的儲存格為: ${selectedCellCoord || 'A1'}。
${contextData ? `當前表格上下文資料（二維陣列）：\n${contextData}\n` : ''}
【重要指示】：如果使用者的指令中明確指定了儲存格座標或範圍（例如 A1、A1:A3），請務必在公式中「完全照抄」該座標，絕對不可自行偏移列號或行號！

用戶指令：「${aiFormulaInput}」

請將指令轉換為正確的公式，並提供簡單中文說明。
請嚴格以 JSON 格式回應，格式如下（不要包含 markdown）：
{"formula": "=SUM(A1)", "explanation_zh": "說明文字"}`;
        
        const response = await model.generateContent(prompt);
        const text = response.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          result = { formula: parsed.formula, explanation: parsed.explanation_zh };
        } else {
          result = { formula: t("err.error"), explanation: t("err.invalid_array") };
        }
      } else {
        // Platform mode (calls backend)
        const res = await fetch('http://localhost:3000/api/ai/translate-formula', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: aiFormulaInput, currentCell: selectedCellCoord, contextData })
        });
        if (res.ok) {
          const json = await res.json();
          result = { formula: json.data?.formula || '', explanation: json.data?.explanation_zh || '' };
        } else {
          result = { formula: t("err.error"), explanation: t("err.api_fail") };
        }
      }

      setAiTranslation(result);
    } catch (e: any) {
      console.error(e);
      setAiTranslation({ formula: t("err.error"), explanation: e.message || t('err.unknown') });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleApplyFormula = () => {
    if (aiTranslation?.formula) {
      if (activeEditors[0] === 'word') {
        window.dispatchEvent(new CustomEvent('insert-word-formula', { detail: aiTranslation.formula }));
      } else {
        handleFormulaBarChange(aiTranslation.formula);
      }
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative flex flex-col">
      {/* Paywall removed by user request */}
      <SettingsModal />
      <InterstitialAdModal 
        isOpen={showExportAd} 
        onClose={() => {
          setShowExportAd(false);
          performExport();
        }} 
      />
      <Navbar handleFileUpload={handleFileUpload} handleExport={handleExportClick} />
      <PanelGroup key="layout-v5" orientation="horizontal" className="w-full h-full flex-1 min-h-0">
        {showFileLibrary && (
          <>
            <Panel id="library-panel" defaultSize={15} minSize={5} className="bg-[#93bbf6] dark:bg-blue-900/40 flex flex-col z-20 border-r border-[#7aa9ed] dark:border-blue-800/50 shadow-sm">
              <FileLibrary />
            </Panel>
            <PanelResizeHandle className="w-1.5 bg-[#7aa9ed]/50 dark:bg-blue-800/30 hover:bg-blue-500 cursor-col-resize transition-colors z-30" />
          </>
        )}
        {showPreviewPanel && (
          <>
            <Panel id="preview-panel" defaultSize={20} minSize={5} className="bg-[#7ba8ef] dark:bg-blue-800/40 flex flex-col border-r border-[#699be6] dark:border-blue-700/50 shadow-md z-10">
              <PreviewPanel handleLoadSelectedFile={handleLoadSelectedFile} docxHtml={docxHtml} xlsxHtml={xlsxHtml} pptxHtml={pptxHtml} />
            </Panel>
            <PanelResizeHandle className="w-1.5 bg-[#699be6]/50 dark:bg-blue-700/30 hover:bg-blue-500 cursor-col-resize transition-colors z-30" />
          </>
        )}
        <Panel defaultSize={(showFileLibrary ? 15 : 0) + (showPreviewPanel ? 20 : 0) < 35 ? 100 : 65} className="flex flex-col min-w-0 bg-white dark:bg-slate-800 z-0">
          <PanelGroup key="editor-layout-v5" orientation="horizontal" className="flex-1 overflow-hidden w-full relative z-0">
            {isMultiverseMode && activeEditors[0] === 'word' ? (
              <>
                <Panel id="multiverse-academic" defaultSize={33} className="relative z-0 flex flex-col bg-slate-50 dark:bg-slate-900/50 min-w-[200px]">
                  <div className="bg-indigo-600 text-white text-xs font-bold p-1 text-center">{t("style.apa")}</div>
                  <WordEditor multiverseRole="apa" />
                </Panel>
                <PanelResizeHandle className="w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-400 cursor-col-resize transition-colors z-30" />
                <Panel id="multiverse-boss" defaultSize={33} className="relative z-0 flex flex-col bg-slate-50 dark:bg-slate-900/50 min-w-[200px]">
                  <div className="bg-red-600 text-white text-xs font-bold p-1 text-center">{t("style.boss")}</div>
                  <WordEditor multiverseRole="boss" />
                </Panel>
                <PanelResizeHandle className="w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-red-400 cursor-col-resize transition-colors z-30" />
                <Panel id="multiverse-kid" defaultSize={34} className="relative z-0 flex flex-col bg-slate-50 dark:bg-slate-900/50 min-w-[200px]">
                  <div className="bg-amber-500 text-white text-xs font-bold p-1 text-center">{t("style.kids")}</div>
                  <WordEditor multiverseRole="kid" />
                </Panel>
                {showAiSidebar && <PanelResizeHandle className="w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-400 cursor-col-resize transition-colors z-30" />}
              </>
            ) : (
              activeEditors.map((editor, index) => (
                <React.Fragment key={editor}>
                  <Panel id={`editor-panel-${editor}`} defaultSize={100 / (activeEditors.length + (showAiSidebar ? 1 : 0))} className="relative z-0 flex flex-col bg-slate-50 dark:bg-slate-900/50 min-w-[300px]">
                    {editor === 'excel' && <ExcelEditor univerContainerRef={univerContainerRef} univerApiRef={univerApiRef} handleFormulaBarChange={handleFormulaBarChange} />}
                    {editor === 'word' && <WordEditor />}
                    {editor === 'ppt' && <PptEditor />}
                  </Panel>
                  {(index < activeEditors.length - 1 || showAiSidebar) && (
                    <PanelResizeHandle className="w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500 cursor-col-resize transition-colors z-30" />
                  )}
                </React.Fragment>
              ))
            )}
            {showAiSidebar && (
              <Panel id="ai-sidebar" defaultSize={activeEditors.length > 0 ? 20 : 100} minSize={5} className="bg-white dark:bg-slate-800 flex flex-col z-10 select-none">
                <AiSidebar handleAiSubmit={handleAiSubmit} handleApplyFormula={handleApplyFormula} inputRef={inputRef} />
              </Panel>
            )}
            {activeEditors.length === 0 && !showAiSidebar && (
              <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-white select-none">
                {t("editor.select_msg")}
              </div>
            )}
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default EditorPage;
