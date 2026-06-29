import toast from 'react-hot-toast';
import { useAppContext } from '../contexts/AppContext';
import React from 'react';

export const Paywall: React.FC = () => {
    const { setIsSubscribed } = useAppContext();

  const handleSubscribe = (plan: 'yearly' | 'lifetime') => {
    // 模擬呼叫金流 API
    toast(`正在為您導向 ${plan === 'yearly' ? '365元 年費訂閱' : '2000元 終身買斷'} 的結帳頁面...`);
    // 假設付款成功
    setTimeout(() => {
      toast.success('付款成功！感謝您的訂閱，系統權限已全面解鎖。');
      setIsSubscribed(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm overflow-y-auto py-10">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">
        {/* 左側介紹區 */}
        <div className="md:w-5/12 bg-gradient-to-br from-indigo-600 to-blue-700 p-10 text-white flex flex-col justify-center">
          <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-6 w-max">
            ✨ AI 生產力套件 專業版
          </div>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">解放您的<br/>生產力。</h1>
          <p className="text-indigo-100 text-sm leading-relaxed mb-8">
            加入專業版會員，無限制存取智慧表格、AI 公式生成器與文件擴寫功能。每天不到一杯咖啡的價格，讓 AI 成為您最強大的辦公室助理。
          </p>
          <ul className="space-y-3 text-sm font-medium">
            <li className="flex items-center"><span className="mr-2">✅</span> 完整存取 表格 / 文件 / 簡報 編輯器</li>
            <li className="flex items-center"><span className="mr-2">✅</span> 支援三層算力：自帶模型 / 雲端 API / 點數代扣</li>
            <li className="flex items-center"><span className="mr-2">✅</span> 檔案本機加密，保護商業機密</li>
            <li className="flex items-center"><span className="mr-2">✅</span> 優先獲得最新 AI 功能更新</li>
          </ul>
        </div>

        {/* 右側方案區 */}
        <div className="md:w-7/12 p-10 bg-slate-50 flex flex-col justify-center relative">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">選擇您的解鎖方案</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 年費方案 */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col h-full" onClick={() => handleSubscribe('yearly')}>
              <div className="text-indigo-600 font-bold tracking-wide text-sm mb-2 uppercase">超值訂閱制</div>
              <div className="flex items-baseline mb-4">
                <span className="text-4xl font-extrabold text-slate-800">NT$365</span>
                <span className="text-slate-500 ml-1 font-medium">/ 年</span>
              </div>
              <p className="text-xs text-slate-500 mb-6 flex-1">
                等於每天只要 <strong className="text-indigo-600">1 元</strong>。適合想要以最低門檻享受最新 AI 辦公體驗的專業人士。
              </p>
              <button className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition-colors">
                選擇年費訂閱
              </button>
            </div>

            {/* 買斷方案 */}
            <div className="bg-indigo-50 border-2 border-indigo-500 rounded-xl p-6 hover:border-indigo-600 transition-all cursor-pointer shadow-md flex flex-col h-full relative" onClick={() => handleSubscribe('lifetime')}>
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm">
                最佳選擇 🔥
              </div>
              <div className="text-indigo-700 font-bold tracking-wide text-sm mb-2 uppercase">終身買斷制</div>
              <div className="flex items-baseline mb-4">
                <span className="text-4xl font-extrabold text-indigo-900">NT$2,000</span>
                <span className="text-indigo-500 ml-1 font-medium">/ 終身</span>
              </div>
              <p className="text-xs text-indigo-600 mb-6 flex-1">
                一次性付費，終身免年費。未來系統所有核心功能升級皆免費涵蓋，最適合精打細算的重度使用者。
              </p>
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-indigo-500/30 shadow-lg">
                立即終身買斷
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-slate-400">
            點擊方案按鈕即代表您同意我們的服務條款與隱私權政策。<br/>
            (此為模擬測試環境，點擊按鈕將直接開通權限)
          </div>
        </div>
      </div>
    </div>
  );
};
