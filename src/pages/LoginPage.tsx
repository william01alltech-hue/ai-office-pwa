import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirect to where the user came from or to home
  const from = (location.state as any)?.from?.pathname || "/";

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await loginWithGoogle();
      toast.success('登入成功！');
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error(error);
      toast.error('登入失敗，請重試。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">AI Office</h1>
            <p className="text-slate-500 dark:text-slate-400">
              登入以使用專屬的 AI 雲端工作區
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white font-medium py-3 px-4 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              使用 Google 帳號登入
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-slate-500 dark:text-white">
            登入即表示您同意我們的服務條款與隱私權政策。
          </div>
        </div>
      </div>
    </div>
  );
};
