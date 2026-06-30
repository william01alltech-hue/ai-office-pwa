import React from 'react';
import { useAppContext } from '../contexts/AppContext';

export const SettingsModal: React.FC = () => {
    const { 
    showSettingsModal, setShowSettingsModal, 
    userApiKey, setUserApiKey,
    customEndpoint, setCustomEndpoint, 
    computeMode, setComputeMode,
    t
  } = useAppContext();

  if (!showSettingsModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-slate-800 tracking-wider">{t('settings.title')}</h2>
          <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 算力路由選擇 */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">{t('settings.compute_mode')}</h3>
            <div className="space-y-3">
              <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${computeMode === 'local' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-200'}`}>
                <input type="radio" className="mt-1 mr-3" checked={computeMode === 'local'} onChange={() => setComputeMode('local')} />
                <div className="w-full">
                  <div className="font-bold text-slate-800 text-sm">{t('settings.mode_a')}</div>
                  <div className="text-xs text-slate-500 mt-1 mb-2">{t('settings.mode_a_desc')}</div>
                  {computeMode === 'local' && (
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-700 mb-1">AI API Endpoint (Ollama / Ngrok):</div>
                      <input 
                        type="text" 
                        placeholder="http://127.0.0.1:11434" 
                        className="w-full p-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                        value={customEndpoint}
                        onChange={(e) => setCustomEndpoint(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </label>
              
              <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${computeMode === 'byok' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-200'}`}>
                <input type="radio" className="mt-1 mr-3" checked={computeMode === 'byok'} onChange={() => setComputeMode('byok')} />
                <div className="w-full">
                  <div className="font-bold text-slate-800 text-sm">{t('settings.mode_b')}</div>
                  <div className="text-xs text-slate-500 mt-1 mb-2">{t('settings.mode_b_desc')}</div>
                  {computeMode === 'byok' && (
                    <input 
                      type="password" 
                      placeholder={t('settings.mode_b_placeholder')} 
                      className="w-full p-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                      value={userApiKey}
                      onChange={(e) => setUserApiKey(e.target.value)}
                    />
                  )}
                </div>
              </label>

              <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${computeMode === 'platform' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-200'}`}>
                <input type="radio" className="mt-1 mr-3" checked={computeMode === 'platform'} onChange={() => setComputeMode('platform')} />
                <div>
                  <div className="font-bold text-slate-800 text-sm">{t('settings.mode_c')}</div>
                  <div className="text-xs text-slate-500 mt-1">{t('settings.mode_c_desc')}</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button 
            onClick={() => setShowSettingsModal(false)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded shadow-sm transition-colors"
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
