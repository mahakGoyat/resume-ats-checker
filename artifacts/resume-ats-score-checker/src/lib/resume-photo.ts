import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function renderPdfRegion(buffer: ArrayBuffer): Promise<string> {
  return pdfjsLib.getDocument({ data: buffer }).promise.then(async (pdf) => {
    const page = await pdf.getPage(1);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas context');
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const cropWidth = Math.round(viewport.width * 0.34);
    const cropHeight = Math.round(viewport.height * 0.3);
    const crop = document.createElement('canvas');
    crop.width = cropWidth;
    crop.height = cropHeight;
    const cropCtx = crop.getContext('2d');
    if (!cropCtx) throw new Error('no crop context');
    cropCtx.drawImage(canvas, 0, 0, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return crop.toDataURL('image/jpeg', 0.82);
  });
}

export async function extractResumePhoto(file: File | null): Promise<string | null> {
  if (!file) return null;
  try {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      return await renderPdfRegion(await file.arrayBuffer());
    }
    if (file.type.startsWith('image/')) {
      return await fileToDataUrl(file);
    }
  } catch (error) {
    console.warn('[Resume ATS] Could not extract a resume photo:', error);
  }
  return null;
}