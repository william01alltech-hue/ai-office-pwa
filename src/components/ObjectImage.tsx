import React from 'react';
import { useObjectURL } from '../hooks/useObjectURL';

interface ObjectImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  file: File | Blob | null | undefined;
}

export const ObjectImage: React.FC<ObjectImageProps> = ({ file, ...props }) => {
  const url = useObjectURL(file);
  
  if (!url) return null;
  
  return <img src={url} {...props} />;
};
