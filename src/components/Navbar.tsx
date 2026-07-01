import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export const Navbar: React.FC<{
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExport: () => void;
}> = ({ handleFileUpload, handleExport }) => {
  const { activeEditors, setActiveEditors, userApiKey, points, setShowSettingsModal, isUploading, showFileLibrary, setShowFileLibrary, showPreviewPanel, setShowPreviewPanel, showAiSidebar, setShowAiSidebar, t } = useAppContext();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const toggleEditor = (editor: 'excel' | 'word' | 'ppt') => {
    setActiveEditors(prev => 
      prev.includes(editor) ? prev.filter(e => e !== editor) : [...prev, editor]
    );
  };
  
  const mainEditor = activeEditors[0];

  return (
    <nav className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 md:px-6 shadow-sm z-10 justify-between w-full">
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Branding on the far left */}
        <div className="hidden md:flex items-baseline gap-2 mr-2 border-r border-slate-200 dark:border-slate-700 pr-3">
          <span className="text-xl font-extrabold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent tracking-tight">SyncCore Docs</span>
          <span className="text-xs font-bold text-slate-400 dark:text-white tracking-widest">{t('nav.core_docs')}</span>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded text-slate-500 dark:text-white hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={t('nav.back_to_dashboard')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-sm font-bold">{t('nav.back_to_dashboard')}</span>
        </button>
        <button 
          onClick={() => setShowFileLibrary(!showFileLibrary)}
          className={`px-3 py-1.5 rounded transition-colors shadow flex items-center space-x-1 ${!showFileLibrary ? 'bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'}`}
          title={t('nav.toggle_library')}
        >
          <span className="text-sm">🗂️ {t('nav.library')}</span>
        </button>
        <button 
          onClick={() => setShowPreviewPanel(!showPreviewPanel)}
          className={`px-3 py-1.5 rounded transition-colors shadow flex items-center space-x-1 ${!showPreviewPanel ? 'bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'}`}
          title={t('nav.toggle_preview')}
        >
          <span className="text-sm">👁️ {t('nav.preview_import')}</span>
        </button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700"></div>
        <button onClick={() => toggleEditor('excel')} className={`px-4 md:px-6 py-1.5 rounded font-extrabold tracking-wider transition-colors shadow ${activeEditors.includes('excel') ? 'bg-[#38a3a5] text-white ring-2 ring-offset-1 dark:ring-offset-slate-900 ring-[#38a3a5]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'}`}>{t('editor.excel')}</button>
        <button onClick={() => toggleEditor('word')} className={`px-4 md:px-6 py-1.5 rounded font-extrabold tracking-wider transition-colors shadow ${activeEditors.includes('word') ? 'bg-[#42a5f5] text-white ring-2 ring-offset-1 dark:ring-offset-slate-900 ring-[#42a5f5]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'}`}>{t('editor.word')}</button>
        <button onClick={() => toggleEditor('ppt')} className={`px-4 md:px-6 py-1.5 rounded font-extrabold tracking-wider transition-colors shadow ${activeEditors.includes('ppt') ? 'bg-[#4dd0e1] text-white ring-2 ring-offset-1 dark:ring-offset-slate-900 ring-[#4dd0e1]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'}`}>{t('editor.ppt')}</button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700"></div>
        <button 
          onClick={() => setShowAiSidebar(!showAiSidebar)}
          className={`px-3 py-1.5 rounded transition-colors shadow flex items-center space-x-1 ${!showAiSidebar ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
          title={t('nav.toggle_ai')}
        >
          <span className="text-sm font-bold">✨ {t('nav.ai_assistant')}</span>
        </button>
      </div>
      <div className="flex items-center space-x-3">
        {currentUser ? (
          <div translate="no" className="hidden md:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" />
            ) : (
              <span className="text-xs">👤</span>
            )}
            <span className="text-xs text-slate-700 dark:text-white max-w-[100px] truncate">
              <span>{currentUser.email}</span>
            </span>
            <button onClick={logout} className="text-xs text-slate-500 hover:text-red-500 ml-2" title="登出">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className="text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-1.5 rounded border border-transparent shadow-sm hover:from-blue-600 hover:to-indigo-600 transition-colors"
          >
            登入
          </button>
        )}

        <span translate="no" className="hidden md:flex text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 items-center">
          <span className="mr-1.5 text-xs text-yellow-500">🪙</span>
          <span>{t('nav.compute')}</span>：
          <span className="font-bold">
            {userApiKey ? <span>{t('nav.unlimited')}</span> : <span>{points} {t('nav.points')}</span>}
          </span>
        </span>

        <button className="text-xs text-slate-500 dark:text-white bg-slate-100 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm" onClick={() => setShowSettingsModal(true)}>⚙️ {t('nav.settings')}</button>
        <label className={`cursor-pointer text-sm font-medium ${isUploading ? 'bg-slate-400' : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'} text-white px-4 py-1.5 rounded transition-all shadow-md hidden md:flex items-center space-x-1`}>
          <span>{isUploading ? t('nav.processing') : t('nav.image_to_table')}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
        <button onClick={handleExport} className="text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white px-4 py-1.5 rounded transition-colors shadow-md hidden md:block" disabled={activeEditors.length === 0}>
          {mainEditor === 'excel' ? t('nav.export_excel') : mainEditor === 'word' ? t('nav.export_word') : mainEditor === 'ppt' ? t('nav.export_ppt') : t('nav.export_file')}
        </button>
      </div>
    </nav>
  );
};
