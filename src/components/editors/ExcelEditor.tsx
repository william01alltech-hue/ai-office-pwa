import toast from 'react-hot-toast';
import React, { useEffect } from 'react';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreZhTW from '@univerjs/preset-sheets-core/locales/zh-TW';
import '@univerjs/preset-sheets-core/lib/index.css';
import '@univerjs/sheets/facade';
import { useAppContext } from '../../contexts/AppContext';

export const ExcelEditor: React.FC<{
  univerContainerRef: React.RefObject<HTMLDivElement>;
  univerApiRef: React.MutableRefObject<any>;
  handleFormulaBarChange: (val: string) => void;
}> = ({ univerContainerRef, univerApiRef, handleFormulaBarChange }) => {
  const { t, sheetData, activeEditors, selectedCellCoord, setSelectedCellCoord, setActiveCellValue, activeCellValue, isSelectingRange, setIsSelectingRange, beautifyStyleId, triggerBeautify, generatedStyles } = useAppContext();

  useEffect(() => {
    if (!activeEditors.includes('excel') || !univerContainerRef.current) return;
    const { univerAPI } = createUniver({
      locale: LocaleType.ZH_TW,
      locales: { [LocaleType.ZH_TW]: mergeLocales(UniverPresetSheetsCoreZhTW) },
      presets: [UniverSheetsCorePreset({ container: univerContainerRef.current, header: true, toolbar: true })]
    });
    
    univerAPI.createUniverSheet(sheetData);
    univerApiRef.current = univerAPI;

    const commandSubscription = univerAPI.onCommandExecuted((command: any) => {
      // ... existing code ...
      if (command.id === 'sheet.operation.set-selections') {
        const activeSheet = univerAPI.getActiveWorkbook()?.getActiveSheet();
        if (activeSheet) {
          const selection = activeSheet.getSelection();
          // @ts-expect-error Property 'range' may be hidden or differ in types
          if (selection && selection.range) {
            // @ts-expect-error Property 'range' may be hidden or differ in types
            const { startRow, startColumn } = selection.range;
            const coord = `${String.fromCharCode(65 + startColumn)}${startRow + 1}`;
            setSelectedCellCoord(coord);
            // @ts-expect-error type missing
            const cell = activeSheet.getCell(startRow, startColumn);
            const cellValue = cell?.f || cell?.v || '';
            setActiveCellValue(String(cellValue));
            setIsSelectingRange(true);
          }
        }
      }
    });

    // 加入 ResizeObserver 以解決面板縮放時 Univer 畫布不重繪導致格線消失的問題
    const resizeObserver = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });
    resizeObserver.observe(univerContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      commandSubscription.dispose();
      univerAPI.dispose();
      univerApiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEditors.includes('excel'), sheetData]);

  // 監聽 triggerBeautify 事件，並套用對應的樣式
  useEffect(() => {
    if (triggerBeautify === 0 || !univerApiRef.current || !beautifyStyleId || generatedStyles.length === 0) return;

    try {
      const workbook = univerApiRef.current.getActiveWorkbook();
      if (!workbook) return;
      const sheet = workbook.getActiveSheet();
      if (!sheet) return;

      const styleConfig = generatedStyles.find(s => s.id === beautifyStyleId);
      if (!styleConfig) return;

      const headerBg = styleConfig.headerBg;
      const headerText = styleConfig.headerText;
      const rowBg1 = styleConfig.rowBg1;
      const rowBg2 = styleConfig.rowBg2;

      // 將動態樣式套用到 A1:J20 範圍
      for (let c = 0; c < 10; c++) {
        const headerCell = sheet.getRange(0, c, 0, c);
        if (headerCell.setBackgroundColor) headerCell.setBackgroundColor(headerBg);
        if (headerCell.setFontColor) headerCell.setFontColor(headerText);
        if (headerCell.setFontWeight) headerCell.setFontWeight('bold');
      }

      for (let r = 1; r < 20; r++) {
        const bg = r % 2 === 0 ? rowBg1 : rowBg2;
        for (let c = 0; c < 10; c++) {
          const cell = sheet.getRange(r, c, r, c);
          if (cell.setBackgroundColor) cell.setBackgroundColor(bg);
          if (cell.setFontColor) {
            // 計算背景亮暗來決定字體顏色，簡單的做法是直接用黑色或根據主題給定的顏色
            // 由於模型目前沒給內文字體色，我們就保持預設或給定深色
            cell.setFontColor('#1e293b'); 
          }
        }
      }
    } catch (e) {
      console.warn('套用 AI 美化樣式失敗', e);
    }
  }, [triggerBeautify, beautifyStyleId, univerApiRef, generatedStyles]);

  // 監聽 6 大進階 AI 智慧操作事件
  useEffect(() => {
    const handleEnrich = () => {
      const workbook = univerApiRef.current?.getActiveWorkbook();
      const sheet = workbook?.getActiveSheet();
      if (sheet) {
        // 模擬智慧填表: 在 B1:B3 填入假資料
        const cell1 = sheet.getRange(0, 1, 0, 1);
        if (cell1.setValue) cell1.setValue('Tim Cook');
        const cell2 = sheet.getRange(1, 1, 1, 1);
        if (cell2.setValue) cell2.setValue('Satya Nadella');
        const cell3 = sheet.getRange(2, 1, 2, 1);
        if (cell3.setValue) cell3.setValue('Sundar Pichai');
        if (cell1.setBackgroundColor) cell1.setBackgroundColor('#eff6ff');
        if (cell2.setBackgroundColor) cell2.setBackgroundColor('#eff6ff');
        if (cell3.setBackgroundColor) cell3.setBackgroundColor('#eff6ff');
      }
    };

    const handleExtract = (e: any) => {
      const workbook = univerApiRef.current?.getActiveWorkbook();
      const sheet = workbook?.getActiveSheet();
      const text = e.detail || '';
      if (sheet && text) {
        // 模擬文字轉表格
        const cell1 = sheet.getRange(5, 0, 5, 0);
        if (cell1.setValue) cell1.setValue('品項');
        const cell2 = sheet.getRange(5, 1, 5, 1);
        if (cell2.setValue) cell2.setValue('數量');
        const cell3 = sheet.getRange(6, 0, 6, 0);
        if (cell3.setValue) cell3.setValue('AI 解析商品');
        const cell4 = sheet.getRange(6, 1, 6, 1);
        if (cell4.setValue) cell4.setValue('100');
        if (cell1.setBackgroundColor) {
          cell1.setBackgroundColor('#fdf4ff');
          cell2.setBackgroundColor('#fdf4ff');
          cell3.setBackgroundColor('#fdf4ff');
          cell4.setBackgroundColor('#fdf4ff');
        }
      }
    };

    const handleAnomaly = () => {
      const workbook = univerApiRef.current?.getActiveWorkbook();
      const sheet = workbook?.getActiveSheet();
      if (sheet) {
        // 模擬異常偵測
        const cell = sheet.getRange(3, 3, 3, 3); // D4
        if (cell.setValue) cell.setValue('9999999');
        if (cell.setBackgroundColor) cell.setBackgroundColor('#fef2f2');
        if (cell.setFontColor) cell.setFontColor('#ef4444');
      }
    };

    const handleInsight = () => {
      // 模擬總裁級報告 (彈窗提示)
      toast('【AI 總裁級洞察報告】\\n\\n本季重點洞察：歐洲區的 Q3 銷量異常下滑了 15%，主要原因是產品 X 的退貨率攀升，建議下個月增加行銷預算。');
    };

    const handleWhatIf = () => {
      const workbook = univerApiRef.current?.getActiveWorkbook();
      const sheet = workbook?.getActiveSheet();
      if (sheet) {
        // 模擬情境模擬器: 將 C 欄數值增加，並標綠色
        for (let r = 1; r < 5; r++) {
          const cell = sheet.getRange(r, 2, r, 2);
          if (cell.setValue) cell.setValue('↑ 15%');
          if (cell.setBackgroundColor) cell.setBackgroundColor('#ecfdf5');
          if (cell.setFontColor) cell.setFontColor('#10b981');
        }
      }
    };

    const handleRpa = (e: any) => {
      const workbook = univerApiRef.current?.getActiveWorkbook();
      const sheet = workbook?.getActiveSheet();
      const cmd = e.detail || '';
      if (sheet && cmd.includes('紅')) {
        // 模擬 RPA
        for (let r = 1; r < 5; r++) {
          const cell = sheet.getRange(r, 4, r, 4);
          if (cell.setValue) cell.setValue('低於50萬');
          if (cell.setBackgroundColor) cell.setBackgroundColor('#fee2e2');
        }
      }
    };

    window.addEventListener('ai-excel-enrich', handleEnrich);
    window.addEventListener('ai-excel-extract', handleExtract);
    window.addEventListener('ai-excel-anomaly', handleAnomaly);
    window.addEventListener('ai-excel-insight', handleInsight);
    window.addEventListener('ai-excel-whatif', handleWhatIf);
    window.addEventListener('ai-excel-rpa', handleRpa);

    return () => {
      window.removeEventListener('ai-excel-enrich', handleEnrich);
      window.removeEventListener('ai-excel-extract', handleExtract);
      window.removeEventListener('ai-excel-anomaly', handleAnomaly);
      window.removeEventListener('ai-excel-insight', handleInsight);
      window.removeEventListener('ai-excel-whatif', handleWhatIf);
      window.removeEventListener('ai-excel-rpa', handleRpa);
    };
  }, [univerApiRef]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative">
      <div className="h-10 bg-white border-b border-slate-200 flex items-center px-4 space-x-2.5 z-10 select-none">
        <div className="bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs px-2.5 py-1 rounded min-w-[55px] text-center font-bold">{selectedCellCoord || 'A1'}</div>
        <div className="h-4 w-px bg-slate-300"></div>
        <div className="text-slate-400 font-mono text-sm font-bold select-none px-1">fx</div>
        <div className="flex-1 flex items-center">
          <input
            type="text"
            placeholder={t('excel.formula_placeholder')}
            className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-neo-accent focus:ring-1 focus:ring-neo-accent/20 rounded px-3 py-1 text-xs transition-all focus:outline-none placeholder-slate-400 text-slate-800 font-mono"
            value={activeCellValue}
            onChange={(e) => handleFormulaBarChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        <div ref={univerContainerRef} className="absolute inset-0 w-full h-full univer-container" />
      </div>
      {isSelectingRange && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-pulse z-50">
          {t('excel.selecting_range')}
        </div>
      )}
    </div>
  );
};
