import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { motion } from 'motion/react';
import { Check, X, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspect?: number;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ 
  image, 
  onCropComplete, 
  onCancel,
  aspect = 1 
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Set maximum dimension for the cropped image to keep file size small
    const MAX_DIMENSION = 800;
    let width = pixelCrop.width;
    let height = pixelCrop.height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = width * ratio;
      height = height * ratio;
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      width,
      height
    );

    // Use JPEG with 0.7 quality to significantly reduce file size
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const handleDone = async () => {
    if (croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(image, croppedAreaPixels);
        onCropComplete(croppedImage);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative flex-1 bg-neutral-900">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteInternal}
          onZoomChange={onZoomChange}
        />
      </div>
      <div className="bg-white p-6 space-y-6">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-neutral-400 uppercase">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-900"
          />
        </div>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center gap-2"
          >
            <X size={20} />
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="flex-[2] py-4 bg-neutral-900 text-white font-bold flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};
