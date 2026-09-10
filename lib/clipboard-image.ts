export function readClipboardImage(file: File): Promise<{ image: string; width: number; height: number }> {
  if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type)) return Promise.reject(new Error('Use a PNG, JPEG, WebP, GIF, or AVIF image.'));
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('Choose an image smaller than 10 MB.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve({ image: reader.result as string, width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('This image could not be decoded.'));
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}


