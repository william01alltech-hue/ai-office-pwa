
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './contexts/AppContext';
import { FileSystemProvider } from './contexts/FileSystemContext';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import FileMasterPage from './pages/FileMasterPage';
import StickerStudioPage from './pages/StickerStudioPage';
import PlaygroundPage from './pages/PlaygroundPage';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider } from './contexts/AuthContext';
import { GoogleAdBanner } from './components/ads/GoogleAdBanner';

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
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tools" element={<FileMasterPage />} />
                  <Route path="/sticker-studio" element={<StickerStudioPage />} />
                  <Route path="/playground" element={<PlaygroundPage />} />
                  <Route path="/:type/:id" element={<EditorPage />} />
                </Routes>
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
