import React, { useState, useRef } from 'react';
import { Camera, X, Check, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface PhotoCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onCapture, onClose }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (mode: 'user' | 'environment') => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      // 1. Stop and cleanup previous stream
      stopCamera();
      
      // 2. Small delay to allow hardware to release
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia is not supported');
        isStartingRef.current = false;
        return;
      }

      let mediaStream: MediaStream | null = null;
      
      const constraints = [
        {
          video: { 
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        },
        {
          video: { facingMode: mode },
          audio: false,
        },
        {
          video: true,
          audio: false,
        }
      ];

      for (const constraint of constraints) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraint);
          if (mediaStream) break;
        } catch (e) {
          console.warn('Constraint failed:', constraint, e);
        }
      }

      if (!mediaStream) {
        throw new Error('All camera constraints failed');
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for metadata to load before playing
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          } else {
            resolve(null);
          }
        });

        try {
          await videoRef.current.play();
        } catch (playErr: any) {
          if (playErr.name !== 'AbortError') {
            console.error('Error playing video:', playErr);
          }
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    } finally {
      isStartingRef.current = false;
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  React.useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-md aspect-[3/4] bg-neutral-900 overflow-hidden shadow-2xl ring-1 ring-white/10">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={cn(
                "w-full h-full object-cover transition-transform duration-500",
                facingMode === 'user' && "scale-x-[-1]"
              )}
            />
            
            {/* Camera Controls Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center">
              <button
                onClick={onClose}
                className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all active:scale-95"
              >
                <X size={24} />
              </button>
              
              <button
                onClick={capturePhoto}
                className="p-1 bg-white rounded-full shadow-xl active:scale-90 transition-transform"
              >
                <div className="w-16 h-16 rounded-full border-4 border-black/5 flex items-center justify-center bg-white">
                  <Camera size={32} className="text-black" />
                </div>
              </button>

              <button
                onClick={toggleCamera}
                className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all active:scale-95"
              >
                <RefreshCw size={24} />
              </button>
            </div>
            
            {/* Viewfinder Guide */}
            <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
              <div className="w-full h-full border border-white/20" />
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-full"
          >
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-12">
              <button
                onClick={() => {
                  setCapturedImage(null);
                  startCamera(facingMode);
                }}
                className="flex flex-col items-center gap-2 text-white group"
              >
                <div className="p-4 bg-white/10 group-hover:bg-white/20 backdrop-blur-md rounded-full transition-all active:scale-95">
                  <X size={24} />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Retake</span>
              </button>
              
              <button
                onClick={() => onCapture(capturedImage)}
                className="flex flex-col items-center gap-2 text-white group"
              >
                <div className="p-6 bg-emerald-500 group-hover:bg-emerald-400 rounded-full shadow-xl transition-all active:scale-95">
                  <Check size={32} />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Confirm</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      
      <p className="mt-6 text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">
        {!capturedImage ? "Align your vision in the frame" : "Looks perfect! Use this photo?"}
      </p>
    </div>
  );
};
