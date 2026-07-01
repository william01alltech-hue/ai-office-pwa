import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { redeemInviteCode } from '../services/userService';
import toast from 'react-hot-toast';

interface InviteCodeModalProps {
  onClose: () => void;
}

export const InviteCodeModal: React.FC<InviteCodeModalProps> = ({ onClose }) => {
  const { currentUser, refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error('請輸入邀請碼');
      return;
    }
    if (!currentUser) return;

    try {
      setIsLoading(true);
      await redeemInviteCode(currentUser.uid, code);
      await refreshProfile();
      toast.success('🎉 恭喜！您的帳號已升級為企業帳號！');
      onClose();
    } catch (error: any) {
      toast.error(error.message || '兌換失敗，請重試。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              🎫
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">輸入企業邀請碼</h2>
              <p className="text-blue-100 text-xs">輸入後帳號將升級為企業版</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-5">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">🏢 企業帳號享有：</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-600 dark:text-blue-400">
              <li>✅ 無限 AI 算力點數</li>
              <li>✅ 存取公司 8TB NAS 雲端硬碟</li>
              <li>✅ 所有進階功能優先使用</li>
            </ul>
          </div>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            邀請碼
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
            placeholder="例如：ALLTECH-2024-XXXX"
            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-center text-lg uppercase"
            autoFocus
          />

          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleRedeem}
              disabled={isLoading || !code.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : '🚀'}
              {isLoading ? '驗證中...' : '立即兌換'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
