
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './contexts/AppContext';
import { FileSystemProvider } from './contexts/FileSystemContext';
import Dashboard from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import { AuthProvider } from './contexts/AuthContext';
import { GoogleAdBanner } from './components/ads/GoogleAdBanner';

// 重量級編輯器與工具頁面改為動態載入
const EditorPage = lazy(() => import('./pages/EditorPage'));
const FileMasterPage = lazy(() => import('./pages/FileMasterPage'));
const StickerStudioPage = lazy(() => import('./pages/StickerStudioPage'));
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage'));

import { useTheme } from './hooks/useTheme';

function ThemeManager() {
  useTheme();
  return null;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <FileSystemProvider>
          <AppProvider>
            <ThemeManager />
            <Toaster position="bottom-right" />
            <div className="flex flex-col h-[100dvh] w-screen overflow-hidden">
              <div className="flex-1 overflow-hidden relative">
                <Suspense fallback={
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-3">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">正在下載編輯器元件...</p>
                  </div>
                }>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/tools" element={<FileMasterPage />} />
                    <Route path="/sticker-studio" element={<StickerStudioPage />} />
                    <Route path="/playground" element={<PlaygroundPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/:type/:id" element={<EditorPage />} />
                  </Routes>
                </Suspense>
              </div>
              {/* 全站橫幅廣告 */}
              <div className="h-[90px] bg-slate-50 border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800 shrink-0">
                <GoogleAdBanner className="w-full h-full" />
              </div>
            </div>
          </AppProvider>
        </FileSystemProvider>
      </AuthProvider>
    </Router>
  );
}
