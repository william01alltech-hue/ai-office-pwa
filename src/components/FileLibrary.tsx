import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useAppContext, type FileSystemNode } from '../contexts/AppContext';

// Helper to filter allowed extensions
const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg'];
const isAllowedFile = (name: string) => ALLOWED_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));

// Recursive TreeNode Component
const TreeNode: React.FC<{ node: FileSystemNode, depth: number, onRemove?: () => void, onDoubleClickFile?: (file: File) => void }> = ({ node, depth, onRemove, onDoubleClickFile }) => {
  const { setSelectedFile } = useAppContext();
  const [isOpen, setIsOpen] = useState(node.isOpen || false);
  const [children, setChildren] = useState<FileSystemNode[]>(node.children || []);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (node.kind === 'file') {
      try {
        const file = await (node.handle as FileSystemFileHandle).getFile();
        setSelectedFile(file);
      } catch (e) {
        console.error("Failed to read file", e);
      }
      return;
    }

    if (node.kind === 'directory') {
      const nextOpen = !isOpen;
      setIsOpen(nextOpen);
      if (nextOpen && children.length === 0) {
        setIsLoading(true);
        try {
          const newChildren: FileSystemNode[] = [];
          for await (const entry of (node.handle as FileSystemDirectoryHandle).values()) {
            // Ignore hidden files like .git or .DS_Store
            if (entry.name.startsWith('.')) continue;
            // If it's a file, check extension
            if (entry.kind === 'file' && !isAllowedFile(entry.name)) continue;

            newChildren.push({
              name: entry.name,
              kind: entry.kind,
              handle: entry
            });
          }
          // Sort: directories first, then alphabetically
          newChildren.sort((a, b) => {
            if (a.kind === b.kind) return a.name.localeCompare(b.name);
            return a.kind === 'directory' ? -1 : 1;
          });
          setChildren(newChildren);
        } catch (e) {
          console.error("Failed to read directory", e);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1.5 px-2 rounded cursor-pointer transition-colors text-sm tracking-wide truncate hover:bg-white/30 dark:hover:bg-white/10 text-slate-800 dark:text-white`}
        style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
        onClick={handleToggle}
        onDoubleClick={async (e) => {
          e.stopPropagation();
          if (node.kind === 'file' && onDoubleClickFile) {
            try {
              const file = await (node.handle as FileSystemFileHandle).getFile();
              onDoubleClickFile(file);
            } catch (err) {
              console.error("Failed to read file on double click", err);
            }
          }
        }}
        title={node.name}
      >
        <span className="mr-2 opacity-80">
          {node.kind === 'directory' ? (isOpen ? '📂' : '📁') : '📄'}
        </span>
        <span className={`${node.kind === 'directory' ? 'font-bold' : ''} truncate flex-1`}>
          {node.name}
        </span>
        {isLoading && <span className="ml-2 text-xs text-blue-600 animate-pulse">...</span>}
        {onRemove && (
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="ml-2 text-xs text-red-400 hover:text-red-600 px-1 rounded hover:bg-red-50 transition-colors"
            title="移除掛載"
          >
            ✕
          </button>
        )}
      </div>
      {isOpen && children.map((child, idx) => (
        <TreeNode key={`${child.name}-${idx}`} node={child} depth={depth + 1} onDoubleClickFile={onDoubleClickFile} />
      ))}
    </div>
  );
};

export const FileLibrary: React.FC<{ onDoubleClickFile?: (file: File) => void }> = ({ onDoubleClickFile }) => {
  const { uploadedFiles, selectedFile, setSelectedFile, fileTrees, setFileTrees, t } = useAppContext();

  const handleMountLocalFolder = async () => {
    try {
            const dirHandle = await window.showDirectoryPicker({
        mode: 'read'
      });
      
      const rootNode: FileSystemNode = {
        name: dirHandle.name,
        kind: 'directory',
        handle: dirHandle,
        isOpen: true // Automatically open the root
      };
      
      // Load first level immediately
      const newChildren: FileSystemNode[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.name.startsWith('.')) continue;
        if (entry.kind === 'file' && !isAllowedFile(entry.name)) continue;
        newChildren.push({ name: entry.name, kind: entry.kind, handle: entry });
      }
      newChildren.sort((a, b) => {
        if (a.kind === b.kind) return a.name.localeCompare(b.name);
        return a.kind === 'directory' ? -1 : 1;
      });
      rootNode.children = newChildren;
      
      setFileTrees(prev => [...prev, rootNode]);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Failed to mount directory", err);
        toast(t('sidebar.mount_err'));
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-4 pt-6 text-center border-b border-[#7aa9ed]/40 pb-4 space-y-3">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-wider mb-3">{t('sidebar.file_lib')}</h2>
        <button 
          onClick={handleMountLocalFolder}
          className="w-full bg-blue-500/80 hover:bg-blue-600 text-white text-sm font-bold py-1.5 px-3 rounded shadow-sm transition-colors border border-blue-400"
        >
          📂 {t('sidebar.mount_folder')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 mt-1">
        {fileTrees.length > 0 && (
          <div className="mb-4 pb-4 border-b border-[#7aa9ed]/20">
            <div className="text-xs font-bold text-slate-600 dark:text-white mb-2 px-2">{t('sidebar.mounted_dir')}</div>
            {fileTrees.map((tree, idx) => (
              <TreeNode 
                key={`${tree.name}-${idx}`} 
                node={tree} 
                depth={0} 
                onRemove={() => setFileTrees(prev => prev.filter((_, i) => i !== idx))}
                onDoubleClickFile={onDoubleClickFile}
              />
            ))}
          </div>
        )}
        <div className="text-xs font-bold text-slate-600 dark:text-white mb-2 px-2">{t('sidebar.uploaded_list')}</div>
        {uploadedFiles.map((file, idx) => (
          <div 
            key={idx}
            onClick={() => setSelectedFile(file)}
            onDoubleClick={() => onDoubleClickFile && onDoubleClickFile(file)}
            className={`text-slate-800 dark:text-white font-bold p-2 px-3 rounded cursor-pointer transition-colors text-sm tracking-wide truncate ${selectedFile === file ? 'bg-white/50 dark:bg-white/20 shadow-sm' : 'hover:bg-white/20 dark:hover:bg-white/10'}`}
            title={file.name}
          >
            {file.name}
          </div>
        ))}
        {uploadedFiles.length === 0 && (
          <div className="text-slate-800/50 dark:text-white/50 p-2 text-center text-xs">{t('sidebar.no_upload')}</div>
        )}
      </div>
    </div>
  );
};
