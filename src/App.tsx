import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';
import { useFirebase } from './FirebaseProvider';
import { 
  Plus, 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  Settings as SettingsIcon, 
  Home as HomeIcon,
  ChevronLeft,
  Camera,
  CheckCircle2,
  Trash2,
  Save,
  Grid3X3,
  Grid2X2,
  LogOut,
  User as UserIcon,
  Stamp,
  Download,
  LayoutTemplate,
  Pin,
  Crop,
  ChevronRight,
  Archive,
  Calendar as CalendarIconLucide,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils';
import { PhotoCapture } from './components/PhotoCapture';
import { ConfirmModal } from './components/ConfirmModal';
import { ImageCropper } from './components/ImageCropper';
import { ExportPreview } from './components/ExportPreview';

import { toPng } from 'html-to-image';

// --- Types ---

const STAMP_OPTIONS = [
  { id: 'check', emoji: '✅', label: 'Check' },
  { id: 'star', emoji: '🌟', label: 'Star' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'target', emoji: '🎯', label: 'Target' },
  { id: 'trophy', emoji: '🏆', label: 'Trophy' },
  { id: 'sparkle', emoji: '✨', label: 'Sparkle' },
  { id: 'clover', emoji: '🍀', label: 'Clover' },
];

interface Bingo {
  id: string;
  userId: string;
  title: string;
  theme: string;
  size: number;
  aspectRatio?: '1:1' | '3:4';
  createdAt: any;
  isCompleted: boolean;
  completedAt?: any;
  isTemplate?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  archivedAt?: any;
  stickers?: { x: number, y: number, emoji: string }[];
}

interface BingoCell {
  id: string;
  index: number;
  text: string;
  visionImageData?: string;
  imageData?: string;
  isCompleted: boolean;
  completedAt?: any;
}

// --- Components ---

const BingoCellItem: React.FC<{
  cell: BingoCell;
  onUpdate: (data: Partial<BingoCell>) => void;
  isEditing: boolean;
  isStamping: boolean;
  aspectRatio?: '1:1' | '3:4';
}> = ({ cell, onUpdate, isEditing, isStamping, aspectRatio = '1:1' }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [croppingField, setCroppingField] = useState<'imageData' | 'visionImageData'>('imageData');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const visionFileInputRef = React.useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageData' | 'visionImageData') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        setRawImage(result);
        setCroppingField(field);
        setIsCropping(true);
        setShowUploadOptions(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedImage: string) => {
    setIsProcessing(true);
    try {
      const compressed = await compressImage(croppedImage);
      if (croppingField === 'imageData') {
        onUpdate({ 
          imageData: compressed, 
          isCompleted: true, 
          completedAt: serverTimestamp() 
        });
      } else {
        onUpdate({ visionImageData: compressed });
      }
    } catch (err) {
      console.error('Processing failed', err);
    } finally {
      setIsProcessing(false);
      setIsCropping(false);
      setRawImage(null);
    }
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden border transition-all duration-300 group",
        aspectRatio === '3:4' ? "aspect-[3/4]" : "aspect-square",
        cell.isCompleted ? "border-neutral-200 bg-neutral-50" : "border-neutral-200 bg-white",
        !cell.isCompleted && !isEditing && "hover:border-neutral-400 cursor-pointer"
      )}
      onClick={() => {
        if (!isEditing && !isStamping && !cell.isCompleted) {
          setShowUploadOptions(true);
        }
      }}
    >
      {/* Background Image: Either Vision or Real */}
      {(cell.imageData || cell.visionImageData) ? (
        <img 
          src={(cell.imageData || cell.visionImageData) || undefined} 
          alt={cell.text} 
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            !cell.isCompleted && "blur-[1px] grayscale-[5%] opacity-[0.15]"
          )}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2 text-center bg-neutral-50">
          {!isEditing && (
            <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
              {cell.text ? "" : "Goal"}
            </span>
          )}
        </div>
      )}

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
          >
            <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-900">Processing</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Overlay */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center p-2 text-center transition-opacity duration-300",
        cell.isCompleted ? "opacity-0" : "opacity-100"
      )}>
        {!isEditing && (
          <span className="text-[11px] font-bold text-neutral-800 leading-tight drop-shadow-sm">
            {cell.text}
          </span>
        )}
      </div>

      {/* Hover Action (Capture) */}
      {!cell.isCompleted && !isEditing && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/10 transition-opacity z-20">
          <div className="bg-white/90 p-3 rounded-none shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <Camera size={24} className="text-neutral-900" />
          </div>
        </div>
      )}

      {/* Editing Overlay */}
      {isEditing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-2 gap-2 z-30">
          <textarea
            value={cell.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            className="w-full flex-1 bg-transparent text-white text-[11px] font-bold text-center resize-none focus:outline-none placeholder:text-white/30"
            placeholder="What's the goal?"
          />
          <div className="flex gap-2 w-full">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                visionFileInputRef.current?.click();
              }}
              className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 rounded-none text-white text-[9px] font-bold uppercase tracking-tighter transition-colors"
            >
              Vision Pic
            </button>
            <input 
              type="file" 
              ref={visionFileInputRef} 
              onChange={(e) => handleImageUpload(e, 'visionImageData')} 
              className="hidden" 
              accept="image/*"
            />
          </div>
        </div>
      )}

      {/* Upload Options Modal */}
      <AnimatePresence>
        {showUploadOptions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center p-6 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowUploadOptions(false);
            }}
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm bg-white rounded-none p-6 space-y-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-neutral-900 text-center">
                {cell.isCompleted ? "Edit Goal Image" : "Complete Goal"}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {(cell.imageData || cell.visionImageData) && (
                  <button 
                    onClick={() => {
                      const imageToEdit = cell.imageData || cell.visionImageData || null;
                      setRawImage(imageToEdit);
                      setCroppingField(cell.imageData ? 'imageData' : 'visionImageData');
                      setIsCropping(true);
                      setShowUploadOptions(false);
                    }}
                    className="col-span-2 flex items-center justify-center gap-3 p-4 bg-neutral-900 text-white rounded-none hover:bg-neutral-800 transition-colors"
                  >
                    <Crop size={20} />
                    <span className="text-sm font-bold">Edit Current Image</span>
                  </button>
                )}
                <button 
                  onClick={() => {
                    setShowCamera(true);
                    setShowUploadOptions(false);
                  }}
                  className="flex flex-col items-center gap-3 p-6 bg-neutral-50 rounded-none hover:bg-neutral-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-none flex items-center justify-center">
                    <Camera size={24} />
                  </div>
                  <span className="text-sm font-bold text-neutral-700">Camera</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 bg-neutral-50 rounded-none hover:bg-neutral-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-none flex items-center justify-center">
                    <Plus size={24} />
                  </div>
                  <span className="text-sm font-bold text-neutral-700">Gallery</span>
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => handleImageUpload(e, 'imageData')} 
                className="hidden" 
                accept="image/*"
              />
              <button 
                onClick={() => setShowUploadOptions(false)}
                className="w-full py-4 text-neutral-400 font-bold"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCamera && (
          <PhotoCapture 
            onCapture={(base64) => {
              setRawImage(base64);
              setIsCropping(true);
              setShowCamera(false);
            }}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCropping && rawImage && (
          <ImageCropper 
            image={rawImage}
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setIsCropping(false);
              setRawImage(null);
            }}
            aspect={aspectRatio === '3:4' ? 0.75 : 1}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const BingoBoard: React.FC<{
  bingo: Bingo;
  cells: BingoCell[];
  onUpdateCell: (cellId: string, data: Partial<BingoCell>) => void;
  isEditing: boolean;
  isStamping: boolean;
  selectedStampEmoji: string | null;
  onStamp: (pos: { x: number, y: number }) => void;
  boardRef: React.RefObject<HTMLDivElement>;
}> = ({ bingo, cells, onUpdateCell, isEditing, isStamping, selectedStampEmoji, onStamp, boardRef }) => {
  const sortedCells = [...cells].sort((a, b) => a.index - b.index);

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isStamping || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onStamp({ x, y });
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div 
        ref={boardRef}
        onClick={handleBoardClick}
        className={cn(
          "grid w-full bg-neutral-200 border border-neutral-200 relative",
          bingo.size === 3 ? "grid-cols-3 gap-px" : "grid-cols-4 gap-px",
          isStamping && "cursor-crosshair"
        )}
      >
        {sortedCells.map((cell) => (
          <BingoCellItem 
            key={cell.id} 
            cell={cell} 
            onUpdate={(data) => onUpdateCell(cell.id, data)}
            isEditing={isEditing}
            isStamping={isStamping}
            aspectRatio={bingo.aspectRatio}
          />
        ))}

        {/* Stickers Layer */}
        {bingo.stickers?.map((sticker, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute pointer-events-none text-4xl z-30 drop-shadow-xl"
            style={{ 
              left: `${sticker.x}%`, 
              top: `${sticker.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {sticker.emoji}
          </motion.div>
        ))}
      </div>
      
      {isStamping && (
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none border-2 border-emerald-500/20 animate-pulse flex items-center justify-center">
          {selectedStampEmoji && (
            <div className="bg-white/90 p-4 rounded-full shadow-2xl animate-bounce">
              <span className="text-4xl">{selectedStampEmoji}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Helper: Bingo Detection ---
const checkBingos = (cells: BingoCell[], size: number): number => {
  if (cells.length === 0 || size <= 0) return 0;
  const grid = Array.from({ length: size }, () => Array(size).fill(false));
  cells.forEach(c => {
    const row = Math.floor(c.index / size);
    const col = c.index % size;
    if (row >= 0 && row < size && col >= 0 && col < size) {
      if (c.isCompleted) grid[row][col] = true;
    }
  });

  let count = 0;

  // Rows
  for (let r = 0; r < size; r++) {
    if (grid[r].every(v => v)) count++;
  }

  // Cols
  for (let c = 0; c < size; c++) {
    let all = true;
    for (let r = 0; r < size; r++) {
      if (!grid[r][c]) all = false;
    }
    if (all) count++;
  }

  // Diagonals
  let d1 = true;
  let d2 = true;
  for (let i = 0; i < size; i++) {
    if (!grid[i][i]) d1 = false;
    if (!grid[i][size - 1 - i]) d2 = false;
  }
  if (d1) count++;
  if (d2) count++;

  return count;
};

// --- Main App Views ---

export default function App() {
  const { user, loading, logout } = useFirebase();
  const [view, setView] = useState<'home' | 'new' | 'list' | 'settings'>('home');
  const [bingos, setBingos] = useState<Bingo[]>([]);
  const [currentBingo, setCurrentBingo] = useState<Bingo | null>(null);
  const [currentCells, setCurrentCells] = useState<BingoCell[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isStamping, setIsStamping] = useState(false);
  const [selectedStampEmoji, setSelectedStampEmoji] = useState<string | null>(null);
  const [showStampSelector, setShowStampSelector] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);

  const bingosAchieved = currentBingo ? checkBingos(currentCells, currentBingo.size) : 0;
  const stampsEarned = bingosAchieved;
  const stampsPlacedCount = currentBingo?.stickers?.length || 0;
  const canPlaceStamp = stampsEarned > stampsPlacedCount;

  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportImage, setExportImage] = useState<string | null>(null);

  // Fetch Bingos
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'bingos'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bingoList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bingo));
      setBingos(bingoList);
      if (bingoList.length > 0 && !currentBingo) {
        setCurrentBingo(bingoList[0]);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bingos'));

    return () => unsubscribe();
  }, [user]);

  // Fetch Cells for current Bingo
  useEffect(() => {
    if (!currentBingo) {
      setCurrentCells([]);
      return;
    }

    const q = query(collection(db, 'bingos', currentBingo.id, 'cells'), orderBy('index', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCurrentCells(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BingoCell)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `bingos/${currentBingo.id}/cells`));

    return () => unsubscribe();
  }, [currentBingo]);

  const handleCreateBingo = async (title: string, size: number, theme: string, cellData: { text: string, visionImageData?: string }[], aspectRatio: '1:1' | '3:4' = '1:1', templateId?: string) => {
    if (!user) return;

    try {
      const bingoRef = await addDoc(collection(db, 'bingos'), {
        userId: user.uid,
        title,
        theme,
        size,
        aspectRatio,
        createdAt: serverTimestamp(),
        isCompleted: false,
        isTemplate: false,
        isPinned: false
      });

      const batch = writeBatch(db);
      
      if (templateId) {
        // Clone from template
        const templateCellsSnap = await getDocs(collection(db, 'bingos', templateId, 'cells'));
        templateCellsSnap.docs.forEach(cellDoc => {
          const data = cellDoc.data();
          const cellRef = doc(collection(db, 'bingos', bingoRef.id, 'cells'));
          batch.set(cellRef, {
            index: data.index,
            text: data.text || '',
            visionImageData: data.visionImageData || null,
            isCompleted: false
          });
        });
      } else {
        // Create with initial cell data
        cellData.forEach((cell, i) => {
          const cellRef = doc(collection(db, 'bingos', bingoRef.id, 'cells'));
          batch.set(cellRef, {
            index: i,
            text: cell.text || '',
            visionImageData: cell.visionImageData || null,
            isCompleted: false
          });
        });
      }
      
      await batch.commit();
      
      const newBingo = { id: bingoRef.id, title, theme, size, aspectRatio, userId: user.uid, createdAt: new Date(), isCompleted: false, isTemplate: false, isPinned: false } as Bingo;
      setCurrentBingo(newBingo);
      setView('home');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bingos');
    }
  };

  const handleDownloadBoard = async () => {
    if (!boardRef.current || !currentBingo) return;
    try {
      // Use a simpler capture approach to avoid cut-off issues
      const dataUrl = await toPng(boardRef.current, { 
        cacheBust: true,
        pixelRatio: 3, // High quality
      });
      setExportImage(dataUrl);
      setShowExportPreview(true);
    } catch (err) {
      console.error('Capture failed', err);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!currentBingo || !user) return;
    try {
      const templateRef = await addDoc(collection(db, 'bingos'), {
        userId: user.uid,
        title: `${currentBingo.title} (Template)`,
        theme: currentBingo.theme,
        size: currentBingo.size,
        createdAt: serverTimestamp(),
        isCompleted: false,
        isTemplate: true
      });

      const batch = writeBatch(db);
      currentCells.forEach(cell => {
        const cellRef = doc(collection(db, 'bingos', templateRef.id, 'cells'));
        batch.set(cellRef, {
          index: cell.index,
          text: cell.text,
          visionImageData: cell.visionImageData || null,
          isCompleted: false
        });
      });
      await batch.commit();
      alert('Board saved as template!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bingos');
    }
  };

  const handleUpdateCell = async (cellId: string, data: Partial<BingoCell>) => {
    if (!currentBingo) return;
    try {
      await updateDoc(doc(db, 'bingos', currentBingo.id, 'cells', cellId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bingos/${currentBingo.id}/cells/${cellId}`);
    }
  };

  const handleDeleteBingo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bingos', id));
      if (currentBingo?.id === id) {
        setCurrentBingo(bingos.find(b => b.id !== id) || null);
      }
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bingos/${id}`);
    }
  };

  const handlePlaceStamp = async (pos: { x: number, y: number }) => {
    if (!currentBingo || !canPlaceStamp || !selectedStampEmoji) return;
    await handleConfirmStamp(selectedStampEmoji, pos);
  };

  const handleConfirmStamp = async (emoji: string, pos: { x: number, y: number }) => {
    if (!currentBingo) return;
    try {
      const newSticker = { ...pos, emoji };
      const updatedStickers = [...(currentBingo.stickers || []), newSticker];
      
      await updateDoc(doc(db, 'bingos', currentBingo.id), {
        stickers: updatedStickers
      });
      
      setIsStamping(false);
      setSelectedStampEmoji(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bingos/${currentBingo.id}`);
    }
  };

  const handleFinishBingo = async (id: string) => {
    try {
      await updateDoc(doc(db, 'bingos', id), {
        isArchived: true,
        archivedAt: serverTimestamp()
      });
      if (currentBingo?.id === id) {
        setCurrentBingo(bingos.find(b => b.id !== id && !b.isArchived) || null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bingos/${id}`);
    }
  };

  const handleTogglePin = async (bingo: Bingo) => {
    try {
      await updateDoc(doc(db, 'bingos', bingo.id), {
        isPinned: !bingo.isPinned
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bingos/${bingo.id}`);
    }
  };

  const sortedBingos = [...bingos].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-neutral-200 rounded-2xl" />
          <div className="h-4 w-32 bg-neutral-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-neutral-50/80 backdrop-blur-md px-6 py-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            {view === 'home' ? (currentBingo?.title || 'Daily Bingo') : 
             view === 'new' ? 'New Bingo' : 
             view === 'list' ? 'My Bingos' : 'Settings'}
          </h2>
          {view === 'home' && currentBingo && (
            <p className="text-xs text-neutral-500 font-medium">
              {new Date(currentBingo.createdAt?.toDate?.() || currentBingo.createdAt).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {view === 'home' && currentBingo && (
            <>
              <button 
                onClick={() => handleTogglePin(currentBingo)}
                className={cn(
                  "p-2 rounded-none transition-colors",
                  currentBingo.isPinned ? "text-amber-500" : "text-neutral-400"
                )}
                title={currentBingo.isPinned ? "Unpin Board" : "Pin Board"}
              >
                <Pin size={20} fill={currentBingo.isPinned ? "currentColor" : "none"} />
              </button>
              {!currentBingo.isArchived && (
                <button 
                  onClick={() => handleFinishBingo(currentBingo.id)}
                  className="p-2 bg-neutral-900 text-white rounded-none hover:bg-neutral-800 transition-colors"
                  title="Finish Board"
                >
                  <Archive size={20} />
                </button>
              )}
              {canPlaceStamp && (
                <button 
                  onClick={() => {
                    if (isStamping) {
                      setIsStamping(false);
                      setSelectedStampEmoji(null);
                    } else {
                      setShowStampSelector(true);
                    }
                  }}
                  className={cn(
                    "p-2 rounded-none transition-colors relative",
                    isStamping ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600"
                  )}
                  title="Place Earned Stamp"
                >
                  <Stamp size={20} />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border border-white">
                    {stampsEarned - stampsPlacedCount}
                  </span>
                </button>
              )}
              <button 
                onClick={handleDownloadBoard}
                className="p-2 bg-neutral-200 text-neutral-600 rounded-none hover:bg-neutral-300 transition-colors"
                title="Download Board"
              >
                <Download size={20} />
              </button>
              {!currentBingo.isTemplate && (
                <button 
                  onClick={handleSaveAsTemplate}
                  className="p-2 bg-neutral-200 text-neutral-600 rounded-none hover:bg-neutral-300 transition-colors"
                  title="Save as Template"
                >
                  <LayoutTemplate size={20} />
                </button>
              )}
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "p-2 rounded-none transition-colors",
                  isEditing ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-600"
                )}
              >
                {isEditing ? <CheckCircle2 size={20} /> : <Plus size={20} />}
              </button>
              <button 
                onClick={() => setDeleteConfirmId(currentBingo.id)}
                className="p-2 bg-neutral-200 text-neutral-600 rounded-none"
              >
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              {currentBingo ? (
                <div className="w-full">
                  <BingoBoard 
                    bingo={currentBingo} 
                    cells={currentCells} 
                    onUpdateCell={handleUpdateCell}
                    isEditing={isEditing}
                    isStamping={isStamping}
                    selectedStampEmoji={selectedStampEmoji}
                    onStamp={handlePlaceStamp}
                    boardRef={boardRef}
                  />
                  <div className="mt-12 text-center max-w-md mx-auto">
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Progress</p>
                      <p className="text-sm text-neutral-900 font-bold">
                        {currentCells.filter(c => c.isCompleted).length} / {currentBingo.size * currentBingo.size}
                      </p>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 rounded-none overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentCells.filter(c => c.isCompleted).length / (currentBingo.size * currentBingo.size)) * 100}%` }}
                      />
                    </div>
                    {bingosAchieved > 0 && (
                      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                        <div className="text-left">
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Bingos Achieved</p>
                          <p className="text-lg font-bold text-emerald-900">{bingosAchieved}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Stamps Placed</p>
                          <p className="text-lg font-bold text-emerald-900">{stampsPlacedCount}</p>
                        </div>
                      </div>
                    )}

                    {/* Other Bingos List */}
                    <div className="mt-16 w-full space-y-6">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Other Active Boards</h3>
                        <button onClick={() => setView('list')} className="text-[10px] font-bold text-neutral-900 uppercase underline">View All</button>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1">
                        {sortedBingos.filter(b => !b.isTemplate && b.id !== currentBingo.id && !b.isArchived).map(bingo => (
                          <button
                            key={bingo.id}
                            onClick={() => setCurrentBingo(bingo)}
                            className="flex-shrink-0 w-40 p-4 bg-white border border-neutral-200 text-left hover:border-neutral-400 transition-all shadow-sm relative group"
                          >
                            {bingo.isPinned && (
                              <Pin size={12} className="absolute top-2 right-2 text-amber-500" fill="currentColor" />
                            )}
                            <h4 className="font-bold text-neutral-900 text-sm truncate mb-1">{bingo.title}</h4>
                            <p className="text-[10px] text-neutral-500 truncate">{bingo.theme}</p>
                            <div className="mt-3 w-full h-1 bg-neutral-100">
                              <div className="h-full bg-neutral-300 w-1/3" />
                            </div>
                          </button>
                        ))}
                        <button 
                          onClick={() => setView('new')}
                          className="flex-shrink-0 w-40 p-4 border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-all"
                        >
                          <Plus size={20} />
                          <span className="text-[10px] font-bold uppercase">New Board</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-20 text-center">
            <div className="w-16 h-16 bg-neutral-200 rounded-none flex items-center justify-center text-neutral-400 mx-auto mb-4">
              <LayoutGrid size={32} />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">No Bingos Yet</h3>
            <p className="text-sm text-neutral-500 mb-8">Create your first bingo board to start tracking.</p>
            <button 
              onClick={() => setView('new')}
              className="px-8 py-3 bg-neutral-900 text-white rounded-none font-medium"
            >
              Create Bingo
            </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'new' && (
            <motion.div
              key="new"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto"
            >
              <NewBingoForm 
                onSubmit={handleCreateBingo} 
                onCancel={() => setView('home')} 
                templates={bingos.filter(b => b.isTemplate)}
              />
            </motion.div>
          )}

          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <BingoCalendar 
                bingos={bingos} 
                onSelectBingo={(bingo) => {
                  setCurrentBingo(bingo);
                  setView('home');
                }}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Active Boards</h3>
                  <button 
                    onClick={() => setView('new')}
                    className="text-[10px] font-bold text-neutral-900 uppercase underline"
                  >
                    New Board
                  </button>
                </div>
                {sortedBingos.filter(b => !b.isTemplate && !b.isArchived).map(bingo => (
                  <div key={bingo.id} className="flex gap-2">
                    <button
                      onClick={() => {
                        setCurrentBingo(bingo);
                        setView('home');
                      }}
                      className="flex-1 p-4 bg-white rounded-none border border-neutral-200 flex items-center justify-between text-left hover:border-neutral-400 transition-all shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-neutral-900">{bingo.title}</h4>
                          {bingo.isPinned && <Pin size={12} className="text-amber-500" fill="currentColor" />}
                        </div>
                        <p className="text-xs text-neutral-500">{bingo.theme} • {bingo.size}x{bingo.size}</p>
                      </div>
                      <div className="w-10 h-10 bg-neutral-100 rounded-none flex items-center justify-center text-neutral-400">
                        <LayoutGrid size={20} />
                      </div>
                    </button>
                    <button 
                      onClick={() => handleTogglePin(bingo)}
                      className={cn(
                        "px-3 border transition-colors",
                        bingo.isPinned ? "bg-amber-50 border-amber-200 text-amber-500" : "bg-white border-neutral-200 text-neutral-300"
                      )}
                    >
                      <Pin size={18} fill={bingo.isPinned ? "currentColor" : "none"} />
                    </button>
                  </div>
                ))}
                {sortedBingos.filter(b => !b.isTemplate && !b.isArchived).length === 0 && (
                  <p className="text-center py-8 text-neutral-400 text-sm">No active boards.</p>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-1">My Templates</h3>
                {bingos.filter(b => b.isTemplate).map(bingo => (
                  <button
                    key={bingo.id}
                    onClick={() => {
                      setCurrentBingo(bingo);
                      setView('home');
                    }}
                    className="w-full p-4 bg-emerald-50/50 rounded-none border border-emerald-100 flex items-center justify-between text-left hover:border-emerald-300 transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-emerald-900">{bingo.title}</h4>
                      <p className="text-xs text-emerald-600/70">{bingo.theme} • {bingo.size}x{bingo.size}</p>
                    </div>
                    <div className="w-10 h-10 bg-white rounded-none flex items-center justify-center text-emerald-400 shadow-sm">
                      <Save size={20} />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-none overflow-hidden mb-4 border-4 border-white shadow-lg bg-neutral-200 flex items-center justify-center">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={48} className="text-neutral-400" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-neutral-900">{user.displayName}</h3>
                <p className="text-sm text-neutral-500">{user.email}</p>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={logout}
                  className="w-full p-4 bg-red-50 text-red-600 rounded-none font-semibold flex items-center justify-center gap-3"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-neutral-200 px-8 py-4 flex items-center justify-between z-40">
        <NavButton active={view === 'home'} onClick={() => setView('home')} icon={<HomeIcon size={24} />} />
        <NavButton active={view === 'list'} onClick={() => setView('list')} icon={<CalendarIcon size={24} />} />
        <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<SettingsIcon size={24} />} />
      </nav>

      <AnimatePresence>
        {showExportPreview && exportImage && (
          <ExportPreview 
            image={exportImage}
            title={currentBingo?.title || 'Bingo'}
            onClose={() => {
              setShowExportPreview(false);
              setExportImage(null);
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        title="Delete Bingo Board"
        message="Are you sure you want to delete this board? This action cannot be undone."
        onConfirm={() => deleteConfirmId && handleDeleteBingo(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
        variant="danger"
        confirmText="Delete"
      />

      <StampSelectorModal 
        isOpen={showStampSelector}
        onSelect={(emoji) => {
          setSelectedStampEmoji(emoji);
          setIsStamping(true);
          setShowStampSelector(false);
        }}
        onCancel={() => setShowStampSelector(false)}
      />
    </div>
  );
}

const StampSelectorModal: React.FC<{
  isOpen: boolean;
  onSelect: (emoji: string) => void;
  onCancel: () => void;
}> = ({ isOpen, onSelect, onCancel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-none p-8 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Choose Your Stamp</h3>
            <p className="text-sm text-neutral-500 mb-8">You've earned a stamp! Select an icon to mark your achievement.</p>
            
            <div className="grid grid-cols-4 gap-3 mb-8">
              {STAMP_OPTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.emoji)}
                  className="aspect-square flex flex-col items-center justify-center gap-1 border border-neutral-100 hover:border-neutral-900 hover:bg-neutral-50 transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{s.emoji}</span>
                  <span className="text-[8px] font-bold text-neutral-400 uppercase">{s.label}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={onCancel}
              className="w-full py-4 text-neutral-400 font-bold text-sm uppercase tracking-widest"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const BingoCalendar: React.FC<{ 
  bingos: Bingo[]; 
  onSelectBingo: (bingo: Bingo) => void;
}> = ({ bingos, onSelectBingo }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }

  const getBingosForDate = (date: Date) => {
    return bingos.filter(b => {
      if (b.isTemplate) return false;
      const createdAt = b.createdAt?.toDate?.() || new Date(b.createdAt);
      const archivedAt = b.archivedAt?.toDate?.() || (b.archivedAt ? new Date(b.archivedAt) : null);
      
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      
      const start = new Date(createdAt);
      start.setHours(0, 0, 0, 0);
      
      if (archivedAt) {
        const end = new Date(archivedAt);
        end.setHours(0, 0, 0, 0);
        return d >= start && d <= end;
      }
      
      return d >= start;
    });
  };

  const selectedBingos = selectedDate ? getBingosForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-neutral-900">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentDate(new Date(year, month - 1))}
              className="p-2 hover:bg-neutral-100 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(year, month + 1))}
              className="p-2 hover:bg-neutral-100 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-neutral-400 py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
            
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const dayBingos = getBingosForDate(date);
            const hasBingos = dayBingos.length > 0;
            const allCompleted = hasBingos && dayBingos.every(b => b.isCompleted);

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "aspect-square relative flex flex-col items-center justify-center text-sm transition-all",
                  isSelected ? "bg-neutral-900 text-white" : "hover:bg-neutral-50",
                  isToday && !isSelected && "text-emerald-600 font-bold underline underline-offset-4"
                )}
              >
                <span>{date.getDate()}</span>
                {hasBingos && !isSelected && (
                  <div className={cn(
                    "absolute bottom-1 w-1 h-1 rounded-full",
                    allCompleted ? "bg-emerald-500" : "bg-neutral-300"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">
            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h4>
          <div className="space-y-3">
            {selectedBingos.length > 0 ? (
              selectedBingos.map(bingo => (
                <button
                  key={bingo.id}
                  onClick={() => onSelectBingo(bingo)}
                  className="w-full p-4 bg-white border border-neutral-200 flex items-center justify-between text-left hover:border-neutral-400 transition-all shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-bold text-neutral-900 truncate">{bingo.title}</h5>
                      {bingo.isArchived && <span className="text-[8px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 font-bold uppercase tracking-tighter">Archived</span>}
                    </div>
                    <p className="text-[10px] text-neutral-500 truncate">{bingo.theme}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-neutral-900">
                        {bingo.isCompleted ? '100%' : 'In Progress'}
                      </p>
                    </div>
                    <div className={cn(
                      "w-8 h-8 rounded-none flex items-center justify-center",
                      bingo.isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-neutral-100 text-neutral-400"
                    )}>
                      <LayoutGrid size={16} />
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center bg-neutral-50 border border-dashed border-neutral-200">
                <p className="text-sm text-neutral-400">No bingo activity on this day.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={cn(
      "p-3 rounded-none transition-all duration-300",
      active ? "text-neutral-900 scale-110" : "text-neutral-300 hover:text-neutral-400"
    )}
  >
    {icon}
  </button>
);

const NewBingoForm: React.FC<{ 
  onSubmit: (title: string, size: number, theme: string, cellData: { text: string, visionImageData?: string }[], aspectRatio: '1:1' | '3:4', templateId?: string) => void; 
  onCancel: () => void;
  templates: Bingo[];
}> = ({ onSubmit, onCancel, templates }) => {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [size, setSize] = useState(3);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4'>('1:1');
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>();
  const [cellData, setCellData] = useState<{ text: string, visionImageData?: string }[]>(
    Array.from({ length: 9 }, () => ({ text: '' }))
  );
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    setCellData(Array.from({ length: newSize * newSize }, () => ({ text: '' })));
  };

  const handleCellUpdate = (index: number, data: { text?: string, visionImageData?: string }) => {
    const newData = [...cellData];
    newData[index] = { ...newData[index], ...data };
    setCellData(newData);
  };

  const handleVisionUpload = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          setRawImage(reader.result as string);
          setEditingIndex(index);
          setIsCropping(true);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleCropComplete = async (croppedImage: string) => {
    setIsProcessing(true);
    try {
      // Simple compression for vision images
      const img = new Image();
      img.src = croppedImage;
      await new Promise(resolve => img.onload = resolve);
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 600;
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
      ctx?.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.6);
      
      if (editingIndex !== null) {
        handleCellUpdate(editingIndex, { visionImageData: compressed });
      }
    } catch (err) {
      console.error('Processing failed', err);
    } finally {
      setIsProcessing(false);
      setIsCropping(false);
      setRawImage(null);
      setEditingIndex(null);
    }
  };

  if (step === 2) {
    return (
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Set Your Goals</h3>
          <p className="text-xs text-neutral-500">Define what each cell represents. You can also add a vision picture.</p>
        </div>

        <div className={cn(
          "grid gap-2",
          size === 3 ? "grid-cols-3" : "grid-cols-4"
        )}>
          {cellData.map((cell, i) => (
            <div key={i} className={cn(
              "relative bg-neutral-50 border border-neutral-200 group overflow-hidden",
              aspectRatio === '3:4' ? "aspect-[3/4]" : "aspect-square"
            )}>
              {cell.visionImageData ? (
                <img src={cell.visionImageData} className="w-full h-full object-cover opacity-[0.15]" />
              ) : null}
              <textarea
                value={cell.text}
                onChange={(e) => handleCellUpdate(i, { text: e.target.value })}
                placeholder={`Goal ${i + 1}`}
                className="absolute inset-0 w-full h-full bg-transparent p-2 text-[10px] font-bold text-center resize-none focus:outline-none placeholder:text-neutral-300 z-10"
              />
              
              {/* Processing Overlay */}
              <AnimatePresence>
                {isProcessing && editingIndex === i && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1"
                  >
                    <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {cell.visionImageData && (
                  <button 
                    onClick={() => {
                      setRawImage(cell.visionImageData || null);
                      setEditingIndex(i);
                      setIsCropping(true);
                    }}
                    className="p-1 bg-white/80 rounded-none"
                  >
                    <Crop size={12} className="text-neutral-600" />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setEditingIndex(i);
                    setShowUploadOptions(true);
                  }}
                  className="p-1 bg-white/80 rounded-none"
                >
                  <Camera size={12} className="text-neutral-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {showUploadOptions && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
              onClick={() => setShowUploadOptions(false)}
            >
              <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="w-full max-w-md bg-white p-8 rounded-none space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-neutral-900 uppercase tracking-widest">Add Vision Photo</h3>
                  <p className="text-xs text-neutral-400">Choose how you want to add your goal photo.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setShowCamera(true);
                      setShowUploadOptions(false);
                    }}
                    className="flex flex-col items-center gap-3 p-6 bg-neutral-50 rounded-none hover:bg-neutral-100 transition-colors"
                  >
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-none flex items-center justify-center">
                      <Camera size={24} />
                    </div>
                    <span className="text-sm font-bold text-neutral-700">Camera</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setRawImage(reader.result as string);
                            setIsCropping(true);
                            setShowUploadOptions(false);
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="flex flex-col items-center gap-3 p-6 bg-neutral-50 rounded-none hover:bg-neutral-100 transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-none flex items-center justify-center">
                      <ImageIcon size={24} />
                    </div>
                    <span className="text-sm font-bold text-neutral-700">Gallery</span>
                  </button>
                </div>
                
                <button 
                  onClick={() => setShowUploadOptions(false)}
                  className="w-full py-4 text-neutral-400 font-bold"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCamera && (
            <PhotoCapture 
              onCapture={(base64) => {
                setRawImage(base64);
                setIsCropping(true);
                setShowCamera(false);
              }}
              onClose={() => setShowCamera(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCropping && rawImage && (
            <ImageCropper 
              image={rawImage}
              onCropComplete={handleCropComplete}
              onCancel={() => {
                setIsCropping(false);
                setRawImage(null);
                setEditingIndex(null);
              }}
              aspect={aspectRatio === '3:4' ? 0.75 : 1}
            />
          )}
        </AnimatePresence>

        <div className="pt-4 flex gap-4">
          <button 
            onClick={() => setStep(1)}
            className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-none font-bold"
          >
            Back
          </button>
          <button 
            onClick={() => onSubmit(title, size, theme, cellData, aspectRatio, selectedTemplate)}
            className="flex-[2] py-4 bg-neutral-900 text-white rounded-none font-bold shadow-lg"
          >
            Create Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-4">
        <label className="block text-sm font-bold text-neutral-900 uppercase tracking-wider">Title</label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. My Perfect Day"
          className="w-full p-4 bg-white border border-neutral-200 rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-bold text-neutral-900 uppercase tracking-wider">Theme Name</label>
        <input 
          type="text" 
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="e.g. Morning Routine"
          className="w-full p-4 bg-white border border-neutral-200 rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      {templates.length > 0 && (
        <div className="space-y-4">
          <label className="block text-sm font-bold text-neutral-900 uppercase tracking-wider">Start from Template</label>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => {
                setSelectedTemplate(undefined);
                handleSizeChange(3);
              }}
              className={cn(
                "flex-shrink-0 px-6 py-3 rounded-none border text-sm font-bold transition-all",
                !selectedTemplate ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-200 text-neutral-400"
              )}
            >
              Blank
            </button>
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTemplate(t.id);
                  handleSizeChange(t.size);
                  if (!theme) setTheme(t.theme);
                }}
                className={cn(
                  "flex-shrink-0 px-6 py-3 rounded-none border text-sm font-bold transition-all",
                  selectedTemplate === t.id ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-200 text-neutral-400"
                )}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedTemplate && (
        <div className="space-y-4">
          <label className="block text-sm font-bold text-neutral-900 uppercase tracking-wider">Aspect Ratio</label>
          <div className="flex gap-4">
            <button
              onClick={() => setAspectRatio('1:1')}
              className={cn(
                "flex-1 p-4 rounded-none border flex flex-col items-center gap-2 transition-all",
                aspectRatio === '1:1' ? "border-neutral-900 text-neutral-900" : "bg-white border-neutral-200 text-neutral-300"
              )}
            >
              <div className="w-8 h-8 border-2 border-current" />
              <span className="text-xs font-bold">1 : 1 (Square)</span>
            </button>
            <button
              onClick={() => setAspectRatio('3:4')}
              className={cn(
                "flex-1 p-4 rounded-none border flex flex-col items-center gap-2 transition-all",
                aspectRatio === '3:4' ? "border-neutral-900 text-neutral-900" : "bg-white border-neutral-200 text-neutral-300"
              )}
            >
              <div className="w-6 h-8 border-2 border-current" />
              <span className="text-xs font-bold">3 : 4 (Portrait)</span>
            </button>
          </div>
        </div>
      )}

      {!selectedTemplate && (
        <div className="space-y-4">
          <label className="block text-sm font-bold text-neutral-900 uppercase tracking-wider">Grid Size</label>
          <div className="flex gap-4">
            <button
              onClick={() => handleSizeChange(3)}
              className={cn(
                "flex-1 p-6 rounded-none border flex flex-col items-center gap-2 transition-all",
                size === 3 ? "border-neutral-900 text-neutral-900" : "bg-white border-neutral-200 text-neutral-300"
              )}
            >
              <Grid3X3 size={32} />
              <span className="font-bold">3 x 3</span>
            </button>
            <button
              onClick={() => handleSizeChange(4)}
              className={cn(
                "flex-1 p-6 rounded-none border flex flex-col items-center gap-2 transition-all",
                size === 4 ? "border-neutral-900 text-neutral-900" : "bg-white border-neutral-200 text-neutral-300"
              )}
            >
              <Grid2X2 size={32} />
              <span className="font-bold">4 x 4</span>
            </button>
          </div>
        </div>
      )}

      <div className="pt-4 flex gap-4">
        <button 
          onClick={onCancel}
          className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-none font-bold"
        >
          Cancel
        </button>
        <button 
          onClick={() => title && theme && setStep(2)}
          disabled={!title || !theme}
          className="flex-[2] py-4 bg-neutral-900 text-white rounded-none font-bold disabled:opacity-50 shadow-lg"
        >
          Next: Set Goals
        </button>
      </div>
    </div>
  );
};
