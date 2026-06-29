import React, { createContext, useContext, useState, useEffect } from 'react';
import localforage from 'localforage';

export interface VirtualFile {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: number;
  thumbnail?: string; // Base64 for images
}

interface FileSystemContextType {
  files: VirtualFile[];
  isLoaded: boolean;
  uploadFiles: (newFiles: File[]) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  renameFile: (id: string, newName: string) => Promise<void>;
  getFile: (id: string) => Promise<File | null>;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

// Helper function to generate a tiny thumbnail for images
const generateThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve('');
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 150;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } else {
        resolve('');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };
    img.src = objectUrl;
  });
};

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const storedFiles = await localforage.getItem<VirtualFile[]>('synccore_v2_files');
        if (storedFiles) {
          setFiles(storedFiles);
        } else {
          // Clear old corrupted data (V1) to prevent crashes
          await localforage.removeItem('synccore_files');
          setFiles([]);
        }
      } catch (error) {
        console.error('Failed to load files from IndexedDB:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadFiles();
  }, []);

  const saveFiles = async (updatedFiles: VirtualFile[]) => {
    setFiles(updatedFiles);
    try {
      await localforage.setItem('synccore_v2_files', updatedFiles);
    } catch (error) {
      console.error('Failed to save files to IndexedDB:', error);
    }
  };

  const uploadFiles = async (newFiles: File[]) => {
    const virtualFiles: VirtualFile[] = [];
    
    for (const file of newFiles) {
      const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString();
      
      // Save the actual Blob/File to a separate store
      await localforage.setItem(`synccore_blob_${id}`, file);
      
      // Generate thumbnail
      const thumbnail = await generateThumbnail(file);
      
      virtualFiles.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        createdAt: Date.now(),
        thumbnail
      });
    }
    
    await saveFiles([...virtualFiles, ...files]); // Add to top
  };

  const deleteFile = async (id: string) => {
    const updatedFiles = files.filter(f => f.id !== id);
    await saveFiles(updatedFiles);
    await localforage.removeItem(`synccore_blob_${id}`);
  };

  const renameFile = async (id: string, newName: string) => {
    const updatedFiles = files.map(f => {
      if (f.id === id) {
        return { ...f, name: newName };
      }
      return f;
    });
    await saveFiles(updatedFiles);
    
    // Also update the actual File object name inside the blob store
    const oldFile = await localforage.getItem<File>(`synccore_blob_${id}`);
    if (oldFile) {
      const renamedFile = new File([oldFile], newName, { type: oldFile.type });
      await localforage.setItem(`synccore_blob_${id}`, renamedFile);
    }
  };

  const getFile = async (id: string): Promise<File | null> => {
    try {
      return await localforage.getItem<File>(`synccore_blob_${id}`);
    } catch (error) {
      console.error('Failed to get file blob:', error);
      return null;
    }
  };

  return (
    <FileSystemContext.Provider value={{ files, isLoaded, uploadFiles, deleteFile, renameFile, getFile }}>
      {children}
    </FileSystemContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (context === undefined) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};
