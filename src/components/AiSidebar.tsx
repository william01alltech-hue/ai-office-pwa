import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

export const AiSidebar: React.FC<{
  handleAiSubmit: () => void;
  handleApplyFormula: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}> = ({ handleAiSubmit, handleApplyFormula, inputRef }) => {
  const [beautifyPrompt, setBeautifyPrompt] = useState('');
  const [aiTextPrompt, setAiTextPrompt] = useState('');
  const [isGeneratingStyle, setIsGeneratingStyle] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  
  const { 
    activeEditors,
    aiFormulaInput,
    setAiFormulaInput,
    isTranslating,
    aiTranslation,
    aiActiveTab,
    setAiActiveTab,
    beautifyStyleId,
    setBeautifyStyleId,
    generatedStyles,
    setGeneratedStyles,
    setTriggerBeautify,
    selectedCellCoord,
    isSelectingRange,
    setIsSelectingRange,
    wordSelectedText,
    aiTextInsertMode,
    setAiTextInsertMode,
    t
  } = useAppContext();
  
  const activeEditor = activeEditors[0] || null;

  React.useEffect(() => {
    if (activeEditor === 'excel') {
      if (aiActiveTab !== 'formula' && aiActiveTab !== 'beautify') setAiActiveTab('formula');
    } else if (activeEditor === 'word') {
      if (aiActiveTab !== 'text' && aiActiveTab !== 'formula') setAiActiveTab('text');
    } else if (activeEditor === 'ppt') {
      if (aiActiveTab !== 'ppt') setAiActiveTab('ppt' as 'ppt' | 'excel' | 'word');
    }
  }, [activeEditor]);

  const handleGenerateBeautify = async () => {
    setIsGeneratingStyle(true);
    setBeautifyPrompt('');
    
    const prompt = `You are an expert UI designer. Generate exactly 3 distinct color themes for a spreadsheet table. 
Respond ONLY with a valid JSON array of objects.`;

    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", description: "繁體中文名稱 (例如：專業商務)" },
          desc: { type: "string", description: "繁體中文描述 (例如：深藍色調，適合正式財報)" },
          emoji: { type: "string", description: "Emoji 符號 (例如：🏢)" },
          headerBg: { type: "string", description: "Hex color (例如：#1e3a8a)" },
          headerText: { type: "string", description: "Hex color (例如：#ffffff)" },
          rowBg1: { type: "string", description: "Hex color (例如：#ffffff)" },
          rowBg2: { type: "string", description: "Hex color (例如：#f1f5f9)" }
        },
        required: ["id", "name", "desc", "emoji", "headerBg", "headerText", "rowBg1", "rowBg2"]
      }
    };

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5-coder:32b',
          prompt: prompt,
          stream: false,
          format: schema
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      // 清除可能包在 Markdown 內的 JSON
      const cleanedStr = data.response.replace(/```json\n?|```/g, '').trim();
      let styles = JSON.parse(cleanedStr);
      
      if (!Array.isArray(styles)) {
        // 如果模型沒有回傳陣列，而是回傳物件，試著轉換
        if (styles.themes) styles = styles.themes;
        else styles = Object.values(styles);
      }
      
      // 正規化資料結構，確保 AI 漏掉的欄位有預設值
      const normalizedStyles = styles.map((s: any, i: number) => ({
        id: s.id || `theme${i + 1}`,
        name: s.name || `主題 ${i + 1}`,
        desc: s.desc || (s.headerBg || s.header ? `自訂色調` : 'AI 生成主題'),
        emoji: s.emoji || '✨',
        headerBg: s.headerBg || s.header || '#1e3a8a',
        headerText: s.headerText || s.text || '#ffffff',
        rowBg1: s.rowBg1 || s.background || '#ffffff',
        rowBg2: s.rowBg2 || s.background || '#f1f5f9'
      }));

      setGeneratedStyles(normalizedStyles);
      if (normalizedStyles.length > 0) {
        setBeautifyStyleId(normalizedStyles[0].id);
      }
      setTriggerBeautify(Date.now());
    } catch (e: any) {
      console.error(e);
      if (e.message === 'Failed to fetch') {
        alert('無法連線到 Ollama，請確認是否啟動且設定了 CORS (OLLAMA_ORIGINS="*")。');
      } else {
        alert('解析 AI 回應失敗，請重試或微調提示詞！(錯誤: ' + e.message + ')');
      }
    } finally {
      setIsGeneratingStyle(false);
    }
  };

  const handleStyleSelect = (id: string) => {
    setBeautifyStyleId(id);
    // eslint-disable-next-line react-hooks/purity
    setTriggerBeautify(Date.now());
  };

  const handleTweakSubmit = async () => {
    if (!beautifyPrompt.trim() || generatedStyles.length === 0) return;
    setIsGeneratingStyle(true);

    const prompt = `You are an expert UI designer. The user wants to adjust the current spreadsheet color themes based on this instruction: "${beautifyPrompt}".
Current Themes:
${JSON.stringify(generatedStyles)}

Return an updated JSON array of 3 themes that incorporate the user's instruction.`;

    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          desc: { type: "string" },
          emoji: { type: "string" },
          headerBg: { type: "string" },
          headerText: { type: "string" },
          rowBg1: { type: "string" },
          rowBg2: { type: "string" }
        },
        required: ["id", "name", "desc", "emoji", "headerBg", "headerText", "rowBg1", "rowBg2"]
      }
    };

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5-coder:32b',
          prompt: prompt,
          stream: false,
          format: schema
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      // 清除可能包在 Markdown 內的 JSON
      const cleanedStr = data.response.replace(/```json\n?|```/g, '').trim();
      let styles = JSON.parse(cleanedStr);
      
      if (!Array.isArray(styles)) {
        if (styles.themes) styles = styles.themes;
        else styles = Object.values(styles);
      }
      
      // 正規化資料結構，確保 AI 欄位
      const normalizedStyles = styles.map((s: any, i: number) => ({
        id: s.id || `theme${i + 1}`,
        name: s.name || `主題 ${i + 1}`,
        desc: s.desc || (s.headerBg || s.header ? `自訂色調` : 'AI 生成主題'),
        emoji: s.emoji || '✨',
        headerBg: s.headerBg || s.header || '#1e3a8a',
        headerText: s.headerText || s.text || '#ffffff',
        rowBg1: s.rowBg1 || s.background || '#ffffff',
        rowBg2: s.rowBg2 || s.background || '#f1f5f9'
      }));

      setGeneratedStyles(normalizedStyles);
      if (normalizedStyles.length > 0) {
        if (normalizedStyles.find((s: any) => s.id === beautifyStyleId)) {
          setTriggerBeautify(Date.now());
        } else {
          setBeautifyStyleId(normalizedStyles[0].id);
          setTriggerBeautify(Date.now());
        }
      }
      setBeautifyPrompt('');
    } catch (e: any) {
      console.error(e);
      if (e.message === 'Failed to fetch') {
        alert('無法連線到 Ollama，請確認是否啟動且設定了 CORS (OLLAMA_ORIGINS="*")。');
      } else {
        alert('微調失敗，解析 AI 回應發生錯誤！(錯誤: ' + e.message + ')');
      }
    } finally {
      setIsGeneratingStyle(false);
    }
  };

  const handleAiTextSubmit = async (instruction: string, actionType: 'rewrite' | 'draft' | 'summarize' | 'translate') => {
    setIsGeneratingText(true);
    let prompt = '';
    
    if (actionType === 'draft') {
      prompt = `You are a professional assistant writing in Traditional Chinese. Write a detailed draft based on this instruction: "${instruction}". Output ONLY the content, no conversational filler.`;
    } else {
      const basePrompt = `You are a professional editor. Please process the following text in Traditional Chinese according to this instruction: "${instruction}". Output ONLY the processed text, no conversational filler.\n\nOriginal Text:\n${wordSelectedText}`;
      prompt = basePrompt;
    }

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5-coder:32b',
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      const generatedText = data.response.trim();
      
      if (wordSelectedText && aiTextInsertMode === 'replace') {
        window.dispatchEvent(new CustomEvent('replace-word-text', { detail: generatedText }));
      } else if (wordSelectedText && aiTextInsertMode === 'insertBelow') {
        window.dispatchEvent(new CustomEvent('insert-word-text-below', { detail: generatedText }));
      } else {
        // No selection, just insert
        window.dispatchEvent(new CustomEvent('replace-word-text', { detail: generatedText }));
      }
      setAiTextPrompt('');
    } catch (e: any) {
      console.error(e);
      alert('文字生成失敗！(錯誤: ' + e.message + ')');
    } finally {
      setIsGeneratingText(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
        <div className="p-3">
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-white tracking-wider flex items-center">✨ {t('ai.title')}</h2>
        </div>
        <div className="flex px-2 space-x-1">
          {activeEditor === 'excel' && (
            <>
              <button 
                onClick={() => setAiActiveTab('formula')}
                className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-colors ${aiActiveTab === 'formula' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 border-t border-l border-r border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
              >
                {t('ai.tabs.formula')}
              </button>
              <button 
                onClick={() => setAiActiveTab('beautify')}
                className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-colors ${aiActiveTab === 'beautify' ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 border-t border-l border-r border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
              >
                {t('ai.tabs.beautify')}
              </button>
              <button 
                onClick={() => setAiActiveTab('action')}
                className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-colors ${aiActiveTab === 'action' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-t border-l border-r border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
              >
                {t('ai.tabs.action')}
              </button>
            </>
          )}

          {activeEditor === 'word' && (
            <>
              <button 
                onClick={() => setAiActiveTab('text')}
                className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-colors ${aiActiveTab === 'text' ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 border-t border-l border-r border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
              >
                {t('ai.tabs.text')}
              </button>
              <button 
                onClick={() => setAiActiveTab('formula')}
                className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-colors ${aiActiveTab === 'formula' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 border-t border-l border-r border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
              >
                {t('ai.tabs.formula')}
              </button>
            </>
          )}

          {activeEditor === 'ppt' && (
            <>
              <button 
                onClick={() => setAiActiveTab('ppt' as 'ppt' | 'excel' | 'word')}
                className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-colors ${aiActiveTab === 'ppt' ? 'bg-white dark:bg-slate-800 text-orange-700 dark:text-orange-400 border-t border-l border-r border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
              >
                {t('ai.tabs.ppt')}
              </button>
              <button 
                onClick={() => setAiActiveTab('action')}
                className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-colors ${aiActiveTab === 'action' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-t border-l border-r border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
              >
                {t('ai.tabs.action')}
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
        {aiActiveTab === 'formula' && (
          <>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4 text-xs text-slate-600 dark:text-white leading-relaxed">
              <p className="font-bold text-slate-700 dark:text-white mb-2">{t('ai.formula.hint.title')}</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-white">
                {activeEditor === 'word' ? (
                  <>
                    <li>{t('ai.formula.hint.word.1')}</li>
                    <li>{t('ai.formula.hint.word.2')}</li>
                    <li>{t('ai.formula.hint.word.3')}</li>
                  </>
                ) : (
                  <>
                    <li>{t('ai.formula.hint.excel.1')}</li>
                    <li>{t('ai.formula.hint.excel.2')}</li>
                    <li>{t('ai.formula.hint.excel.3')}</li>
                  </>
                )}
              </ul>
            </div>
            <div className="flex flex-col space-y-2">
              <textarea
                ref={inputRef}
                className={`w-full h-24 p-3 text-sm border rounded-lg resize-none transition-all shadow-inner focus:outline-none focus:ring-2 dark:bg-slate-700 dark:text-white ${isSelectingRange ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-300 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-900'}`}
                placeholder={t('ai.formula.placeholder')}
                value={aiFormulaInput}
                onChange={(e) => setAiFormulaInput(e.target.value)}
                onFocus={() => { if (activeEditor === 'excel') setIsSelectingRange(true); }}
                onBlur={() => { setTimeout(() => setIsSelectingRange(false), 200); }}
              />
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>{isSelectingRange ? `${t('ai.formula.selecting')}: ${selectedCellCoord}` : t('ai.common.clear')}</span>
                <button 
                  onClick={handleAiSubmit}
                  disabled={isTranslating || !aiFormulaInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <span>{isTranslating ? t('ai.common.calculating') : t('ai.formula.submit')}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {aiActiveTab === 'formula' && aiTranslation && (
          <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-2">✅ {t('ai.formula.result.title')}：</h3>
            <code className="block bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-800/50 rounded px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 font-mono shadow-sm break-all">
              {aiTranslation.formula}
            </code>
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-500 leading-relaxed mb-4">{aiTranslation.explanation}</p>
            <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-300">
              <span className="font-bold">✅ {t('ai.formula.result.success')}</span>
              <button 
                onClick={handleApplyFormula}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-sm"
              >
                {t('ai.formula.result.apply')}
              </button>
            </div>
          </div>
        )}


        {aiActiveTab === 'beautify' && (
          <div className="flex flex-col h-full space-y-4 animate-in fade-in">
            {activeEditor !== 'excel' ? (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-lg text-sm text-center">
                ⚠️ {t('ai.beautify.error.notExcel')}
              </div>
            ) : (
              <>
                {!beautifyStyleId && !isGeneratingStyle ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center text-2xl shadow-inner">
                      ✨
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">{t('ai.beautify.empty.title')}</h3>
                      <p className="text-xs text-slate-500 dark:text-white mt-1">{t('ai.beautify.empty.desc')}</p>
                    </div>
                    <button 
                      onClick={handleGenerateBeautify}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all flex items-center justify-center space-x-2"
                    >
                      <span>🚀 {t('ai.beautify.empty.submit')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('ai.beautify.list.title')}</h3>
                      <button 
                        onClick={handleGenerateBeautify}
                        disabled={isGeneratingStyle}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center font-bold"
                      >
                        🔄 {t('ai.beautify.list.retry')}
                      </button>
                    </div>
                    
                    {isGeneratingStyle ? (
                      <div className="py-8 flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-4 border-purple-200 dark:border-purple-900/50 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div>
                        <p className="text-xs text-slate-500 dark:text-white font-bold animate-pulse">AI 正在為您設計專屬樣式...</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {generatedStyles.map((style) => (
                          <div 
                            key={style.id}
                            onClick={() => handleStyleSelect(style.id)}
                            className={`border rounded-lg p-3 cursor-pointer transition-all ${beautifyStyleId === style.id ? 'border-purple-500 ring-2 ring-purple-100 dark:ring-purple-900 bg-purple-50 dark:bg-purple-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 bg-white dark:bg-slate-800'}`}
                          >
                            <div className="flex-1">
                              <div className="font-bold text-slate-800 dark:text-white text-sm">{style.name}</div>
                              <div className="text-xs text-slate-500 dark:text-white">{style.desc}</div>
                            </div>
                            {beautifyStyleId === style.id && (
                              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">
                                ✓
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-white mb-2">對話式微調 (Natural Language Tweak)</h3>
                      <div className="flex space-x-2">
                        <input 
                          type="text"
                          value={beautifyPrompt}
                          onChange={(e) => setBeautifyPrompt(e.target.value)}
                          placeholder="例如：把標題換成溫暖的橘色..."
                          className="flex-1 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded px-3 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleTweakSubmit()}
                        />
                        <button 
                          onClick={handleTweakSubmit}
                          disabled={!beautifyPrompt.trim() || isGeneratingStyle}
                          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 rounded font-bold shadow-sm"
                        >
                          送出
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {aiActiveTab === 'ppt' && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in space-y-4">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-100 dark:border-orange-800/50 rounded-lg p-4 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl shadow-sm mb-2">
                ✨
              </div>
              <h3 className="font-bold text-orange-800 dark:text-orange-300">零成本極致簡報生成</h3>
              <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1 leading-relaxed">
                輸入任何主題，AI 將以「麥肯錫大綱框架」結合高畫質圖庫，瞬間為您組合出大師級排版的精美簡報。
              </p>
            </div>
            
            <div className="flex-1 flex flex-col space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-white">您想做什麼主題的簡報？</label>
              <textarea
                id="ppt-generate-topic-input"
                className="w-full flex-1 p-3 text-sm border rounded-lg resize-none transition-all shadow-inner focus:outline-none focus:ring-2 border-slate-300 dark:border-slate-600 focus:border-orange-400 dark:focus:border-orange-500 focus:ring-orange-100 dark:focus:ring-orange-900 dark:bg-slate-700 dark:text-white"
                placeholder="例如：2025 AI 產品亞太區上市企劃、如何提升遠距團隊生產力..."
                defaultValue="2025 AI 次世代產品上市企劃"
              />
              <button 
                onClick={() => {
                  const val = (document.getElementById('ppt-generate-topic-input') as HTMLTextAreaElement)?.value || '預設主題';
                  window.dispatchEvent(new CustomEvent('ai-ppt-full-generate', { detail: val }));
                }}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center space-x-2 text-sm"
              >
                <span>🚀</span>
                <span>一鍵生成大師級簡報</span>
              </button>
            </div>
          </div>
        )}

        {aiActiveTab === 'action' && activeEditor === 'excel' && (
          <div className="flex flex-col space-y-4 h-full animate-in fade-in">
            {/* A. 自動化資料處理 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm flex flex-col space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-white border-b pb-1 mb-1">A. 自動化資料處理</span>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('ai-excel-enrich'))}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded border border-blue-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <span>🧠</span><span>智慧擴充填表 (Data Enrichment)</span>
              </button>
              <div className="flex flex-col space-y-1 pt-1">
                <textarea
                  className="w-full h-16 p-2 text-xs border rounded resize-none bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="貼上凌亂的純文字或Email內容..."
                  id="excel-unstructured-input"
                />
                <button 
                  onClick={() => {
                    const val = (document.getElementById('excel-unstructured-input') as HTMLTextAreaElement)?.value;
                    window.dispatchEvent(new CustomEvent('ai-excel-extract', { detail: val }));
                  }}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded border border-indigo-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
                >
                  <span>📊</span><span>碎紙機重組 (文字轉表格)</span>
                </button>
              </div>
            </div>

            {/* B. 智能分析與除錯 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm flex flex-col space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-white border-b pb-1 mb-1">B. 智能分析與除錯</span>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('ai-excel-anomaly'))}
                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded border border-red-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <span>🕵️‍♂️</span><span>一鍵異常偵測與除錯</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('ai-excel-insight'))}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded border border-amber-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <span>📈</span><span>總裁級洞察報告</span>
              </button>
            </div>

            {/* C. 進階應用 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm flex flex-col space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-white border-b pb-1 mb-1">C. 進階應用</span>
              <div className="flex flex-col space-y-1">
                <input
                  type="text"
                  className="w-full p-2 text-xs border rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  placeholder="例如：人事費增加 5%"
                  id="excel-whatif-input"
                />
                <button 
                  onClick={() => {
                    const val = (document.getElementById('excel-whatif-input') as HTMLInputElement)?.value;
                    window.dispatchEvent(new CustomEvent('ai-excel-whatif', { detail: val }));
                  }}
                  className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded border border-purple-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
                >
                  <span>🔮</span><span>情境模擬器 (What-If)</span>
                </button>
              </div>
              <div className="flex flex-col space-y-1 pt-1">
                <input
                  type="text"
                  className="w-full p-2 text-xs border rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="例如：把低於50萬標為紅色"
                  id="excel-rpa-input"
                />
                <button 
                  onClick={() => {
                    const val = (document.getElementById('excel-rpa-input') as HTMLInputElement)?.value;
                    window.dispatchEvent(new CustomEvent('ai-excel-rpa', { detail: val }));
                  }}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded border border-emerald-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
                >
                  <span>🗣️</span><span>自然語言 RPA 操作</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {aiActiveTab === 'action' && activeEditor === 'ppt' && (
          <div className="flex flex-col space-y-4 h-full animate-in fade-in">
            {/* A. 內容生成與轉換 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm flex flex-col space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-white border-b pb-1 mb-1">A. 內容生成與轉換</span>
              <div className="flex flex-col space-y-1 pt-1">
                <textarea
                  className="w-full h-16 p-2 text-xs border rounded resize-none bg-slate-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  placeholder="貼上會議記錄或企劃草稿..."
                  id="ppt-text-to-deck-input"
                />
                <button 
                  onClick={() => {
                    const val = (document.getElementById('ppt-text-to-deck-input') as HTMLTextAreaElement)?.value;
                    window.dispatchEvent(new CustomEvent('ai-ppt-text-to-deck', { detail: val }));
                  }}
                  className="w-full py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold rounded border border-orange-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
                >
                  <span>📝</span><span>一鍵草稿轉大片 (Text-to-Deck)</span>
                </button>
              </div>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('ai-ppt-speaker-coach'))}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded border border-blue-200 shadow-sm flex items-center justify-center space-x-2 transition-colors mt-2"
              >
                <span>🗣️</span><span>專屬演講教練 (生成逐字稿)</span>
              </button>
            </div>

            {/* B. 視覺與動畫設計 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm flex flex-col space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-white border-b pb-1 mb-1">B. 視覺與動畫設計</span>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('ai-ppt-smart-visuals'))}
                className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded border border-purple-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <span>🎨</span><span>自動配圖與空間魔法</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('ai-ppt-cinematic-3d'))}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded border border-indigo-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <span>🎬</span><span>電影級過場與 3D 注入</span>
              </button>
            </div>

            {/* C. 戰略與防禦 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm flex flex-col space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-white border-b pb-1 mb-1">C. 戰略與防禦</span>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('ai-ppt-storyline'))}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded border border-rose-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <span>🔄</span><span>故事線重整 (高管模式)</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('ai-ppt-qa-anticipator'))}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded border border-emerald-200 shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <span>🛡️</span><span>QA 預測防禦彈藥庫</span>
              </button>
            </div>
          </div>
        )}

        {aiActiveTab === 'text' && (
          <div className="flex flex-col space-y-4 h-full">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-3 shadow-sm flex flex-col space-y-2">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">🚀 全局智能強化 (Global Enhancements)</span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('ai-deformat'))}
                  className="px-2 py-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold rounded border border-indigo-100 dark:border-indigo-800 shadow-sm flex items-center justify-center space-x-1 transition-colors"
                >
                  <span>🗑️</span><span>排版解毒還原</span>
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('ai-text-to-chart'))}
                  className="px-2 py-2 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-300 text-[11px] font-bold rounded border border-purple-100 dark:border-purple-800 shadow-sm flex items-center justify-center space-x-1 transition-colors"
                >
                  <span>📊</span><span>語意轉圖表</span>
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('ai-smart-citation'))}
                  className="px-2 py-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 text-[11px] font-bold rounded border border-emerald-100 dark:border-emerald-800 shadow-sm flex items-center justify-center space-x-1 transition-colors"
                >
                  <span>📚</span><span>智慧註腳補全</span>
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('ai-accessibility'))}
                  className="px-2 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-[11px] font-bold rounded border border-blue-100 dark:border-blue-800 shadow-sm flex items-center justify-center space-x-1 transition-colors"
                >
                  <span>♿</span><span>無障礙極致優化</span>
                </button>
              </div>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('ai-multiverse-toggle'))}
                className="mt-2 w-full py-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white text-xs font-bold rounded shadow-md flex items-center justify-center space-x-2 transition-all"
                title="同時生成並比較學術風、高管版與兒童版"
              >
                <span>🌌</span><span>產出平行宇宙版 (A/B Testing)</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm flex flex-col space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-white">針對選取文字：</span>
              {wordSelectedText ? (
                <div className="text-xs text-slate-600 dark:text-slate-300 italic border-l-2 border-blue-400 pl-2 max-h-20 overflow-hidden text-ellipsis">
                  "{wordSelectedText}"
                </div>
              ) : (
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  (目前未反白任何文字，直接產生新內容)
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 pt-2">
                <button 
                  disabled={!wordSelectedText || isGeneratingText}
                  onClick={() => handleAiTextSubmit('請幫我縮短並精簡這段文字', 'rewrite')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-white text-xs rounded disabled:opacity-50"
                >縮短文章</button>
                <button 
                  disabled={!wordSelectedText || isGeneratingText}
                  onClick={() => handleAiTextSubmit('請幫我擴寫這段文字，增加更多細節', 'rewrite')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-white text-xs rounded disabled:opacity-50"
                >擴寫文章</button>
                <button 
                  disabled={!wordSelectedText || isGeneratingText}
                  onClick={() => handleAiTextSubmit('請將這段文字語氣改得更正式專業', 'rewrite')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-white text-xs rounded disabled:opacity-50"
                >正式語氣</button>
                <select 
                  disabled={!wordSelectedText || isGeneratingText}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAiTextSubmit(`請將這段文字翻譯成專業的${e.target.value}`, 'translate');
                      e.target.value = '';
                    }
                  }}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-white text-xs rounded disabled:opacity-50 outline-none cursor-pointer appearance-none"
                >
                  <option value="">翻譯為 ▾</option>
                  <option value="英文">英文</option>
                  <option value="日文">日文</option>
                  <option value="韓文">韓文</option>
                  <option value="簡體中文">簡體中文</option>
                  <option value="越南文">越南文</option>
                  <option value="印尼文">印尼文</option>
                  <option value="泰文">泰文</option>
                  <option value="西班牙文">西班牙文</option>
                  <option value="法文">法文</option>
                  <option value="德文">德文</option>
                </select>
                <button 
                  disabled={!wordSelectedText || isGeneratingText}
                  onClick={() => handleAiTextSubmit('請幫我條列式總結這段文字的重點', 'summarize')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-white text-xs rounded disabled:opacity-50"
                >重點摘要</button>
              </div>

              {wordSelectedText && (
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500">處理結果：</span>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="insertMode" 
                      value="replace" 
                      checked={aiTextInsertMode === 'replace'} 
                      onChange={() => setAiTextInsertMode('replace')}
                      className="w-3 h-3 text-blue-600"
                    />
                    <span className="text-[10px] text-slate-600 dark:text-slate-300">取代原文</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="insertMode" 
                      value="insertBelow" 
                      checked={aiTextInsertMode === 'insertBelow'} 
                      onChange={() => setAiTextInsertMode('insertBelow')}
                      className="w-3 h-3 text-blue-600"
                    />
                    <span className="text-[10px] text-slate-600 dark:text-slate-300">插在下方</span>
                  </label>
                </div>
              )}
            </div>
            
            <div className="flex flex-col flex-1 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-white">自訂指令起草/排版：</span>
              <textarea
                className="w-full flex-1 min-h-[100px] p-3 text-sm border rounded-lg resize-none transition-all shadow-inner focus:outline-none focus:ring-2 border-slate-300 dark:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900 dark:bg-slate-700 dark:text-white"
                placeholder={wordSelectedText ? "輸入改寫指令..." : "輸入起草主題，或全篇排版要求 (例：標題變18pt藍色)..."}
                value={aiTextPrompt}
                onChange={(e) => setAiTextPrompt(e.target.value)}
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => handleAiTextSubmit(aiTextPrompt, wordSelectedText ? 'rewrite' : 'draft')}
                  disabled={isGeneratingText || !aiTextPrompt.trim()}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isGeneratingText ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>{wordSelectedText ? '套用改寫' : '自動起草'}</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => {
                    // 派發自訂排版事件給 WordEditor
                    window.dispatchEvent(new CustomEvent('ai-custom-format'));
                    setAiTextPrompt('');
                  }}
                  disabled={isGeneratingText || !aiTextPrompt.trim()}
                  className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  title="將此指令視為全篇排版要求"
                >
                  <span>🎨</span>
                  <span>全篇自訂排版</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
