import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, type LanguageKey } from '../i18n/translations';

// 定義投影片介面
export interface Slide {
  id: string;
  title: string;
  content: string;
}

// 檔案樹狀節點介面
export interface FileSystemNode {
  name: string;
  kind: 'file' | 'directory';
  handle: any; // FileSystemFileHandle | FileSystemDirectoryHandle
  children?: FileSystemNode[];
  isOpen?: boolean;
}

export interface BeautifyTheme {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  headerBg: string;
  headerText: string;
  rowBg1: string;
  rowBg2: string;
}

// 統整所有全域狀態
interface AppContextType {
  // 編輯器切換
  activeEditors: ('excel' | 'word' | 'ppt')[];
  setActiveEditors: React.Dispatch<React.SetStateAction<('excel' | 'word' | 'ppt')[]>>;

  // 檔案管理
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  fileTrees: FileSystemNode[];
  setFileTrees: React.Dispatch<React.SetStateAction<FileSystemNode[]>>;

  // 全域共用資料
  sheetData: any;
  setSheetData: (data: any) => void;
  wordData: string;
  setWordData: (data: string) => void;
  isPlayingSlides: boolean;
  setIsPlayingSlides: React.Dispatch<React.SetStateAction<boolean>>;
  pptTransition: string;
  setPptTransition: React.Dispatch<React.SetStateAction<string>>;
  slides: Slide[];
  setSlides: React.Dispatch<React.SetStateAction<Slide[]>>;
  activeSlideId: string;
  setActiveSlideId: (id: string) => void;
  parsedPptxSlides: Slide[];
  setParsedPptxSlides: React.Dispatch<React.SetStateAction<Slide[]>>;
  parsedXlsxSheet: any;
  setParsedXlsxSheet: (sheet: any) => void;

  // AI 與點數
  points: number;
  setPoints: React.Dispatch<React.SetStateAction<number>>;
  userApiKey: string;
  customEndpoint: string;
  setCustomEndpoint: (endpoint: string) => void;
  setUserApiKey: (key: string) => void;
  showAiSidebar: boolean;
  setShowAiSidebar: (show: boolean) => void;
  showFileLibrary: boolean;
  setShowFileLibrary: (show: boolean) => void;
  showPreviewPanel: boolean;
  setShowPreviewPanel: (show: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;

  // 商業化與算力設定
  isSubscribed: boolean;
  setIsSubscribed: (val: boolean) => void;
  computeMode: 'local' | 'byok' | 'platform';
  setComputeMode: (mode: 'local' | 'byok' | 'platform') => void;

  // 公式與 Excel 狀態
  aiFormulaInput: string;
  setAiFormulaInput: (val: string) => void;
  isTranslating: boolean;
  setIsTranslating: (is: boolean) => void;

  // AI 狀態
  aiActiveTab: 'formula' | 'beautify' | 'text' | 'action' | 'ppt';
  setAiActiveTab: (tab: 'formula' | 'beautify' | 'text' | 'action' | any) => void;
  beautifyStyleId: string | null;
  setBeautifyStyleId: (id: string | null) => void;
  generatedStyles: BeautifyTheme[];
  setGeneratedStyles: React.Dispatch<React.SetStateAction<BeautifyTheme[]>>;
  triggerBeautify: number;
  setTriggerBeautify: React.Dispatch<React.SetStateAction<number>>;
  selectedCellCoord: string;
  setSelectedCellCoord: (coord: string) => void;
  activeCellValue: string;
  setActiveCellValue: (val: string) => void;
  isSelectingRange: boolean;
  setIsSelectingRange: (isSelecting: boolean) => void;
  aiTranslation: { formula: string; explanation: string } | null;
  setAiTranslation: (translation: { formula: string; explanation: string } | null) => void;

  // Word AI 狀態
  wordSelectedText: string;
  setWordSelectedText: (val: string) => void;
  aiTextInsertMode: 'replace' | 'insertBelow';
  setAiTextInsertMode: (mode: 'replace' | 'insertBelow') => void;

  // Global AI Language
  aiLanguage: string;
  setAiLanguage: (lang: string) => void;
  t: (key: string) => string;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Font Size
  fontSize: 'sm' | 'base' | 'lg';
  setFontSize: (size: 'sm' | 'base' | 'lg') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeEditors, setActiveEditors] = useState<('excel' | 'word' | 'ppt')[]>(['excel']);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileTrees, setFileTrees] = useState<FileSystemNode[]>([]);

  const [sheetData, setSheetData] = useState<any>({
    id: 'workbook-1', name: translations[(localStorage.getItem("language") as "zh-TW") || "zh-TW"]?.["app.blank_sheet"] || "Blank", sheetOrder: ['sheet-1'],
    sheets: { 'sheet-1': { id: 'sheet-1', name: 'Sheet1', cellData: {}, rowCount: 100, columnCount: 30 } }
  });
  const [wordData, setWordData] = useState<string>('');
  const [slides, setSlides] = useState<Slide[]>([{ id: '1', title: '', content: '' }]);
  const [activeSlideId, setActiveSlideId] = useState<string>('1');
  const [isPlayingSlides, setIsPlayingSlides] = useState<boolean>(false);
  const [pptTransition, setPptTransition] = useState<string>('slide');
  const [aiLanguage, setAiLanguage] = useState<string>('English (en-US)');
  
  const [wordSelectedText, setWordSelectedText] = useState<string>('');
  const [parsedXlsxSheet, setParsedXlsxSheet] = useState<any>(null);

  const [parsedPptxSlides, setParsedPptxSlides] = useState<Slide[]>([]);

  const [points, setPoints] = useState<number>(20);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [customEndpoint, setCustomEndpoint] = useState<string>(() => localStorage.getItem('customEndpoint') || 'https://neat-parrots-sin.loca.lt');
  const [showAiSidebar, setShowAiSidebar] = useState<boolean>(true);
  const [showFileLibrary, setShowFileLibrary] = useState<boolean>(true);
  const [showPreviewPanel, setShowPreviewPanel] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);

  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [computeMode, setComputeMode] = useState<'local' | 'byok' | 'platform'>('platform');

  const [aiFormulaInput, setAiFormulaInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [aiActiveTab, setAiActiveTab] = useState<'formula' | 'beautify' | 'text' | 'action' | 'ppt'>('formula');
  const [beautifyStyleId, setBeautifyStyleId] = useState<string | null>(null);
  const [generatedStyles, setGeneratedStyles] = useState<BeautifyTheme[]>([]);
  const [triggerBeautify, setTriggerBeautify] = useState(0);
  const [selectedCellCoord, setSelectedCellCoord] = useState('A1');
  const [activeCellValue, setActiveCellValue] = useState('');
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [aiTranslation, setAiTranslation] = useState<{ formula: string; explanation: string } | null>(null);

  const [aiTextInsertMode, setAiTextInsertMode] = useState<'replace' | 'insertBelow'>('replace');

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>(() => (localStorage.getItem("fontSize") as "sm" | "base" | "lg") || 'base');

  // 翻譯函式
  const t = (key: string) => {
    // aiLanguage 格式為 "English (en-US)"，我們需要取出括號內的 "en-US"
    const match = aiLanguage.match(/\(([^)]+)\)/);
    const langKey = (match ? match[1] : 'en-US') as LanguageKey;
    
    // 如果找不到指定的語言，退回英文
    const dict = translations[langKey] || translations['en-US'];
    return dict[key] || key;
  };

  // 儲存 API Key & Theme & FontSize
  useEffect(() => {
    localStorage.setItem('gemini_api_key', userApiKey);
  }, [userApiKey]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  // 監聽並套用字體大小
  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    const root = window.document.documentElement;
    if (fontSize === 'sm') {
      root.style.fontSize = '16px';
    } else if (fontSize === 'lg') {
      root.style.fontSize = '24px';
    } else {
      root.style.fontSize = '20px'; // base
    }
  }, [fontSize]);

  // 監聽系統主題變化 (當 theme === 'system' 時)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const root = window.document.documentElement;
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <AppContext.Provider value={{
      activeEditors, setActiveEditors,
      uploadedFiles, setUploadedFiles,
      selectedFile, setSelectedFile,
      fileTrees, setFileTrees,
      sheetData, setSheetData,
      wordData, setWordData,
      slides, setSlides,
      activeSlideId, setActiveSlideId,
      isPlayingSlides, setIsPlayingSlides,
      pptTransition, setPptTransition,
      parsedPptxSlides, setParsedPptxSlides,
      parsedXlsxSheet, setParsedXlsxSheet,
      points, setPoints,
      userApiKey, setUserApiKey,
      customEndpoint, setCustomEndpoint,
      showAiSidebar, setShowAiSidebar,
      showFileLibrary, setShowFileLibrary,
      showPreviewPanel, setShowPreviewPanel,
      showSettingsModal, setShowSettingsModal,
      isUploading, setIsUploading,
      isSubscribed, setIsSubscribed,
      computeMode, setComputeMode,
      aiFormulaInput, setAiFormulaInput,
      isTranslating, setIsTranslating,
      aiActiveTab,
      setAiActiveTab,
      beautifyStyleId,
      setBeautifyStyleId,
      generatedStyles,
      setGeneratedStyles,
      triggerBeautify,
      setTriggerBeautify,
      selectedCellCoord,
      setSelectedCellCoord,
      activeCellValue,
      setActiveCellValue,
      isSelectingRange,
      setIsSelectingRange,
      aiTranslation,
      setAiTranslation,
      wordSelectedText,
      setWordSelectedText,
      aiTextInsertMode,
      setAiTextInsertMode,
      aiLanguage,
      setAiLanguage,
      t,
      theme,
      setTheme,
      fontSize,
      setFontSize
    }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
