// Compress an image File/Blob to a bounded JPEG data URL before storing it in
// IndexedDB. Questions photographed from books can be several MB; we cap the
// longest edge and re-encode so the DB (and JSON export) stay small.

const MAX_EDGE = 1400;
const QUALITY = 0.72;

export async function compressImageToDataUrl(
  blob: Blob,
  maxEdge = MAX_EDGE,
  quality = QUALITY,
): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas not supported');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', quality);
}

/** Extract the first image blob from a clipboard paste event, if any. */
export function imageFromClipboard(items: DataTransferItemList): Blob | null {
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}
