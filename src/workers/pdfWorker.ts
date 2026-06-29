import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

// Message interfaces
export interface WorkerMessage {
  id: string;
  action: 'merge' | 'split' | 'compress';
  files: { name: string; buffer: ArrayBuffer }[];
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  action: 'merge' | 'split' | 'compress';
  data?: Blob;
  error?: string;
  files?: { name: string; blob: Blob }[];
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, action, files } = e.data;

  try {
    if (action === 'merge') {
      const mergedPdf = await PDFDocument.create();
      
      for (const fileData of files) {
        const pdf = await PDFDocument.load(fileData.buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      
      self.postMessage({ id, success: true, action, data: blob } as WorkerResponse);
    } 
    
    else if (action === 'split') {
      // For split, we'll process the first file in the array
      const fileData = files[0];
      const pdf = await PDFDocument.load(fileData.buffer);
      const pageCount = pdf.getPageCount();
      
      const zip = new JSZip();
      const folderName = fileData.name.replace('.pdf', '') + '_split';
      const imgFolder = zip.folder(folderName);
      
      for (let i = 0; i < pageCount; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        imgFolder?.file(`page_${i + 1}.pdf`, pdfBytes);
      }
      
      const zipContent = await zip.generateAsync({ type: 'blob' });
      self.postMessage({ id, success: true, action, data: zipContent } as WorkerResponse);
    }
    
    else if (action === 'compress') {
      const fileData = files[0];
      const pdf = await PDFDocument.load(fileData.buffer);
      const pdfBytes = await pdf.save({ useObjectStreams: false });
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      self.postMessage({ id, success: true, action, data: blob } as WorkerResponse);
    }
  } catch (error: any) {
    self.postMessage({ id, success: false, action, error: error.message } as WorkerResponse);
  }
};
