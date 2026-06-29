import React from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useAppContext } from '../contexts/AppContext';

const PlaygroundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppContext();

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative flex flex-col">
      <header className="h-[60px] shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 font-medium bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            {t('play.back')}
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('play.title')}
          </h1>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-10 flex flex-col items-center justify-center">
        <div className="text-center space-y-4 max-w-lg">
          <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <span className="text-5xl">🎮</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{t('play.preparing')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('play.desc')) }} />
        </div>
      </main>
    </div>
  );
};

export default PlaygroundPage;
