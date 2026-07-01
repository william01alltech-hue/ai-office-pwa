import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { SettingsModal } from '../components/SettingsModal';
import { InviteCodeModal } from '../components/InviteCodeModal';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { files, deleteFile } = useFileSystem();
  const { fontSize, setFontSize, aiLanguage, setAiLanguage, t, setShowSettingsModal } = useAppContext();
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // 點擊外部關閉用戶選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleCreateNew = (type: 'excel' | 'word' | 'ppt') => {
    // Generate a pseudo-random ID for the new file
    const newId = Date.now().toString();
    navigate(`/${type}/${newId}`);
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-white">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            S
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-baseline gap-2">
            SyncCore AI <span className="text-sm font-medium text-slate-500 dark:text-white">{t('nav.core_title')}</span>
          </h1>
        </div>

        <div className="flex-1 max-w-2xl px-12">
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder={t('dash.search')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 dark:bg-slate-700 border border-transparent rounded-xl focus:border-blue-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {t('dash.install')}
            </button>
          )}
          <button className="p-2 hover:bg-slate-100 rounded-full hover:text-slate-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-slate-100 rounded-full hover:text-slate-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          
          {currentUser ? (
            <div id="user-menu-container" className="flex items-center gap-2 relative">
              <div className="flex flex-col items-end">
                {isAdmin && (
                  <span className="text-[10px] font-bold text-white bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 rounded-full mb-0.5 shadow-sm">
                    👑 管理員
                  </span>
                )}
                {userProfile?.role === 'enterprise' && (
                  <span className="text-[10px] font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 px-2 py-0.5 rounded-full mb-0.5 shadow-sm">
                    🏢 企業版
                  </span>
                )}
                {userProfile?.role === 'user' && userProfile && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full mb-0.5">
                    🪙 {userProfile.points} 點
                  </span>
                )}
              </div>
              <button onClick={() => setShowUserMenu(v => !v)} className="focus:outline-none">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-9 h-9 rounded-full shadow-sm border-2 border-white ring-2 ring-slate-100 cursor-pointer hover:ring-blue-300 transition-all" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-medium cursor-pointer shadow-sm border-2 border-white ring-2 ring-slate-100 hover:ring-blue-300 transition-all">
                    {currentUser.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{currentUser.displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                    {isAdmin && <span className="mt-1 inline-block text-[10px] font-bold text-white bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 rounded-full">👑 管理員</span>}
                    {userProfile?.role === 'enterprise' && <span className="mt-1 inline-block text-[10px] font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 px-2 py-0.5 rounded-full">🏢 企業版</span>}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => { navigate('/admin'); setShowUserMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2 transition-colors border-b border-slate-100 dark:border-slate-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      管理後台
                    </button>
                  )}
                  {userProfile?.role === 'user' && (
                    <button
                      onClick={() => { setShowUserMenu(false); setShowInviteModal(true); }}
                      className="w-full text-left px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 transition-colors border-b border-slate-100 dark:border-slate-700"
                    >
                      🎫 輸入企業邵請碼
                    </button>
                  )}
                  <button 
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    登出
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 rounded-xl shadow-sm hover:from-blue-600 hover:to-indigo-600 transition-all hover:-translate-y-0.5"
            >
              登入
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">


        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-10 bg-white dark:bg-slate-800">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-widest uppercase mb-4 border border-blue-100 dark:border-blue-800 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  {t('dash.badge')}
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 dark:from-white dark:via-blue-300 dark:to-white tracking-tight pb-1">
                  {t('dash.welcome')} <span className="inline-block animate-bounce origin-bottom filter drop-shadow-md">✨</span>
                </h2>
              </div>
              
              <div className="flex items-center gap-5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl p-2.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white dark:border-slate-700/80">
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dash.lang')}</span>
                  <select
                    className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 py-1 pl-1 pr-6 focus:ring-0 outline-none cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    value={aiLanguage}
                    onChange={(e) => setAiLanguage(e.target.value)}
                  >
                    <option value="繁體中文 (zh-TW)">繁體中文</option>
                    <option value="简体中文 (zh-CN)">简体中文</option>
                    <option value="English (en-US)">English</option>
                    <option value="Español (es-ES)">Español</option>
                    <option value="日本語 (ja-JP)">日本語</option>
                    <option value="Deutsch (de-DE)">Deutsch</option>
                    <option value="Français (fr-FR)">Français</option>
                    <option value="Português (pt-BR)">Português</option>
                    <option value="Русский (ru-RU)">Русский</option>
                    <option value="한국어 (ko-KR)">한국어</option>
                    <option value="العربية (ar-SA)">العربية</option>
                  </select>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex items-center gap-1.5 pr-1">
                  <button onClick={() => setFontSize('sm')} className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-300 ${fontSize === 'sm' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}>{t('dash.sm')}</button>
                  <button onClick={() => setFontSize('base')} className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${fontSize === 'base' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}>{t('dash.md')}</button>
                  <button onClick={() => setFontSize('lg')} className={`w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold transition-all duration-300 ${fontSize === 'lg' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}>{t('dash.lg')}</button>
                </div>
              </div>
            </div>
            
            <section className="mb-14">
              <h3 className="text-lg font-semibold mb-5 text-slate-800 dark:text-white">{t('dash.create')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Word Card */}
                <div className="flex flex-col gap-3">
                  <div onClick={() => handleCreateNew('word')} className="cursor-pointer group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 p-7 h-56 flex flex-col justify-end text-white shadow-xl shadow-blue-400/20 hover:shadow-[0_20px_50px_rgba(59,130,246,0.6)] hover:-translate-y-2 transition-all duration-500 border border-white/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out"></div>
                    <div className="absolute -right-6 -bottom-6 opacity-30 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 ease-out">
                      <svg viewBox="0 0 100 100" className="h-48 w-48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M25 15C25 11.686 27.686 9 31 9H62L81 28V85C81 88.314 78.314 91 75 91H31C27.686 91 25 88.314 25 85V15Z" fill="#ffffff" opacity="0.8"/>
                        <path d="M62 9L62 25C62 26.657 63.343 28 65 28H81Z" fill="#e2e8f0" opacity="0.9"/>
                        <rect x="40" y="45" width="28" height="6" rx="3" fill="#3b82f6" opacity="0.5"/>
                        <rect x="40" y="59" width="18" height="6" rx="3" fill="#3b82f6" opacity="0.5"/>
                        <rect x="40" y="73" width="24" height="6" rx="3" fill="#3b82f6" opacity="0.5"/>
                      </svg>
                    </div>
                    <div className="absolute top-7 left-7 p-3.5 bg-white/30 backdrop-blur-xl rounded-[20px] border border-white/50 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-2xl shadow-blue-900/30">
                      <svg viewBox="0 0 100 100" className="h-10 w-10 drop-shadow-[0_8px_8px_rgba(30,58,138,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="docBg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor="#e2e8f0" />
                          </linearGradient>
                          <linearGradient id="docFold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f8fafc" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                          </linearGradient>
                          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                        </defs>
                        <path d="M25 15C25 11.686 27.686 9 31 9H62L81 28V85C81 88.314 78.314 91 75 91H31C27.686 91 25 88.314 25 85V15Z" fill="url(#docBg)"/>
                        <path d="M62 9L62 25C62 26.657 63.343 28 65 28H81Z" fill="url(#docFold)"/>
                        <path d="M26 15C26 12.239 28.239 10 31 10H61L80 29V85C80 87.761 77.761 90 75 90H31C28.239 90 26 87.761 26 85V15Z" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.8"/>
                        <rect x="40" y="45" width="28" height="6" rx="3" fill="url(#lineGrad)" />
                        <rect x="40" y="59" width="18" height="6" rx="3" fill="url(#lineGrad)" />
                        <rect x="40" y="73" width="24" height="6" rx="3" fill="url(#lineGrad)" />
                      </svg>
                    </div>
                    <div className="relative z-10 transform group-hover:translate-x-1 transition-transform duration-300">
                      <h4 className="text-2xl font-extrabold tracking-tight drop-shadow-md">SyncCore Docs</h4>
                      <p className="text-blue-100 font-bold tracking-widest text-sm mt-1.5 uppercase drop-shadow">{t('nav.core_docs')}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal('docs')} className="text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-all self-start px-3 py-1.5 rounded-lg flex items-center gap-1.5 group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t('dash.info')}
                  </button>
                </div>

                {/* FileMaster Card */}
                <div className="flex flex-col gap-3">
                  <div onClick={() => navigate('/tools')} className="cursor-pointer group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-300 to-emerald-500 p-7 h-56 flex flex-col justify-end text-white shadow-xl shadow-emerald-400/20 hover:shadow-[0_20px_50px_rgba(16,185,129,0.6)] hover:-translate-y-2 transition-all duration-500 border border-white/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out"></div>
                    <div className="absolute -right-6 -bottom-6 opacity-30 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 ease-out">
                      <svg viewBox="0 0 100 100" className="h-48 w-48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 35C15 31.686 17.686 29 21 29H40L46 35H83C86.314 35 89 37.686 89 41V80C89 83.314 86.314 86 83 86H21C17.686 86 15 83.314 15 80V35Z" fill="#ffffff" opacity="0.5" />
                        <rect x="25" y="22" width="54" height="40" rx="3" fill="#10b981" opacity="0.5" />
                        <path d="M11 48C11 44.686 13.686 42 17 42H87C90.314 42 93 44.686 93 48V80C93 83.314 90.314 86 87 86H17C13.686 86 11 83.314 11 80V48Z" fill="#ffffff" opacity="0.7" />
                      </svg>
                    </div>
                    <div className="absolute top-7 left-7 p-3.5 bg-white/30 backdrop-blur-xl rounded-[20px] border border-white/50 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 shadow-2xl shadow-emerald-900/30">
                      <svg viewBox="0 0 100 100" className="h-10 w-10 drop-shadow-[0_8px_8px_rgba(4,120,87,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="folderBackW" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f8fafc" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                          </linearGradient>
                          <linearGradient id="folderFrontW" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor="#e2e8f0" />
                          </linearGradient>
                          <linearGradient id="folderAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>
                        <path d="M15 35C15 31.686 17.686 29 21 29H40L46 35H83C86.314 35 89 37.686 89 41V80C89 83.314 86.314 86 83 86H21C17.686 86 15 83.314 15 80V35Z" fill="url(#folderBackW)" />
                        <rect x="25" y="22" width="54" height="40" rx="3" fill="url(#folderAccent)" />
                        <rect x="35" y="30" width="34" height="4" rx="2" fill="white" opacity="0.8"/>
                        <rect x="35" y="38" width="24" height="4" rx="2" fill="white" opacity="0.8"/>
                        <path d="M11 48C11 44.686 13.686 42 17 42H87C90.314 42 93 44.686 93 48V80C93 83.314 90.314 86 87 86H17C13.686 86 11 83.314 11 80V48Z" fill="url(#folderFrontW)" />
                        <path d="M12 48C12 45.239 14.239 43 17 43H87C89.761 43 92 45.239 92 48V85C92 87.761 89.761 90 87 90H17C14.239 90 12 87.761 12 85V48Z" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.8"/>
                      </svg>
                    </div>
                    <div className="relative z-10 transform group-hover:translate-x-1 transition-transform duration-300">
                      <h4 className="text-2xl font-extrabold tracking-tight drop-shadow-md">FileMaster</h4>
                      <p className="text-emerald-100 font-bold tracking-widest text-sm mt-1.5 uppercase drop-shadow">{t('dash.filemaster')}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal('filemaster')} className="text-sm font-bold text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/30 transition-all self-start px-3 py-1.5 rounded-lg flex items-center gap-1.5 group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t('dash.info')}
                  </button>
                </div>

                {/* StickerStudio Card */}
                <div className="flex flex-col gap-3">
                  <div onClick={() => navigate('/sticker-studio')} className="cursor-pointer group relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-400 p-7 h-56 flex flex-col justify-end text-white shadow-xl shadow-amber-400/20 hover:shadow-[0_20px_50px_rgba(245,158,11,0.6)] hover:-translate-y-2 transition-all duration-500 border border-white/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out"></div>
                    <div className="absolute -right-6 -bottom-6 opacity-30 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 ease-out">
                      <svg viewBox="0 0 100 100" className="h-48 w-48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="45" cy="55" r="35" fill="#ffffff" opacity="0.8" />
                        <path d="M32 60 Q45 75 58 60" stroke="#ffffff" strokeWidth="5" strokeLinecap="round"/>
                        <circle cx="35" cy="45" r="5" fill="#ffffff"/>
                        <circle cx="55" cy="45" r="5" fill="#ffffff"/>
                        <path d="M75 15 L80 30 L95 35 L80 40 L75 55 L70 40 L55 35 L70 30 Z" fill="#ffffff" opacity="0.6" />
                        <path d="M20 20 L22 26 L28 28 L22 30 L20 36 L18 30 L12 28 L18 26 Z" fill="#ffffff" opacity="0.6" />
                      </svg>
                    </div>
                    <div className="absolute top-7 left-7 p-3.5 bg-white/30 backdrop-blur-xl rounded-[20px] border border-white/50 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-2xl shadow-amber-900/30">
                      <svg viewBox="0 0 100 100" className="h-10 w-10 drop-shadow-[0_8px_8px_rgba(180,83,9,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="stickerBg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor="#fff7ed" />
                          </linearGradient>
                          <linearGradient id="starGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#fcd34d" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </linearGradient>
                        </defs>
                        <circle cx="45" cy="55" r="35" fill="url(#stickerBg)" stroke="white" strokeWidth="2" />
                        <path d="M32 60 Q45 75 58 60" stroke="#d97706" strokeWidth="4" strokeLinecap="round"/>
                        <circle cx="35" cy="45" r="5" fill="#d97706"/>
                        <circle cx="55" cy="45" r="5" fill="#d97706"/>
                        <path d="M75 15 L80 30 L95 35 L80 40 L75 55 L70 40 L55 35 L70 30 Z" fill="url(#starGrad)" stroke="white" strokeWidth="1.5" filter="drop-shadow(0 4px 4px rgba(217, 119, 6, 0.4))"/>
                        <path d="M20 20 L22 26 L28 28 L22 30 L20 36 L18 30 L12 28 L18 26 Z" fill="url(#starGrad)" />
                      </svg>
                    </div>
                    <div className="relative z-10 transform group-hover:translate-x-1 transition-transform duration-300">
                      <h4 className="text-2xl font-extrabold tracking-tight drop-shadow-md">StickerStudio</h4>
                      <p className="text-amber-100 font-bold tracking-widest text-sm mt-1.5 uppercase drop-shadow">{t('dash.sticker')}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal('sticker')} className="text-sm font-bold text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-amber-900/30 transition-all self-start px-3 py-1.5 rounded-lg flex items-center gap-1.5 group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t('dash.info')}
                  </button>
                </div>

                {/* Playground Card */}
                <div className="flex flex-col gap-3">
                  <div onClick={() => navigate('/playground')} className="cursor-pointer group relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-400 to-purple-500 p-7 h-56 flex flex-col justify-end text-white shadow-xl shadow-purple-400/20 hover:shadow-[0_20px_50px_rgba(168,85,247,0.6)] hover:-translate-y-2 transition-all duration-500 border border-white/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out"></div>
                    <div className="absolute -right-6 -bottom-6 opacity-30 group-hover:scale-110 transition-transform duration-700 ease-out">
                      <svg viewBox="0 0 100 100" className="h-48 w-48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="15" y="25" width="70" height="50" rx="25" fill="#ffffff" opacity="0.6" />
                        <circle cx="35" cy="50" r="12" fill="#ffffff" opacity="0.5"/>
                        <path d="M34 42v16m-8-8h16" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.9"/>
                        <circle cx="68" cy="45" r="5" fill="#ffffff" opacity="0.9"/>
                        <circle cx="78" cy="35" r="5" fill="#ffffff" opacity="0.9"/>
                        <circle cx="58" cy="35" r="5" fill="#ffffff" opacity="0.9"/>
                        <circle cx="68" cy="25" r="5" fill="#ffffff" opacity="0.9"/>
                      </svg>
                    </div>
                    <div className="absolute top-7 left-7 p-3.5 bg-white/30 backdrop-blur-xl rounded-[20px] border border-white/50 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-2xl shadow-fuchsia-900/30">
                      <svg viewBox="0 0 100 100" className="h-10 w-10 drop-shadow-[0_8px_8px_rgba(126,34,206,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="padBg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor="#f3e8ff" />
                          </linearGradient>
                          <linearGradient id="padAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#7e22ce" />
                          </linearGradient>
                        </defs>
                        <rect x="15" y="25" width="70" height="50" rx="25" fill="url(#padBg)" stroke="white" strokeWidth="2" />
                        <path d="M34 42v16m-8-8h16" stroke="url(#padAccent)" strokeWidth="5" strokeLinecap="round"/>
                        <circle cx="68" cy="45" r="4.5" fill="url(#padAccent)"/>
                        <circle cx="78" cy="35" r="4.5" fill="url(#padAccent)"/>
                        <circle cx="58" cy="35" r="4.5" fill="url(#padAccent)"/>
                        <circle cx="68" cy="25" r="4.5" fill="url(#padAccent)"/>
                      </svg>
                    </div>
                    <div className="relative z-10 transform group-hover:translate-x-1 transition-transform duration-300">
                      <h4 className="text-2xl font-extrabold tracking-tight drop-shadow-md">Playground</h4>
                      <p className="text-fuchsia-100 font-bold tracking-widest text-sm mt-1.5 uppercase drop-shadow">{t('dash.playground')}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal('playground')} className="text-sm font-bold text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:text-slate-400 dark:hover:text-purple-400 dark:hover:bg-purple-900/30 transition-all self-start px-3 py-1.5 rounded-lg flex items-center gap-1.5 group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t('dash.info')}
                  </button>
                </div>

              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                {t('dash.recent_files')}
              </h2>
              {files.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">{t('dash.no_recent')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {files.map(file => (
                    <div key={file.id} className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 overflow-hidden cursor-pointer">
                      
                      {/* File Icon Area */}
                      <div className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center text-3xl shadow-sm overflow-hidden ${file.type.startsWith('image/') ? 'bg-amber-100 dark:bg-amber-900/50' : file.name.endsWith('.pdf') ? 'bg-red-100 dark:bg-red-900/50' : 'bg-blue-100 dark:bg-blue-900/50'}`}>
                        {file.type.startsWith('image/') ? (file.thumbnail ? <img src={file.thumbnail} className="w-full h-full object-cover" /> : '🖼️') : file.name.endsWith('.pdf') ? '📄' : '📝'}
                      </div>
                      
                      {/* File Info */}
                      <h5 className="font-bold text-sm text-slate-800 dark:text-white truncate mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={file.name}>{file.name}</h5>
                      <p className="text-xs text-slate-500 dark:text-white font-medium">{(file.size / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString()}</p>
                      
                      {/* Action Buttons (appear on hover) */}
                      <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-[2px] p-4 flex flex-col justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-y-2 group-hover:translate-y-0">
                        <p className="text-[10px] font-black text-center text-slate-400 dark:text-white mb-1 truncate px-2 uppercase tracking-wider">{file.name}</p>
                        <button onClick={(e) => { e.stopPropagation(); const type = file.name.match(/\.(xlsx|xls|csv)$/) ? 'excel' : file.name.match(/\.(pptx|ppt)$/) ? 'ppt' : 'word'; navigate(`/${type}/${file.id}`); }} className="w-full text-xs bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"><span className="text-base">📝</span> {t('dash.open')}</button>
                        <button onClick={(e) => { e.stopPropagation(); navigate('/tools'); }} className="w-full text-xs bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"><span className="text-base">🔄</span> {t('dash.to_filemaster')}</button>
                        <button onClick={(e) => { e.stopPropagation(); navigate('/sticker-studio'); }} className="w-full text-xs bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"><span className="text-base">🎨</span> {t('dash.to_sticker')}</button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5"></div>
                        <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} className="w-full text-xs bg-red-50 dark:bg-red-900/30 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"><span className="text-base">🗑️</span> {t('dash.delete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {activeModal === 'docs' ? t('modal.docs_title') : activeModal === 'filemaster' ? t('modal.filemaster_title') : activeModal === 'playground' ? t('modal.playground_title') : t('modal.sticker_title')}
                </h3>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
                {activeModal === 'docs' && (
                  <>
                    <p>{t('modal.docs_desc1')}</p>
                    <p>{t('modal.docs_desc2')}</p>
                  </>
                )}
                {activeModal === 'filemaster' && (
                  <>
                    <p><strong>{t("dash.fm_title")}</strong> {t("dash.fm_desc1")}</p>
                    <p>{t("dash.fm_desc2")}</p>
                  </>
                )}
                {activeModal === 'sticker' && (
                  <>
                    <p><strong>{t("dash.st_title")}</strong> {t("dash.st_desc1")}</p>
                    <p>{t("dash.st_desc2")}</p>
                  </>
                )}
                {activeModal === 'playground' && (
                  <>
                    <p><strong>{t("dash.pg_title")}</strong> {t("dash.pg_desc1")}</p>
                    <p>{t("dash.pg_desc2")}</p>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setActiveModal(null)} className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors shadow-sm">
                  {t("btn.got_it")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <SettingsModal />
      {showInviteModal && <InviteCodeModal onClose={() => setShowInviteModal(false)} />}
    </div>
  );
};

export default Dashboard;
