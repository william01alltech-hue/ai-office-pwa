import React, { useEffect, useState } from 'react';

interface InterstitialAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  countdownSeconds?: number;
}

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  isOpen,
  onClose,
  countdownSeconds = 5,
}) => {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(countdownSeconds);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCanSkip(false);

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanSkip(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, countdownSeconds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-95 backdrop-blur-md transition-opacity">
      <div className="w-full max-w-4xl h-[80vh] bg-white rounded-xl shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Header / Skip Bar */}
        <div className="h-14 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-6">
          <span className="text-slate-500 font-bold text-sm tracking-wider uppercase">贊助廣告</span>
          {canSkip ? (
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-md transition-colors flex items-center gap-2 animate-pulse"
            >
              <span>跳過廣告並下載</span>
              <span className="text-lg leading-none">→</span>
            </button>
          ) : (
            <div className="bg-slate-200 text-slate-500 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
              <span className="animate-spin text-lg leading-none">⏳</span>
              <span>廣告結束後即可下載 ({timeLeft}s)</span>
            </div>
          )}
        </div>

        {/* Ad Content Area */}
        <div className="flex-1 bg-slate-50 relative flex items-center justify-center">
          {/* Mock Full-screen Ad */}
          <div className="text-center p-8">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">SyncCore Premium 企業版</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">升級解鎖 <span className="font-bold text-indigo-600">無限 AI 圖片解析</span> 與 <span className="font-bold text-purple-600">進階語音生成公式</span>。現在訂閱即享企業級 SSL 安全防護與 1TB 雲端空間。</p>
            <div className="w-full max-w-lg h-64 bg-slate-200 border-2 border-dashed border-slate-300 mx-auto rounded-xl flex items-center justify-center">
              <span className="text-slate-400 font-medium">Google AdSense 全幅廣告佔位區塊</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
