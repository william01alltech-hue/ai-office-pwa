import toast from 'react-hot-toast';
import React, { useEffect, useRef } from 'react';
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/white.css';
import DOMPurify from 'dompurify';
import { useAppContext } from '../../contexts/AppContext';

export const PptEditor: React.FC = () => {
  const { t, slides, setSlides, activeSlideId, setActiveSlideId, isPlayingSlides, pptTransition, setPptTransition, aiLanguage } = useAppContext();
  const deckRef = useRef<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [coachScript, setCoachScript] = React.useState<string | null>(null);
  const [slideEnhancements, setSlideEnhancements] = React.useState<Record<string, { bg?: string, is3D?: boolean }>>({});
  const [isGeneratingAiPpt, setIsGeneratingAiPpt] = React.useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        // 使用 execCommand 插入圖片
        document.execCommand('insertImage', false, base64Url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSlide = () => {
    const newId = Date.now().toString();
    setSlides([...slides, { id: newId, title: '新投影片', content: '請在此輸入內容...' }]);
    setActiveSlideId(newId);
  };

  const handleDeleteSlide = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) {
      toast.error("至少需要保留一張投影片！");
      return;
    }
    const idx = slides.findIndex(s => s.id === id);
    const newSlides = slides.filter(s => s.id !== id);
    setSlides(newSlides);
    if (activeSlideId === id) {
      setActiveSlideId(newSlides[Math.min(idx, newSlides.length - 1)].id);
    }
  };

  const handleDuplicateSlide = (slide: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = Date.now().toString();
    const idx = slides.findIndex(s => s.id === slide.id);
    const newSlides = [...slides];
    newSlides.splice(idx + 1, 0, { ...slide, id: newId });
    setSlides(newSlides);
    setActiveSlideId(newId);
  };

  const handleMoveSlide = (id: string, direction: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = slides.findIndex(s => s.id === id);
    if (idx < 0 || idx + direction < 0 || idx + direction >= slides.length) return;
    const newSlides = [...slides];
    const temp = newSlides[idx];
    newSlides[idx] = newSlides[idx + direction];
    newSlides[idx + direction] = temp;
    setSlides(newSlides);
  };

  useEffect(() => {
    if (isPlayingSlides) {
      if (!deckRef.current) {
        deckRef.current = new Reveal(document.querySelector('.reveal') as HTMLElement, {
          embedded: true, keyboard: true, controls: true, progress: true, hash: true,
          transition: (pptTransition || "slide") as "slide" | "zoom" | "fade" // 加入過場特效
        });
        deckRef.current.initialize();
      } else {
        deckRef.current.sync();
      }
    } else {
      if (deckRef.current) {
        deckRef.current.destroy();
        deckRef.current = null;
      }
    }
  }, [isPlayingSlides, slides]);

  // 監聽進階 PPT AI 事件
  useEffect(() => {
    const fetchOllama = async (systemPrompt: string, userPrompt: string, requireJson = true) => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'qwen2.5:latest',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            ...(requireJson ? { format: 'json' } : {}),
            stream: false
          })
        });
        if (!response.ok) throw new Error('Ollama Error');
        const data = await response.json();
        let resultStr = data.message.content.trim();
        
        if (requireJson) {
          if (resultStr.includes('```json')) {
            resultStr = resultStr.split('```json')[1].split('```')[0].trim();
          } else if (resultStr.includes('```')) {
            resultStr = resultStr.split('```')[1].split('```')[0].trim();
          }
          return JSON.parse(resultStr);
        }
        return resultStr;
      } catch (error) {
        console.error(error);
        return null;
      }
    };

    const handleTextToDeck = (e: any) => {
      // 直接轉給完整生成器
      handleFullGenerate(e);
    };

    const handleSpeakerCoach = async () => {
      const activeSlide = slides.find(s => s.id === activeSlideId);
      if (!activeSlide) return;
      setIsGeneratingAiPpt(true);
      const systemPrompt = `你是一個世界頂級的 TED 演講教練。使用者會給你一張投影片的標題與內容。
請你使用【${aiLanguage}】為這張投影片撰寫一段約100字的演講逐字稿。
請極度口語化，充滿說服力，並在適當的地方加入 (停頓 2 秒) 或 [自信微笑] 等臨場感提示。
絕對直接輸出講稿文字，不要加入任何其他的問候語或解釋。`;
      const userContent = `標題：${activeSlide.title}\n內容：${activeSlide.content.replace(/<[^>]+>/g, '')}`;
      const script = await fetchOllama(systemPrompt, userContent, false);
      if (script) setCoachScript(`【AI 演講教練】建議講稿：\n${script}`);
      setIsGeneratingAiPpt(false);
    };

    const handleSmartVisuals = async () => {
      const activeSlide = slides.find(s => s.id === activeSlideId);
      if (!activeSlide) return;
      setIsGeneratingAiPpt(true);
      const systemPrompt = `你是一個頂尖的視覺藝術總監。使用者會給你一張投影片的內容。
請你提煉出最能代表這頁內容的「單一英文核心詞彙」，用來呼叫 AI 圖片生成。
請只輸出一個英文單字，絕對不要輸出其他任何符號、句子或解釋。例如：business, factory, futuristic`;
      const userContent = `標題：${activeSlide.title}\n內容：${activeSlide.content.replace(/<[^>]+>/g, '')}`;
      let keyword = await fetchOllama(systemPrompt, userContent, false);
      if (keyword) {
        keyword = keyword.trim().replace(/[^a-zA-Z]/g, '');
        if (keyword) {
          const bgUrl = `url("https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?width=1600&height=900&nologo=true")`;
          setSlideEnhancements(prev => ({
            ...prev,
            [activeSlideId]: { ...prev[activeSlideId], bg: bgUrl }
          }));
        }
      }
      setIsGeneratingAiPpt(false);
    };

    const handleCinematic3D = () => {
      setSlideEnhancements(prev => ({
        ...prev,
        [activeSlideId]: { ...prev[activeSlideId], is3D: true }
      }));
      setPptTransition('zoom');
    };

    const handleStoryline = async () => {
      setIsGeneratingAiPpt(true);
      const allText = slides.map(s => `標題: ${s.title}\n內容: ${s.content.replace(/<[^>]+>/g, '')}`).join('\n\n');
      const systemPrompt = `你是一個 McKinsey 的高級合夥人。
請閱讀以下整份簡報內容，套用「金字塔原理 (結論先決)」，總結出一張「一分鐘高管摘要」。
請使用【${aiLanguage}】。
請嚴格輸出 JSON 格式，不要加 Markdown：{"title": "精煉的摘要標題", "content": "極度精簡的核心結論(100字以內)"}`;
      const result = await fetchOllama(systemPrompt, allText, true);
      if (result && result.title && result.content) {
        const newSlide = {
          id: Date.now().toString(),
          title: `💼 【高管模式】${result.title}`,
          content: `<div style="font-size:32px; line-height:1.6; color:#f8fafc; background:rgba(30,41,59,0.8); padding:50px; border-radius:24px; border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(10px);"><span style="color:#ef4444;font-weight:bold;font-size:40px;">結論先決：</span><br/><br/>${result.content}</div><br/><div style="color:#94a3b8;">(AI 已為您萃取最核心結論，隱藏後方繁瑣的技術細節)</div>`
        };
        setSlides([newSlide, ...slides]);
        setActiveSlideId(newSlide.id);
        setSlideEnhancements(prev => ({
          ...prev,
          [newSlide.id]: { bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }
        }));
      }
      setIsGeneratingAiPpt(false);
    };

    const handleQaAnticipator = async () => {
      setIsGeneratingAiPpt(true);
      const allText = slides.map(s => `標題: ${s.title}\n內容: ${s.content.replace(/<[^>]+>/g, '')}`).join('\n\n');
      const systemPrompt = `你是一個極度嚴苛的投資人或董事會長官。
請挑選這份簡報中邏輯最薄弱或最容易被攻擊的兩點，提出尖銳的質疑問題，然後以簡報者的身份準備好完美的數據防禦回答。
請使用【${aiLanguage}】。
請嚴格輸出 JSON 格式，不要加 Markdown：{"qa": [{"question": "尖銳問題1", "answer": "防禦回答1"}, {"question": "尖銳問題2", "answer": "防禦回答2"}]}`;
      const result = await fetchOllama(systemPrompt, allText, true);
      if (result && result.qa && result.qa.length > 0) {
        const qaSlides = result.qa.map((q: any, i: number) => ({
          id: (Date.now() + i + 1).toString(),
          title: `🛡️ [隱藏附錄] 預測問題 ${i + 1}`,
          content: `<div style="font-size:32px; line-height:1.6; color:#f8fafc; background:rgba(30,41,59,0.8); padding:50px; border-radius:24px; border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(10px);"><b>長官可能提問：</b><br/><span style="color:#fbbf24;">${q.question}</span><br/><br/><b style="color:#10b981;">您的防禦彈藥：</b><br/>${q.answer}</div>`
        }));
        
        const newEnhancements: Record<string, any> = {};
        qaSlides.forEach((s: any) => {
          newEnhancements[s.id] = { bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' };
        });
        
        setSlides([...slides, ...qaSlides]);
        setSlideEnhancements(prev => ({ ...prev, ...newEnhancements }));
        toast(t('ppt.qa_alert'));
      }
      setIsGeneratingAiPpt(false);
    };

    const handleFullGenerate = async (e: any) => {
      let topic = '2025 AI 產品上市企劃';
      
      if (e.detail) {
        if (typeof e.detail === 'string') {
          topic = e.detail;
        } else {
          topic = e.detail.topic || topic;
        }
      }
      
      const timestamp = Date.now();
      
      setIsGeneratingAiPpt(true);
      
      try {
        const systemPrompt = `你是一個世界頂級的 McKinsey 商業簡報專家。
請閱讀使用者輸入的任何文字內容，並將其提煉、歸納為 5 張高品質的投影片大綱。
必須包含：1. 封面 (開場標題) 2. 核心挑戰/痛點 3. 解決策略 4. 關鍵數據或效益 (必帶圖表數據) 5. 行動呼籲。

🚨 極度重要：你必須使用【${aiLanguage}】來輸出！

請嚴格輸出 JSON 格式，絕對不要有任何 Markdown 標記，格式如下：
{
  "slides": [
    {
      "layout": "title",
      "title": "投影片標題",
      "subtitle": "副標題或補充說明文字",
      "bullets": ["重點1", "重點2"],
      "chartData": [{"label": "類別A", "value": 85}, {"label": "類別B", "value": 40}],
      "image_keyword": "business"
    }
  ]
}`;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen2.5:latest',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: topic }
            ],
            format: 'json',
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error('Ollama API 錯誤');
        }

        const data = await response.json();
        let resultStr = data.message.content.trim();
        
        // 嘗試從 markdown 區塊中提取 JSON
        if (resultStr.includes('```json')) {
          resultStr = resultStr.split('```json')[1].split('```')[0].trim();
        } else if (resultStr.includes('```')) {
          resultStr = resultStr.split('```')[1].split('```')[0].trim();
        }
        
        const result = JSON.parse(resultStr);
        
        const compileHtml = (s: any) => {
          const textContent = s.subtitle || s.content || s.description || (s.bullets ? s.bullets.join('<br>') : '') || '無補充內容';
          
          if (s.layout === 'title') return `<div style="font-size:24px; color:#cbd5e1; margin-top:40px;">${textContent !== '無補充內容' ? textContent : ''}</div>`;
          if (s.layout === 'statement') return `<div style="font-size:32px; line-height:1.6; color:#f8fafc; background:rgba(30,41,59,0.8); padding:50px; border-radius:24px; border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(10px); box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">${textContent}</div>`;
          if (s.layout === 'columns') {
            const items = s.bullets && s.bullets.length > 0 ? s.bullets : [textContent];
            const colsHtml = items.map((b: string, i: number) => `
              <div style="flex:1; background:rgba(15,23,42,0.6); padding:30px; border-radius:16px; border-top:4px solid ${i%2===0 ? '#3b82f6' : '#10b981'}; text-align:left;">
                <p style="font-size:22px; color:#e2e8f0; margin:0; line-height:1.6;">${b}</p>
              </div>
            `).join('');
            return `<div style="display:flex; gap:30px; margin-top:40px; justify-content:center;">${colsHtml}</div>`;
          }
          if (s.layout === 'chart' && s.chartData && s.chartData.length > 0) {
            const maxVal = Math.max(...s.chartData.map((d: any) => d.value || 0));
            const barsHtml = s.chartData.map((d: any) => {
              const heightPct = maxVal > 0 ? Math.max(10, ((d.value || 0) / maxVal) * 100) : 10;
              return `
                <div style="display:flex; flex-direction:column; justify-content:flex-end; align-items:center; flex:1; height:300px;">
                  <div style="font-size:32px; font-weight:bold; color:#f8fafc; margin-bottom:15px;">${d.value || 0}</div>
                  <div style="width:100%; max-width:100px; background:linear-gradient(to top, #2563eb, #60a5fa); height:${heightPct}%; border-radius:8px 8px 0 0; box-shadow:0 10px 15px -3px rgba(37,99,235,0.3);"></div>
                  <div style="margin-top:20px; font-size:20px; color:#cbd5e1; font-weight:bold;">${d.label || '項目'}</div>
                </div>
              `;
            }).join('');
            return `<div style="font-size:20px; color:#94a3b8; margin-bottom:30px;">${textContent !== '無補充內容' ? textContent : ''}</div><div style="display:flex; gap:60px; justify-content:center; align-items:flex-end; margin-top:20px; background:rgba(15,23,42,0.6); padding:50px 80px; border-radius:24px; border:1px solid rgba(255,255,255,0.1);">${barsHtml}</div>`;
          }
          return `<div style="font-size:24px; color:#e2e8f0;">${textContent}</div>`;
        };

        if (result && result.slides && result.slides.length > 0) {
          const generatedSlides = result.slides.map((s: any, idx: number) => ({
            id: `${timestamp}_${idx}`,
            title: s.title,
            content: compileHtml(s)
          }));
          
          const enhancements: Record<string, any> = {};
          result.slides.forEach((s: any, idx: number) => {
            if (idx === 0 || s.layout === 'title') {
              const keyword = s.image_keyword || 'business presentation';
              const bgUrl = `url("https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?width=1600&height=900&nologo=true")`;
              enhancements[`${timestamp}_${idx}`] = {
                bg: `linear-gradient(to bottom, rgba(15,23,42,0.7), rgba(15,23,42,0.9)), ${bgUrl}`
              };
            } else {
              // 專業的深色漸層底，不使用凌亂的圖片
              enhancements[`${timestamp}_${idx}`] = {
                bg: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`
              };
            }
          });

          setSlides(generatedSlides);
          setSlideEnhancements(enhancements);
          setActiveSlideId(generatedSlides[0].id);
          setPptTransition('fade');
        }
      } catch (error) {
        console.error('Ollama Generation Error:', error);
        toast(t('ppt.ollama_err'));
      } finally {
        setIsGeneratingAiPpt(false);
      }
    };

    window.addEventListener('ai-ppt-text-to-deck', handleTextToDeck);
    window.addEventListener('ai-ppt-speaker-coach', handleSpeakerCoach);
    window.addEventListener('ai-ppt-smart-visuals', handleSmartVisuals);
    window.addEventListener('ai-ppt-cinematic-3d', handleCinematic3D);
    window.addEventListener('ai-ppt-storyline', handleStoryline);
    window.addEventListener('ai-ppt-qa-anticipator', handleQaAnticipator);
    window.addEventListener('ai-ppt-full-generate', handleFullGenerate);

    return () => {
      window.removeEventListener('ai-ppt-text-to-deck', handleTextToDeck);
      window.removeEventListener('ai-ppt-speaker-coach', handleSpeakerCoach);
      window.removeEventListener('ai-ppt-smart-visuals', handleSmartVisuals);
      window.removeEventListener('ai-ppt-cinematic-3d', handleCinematic3D);
      window.removeEventListener('ai-ppt-storyline', handleStoryline);
      window.removeEventListener('ai-ppt-qa-anticipator', handleQaAnticipator);
      window.removeEventListener('ai-ppt-full-generate', handleFullGenerate);
    };
  }, [activeSlideId, slides, setSlides, setActiveSlideId, setPptTransition]);

  return (
    <div className="flex-1 flex min-h-0 bg-slate-100 dark:bg-slate-900">
      <div className="w-64 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-100/50 dark:bg-slate-800/50 shrink-0">
          <span className="font-bold text-slate-700 dark:text-white text-sm tracking-wide">{t('ppt.outline')}</span>
          <div className="flex items-center gap-2">
            <select 
              value={pptTransition} 
              onChange={(e) => setPptTransition(e.target.value)} 
              className="text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-slate-700 dark:text-white outline-none cursor-pointer shadow-sm focus:ring-1 focus:ring-indigo-500"
              title={t('ppt.transition')}
            >
              <option value="none">{t('ppt.trans_none')}</option>
              <option value="fade">{t('ppt.trans_fade')}</option>
              <option value="slide">{t('ppt.trans_slide')}</option>
              <option value="convex">{t('ppt.trans_convex')}</option>
              <option value="concave">{t('ppt.trans_concave')}</option>
              <option value="zoom">{t('ppt.trans_zoom')}</option>
            </select>
            <button onClick={handleAddSlide} className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded shadow-sm transition-colors font-bold flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              {t('ppt.add_slide')}
            </button>
          </div>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {slides.map((slide, idx) => (
            <div key={slide.id} onClick={() => setActiveSlideId(slide.id)} className={`group p-3 rounded-lg border-2 cursor-pointer transition-all shadow-sm relative overflow-hidden ${activeSlideId === slide.id ? 'border-indigo-400 dark:border-indigo-500 bg-white dark:bg-slate-800 ring-2 ring-indigo-100 dark:ring-indigo-900/50' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/50'}`}>
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500">{t('ppt.page_num').replace('{0}', String(idx + 1))}</div>
                {/* Hover Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 pl-1 rounded">
                  <button onClick={(e) => handleMoveSlide(slide.id, -1, e)} disabled={idx === 0} className="p-0.5 text-slate-400 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-slate-400" title={t('ppt.move_up')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                  </button>
                  <button onClick={(e) => handleMoveSlide(slide.id, 1, e)} disabled={idx === slides.length - 1} className="p-0.5 text-slate-400 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-slate-400" title={t('ppt.move_down')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                  <button onClick={(e) => handleDuplicateSlide(slide, e)} className="p-0.5 text-slate-400 hover:text-indigo-500" title={t('ppt.duplicate')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" /><path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" /></svg>
                  </button>
                  <button onClick={(e) => handleDeleteSlide(slide.id, e)} className="p-0.5 text-slate-400 hover:text-red-500" title={t('ppt.delete')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-white truncate">{slide.title}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900">
        {!isPlayingSlides ? (
          <>
            {/* PPT Toolbar */}
            <div className="h-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 space-x-2 z-10 select-none overflow-x-auto shrink-0">
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('bold'); }} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-white text-sm font-bold transition-colors">{t('ppt.bold')}</button>
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('italic'); }} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-white text-sm italic transition-colors">{t('ppt.italic')}</button>
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('underline'); }} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-white text-sm underline transition-colors">{t('ppt.underline')}</button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
              
              <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded px-1" title={t('ppt.font_color')}>
                <span className="text-[10px] text-slate-500 font-bold ml-1">A</span>
                <input 
                  type="color" 
                  onChange={(e) => { document.execCommand('foreColor', false, e.target.value); }} 
                  className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
                  defaultValue="#000000"
                />
              </div>
              
              <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded px-1" title={t('ppt.highlight')}>
                <span className="text-[10px] text-slate-500 font-bold ml-1">🖌️</span>
                <input 
                  type="color" 
                  onChange={(e) => { document.execCommand('hiliteColor', false, e.target.value); }} 
                  className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
                  defaultValue="#ffff00"
                />
              </div>

              <select 
                onChange={(e) => { document.execCommand('fontSize', false, e.target.value); }}
                className="px-2 py-1 bg-transparent dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-white outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-blue-500/50 w-20 text-sm"
              >
                <option value="">{t('ppt.size')}</option>
                <option value="1">{t('ppt.size_xs')}</option>
                <option value="2">{t('ppt.size_s')}</option>
                <option value="3">{t('ppt.size_m')}</option>
                <option value="4">{t('ppt.size_l')}</option>
                <option value="5">{t('ppt.size_xl')}</option>
                <option value="6">{t('ppt.size_xxl')}</option>
                <option value="7">{t('ppt.size_xxxl')}</option>
              </select>

              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('insertUnorderedList'); }} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-white text-sm transition-colors">{t('ppt.ul')}</button>
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('insertOrderedList'); }} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-white text-sm transition-colors">{t('ppt.ol')}</button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyLeft'); }} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-white text-sm transition-colors" title={t('ppt.align_left')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
              </button>
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyCenter'); }} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-white text-sm transition-colors" title={t('ppt.align_center')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm-4 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
              </button>
              <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyRight'); }} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-white text-sm transition-colors" title={t('ppt.align_right')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm8 4a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1zm-8 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm8 4a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
              </button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <button onClick={() => fileInputRef.current?.click()} className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded text-sm transition-colors font-bold flex items-center gap-1" title={t('ppt.insert_image')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {t('ppt.image')}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-start bg-slate-100 dark:bg-slate-900 space-y-4">
              <div 
                key={activeSlideId} 
                className="bg-white dark:bg-slate-800 w-full max-w-3xl aspect-[16/9] shadow-lg border border-slate-200 dark:border-slate-700 rounded-lg p-10 flex flex-col relative transition-all"
                style={{ 
                  backgroundImage: slideEnhancements[activeSlideId]?.bg, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  color: slideEnhancements[activeSlideId]?.bg ? 'white' : 'inherit',
                  textShadow: slideEnhancements[activeSlideId]?.bg ? '0 2px 4px rgba(0,0,0,0.5)' : 'none'
                }}
              >
                {slideEnhancements[activeSlideId]?.is3D && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 w-48 h-48 animate-[spin_10s_linear_infinite] drop-shadow-2xl">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e6/3D_Cube.png" alt="3D Cube" className="w-full h-full object-contain" />
                  </div>
                )}
                <input type="text" placeholder={t('ppt.title_placeholder')} className={`text-4xl font-extrabold text-center bg-transparent outline-none mb-8 placeholder-slate-300 dark:placeholder-slate-600 ${slideEnhancements[activeSlideId]?.bg ? 'text-white' : 'text-slate-800 dark:text-white'}`} defaultValue={slides.find(s => s.id === activeSlideId)?.title} />
                <div 
                  className="ppt-content-area flex-1 w-full text-base bg-transparent outline-none leading-relaxed overflow-y-auto relative z-10" 
                  contentEditable 
                  suppressContentEditableWarning
                  data-placeholder={t('ppt.content_placeholder')}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(slides.find(s => s.id === activeSlideId)?.content || '') }}
                />
              </div>

              {coachScript && (
                <div className="w-full max-w-3xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-sm relative animate-in slide-in-from-bottom-4">
                  <button onClick={() => setCoachScript(null)} className="absolute top-2 right-2 text-blue-400 hover:text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{coachScript}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 bg-black relative">
            <div className="reveal h-full" ref={deckRef}>
              <div className="slides h-full">
                {slides.map(slide => (
                  <section 
                    key={slide.id}
                    data-transition={pptTransition}
                    style={{ 
                      height: '100%', 
                      background: slideEnhancements[slide.id]?.bg || '#ffffff',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: slideEnhancements[slide.id]?.bg ? '#ffffff' : 'inherit'
                    }}
                  >
                    {slideEnhancements[slide.id]?.is3D && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 w-64 h-64 animate-[spin_10s_linear_infinite] drop-shadow-2xl z-0">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/e/e6/3D_Cube.png" alt="3D Cube" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <h2 className="text-5xl font-bold mb-8 relative z-10" style={{ color: slideEnhancements[slide.id]?.bg ? 'white' : '#1e293b', textShadow: slideEnhancements[slide.id]?.bg ? '0 4px 6px rgba(0,0,0,0.8)' : 'none' }}>{slide.title}</h2>
                    <div className="ppt-content-area text-2xl leading-relaxed max-w-4xl text-center relative z-10" style={{ color: slideEnhancements[slide.id]?.bg ? 'white' : '#475569', textShadow: slideEnhancements[slide.id]?.bg ? '0 2px 4px rgba(0,0,0,0.8)' : 'none' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(slide.content) }} />
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Generating Overlay */}
        {isGeneratingAiPpt && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
            <div className="w-24 h-24 mb-6 relative animate-bounce">
              <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center text-4xl shadow-2xl border-4 border-orange-400">
                🧠
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">{t('ppt.ai_generating')}</h3>
            <p className="text-orange-200">{t('ppt.ai_generating_desc')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
