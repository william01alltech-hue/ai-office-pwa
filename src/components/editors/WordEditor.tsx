import React, { useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import DOMPurify from 'dompurify';
import { useAppContext } from '../../contexts/AppContext';

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

export const WordEditor: React.FC<{ multiverseRole?: string }> = ({ multiverseRole }) => {
  const { t, wordData, setWordData, setWordSelectedText } = useAppContext();
  const [showExcelHeaders, setShowExcelHeaders] = useState(true);
  const [toc, setToc] = useState<{ id: string, level: number, text: string, pos: number }[]>([]);
  const [isAiFormatting, setIsAiFormatting] = useState(false);
  
  const extensions = useMemo(() => [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      Placeholder.configure({
        placeholder: t('word.placeholder'),
        emptyEditorClass: 'is-editor-empty',
      }),
    ], [t]);

  const editor = useEditor({
    extensions,
    content: wordData,
    onUpdate: ({ editor }) => {
      setWordData(editor.getHTML());
      
      // 提取大綱 (Headings)
      const headings: { id: string, level: number, text: string, pos: number }[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          headings.push({
            id: `heading-${pos}`,
            level: node.attrs.level,
            text: node.textContent,
            pos
          });
        }
      });
      setToc(headings);
    },
    onSelectionUpdate: ({ editor }) => {
      const { empty, from, to } = editor.state.selection;
      if (!empty) {
        setWordSelectedText(editor.state.doc.textBetween(from, to, ' '));
      } else {
        setWordSelectedText('');
      }
    }
  });



  React.useEffect(() => {
    const handleInsertFormula = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (editor) {
        // AI 產生的公式直接插入，ReactiveTablePlugin 會自動處理計算
        editor.commands.insertContent(customEvent.detail);
      }
    };
    
    const handleReplaceText = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (editor) {
        editor.chain().focus().insertContent(customEvent.detail).run();
      }
    };

    const handleInsertBelowText = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (editor) {
        const { to } = editor.state.selection;
        editor.chain().focus()
          .setTextSelection(to)
          .insertContent(`<p></p>${customEvent.detail}`)
          .run();
      }
    };

    window.addEventListener('insert-word-formula', handleInsertFormula);
    window.addEventListener('replace-word-text', handleReplaceText);
    window.addEventListener('insert-word-text-below', handleInsertBelowText);
    
    return () => {
      window.removeEventListener('insert-word-formula', handleInsertFormula);
      window.removeEventListener('replace-word-text', handleReplaceText);
      window.removeEventListener('insert-word-text-below', handleInsertBelowText);
    };
  }, [editor]);

  React.useEffect(() => {
    if (editor && wordData !== editor.getHTML()) {
      editor.commands.setContent(wordData);
    };
  }, [wordData, editor]);

  // AI 自動排版模擬邏輯
  const handleAiFormat = (formatType: string) => {
    if (!editor) return;
    setIsAiFormatting(true);
    
    // 模擬 AI 處理延遲
    setTimeout(() => {
      let content = editor.getHTML();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      if (formatType === 'apa') {
        // 模擬 APA: 標題置中加粗，內文縮排，Times New Roman, 1.5 行距
        tempDiv.querySelectorAll('h1, h2, h3').forEach(h => {
          (h as HTMLElement).style.textAlign = 'center';
          (h as HTMLElement).style.fontWeight = 'bold';
          (h as HTMLElement).style.fontFamily = 'Times New Roman, serif';
        });
        tempDiv.querySelectorAll('p').forEach(p => {
          (p as HTMLElement).style.textIndent = '2em';
          (p as HTMLElement).style.lineHeight = '2';
          (p as HTMLElement).style.fontFamily = 'Times New Roman, serif';
          (p as HTMLElement).style.fontSize = '12pt';
        });
      } else if (formatType === 'ieee') {
        // 模擬 IEEE: 標題置中，內文無縮排，字體較小
        tempDiv.querySelectorAll('h1, h2, h3').forEach(h => {
          (h as HTMLElement).style.textAlign = 'center';
          (h as HTMLElement).style.fontFamily = 'Times New Roman, serif';
          (h as HTMLElement).style.textTransform = 'uppercase';
        });
        tempDiv.querySelectorAll('p').forEach(p => {
          (p as HTMLElement).style.textIndent = '0';
          (p as HTMLElement).style.lineHeight = '1.2';
          (p as HTMLElement).style.fontFamily = 'Times New Roman, serif';
          (p as HTMLElement).style.fontSize = '10pt';
        });
      } else if (formatType === 'bilingual') {
        // 模擬雙語對照: 段落切兩欄，中英交錯
        const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
        paragraphs.forEach(p => {
          const text = p.textContent || '';
          p.innerHTML = `<div style="display:flex; gap:16px;">
            <div style="flex:1; padding-right:16px; border-right:2px solid #e2e8f0; color:#334155;">${text}</div>
            <div style="flex:1; color:#64748b; font-style:italic;">[AI Translated English version of: ${text.substring(0,20)}...]</div>
          </div>`;
        });
      } else if (formatType === 'teleprompter') {
        // 模擬提詞機: 黑底白字，極大字體
        tempDiv.querySelectorAll('*').forEach(el => {
          (el as HTMLElement).style.color = '#ffffff';
          (el as HTMLElement).style.backgroundColor = '#0f172a';
          (el as HTMLElement).style.lineHeight = '2.5';
        });
        tempDiv.querySelectorAll('p, h1, h2, h3').forEach(el => {
          (el as HTMLElement).style.fontSize = '36pt';
          (el as HTMLElement).style.fontWeight = 'bold';
        });
        // 套用全域提詞機黑底
        const container = document.createElement('div');
        container.style.backgroundColor = '#0f172a';
        container.style.minHeight = '100vh';
        container.style.padding = '40px';
        container.appendChild(tempDiv.cloneNode(true));
        tempDiv.innerHTML = container.innerHTML;
      } else if (formatType === 'podcast') {
        // 模擬 Podcast 腳本: 自動加上 主持人A/來賓B
        const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
        paragraphs.forEach((p, index) => {
          const isHost = index % 2 === 0;
          const speaker = isHost ? '<strong style="color:#ef4444;">主持人 A：</strong>' : '<strong style="color:#3b82f6;">來賓 B：</strong>';
          p.innerHTML = `${speaker} ${p.textContent}`;
          p.style.backgroundColor = isHost ? '#fef2f2' : '#eff6ff';
          p.style.padding = '12px';
          p.style.borderRadius = '8px';
          p.style.marginBottom = '16px';
        });
      } else if (formatType === 'magazine') {
        // 模擬雜誌風: 首字放大，插入假圖片
        const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
        if (paragraphs.length > 0) {
          const firstP = paragraphs[0];
          const text = firstP.innerHTML;
          if (text.length > 0) {
            firstP.innerHTML = `<span style="float:left; font-size:4em; line-height:0.8; margin-right:8px; margin-top:8px; color:#c026d3; font-weight:bold;">${text.charAt(0)}</span>${text.substring(1)}`;
          }
        }
        if (paragraphs.length > 1) {
          const imgP = paragraphs[Math.floor(paragraphs.length / 2)];
          const imgHtml = `<div style="float:right; width:40%; margin-left:24px; margin-bottom:16px;">
            <img src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80" style="width:100%; border-radius:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);" alt="Magazine visual" />
            <p style="font-size:10pt; color:#64748b; text-align:center; margin-top:8px; font-style:italic;">▲ 這是 AI 自動為您生成的雜誌配圖</p>
          </div>`;
          imgP.insertAdjacentHTML('beforebegin', imgHtml);
        }
      } else if (formatType === 'custom') {
         // 模擬自訂指令: 全文藍色粗體
         tempDiv.querySelectorAll('*').forEach(el => {
           (el as HTMLElement).style.color = '#1e3a8a';
           (el as HTMLElement).style.fontWeight = 'bold';
         });
      } else if (formatType === 'deformat') {
         // 模擬排版解毒: 移除所有 inline style 和 class
         tempDiv.querySelectorAll('*').forEach(el => {
           el.removeAttribute('style');
           el.removeAttribute('class');
         });
      } else if (formatType === 'chart') {
         // 模擬語意轉圖表: 插入假圖表圖片
         tempDiv.innerHTML += `<div style="text-align:center; margin:20px 0;"><img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" style="width:80%; max-width:600px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1);" alt="AI Generated Chart" /><p style="color:#64748b; font-size:12px; margin-top:8px;">▲ 根據段落數據自動生成的圖表</p></div>`;
      } else if (formatType === 'citation') {
         // 模擬智慧註腳
         tempDiv.innerHTML = tempDiv.innerHTML.replace(/(。|！)/g, '<sup>[1]</sup>$1');
         tempDiv.innerHTML += `<hr style="margin-top:40px; border-top:1px solid #cbd5e1;"/><div style="font-size:12px; color:#475569; margin-top:20px;"><h4>參考文獻</h4><p>[1] AI Auto-Citation System. (2026). <em>Journal of Next-Gen Documents</em>, 1(1), 1-10.</p></div>`;
      } else if (formatType === 'accessibility') {
         // 模擬無障礙優化
         tempDiv.querySelectorAll('img').forEach(img => {
           if (!img.getAttribute('alt')) img.setAttribute('alt', 'AI automatically generated image description for screen readers.');
         });
         tempDiv.querySelectorAll('*').forEach(el => {
           const e = el as HTMLElement;
           e.style.color = '#000000'; // 高對比
           e.style.backgroundColor = '#ffffff';
           e.style.fontSize = '14pt'; // 放大字體
           e.style.lineHeight = '2.0';
         });
      } else if (formatType === 'boss') {
         // 模擬高管摘要版
         const firstP = tempDiv.querySelector('p');
         if (firstP) {
           firstP.innerHTML = `<div style="background-color:#fee2e2; border-left:4px solid #ef4444; padding:12px; margin-bottom:16px;">
             <strong style="color:#b91c1c;">[Executive Summary]</strong><br/>
             <span style="color:#7f1d1d;">本文件包含關鍵業績指標與行動方案，請優先審閱。</span>
           </div>` + firstP.innerHTML;
         }
         tempDiv.querySelectorAll('h1, h2').forEach(el => {
           (el as HTMLElement).style.color = '#dc2626';
           (el as HTMLElement).style.fontSize = '24pt';
         });
      } else if (formatType === 'kid') {
         // 模擬兒童注音版
         tempDiv.querySelectorAll('*').forEach(el => {
           (el as HTMLElement).style.fontFamily = '"Comic Sans MS", "DFKai-SB", cursive';
           (el as HTMLElement).style.fontSize = '20pt';
           (el as HTMLElement).style.lineHeight = '2.5';
         });
         tempDiv.innerHTML += `<div style="text-align:center; margin-top:20px;"><img src="https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&q=80" style="border-radius:24px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);" alt="Cute kid drawing" /><p style="color:#f59e0b; font-weight:bold; font-size:24pt; margin-top:10px;">✨ 棒棒的！你讀完了！ ✨</p></div>`;
      }

      editor.commands.setContent(tempDiv.innerHTML);
      setIsAiFormatting(false);
    }, 1500);
  };

  React.useEffect(() => {
    if (multiverseRole) {
      setTimeout(() => {
        handleAiFormat(multiverseRole);
      }, 500);
    }
    
    const handleCustomFormat = () => handleAiFormat('custom');
    const handleDeformat = () => handleAiFormat('deformat');
    const handleChart = () => handleAiFormat('chart');
    const handleCitation = () => handleAiFormat('citation');
    const handleAccess = () => handleAiFormat('accessibility');

    window.addEventListener('ai-custom-format', handleCustomFormat);
    window.addEventListener('ai-deformat', handleDeformat);
    window.addEventListener('ai-text-to-chart', handleChart);
    window.addEventListener('ai-smart-citation', handleCitation);
    window.addEventListener('ai-accessibility', handleAccess);

    return () => {
      window.removeEventListener('ai-custom-format', handleCustomFormat);
      window.removeEventListener('ai-deformat', handleDeformat);
      window.removeEventListener('ai-text-to-chart', handleChart);
      window.removeEventListener('ai-smart-citation', handleCitation);
      window.removeEventListener('ai-accessibility', handleAccess);
    };
  }, [editor]);

  const scrollToHeading = (pos: number) => {
    if (editor) {
      editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
    }
  };

  // 初始載入大綱
  React.useEffect(() => {
    if (editor && toc.length === 0) {
      const headings: { id: string, level: number, text: string, pos: number }[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          headings.push({ id: `heading-${pos}`, level: node.attrs.level, text: node.textContent, pos });
        }
      });
      setToc(headings);
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex-1 flex min-h-0 bg-slate-100 dark:bg-slate-900">
      {/* 左側大綱導覽 (Table of Contents) */}
      <div className="hidden md:flex w-64 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 flex-col overflow-hidden shrink-0">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 shrink-0">
          <span className="font-bold text-slate-700 dark:text-white text-sm tracking-wide flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
            {t('word.toc')}
          </span>
        </div>
        <div className="p-3 overflow-y-auto flex-1">
          {toc.length === 0 ? (
            <div className="text-sm text-slate-400 dark:text-slate-500 text-center mt-10" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('word.toc_hint')) }}>
            </div>
          ) : (
            <ul className="space-y-1">
              {toc.map(heading => (
                <li key={heading.id} 
                  className={`text-sm cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 truncate transition-colors`}
                  style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                  onClick={() => scrollToHeading(heading.pos)}
                  title={heading.text}
                >
                  {heading.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {isAiFormatting && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-purple-100 dark:border-purple-900/50">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
              <span className="text-purple-600 dark:text-purple-400 font-bold text-lg animate-pulse">{t('word.ai_formatting')}</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm mt-2">{t('word.ai_format_wait')}</span>
            </div>
          </div>
        )}
        {/* Rich Text Toolbar */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 flex flex-wrap gap-1.5 text-slate-700 dark:text-white text-xs select-none relative z-40">
          
          <select 
            onChange={(e) => { if (e.target.value) handleAiFormat(e.target.value); e.target.value = ''; }}
            className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded shadow-sm hover:shadow-md hover:from-purple-600 hover:to-indigo-600 transition-all outline-none cursor-pointer appearance-none text-center"
            title={t("editor.ai_format")}
          >
            <option value="" className="text-slate-800 bg-white">{t('word.ai_format_btn')}</option>
            <option value="apa" className="text-slate-800 bg-white">{t('word.fmt_apa')}</option>
            <option value="ieee" className="text-slate-800 bg-white">{t('word.fmt_ieee')}</option>
            <option value="gov" className="text-slate-800 bg-white">{t('word.fmt_gov')}</option>
            <option value="bilingual" className="text-slate-800 bg-emerald-50">{t('word.fmt_bilingual')}</option>
            <option value="teleprompter" className="text-slate-800 bg-slate-200">{t('word.fmt_teleprompter')}</option>
            <option value="podcast" className="text-slate-800 bg-purple-50">{t('word.fmt_podcast')}</option>
            <option value="magazine" className="text-slate-800 bg-pink-50">{t('word.fmt_magazine')}</option>
            <option value="boss" className="text-slate-800 bg-red-50">{t('word.fmt_boss')}</option>
            <option value="kid" className="text-slate-800 bg-amber-50">{t('word.fmt_kid')}</option>
          </select>

          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 self-center mx-1"></div>

          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded font-semibold transition-colors ${editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-600 text-blue-600 dark:text-blue-400 font-bold' : ''}`}>{t('word.bold')}</button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded italic transition-colors ${editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-600 text-blue-600 dark:text-blue-400 font-bold' : ''}`}>{t('word.italic')}</button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded underline transition-colors ${editor.isActive('underline') ? 'bg-slate-200 dark:bg-slate-600 text-blue-600 dark:text-blue-400 font-bold' : ''}`}>{t('word.underline')}</button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded line-through transition-colors ${editor.isActive('strike') ? 'bg-slate-200 dark:bg-slate-600 text-blue-600 dark:text-blue-400 font-bold' : ''}`}>{t('word.strike')}</button>
          <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ${editor.isActive('superscript') ? 'bg-slate-200 dark:bg-slate-600 text-blue-600 dark:text-blue-400 font-bold' : ''}`}>X²</button>
          <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={`px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ${editor.isActive('subscript') ? 'bg-slate-200 dark:bg-slate-600 text-blue-600 dark:text-blue-400 font-bold' : ''}`}>X₂</button>
          <button onClick={() => editor.chain().focus().unsetAllMarks().run()} className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500" title={t('word.clear_format')}>🧹</button>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 self-center mx-1"></div>
        <select 
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          value={editor.getAttributes('textStyle').fontFamily || ''}
          className="px-2 py-1 bg-transparent dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-white outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">{t('word.font_default')}</option>
          <option value="Inter">Inter</option>
          <option value="'Noto Sans TC', sans-serif">{t('word.font_sans')}</option>
          <option value="'Noto Serif TC', serif">{t('word.font_serif')}</option>
        </select>
        
        <select 
          onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
          value={editor.getAttributes('textStyle').fontSize || ''}
          className="px-2 py-1 bg-transparent dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-white outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-blue-500/50 w-16"
        >
          <option value="">{t('word.size')}</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
          <option value="28px">28</option>
          <option value="32px">32</option>
          <option value="36px">36</option>
        </select>

        <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded px-1">
          <span className="text-[10px] text-slate-500 font-bold ml-1">A</span>
          <input 
            type="color" 
            list="preset-colors"
            onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} 
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
            title={t('word.text_color')}
          />
        </div>

        <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded px-1">
          <span className="text-[10px] text-slate-500 ml-1">🖍️</span>
          <input 
            type="color" 
            list="preset-highlight-colors"
            onInput={(e) => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()} 
            value={editor.getAttributes('highlight').color || '#ffff00'}
            className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
            title={t('word.bg_color')}
          />
        </div>
        
        <datalist id="preset-colors">
          <option value="#000000">{t("color.black")}</option>
          <option value="#475569">{t("color.dark_gray")}</option>
          <option value="#ef4444">{t("color.red")}</option>
          <option value="#f97316">{t("color.orange")}</option>
          <option value="#f59e0b">{t("color.yellow")}</option>
          <option value="#22c55e">{t("color.green")}</option>
          <option value="#3b82f6">{t("color.blue")}</option>
          <option value="#6366f1">{t("color.indigo")}</option>
          <option value="#a855f7">{t("color.purple")}</option>
          <option value="#ec4899">{t("color.pink")}</option>
          <option value="#ffffff">{t("color.white")}</option>
        </datalist>

        <datalist id="preset-highlight-colors">
          <option value="#fef08a">{t("color.light_yellow")}</option>
          <option value="#bbf7d0">{t("color.light_green")}</option>
          <option value="#bfdbfe">{t("color.light_blue")}</option>
          <option value="#fbcfe8">{t("color.light_pink")}</option>
          <option value="#e5e7eb">{t("color.light_gray")}</option>
          <option value="#facc15">{t("color.yellow")}</option>
          <option value="#4ade80">{t("color.green")}</option>
          <option value="#60a5fa">{t("color.blue")}</option>
          <option value="#f472b6">{t("color.pink")}</option>
          <option value="#ffffff">{t("color.white")}</option>
          <option value="#000000">{t("color.black")}</option>
        </datalist>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 self-center mx-1"></div>
        <select 
          onChange={(e) => {
            const level = parseInt(e.target.value, 10);
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level: level as 1|2|3|4|5|6 }).run();
            }
          }}
          value={
            editor.isActive('heading', { level: 1 }) ? '1' :
            editor.isActive('heading', { level: 2 }) ? '2' :
            editor.isActive('heading', { level: 3 }) ? '3' :
            editor.isActive('heading', { level: 4 }) ? '4' :
            editor.isActive('heading', { level: 5 }) ? '5' :
            editor.isActive('heading', { level: 6 }) ? '6' : '0'
          }
          className="px-2 py-1 mx-1 bg-transparent dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-white font-semibold outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="0">{t('word.p_normal')}</option>
          <option value="1">{t('word.h1')}</option>
          <option value="2">{t('word.h2')}</option>
          <option value="3">{t('word.h3')}</option>
          <option value="4">{t('word.h4')}</option>
          <option value="5">{t('word.h5')}</option>
          <option value="6">{t('word.h6')}</option>
        </select>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 self-center mx-1"></div>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-600 text-blue-600 dark:text-blue-400' : ''}`}>{t('word.ul')}</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-600 text-blue-600 dark:text-blue-400' : ''}`}>{t('word.ol')}</button>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 self-center mx-1"></div>
        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors font-bold text-emerald-600 dark:text-emerald-400">{t('word.insert_table')}</button>
        {editor.isActive('table') && (
          <>
            <button onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">{t('word.add_row')}</button>
            <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">{t('word.add_col')}</button>
            <button onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">{t('word.del_row')}</button>
            <button onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">{t('word.del_col')}</button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 self-center mx-1"></div>
            <button 
              onClick={() => setShowExcelHeaders(!showExcelHeaders)} 
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 font-semibold ${showExcelHeaders ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
              title={t('word.toggle_header_desc')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              {t('word.toggle_header')}
            </button>
            <button onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-red-600 dark:text-red-400">{t('word.del_table')}</button>
          </>
        )}
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 self-center mx-1"></div>
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-40">{t('word.undo')}</button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-40">{t('word.redo')}</button>
      </div>
      {/* Editor Canvas */}
      <div 
        className="flex-1 p-8 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex justify-center items-start cursor-text transition-colors"
        onClick={() => {
          if (editor && !editor.isFocused) {
            editor.chain().focus().run();
          }
        }}
      >
        <div className="relative w-full max-w-[800px] min-h-[1056px] mb-16">
          {/* Page Background Simulation (Absolute, grows with parent, NOT masked so shadow works) */}
          <div 
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `repeating-linear-gradient(to bottom, 
                var(--page-bg, white) 0px, 
                var(--page-bg, white) 1056px, 
                transparent 1056px, 
                transparent 1088px
              )`,
              backgroundSize: '100% 1088px', // 1056px page + 32px gap
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))',
            }}
          >
            {/* For dark mode page bg */}
            <style>{`
              :root { --page-bg: #ffffff; }
              @media (prefers-color-scheme: dark) {
                /* If theme is dark, we can use slate-800. We will override this inline if needed, but let's just use CSS class approach */
              }
              .dark-theme-page { --page-bg: #1e293b; }
            `}</style>
          </div>
          
          {/* Editor Content with Mask (Relative, in document flow, expands parent) */}
          <div className={`relative z-10 w-full min-h-[1056px] p-[60px] pb-[92px] prose prose-slate dark:prose-invert max-w-none ${showExcelHeaders ? 'show-excel-headers' : ''}`}
               style={{
                  // Mask text in the gap so it looks like true pagination
                  maskImage: 'repeating-linear-gradient(to bottom, black 0px, black 1056px, transparent 1056px, transparent 1088px)',
                  WebkitMaskImage: 'repeating-linear-gradient(to bottom, black 0px, black 1056px, transparent 1056px, transparent 1088px)',
                  maskSize: '100% 1088px',
                  WebkitMaskSize: '100% 1088px',
               }}
          >
            <EditorContent editor={editor} className="outline-none [&_.ProseMirror]:min-h-[936px] [&_.ProseMirror]:outline-none text-slate-800 dark:text-white" />
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
