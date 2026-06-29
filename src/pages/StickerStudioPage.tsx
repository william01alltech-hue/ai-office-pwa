import toast from 'react-hot-toast';
import React, { useState, useRef, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { useFileSystem } from '../contexts/FileSystemContext';
  import JSZip from 'jszip';
  import { ObjectImage } from '../components/ObjectImage';
  import localforage from 'localforage';
  import { useAppContext } from '../contexts/AppContext';
  
  


export type LayerType = 'image' | 'draw';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  zIndex: number;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  file: File;
  imageUrl: string; 
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface DrawLayer extends BaseLayer {
  type: 'draw';
  paths: DrawPath[];
}

export type CanvasLayer = ImageLayer | DrawLayer;

const StickerStudioPage: React.FC = () => {
  const { t } = useAppContext();

  const EXPORT_PLATFORMS = [
    { 
      id: 'line', 
      name: 'sticker.plat_line', 
      format: t('sticker.multi_format'), 
      desc: 'sticker.plat_line_desc', 
      color: 'bg-[#06C755]', 
      hover: 'hover:bg-[#05b34c]',
      subItems: [
        { id: 'line_standard', name: 'sticker.line_std', format: 'PNG', desc: 'sticker.line_std_desc' },
        { id: 'line_emoji', name: t("sticker.emoji"), format: 'PNG', desc: t("sticker.emoji_desc") },
        { id: 'line_message', name: 'sticker.line_big', format: 'PNG', desc: 'sticker.line_big_desc' },
        { id: 'line_animated', name: 'sticker.line_anim', format: 'APNG', desc: 'sticker.line_anim_desc' },
      ]
    },
    { 
      id: 'whatsapp', 
      name: 'WhatsApp', 
      format: t('sticker.multi_format'), 
      desc: t("sticker.wa_expand"), 
      color: 'bg-[#25D366]', 
      hover: 'hover:bg-[#20bd5c]',
      subItems: [
        { id: 'wa_static', name: t('sticker.wa_static'), format: 'WebP', desc: t('sticker.wa_static_desc') },
        { id: 'wa_animated', name: t('sticker.wa_animated'), format: 'WebP', desc: t('sticker.wa_animated_desc') },
      ]
    },
    { 
      id: 'telegram', 
      name: 'Telegram', 
      format: t('sticker.multi_format'), 
      desc: t('sticker.tg_desc'), 
      color: 'bg-[#229ED9]', 
      hover: 'hover:bg-[#1e8cc0]',
      subItems: [
        { id: 'tg_static', name: t('sticker.wa_static'), format: 'PNG', desc: t('sticker.tg_static_desc') },
        { id: 'tg_animated', name: t('sticker.wa_animated'), format: 'TGS', desc: t('sticker.tg_animated_desc') },
        { id: 'tg_video', name: t('sticker.tg_video'), format: 'WEBM', desc: t('sticker.tg_video_desc') },
      ]
    },
    { 
      id: 'wechat', 
      name: t('sticker.wechat'), 
      format: t('sticker.multi_format'), 
      desc: t('sticker.wechat_desc'), 
      color: 'bg-[#07C160]', 
      hover: 'hover:bg-[#06ad56]',
      subItems: [
        { id: 'wechat_static', name: t('sticker.wechat_static'), format: 'PNG', desc: t('sticker.wechat_static_desc') },
        { id: 'wechat_animated', name: t('sticker.wechat_animated'), format: 'GIF', desc: t('sticker.wa_animated_desc') },
      ]
    },
    { 
      id: 'discord', 
      name: 'Discord', 
      format: t('sticker.multi_format'), 
      desc: t('sticker.dc_desc'), 
      color: 'bg-[#5865F2]', 
      hover: 'hover:bg-[#4f5bda]',
      subItems: [
        { id: 'dc_static', name: t('sticker.dc_static'), format: 'PNG', desc: t('sticker.dc_static_desc') },
        { id: 'dc_animated', name: t('sticker.dc_animated'), format: 'GIF', desc: t('sticker.dc_animated_desc') },
      ]
    },
    { 
      id: 'slack_teams', 
      name: 'Slack / Teams', 
      format: t('sticker.multi_format'), 
      desc: t('sticker.slack_desc'), 
      color: 'bg-[#E01E5A]', 
      hover: 'hover:bg-[#c91b51]',
      subItems: [
        { id: 'slack_static', name: t('sticker.slack_static'), format: 'PNG', desc: t('sticker.slack_static_desc') },
        { id: 'slack_animated', name: t('sticker.slack_animated'), format: 'GIF', desc: t('sticker.slack_animated_desc') },
      ]
    },
    { 
      id: 'imessage', 
      name: 'Apple iMessage', 
      format: t('sticker.multi_format'), 
      desc: t('sticker.apple_desc'), 
      color: 'bg-[#0B84FF]', 
      hover: 'hover:bg-[#0a77e6]',
      subItems: [
        { id: 'apple_static', name: t('sticker.apple_static'), format: 'PNG', desc: t('sticker.apple_static_desc') },
        { id: 'apple_animated', name: t('sticker.apple_animated'), format: 'APNG', desc: t('sticker.slack_animated_desc') },
      ]
    },
    { 
      id: 'messenger', 
      name: 'Messenger / IG', 
      format: t('sticker.multi_format'), 
      desc: t('sticker.msg_desc'), 
      color: 'bg-gradient-to-r from-[#00B2FF] to-[#006AFF]', 
      hover: 'opacity-90',
      subItems: [
        { id: 'msg_static', name: t('sticker.wa_static'), format: 'PNG', desc: t('sticker.msg_static_desc') },
        { id: 'msg_animated', name: t('sticker.wa_animated'), format: 'GIF', desc: t('sticker.slack_animated_desc') },
      ]
    },
    { 
      id: 'kakao_viber', 
      name: 'KakaoTalk / Viber', 
      format: t('sticker.multi_format'), 
      desc: t('sticker.kakao_desc'), 
      color: 'bg-[#FEE500] text-[#000000]', 
      hover: 'hover:bg-[#e5ce00]',
      subItems: [
        { id: 'kakao_static', name: t('sticker.wa_static'), format: 'PNG', desc: t('sticker.kakao_static_desc') },
        { id: 'kakao_animated', name: t('sticker.wa_animated'), format: 'APNG', desc: t('sticker.slack_animated_desc') },
      ]
    },
  ];
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [expandedPlatformId, setExpandedPlatformId] = useState<string | null>(null);
  const [showPackModal, setShowPackModal] = useState(false);
  const [packSize, setPackSize] = useState<number>(8);
  const [isExporting, setIsExporting] = useState(false);
  const { files: virtualFiles, uploadFiles, getFile } = useFileSystem();
    const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Canvas & Layers State
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'eraser'>('select');
  const [brushColor, setBrushColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(5);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPathRef = useRef<{x: number, y: number}[]>([]);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);
  const isInitialLoadRef = useRef(true);

  // 離線進度還原 (載入)
  useEffect(() => {
    const loadLayers = async () => {
      try {
        const storedLayers = await localforage.getItem<CanvasLayer[]>('synccore_sticker_layers');
        if (storedLayers && storedLayers.length > 0) {
          const restoredLayers = storedLayers.map(l => {
            if (l.type === 'image') {
              const imgLayer = l as ImageLayer;
              return { ...imgLayer, imageUrl: URL.createObjectURL(imgLayer.file) };
            }
            return l;
          });
          setLayers(restoredLayers);
          
          // 還原已上傳的圖片 (簡易版：從圖層中提取，或者可以另外存)
          const imageFiles = storedLayers.filter(l => l.type === 'image').map(l => (l as ImageLayer).file);
          if (imageFiles.length > 0) {
            setUploadedImages(imageFiles);
          }
        }
      } catch (error) {
        console.error('Failed to load layers from IndexedDB:', error);
      } finally {
        isInitialLoadRef.current = false;
      }
    };
    loadLayers();
  }, []);

  // 離線進度儲存 (當 layers 改變時)
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    const saveLayers = async () => {
      try {
        // 清除儲存前的 imageUrl 避免不必要的暫存資料
        const cleanLayers = layers.map(l => {
          if (l.type === 'image') {
            const { imageUrl, ...rest } = l as ImageLayer;
            return { ...rest, imageUrl: '' };
          }
          return l;
        });
        await localforage.setItem('synccore_sticker_layers', cleanLayers);
      } catch (error) {
        console.error('Failed to save layers to IndexedDB:', error);
      }
    };
    saveLayers();
  }, [layers]);

  // 繪圖渲染引擎
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 每次 state 改變時重新繪製整個 Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    sortedLayers.forEach(layer => {
      if (!layer.visible) return;

      if (layer.type === 'image') {
        const imgLayer = layer as ImageLayer;
        const img = new Image();
        img.src = imgLayer.imageUrl;
        if (img.complete) {
          ctx.drawImage(img, imgLayer.x, imgLayer.y, imgLayer.width, imgLayer.height);
        } else {
          img.onload = () => {
            // 觸發重新繪製 (簡易版，在真實情境應該獨立處理圖片 loading)
            ctx.drawImage(img, imgLayer.x, imgLayer.y, imgLayer.width, imgLayer.height);
          };
        }
      } else if (layer.type === 'draw') {
        const drawLayer = layer as DrawLayer;
        drawLayer.paths.forEach(path => {
          if (path.points.length === 0) return;
          ctx.beginPath();
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        });
      }
    });

  }, [layers]);

  // 滑鼠事件處理
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'draw' && activeTool !== 'eraser') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    currentPathRef.current = [{ x, y }];
    lastPosRef.current = { x, y };
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx && lastPosRef.current) {
      ctx.beginPath();
      ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    currentPathRef.current.push({ x, y });
    lastPosRef.current = { x, y };
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentPathRef.current.length > 0) {
      const finalPath = [...currentPathRef.current];
      setLayers(prev => {
        // 尋找是否已有 draw 圖層，如果沒有就新增一個
        const existingDrawLayer = prev.find(l => l.type === 'draw');
        if (existingDrawLayer) {
          return prev.map(l => l.id === existingDrawLayer.id 
            ? { ...l, paths: [...(l as DrawLayer).paths, { points: finalPath, color: activeTool === 'eraser' ? '#ffffff' : brushColor, width: brushSize }] }
            : l
          );
        } else {
          const newDrawLayer: DrawLayer = {
            id: `layer-${crypto.randomUUID()}`,
            name: t('sticker.draw_layer'),
            type: 'draw',
            visible: true,
            zIndex: prev.length,
            paths: [{ points: finalPath, color: activeTool === 'eraser' ? '#ffffff' : brushColor, width: brushSize }]
          };
          setActiveLayerId(newDrawLayer.id);
          return [...prev, newDrawLayer];
        }
      });
      currentPathRef.current = [];
      lastPosRef.current = null;
    }
  };

  const addImageToCanvas = (file: File) => {
    const imgUrl = URL.createObjectURL(file);
    const newId = `layer-${crypto.randomUUID()}`;
    const newImageLayer: ImageLayer = {
      id: newId,
      name: file.name,
      type: 'image',
      visible: true,
      zIndex: layers.length,
      file: file,
      imageUrl: imgUrl,
      x: 50,
      y: 50,
      width: 200, // 預設縮放尺寸
      height: 200
    };
    setLayers(prev => [...prev, newImageLayer]);
    setActiveLayerId(newImageLayer.id);
  };

  // Resizable Sidebars State
  const [assetsWidth, setAssetsWidth] = useState(320);
  const [propertiesWidth, setPropertiesWidth] = useState(320);

  // Panel Visibility State
  const [showAssetsPanel, setShowAssetsPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  
  // Right Panel Tab State
  const [activeRightTab, setActiveRightTab] = useState<'design' | 'export'>('design');

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

  // 掛載本機資料夾拖曳上傳處理
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      setUploadedImages(prev => [...prev, ...files]);
      uploadFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      setUploadedImages(prev => [...prev, ...files]);
      uploadFiles(files);
    }
  };

  const handleMountDirectory = async () => {
    if (!('showDirectoryPicker' in window)) {
      toast(t('sticker.folder_unsupported'));
      return;
    }
    
    try {
      
            const dirHandle = await window.showDirectoryPicker();
      
      const files: File[] = [];
      for await (const entry of (dirHandle as FileSystemDirectoryHandle).values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          if (file.type.startsWith('image/')) {
            files.push(file);
          }
        }
      }
      uploadFiles(files);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error mounting directory:', err);
        toast(t('sticker.folder_fail'));
      }
    } finally {
      
    }
  };

  
  const generateLinePack = async () => {
    if (uploadedImages.length < packSize) {
      toast(t('sticker.upload_more'));
      return;
    }
    
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const imagesToProcess = uploadedImages.slice(0, packSize);
      
      const processImage = (file: File, maxWidth: number, maxHeight: number, padding: number, exactSize: boolean): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const objectUrl = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context not available'));
            
            // Calculate scale to fit within maxWidth/maxHeight minus padding
            const targetW = maxWidth - padding * 2;
            const targetH = maxHeight - padding * 2;
            const scale = Math.min(targetW / img.width, targetH / img.height, 1);
            
            let finalW = Math.round(img.width * scale);
            let finalH = Math.round(img.height * scale);
            
            // Ensure even dimensions
            if (finalW % 2 !== 0) finalW = Math.max(2, finalW - 1);
            if (finalH % 2 !== 0) finalH = Math.max(2, finalH - 1);
            
            if (exactSize) {
              // For Main/Tab: Canvas size must be exactly the target size
              canvas.width = maxWidth;
              canvas.height = maxHeight;
              const x = (maxWidth - finalW) / 2;
              const y = (maxHeight - finalH) / 2;
              ctx.drawImage(img, x, y, finalW, finalH);
            } else {
              // For standard stickers: Canvas size wraps the image + padding
              canvas.width = finalW + padding * 2;
              canvas.height = finalH + padding * 2;
              ctx.drawImage(img, padding, padding, finalW, finalH);
            }
            
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas to Blob failed'));
            }, 'image/png');
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Image load failed'));
          };
          img.src = objectUrl;
        });
      };

      // Process standard stickers (01.png - 40.png)
      for (let i = 0; i < imagesToProcess.length; i++) {
        const file = imagesToProcess[i];
        const blob = await processImage(file, 370, 320, 10, false);
        const fileName = `${(i + 1).toString().padStart(2, '0')}.png`;
        zip.file(fileName, blob);
      }

      // Process Main (240x240) and Tab (96x74) using the first image
      const firstImage = imagesToProcess[0];
      const mainBlob = await processImage(firstImage, 240, 240, 10, true);
      zip.file('main.png', mainBlob);
      
      const tabBlob = await processImage(firstImage, 96, 74, 5, true);
      zip.file('tab.png', tabBlob);

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `line_sticker_pack_${packSize}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowPackModal(false);
    } catch (error) {
      console.error('Failed to generate pack:', error);
      toast(t('sticker.pack_fail'));
    } finally {
      setIsExporting(false);
    }
  };

  const getToggleClass = (isActive: boolean) => {
    return isActive 
      ? "px-3 py-1.5 bg-blue-500 text-white font-bold rounded-xl shadow-md ring-2 ring-blue-500 ring-offset-1 flex items-center gap-2 transition-all text-sm"
      : "px-3 py-1.5 bg-[#f4f6f8] dark:bg-slate-800 text-slate-600 dark:text-white font-bold rounded-xl shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 text-sm";
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] dark:bg-slate-900 font-sans overflow-hidden">
      
      {/* 頂部導覽 */}
      <header className="absolute top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-20 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="font-extrabold text-slate-800 dark:text-white tracking-tight mr-2">StickerStudio <span className="font-bold text-orange-500 dark:text-orange-400 text-sm ml-1">{t('sticker.title_suffix')}</span></span>
          </div>
          
          <div className="h-6 w-px bg-slate-300 mx-1"></div>
          
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-600 dark:text-white hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors font-bold text-sm"
          >
            <span className="text-lg leading-none">🏠</span>
            {t('sticker.back_home')}
          </button>

          <div className="h-6 w-px bg-slate-300 mx-1"></div>

          <button onClick={() => setShowAssetsPanel(!showAssetsPanel)} className={getToggleClass(showAssetsPanel)}>
            <span className="text-lg leading-none">📁</span> {t('sticker.assets_panel')}
          </button>
          
          <div className="h-6 w-px bg-slate-300 mx-1"></div>
          
          <button onClick={() => setShowPropertiesPanel(!showPropertiesPanel)} className={getToggleClass(showPropertiesPanel)}>
            <span className="text-lg leading-none">🎛️</span> {t('sticker.props_panel')}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-bold text-slate-500 dark:text-white hover:text-slate-800 dark:hover:text-slate-200 transition-colors">{t('sticker.tutorial')}</button>
          <button className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95 whitespace-nowrap">
            {t('sticker.upgrade_pro')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-16 w-full h-full">

        {/* 左側：素材庫 (Assets Panel) */}
        {showAssetsPanel && (
        <aside style={{ width: assetsWidth }} className="bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-sm z-10 shrink-0 relative">
          <div 
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-20"
            onMouseDown={(e) => handleDragStart(e, assetsWidth, setAssetsWidth, 250, 600, false)}
          />
          
          {/* 上傳與匯入區 */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">{t('sticker.assets_panel')}</h2>
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-24 rounded-xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed mb-3
                ${isDragging ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-slate-400'}
              `}
            >
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold tracking-wide">{t('sticker.drag_upload')}</p>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileInput} />
            </div>
            <button 
              onClick={handleMountDirectory}
              className="w-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm border border-slate-200 dark:border-slate-600 shadow-sm"
            >
              <span>📁</span> {t('sticker.mount_folder')}
            </button>
          </div>

          {/* 已上傳素材網格 */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col scrollbar-thin">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('sticker.ready_assets').replace('{0}', String(uploadedImages.length + virtualFiles.length))}</h3>
              {(uploadedImages.length > 0 || virtualFiles.length > 0) && (
                <button onClick={() => { setUploadedImages([]); }} className="text-[10px] text-red-500 hover:text-red-600 font-bold bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">{t('sticker.clear_img')}</button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 content-start">
              {/* Uploaded Images */}
              {uploadedImages.map((file: any, idx: number) => (
                <div 
                  key={`up-${idx}`} 
                  className="aspect-square bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative group border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => addImageToCanvas(file)}
                  title={t('sticker.add_canvas_title')}
                >
                  <ObjectImage file={file} className="w-full h-full object-cover" alt={`upload-${idx}`} />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-black text-sm drop-shadow-md">{t('sticker.add_canvas')}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setUploadedImages(prev => prev.filter((_, i) => i !== idx)); }}
                    className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}

              {/* Virtual Files */}
              {virtualFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="aspect-square bg-white dark:bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group relative border border-slate-200 dark:border-slate-700 shadow-sm"
                  onClick={async () => {
                    const f = await getFile(file.id);
                    if (f) setUploadedImages(prev => [...prev, f]);
                  }}
                  title={t('sticker.use_ready_title')}
                >
                  {file.type.startsWith('image/') ? (file.thumbnail ? <img src={file.thumbnail} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full w-full bg-slate-100 dark:bg-slate-800 text-2xl">🖼️</div>) : <div className="flex items-center justify-center h-full w-full bg-slate-100 dark:bg-slate-800 text-2xl">📄</div>}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold px-2 py-1 bg-blue-500 rounded-full shadow-md">{t('sticker.use_ready')}</span>
                  </div>
                </div>
              ))}
              
              {uploadedImages.length === 0 && virtualFiles.length === 0 && (
                 <div className="col-span-2 text-center text-slate-400 text-sm mt-10">{t('sticker.no_assets')}</div>
              )}
            </div>
          </div>
        </aside>
        )}

        {/* 中央主作業區 (Main Workspace) */}
        <main className="w-full h-full bg-[#e5e7eb] dark:bg-slate-950 relative flex flex-col overflow-hidden items-center justify-center">
          {/* 畫布底層格子背景 */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0iI2QxZDVkYiI+PC9jaXJjbGU+Cjwvc3ZnPg==')] opacity-50 dark:opacity-20 pointer-events-none"></div>

          <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-sm font-bold text-slate-700 dark:text-white">{t('sticker.interactive_canvas')}</span>
            </div>
            {/* 懸浮快速工具箱 (只在設計頁籤下顯示捷徑) */}
            {activeRightTab === 'design' && (
               <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1">
                 <button onClick={() => setActiveTool('select')} className={`p-2 rounded-lg transition-colors ${activeTool === 'select' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'}`} title={t('sticker.tool_select')}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                 </button>
                 <button onClick={() => setActiveTool('draw')} className={`p-2 rounded-lg transition-colors ${activeTool === 'draw' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'}`} title={t('sticker.tool_draw')}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 </button>
                 <button onClick={() => setActiveTool('eraser')} className={`p-2 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'}`} title={t('sticker.tool_eraser')}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
               </div>
            )}
          </div>

          <div className="relative shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-white dark:bg-slate-800 rounded-sm overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700/50" style={{ width: 500, height: 500 }}>
            <canvas 
              ref={canvasRef}
              width={500}
              height={500}
              className={`absolute inset-0 z-10 ${activeTool === 'draw' ? 'cursor-crosshair' : activeTool === 'eraser' ? 'cursor-cell' : 'cursor-default'}`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
            
            {layers.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400/80 dark:text-white/50 z-0 pointer-events-none">
                <span className="text-5xl mb-3 opacity-50 grayscale">🎨</span>
                <p className="font-bold text-lg">{t('sticker.canvas_ready')}</p>
                <p className="text-sm mt-1">{t('sticker.canvas_hint')}</p>
              </div>
            )}
          </div>
        </main>

        {/* 右側：屬性與輸出 (Properties Panel) */}
        {showPropertiesPanel && (
        <aside style={{ width: propertiesWidth }} className="bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-sm z-10 shrink-0 relative">
          <div 
            className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-slate-300 active:bg-slate-400 transition-colors z-20"
            onMouseDown={(e) => handleDragStart(e, propertiesWidth, setPropertiesWidth, 250, 600, true)}
          />
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-800/80">
            <button 
              onClick={() => setActiveRightTab('design')}
              className={`flex-1 py-3 text-sm font-bold transition-all ${activeRightTab === 'design' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-800' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 border-b-2 border-transparent'}`}
            >
              {t('sticker.tab_design')}
            </button>
            <button 
              onClick={() => setActiveRightTab('export')}
              className={`flex-1 py-3 text-sm font-bold transition-all ${activeRightTab === 'export' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-800' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 border-b-2 border-transparent'}`}
            >
              {t('sticker.tab_export')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col scrollbar-thin">
            {activeRightTab === 'design' ? (
              <>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">{t('sticker.toolbar')}</h3>
                <div className="grid grid-cols-3 gap-2 mb-6 shrink-0">
                  <button onClick={() => setActiveTool('select')} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${activeTool === 'select' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                    <span className="text-[10px] font-bold">{t('sticker.tool_select')}</span>
                  </button>
                  <button onClick={() => setActiveTool('draw')} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${activeTool === 'draw' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    <span className="text-[10px] font-bold">{t('sticker.tool_draw')}</span>
                  </button>
                  <button onClick={() => setActiveTool('eraser')} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${activeTool === 'eraser' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    <span className="text-[10px] font-bold">{t('sticker.tool_eraser')}</span>
                  </button>
                </div>

                {activeTool === 'draw' && (
                  <div className="mb-6 space-y-3 shrink-0">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">{t('sticker.brush_color')}</label>
                      <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-full h-8 rounded cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">{t('sticker.brush_size')} ({brushSize}px)</label>
                      <input type="range" min="1" max="20" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-full" />
                    </div>
                  </div>
                )}

                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 mt-4 shrink-0">{t('sticker.layer_mgmt')}</h3>
                <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  {layers.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 dark:text-white text-sm font-medium">{t('sticker.no_layers')}</div>
                  ) : (
                    <div className="flex flex-col-reverse">
                      {[...layers].sort((a, b) => a.zIndex - b.zIndex).map(layer => (
                        <div 
                          key={layer.id} 
                          className={`flex items-center p-2 border-b border-slate-200 dark:border-slate-700 cursor-pointer transition-colors ${activeLayerId === layer.id ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                          onClick={() => setActiveLayerId(layer.id)}
                        >
                          <button 
                            className="mr-2 text-slate-400 hover:text-slate-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLayers(layers.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l));
                            }}
                          >
                            {layer.visible ? '👁️' : '🚫'}
                          </button>
                          <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center mr-2 text-xs overflow-hidden shrink-0">
                            {layer.type === 'image' ? (
                              <img src={(layer as ImageLayer).imageUrl} className="w-full h-full object-cover" />
                            ) : '🖌️'}
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-white truncate flex-1">{layer.name}</span>
                          <button 
                            className="text-slate-400 hover:text-red-500 p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (layer.type === 'image' && (layer as ImageLayer).imageUrl) {
                                URL.revokeObjectURL((layer as ImageLayer).imageUrl);
                              }
                              setLayers(layers.filter(l => l.id !== layer.id));
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    {t('sticker.export_title')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('sticker.export_desc')}</p>
                </div>
                {EXPORT_PLATFORMS.map(platform => (
                  <div key={platform.id} className="w-full">
                    <button
                      className={`w-full group flex items-center rounded-xl border transition-all overflow-hidden p-2 gap-3 bg-white dark:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 ${expandedPlatformId === platform.id ? 'border-slate-300 dark:border-slate-500 shadow-sm' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
                      onClick={() => {
                        if (platform.subItems) {
                          setExpandedPlatformId(expandedPlatformId === platform.id ? null : platform.id);
                        } else {
                          if (uploadedImages.length === 0) {
                            toast(t('sticker.upload_first'));
                            return;
                          }
                          toast(t('sticker.packing').replace('{0}', platform.name));
                        }
                      }}
                    >
                      <div className={`w-10 h-10 flex items-center justify-center shrink-0 text-white rounded-lg ${platform.color} transition-opacity`}>
                        <span className="font-black text-lg leading-none">{platform.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 text-left flex flex-col justify-center pr-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-[14px] text-slate-700 dark:text-white">{t(platform.name)}</span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">{platform.format}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 leading-tight">{t(platform.desc)}</span>
                          {platform.subItems && (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-300 dark:text-slate-400 transition-transform ${expandedPlatformId === platform.id ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                          )}
                        </div>
                      </div>
                    </button>
                    {platform.subItems && expandedPlatformId === platform.id && (
                      <div className="mt-1 ml-3 pl-3 space-y-1 mb-3 border-l-2 border-slate-100 dark:border-slate-700">
                        {platform.subItems.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => {
                              if (sub.id === 'line_standard') {
                                setShowPackModal(true);
                              } else {
                                if (uploadedImages.length === 0) {
                                  toast(t('sticker.upload_first'));
                                  return;
                                }
                                toast(t('sticker.packing').replace('{0}', sub.name));
                              }
                            }}
                            className="w-full group flex items-center rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800 p-1.5 gap-2 transition-all hover:shadow-sm"
                          >
                            <div className={`w-8 h-8 flex items-center justify-center shrink-0 text-white rounded-md ${platform.color} opacity-80 transition-opacity`}>
                              <span className="font-black text-sm leading-none">{platform.name.charAt(0)}</span>
                            </div>
                            <div className="flex-1 text-left flex flex-col justify-center">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-xs text-slate-700 dark:text-white">{t(sub.name)}</span>
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-700 px-1 rounded">{sub.format}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 leading-tight">{t(sub.desc)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
        )}

      </div>
      {/* LINE 打包設定 Modal */}
      {showPackModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-[#06C755]/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#06C755] rounded-xl flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{t("sticker.pack_line").replace("{0}", String(t("sticker.wa_static")))}</h3>
                  <p className="text-sm font-bold text-[#06C755]">{t('sticker.pack_line_req')}</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <h4 className="text-sm font-bold text-slate-500 dark:text-white mb-4">{t('sticker.pack_select_num')}</h4>
              <div className="grid grid-cols-5 gap-3 mb-6">
                {[8, 16, 24, 32, 40].map(size => (
                  <button
                    key={size}
                    onClick={() => setPackSize(size)}
                    className={`py-3 rounded-xl font-black text-lg transition-all ${
                      packSize === size 
                        ? 'bg-[#06C755] text-white shadow-md ring-2 ring-[#06C755] ring-offset-2 dark:ring-offset-slate-800 scale-105' 
                        : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-700 dark:text-white">{t('sticker.pack_uploaded')}</span>
                  <span className={`font-black text-xl ${uploadedImages.length >= packSize ? 'text-[#06C755]' : 'text-orange-500'}`}>
                    {uploadedImages.length} <span className="text-sm font-medium text-slate-500 dark:text-white">{t('sticker.pack_images')}</span>
                  </span>
                </div>
                
                {uploadedImages.length < packSize ? (
                  <div className="flex items-start gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 p-3 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    <p className="text-sm font-bold">{t('sticker.pack_warn_num')}<br/><span className="font-medium text-orange-500/80 dark:text-orange-400/80">{t('sticker.pack_warn_desc').replace('{0}', String(packSize)).replace('{1}', String(uploadedImages.length))}</span></p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-[#06C755] bg-green-50 dark:bg-[#06C755]/10 p-3 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <p className="text-sm font-bold">{t('sticker.pack_ready')}<br/><span className="font-medium text-[#06C755]/80">{t('sticker.pack_ready_desc')}</span></p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowPackModal(false)}
                className="px-6 py-2.5 font-bold text-slate-500 dark:text-white hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                {t('sticker.cancel')}
              </button>
              <button 
                onClick={generateLinePack}
                disabled={uploadedImages.length < packSize || isExporting}
                className={`px-8 py-2.5 font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2
                  ${uploadedImages.length < packSize || isExporting 
                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                    : 'bg-[#06C755] hover:bg-[#05b34c] shadow-green-500/30 active:scale-95'
                  }`}
              >
                {isExporting ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                )}
                {isExporting ? t('sticker.packing_now') : t('sticker.start_pack_zip')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickerStudioPage;
