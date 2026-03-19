import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Type, Pencil, Eraser, Trash2, Calendar } from 'lucide-react';
import { cn } from '../utils';

interface ExportPreviewProps {
  image: string;
  onClose: () => void;
  title: string;
}

export const ExportPreview: React.FC<ExportPreviewProps> = ({ image, onClose, title }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const scaleRef = useRef<number>(1);
  const [mode, setMode] = useState<'text'>('text');
  const [color, setColor] = useState('#000000');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    let isCancelled = false;

    const initCanvas = async () => {
      // Load the image with Fabric first to get reliable dimensions
      const fabricImg = await fabric.FabricImage.fromURL(image);
      if (isCancelled || !canvasRef.current) return;

      const imgWidth = fabricImg.width!;
      const imgHeight = fabricImg.height!;

      // Polaroid Style Frame logic (Classic proportions)
      // Side and top margins are usually equal, bottom is much larger
      const margin = imgWidth * 0.07; // 7% margin
      const bottomMargin = imgWidth * 0.32; // 32% bottom margin for polaroid look
      
      const canvasWidth = imgWidth + (margin * 2);
      const canvasHeight = imgHeight + margin + bottomMargin;

      // Dispose existing if any to prevent "already initialized" error
      if (fabricCanvasRef.current) {
        await fabricCanvasRef.current.dispose();
      }

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#ffffff',
        enableRetinaScaling: false, // We handle scaling manually
      });
      fabricCanvasRef.current = canvas;

      // Place the bingo board image
      // Center it horizontally, and place it at the top margin
      fabricImg.set({
        left: canvasWidth / 2,
        top: margin + (imgHeight / 2),
        originX: 'center',
        originY: 'center',
        selectable: false,
        hoverCursor: 'default',
      });
      canvas.add(fabricImg);

      // Add Date Stamp (Classic Polaroid position: bottom right of the bottom margin)
      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
      
      const dateText = new fabric.IText(dateStr, {
        left: canvasWidth - margin - 10,
        top: canvasHeight - (bottomMargin / 2),
        fontFamily: 'Inter',
        fontSize: Math.max(24, canvasWidth * 0.045),
        fontWeight: '600',
        fill: '#000000',
        originX: 'right',
        originY: 'center',
        selectable: true,
        letterSpacing: 2,
      });
      canvas.add(dateText);

      // Set initial mode
      canvas.isDrawingMode = false;

      setIsReady(true);
      
      // Scale canvas to fit screen preview
      const wrapper = document.getElementById('canvas-wrapper');
      if (wrapper) {
        const availableWidth = wrapper.clientWidth - 40;
        const availableHeight = wrapper.clientHeight - 40;
        
        const scale = Math.min(
          availableWidth / canvasWidth,
          availableHeight / canvasHeight
        );
        
        scaleRef.current = scale;
        canvas.setZoom(scale);
        canvas.setDimensions({
          width: canvasWidth * scale,
          height: canvasHeight * scale
        });
      }
    };

    initCanvas();

    return () => {
      isCancelled = true;
      fabricCanvasRef.current?.dispose();
    };
  }, [image]);

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const canvasWidth = fabricCanvasRef.current.width!;
    const canvasHeight = fabricCanvasRef.current.height!;
    
    const text = new fabric.IText('Add comment here', {
      left: canvasWidth / 2,
      top: canvasHeight - 120,
      fontFamily: 'Inter',
      fontSize: Math.max(28, canvasWidth * 0.025),
      fill: color === '#ffffff' ? '#000000' : color,
      originX: 'center',
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.isDrawingMode = false;
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects();
    const canvasWidth = canvas.width!;
    const canvasHeight = canvas.height!;
    
    // The first object is the background image
    const bgImg = objects[0];
    const imgWidth = bgImg.width! * bgImg.scaleX!;
    const margin = imgWidth * 0.07;
    const bottomMargin = imgWidth * 0.32;

    // Remove everything but the background image
    for (let i = objects.length - 1; i > 0; i--) {
      canvas.remove(objects[i]);
    }

    // Re-add date stamp with correct positioning and black color
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    
    const dateText = new fabric.IText(dateStr, {
      left: canvasWidth - margin - 10,
      top: canvasHeight - (bottomMargin / 2),
      fontFamily: 'Inter',
      fontSize: Math.max(24, canvasWidth * 0.045),
      fontWeight: '600',
      fill: '#000000',
      originX: 'right',
      originY: 'center',
      selectable: true,
      letterSpacing: 2,
    });
    canvas.add(dateText);
  };

  const handleDownload = () => {
    if (!fabricCanvasRef.current) return;
    const dataUrl = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1 / scaleRef.current,
    });
    const link = document.createElement('a');
    link.download = `${title}-film.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-neutral-900 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/10">
        <button onClick={onClose} className="p-2 text-white/60 hover:text-white">
          <X size={24} />
        </button>
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Preview & Edit</h2>
        <button 
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-none font-bold text-xs uppercase tracking-wider"
        >
          <Download size={16} />
          Save
        </button>
      </div>

      {/* Canvas Area */}
      <div id="canvas-wrapper" className="flex-1 relative overflow-hidden flex items-center justify-center p-10">
        {!isReady && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Developing your film...</p>
          </div>
        )}
        <canvas ref={canvasRef} />
      </div>

      {/* Toolbar */}
      <div className="p-6 bg-white border-t border-neutral-200">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex justify-around items-center">
            <button 
              onClick={addText}
              className="flex flex-col items-center gap-2 text-emerald-600 transition-all scale-110"
            >
              <div className="p-3 rounded-full bg-emerald-50">
                <Type size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Add Text</span>
            </button>

            <button 
              onClick={clearCanvas}
              className="flex flex-col items-center gap-2 text-neutral-400 hover:text-red-500 transition-all"
            >
              <div className="p-3">
                <Trash2 size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Reset</span>
            </button>
          </div>

          {/* Color Picker */}
          <div className="flex justify-center gap-3">
            {['#ff6b00', '#000000', '#ef4444', '#3b82f6', '#10b981'].map(c => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (fabricCanvasRef.current?.freeDrawingBrush) {
                    fabricCanvasRef.current.freeDrawingBrush.color = c;
                  }
                  const active = fabricCanvasRef.current?.getActiveObject();
                  if (active && active.type === 'i-text') {
                    active.set('fill', c);
                    fabricCanvasRef.current?.renderAll();
                  }
                }}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  color === c ? "border-neutral-900 scale-125" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
