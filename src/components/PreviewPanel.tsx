import React from 'react';
import DOMPurify from 'dompurify';
import { useAppContext } from '../contexts/AppContext';
import { useObjectURL } from '../hooks/useObjectURL';
import { ObjectImage } from './ObjectImage';

export const PreviewPanel: React.FC<{
  handleLoadSelectedFile: () => void;
  docxHtml: string;
  xlsxHtml: string;
  pptxHtml: string;
}> = ({ handleLoadSelectedFile, docxHtml, xlsxHtml, pptxHtml }) => {
  const { selectedFile, t } = useAppContext();
  const fileUrl = useObjectURL(selectedFile);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-4 pt-6 text-center border-b border-[#699be6] dark:border-blue-900/50">
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-white tracking-wider">{t('sidebar.preview_import')}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start space-y-4">
        {selectedFile ? (
           <div className="text-slate-800 dark:text-white font-bold text-sm w-full break-all flex flex-col h-full">
              <div className="text-center mb-2">{t('sidebar.file_label')}{selectedFile.name}</div>
              <button 
                onClick={handleLoadSelectedFile}
                className="w-full mb-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded shadow-md transition-colors text-xs"
              >
                {t('sidebar.open_import')} 📂
              </button>
              
              {/* DOCX Preview */}
              {(selectedFile.name.endsWith('.docx') || selectedFile.name.endsWith('.doc')) && (
                 <div 
                   className="bg-white dark:bg-slate-800 p-4 rounded shadow-inner overflow-y-auto text-left text-sm font-normal text-slate-800 dark:text-white flex-1 min-h-[300px] max-h-full prose prose-sm dark:prose-invert"
                   dangerouslySetInnerHTML={{ __html: docxHtml ? DOMPurify.sanitize(docxHtml) : t('sidebar.loading') }}
                 />
              )}

              {/* XLSX Preview */}
              {(selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) && (
                 <div 
                   className="bg-white dark:bg-slate-800 p-4 rounded shadow-inner overflow-auto text-left text-sm font-normal text-slate-800 dark:text-white flex-1 min-h-[300px] max-h-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-600 [&_td]:p-1 [&_td]:min-w-[50px] [&_td]:whitespace-nowrap"
                   dangerouslySetInnerHTML={{ __html: xlsxHtml ? DOMPurify.sanitize(xlsxHtml) : t('sidebar.loading') }}
                 />
              )}

              {/* PPTX Preview */}
              {selectedFile.name.endsWith('.pptx') && (
                 <div 
                   className="bg-white dark:bg-slate-800 p-4 rounded shadow-inner overflow-y-auto text-left text-sm font-normal text-slate-800 dark:text-white flex-1 min-h-[300px] max-h-full"
                   dangerouslySetInnerHTML={{ __html: pptxHtml ? DOMPurify.sanitize(pptxHtml) : t('sidebar.loading') }}
                 />
              )}

              {/* PDF or Image */}
              {selectedFile.type.startsWith('image/') && (
                 <ObjectImage file={selectedFile} alt="preview" className="mt-2 rounded shadow bg-white max-w-full" />
              )}
              
              {selectedFile.type === 'application/pdf' && fileUrl && (
                 <iframe src={fileUrl} className="w-full flex-1 min-h-[300px] border-0 rounded bg-white" />
              )}
           </div>
        ) : (
          <div className="text-slate-800/60 font-bold text-sm text-center mt-10">{t('sidebar.select_file')}</div>
        )}
      </div>
    </div>
  );
};
