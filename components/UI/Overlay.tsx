import React from 'react';
import { InteractionState, TreeMode } from '../../types';
import { Loader2, X, Star, Upload, Trash2 } from 'lucide-react';

interface OverlayProps {
  interactionState: InteractionState;
  treeMode: TreeMode;
  wish: string;
  onClose: () => void;
  onAssemble: () => void;
  onExplode: () => void;
  userImages: string[];
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
}

export const Overlay: React.FC<OverlayProps> = ({ 
  interactionState, 
  treeMode,
  wish, 
  onClose,
  onAssemble,
  onExplode,
  userImages,
  onImageUpload,
  onRemoveImage
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 md:p-12">
      {/* Header */}
      <header className="flex flex-col items-center pointer-events-auto transition-all duration-1000">
        <h1 className="text-4xl md:text-6xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-gold-300 to-gold-600 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-widest uppercase text-center">
          Grand Luxury
        </h1>
        <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-gold-500 to-transparent mt-3 mb-2"></div>
      </header>

      {/* Center Action Area - Only for AI Output now */}
      {/* REMOVED pointer-events-auto from this container to allow 3D interaction behind it */}
      <div className="flex-1 flex items-center justify-center relative">
        
        {/* AI GENERATION LOADING - Add pointer-events-auto individually */}
        {interactionState === InteractionState.GENERATING && (
          <div className="pointer-events-auto bg-emerald-950/80 backdrop-blur-md border border-gold-500/30 p-8 rounded-full shadow-[0_0_50px_rgba(255,215,0,0.2)] animate-pulse flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
            <p className="text-gold-300 mt-4 font-serif italic text-lg">Consulting the Elites...</p>
          </div>
        )}

        {/* AI WISH DISPLAY - Add pointer-events-auto individually */}
        {interactionState === InteractionState.SHOWING && (
          <div className="pointer-events-auto max-w-3xl bg-gradient-to-b from-emerald-950/95 to-black/95 backdrop-blur-xl border border-gold-500 p-2 shadow-[0_0_100px_rgba(255,215,0,0.4)] animate-in fade-in zoom-in duration-500 mx-4">
            <div className="border border-gold-500/30 p-8 md:p-12 relative flex flex-col items-center">
               <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gold-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <Star className="w-10 h-10 text-gold-400 mb-6 fill-gold-400/20" />
              
              <p className="font-serif text-2xl md:text-4xl text-center text-gold-50 leading-relaxed italic drop-shadow-md">
                "{wish}"
              </p>
              
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold-500 to-transparent mt-8 mb-4"></div>
              
              <p className="text-center text-gold-600 text-xs font-sans tracking-[0.2em] uppercase">
                A Presidential Prediction
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <footer className="pointer-events-auto flex flex-col items-center gap-6 mb-4 relative">
        
        {/* Hint Text - Only show when tree is formed and idle */}
        {treeMode === TreeMode.FORMED && interactionState === InteractionState.IDLE && (
           <div className="animate-pulse">
             <p className="text-gold-500/80 font-serif italic text-sm md:text-base drop-shadow-lg">
               Tap the Golden Star for a Fortune
             </p>
           </div>
        )}

        {/* Main Toggle Button */}
        <button 
          onClick={treeMode === TreeMode.FORMED ? onExplode : onAssemble}
          className="group relative px-10 py-4 bg-black/60 backdrop-blur-xl border border-gold-500/40 rounded-sm overflow-hidden hover:bg-gold-900/30 transition-all duration-500 shadow-[0_0_30px_rgba(255,215,0,0.1)] hover:shadow-[0_0_50px_rgba(255,215,0,0.3)]"
        >
          <span className="relative z-10 text-gold-100 font-sans text-sm md:text-base tracking-[0.25em] group-hover:text-white transition-colors uppercase font-bold">
            {treeMode === TreeMode.FORMED ? "Disperse Elements" : "Assemble Grandeur"}
          </span>
          
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          
          {/* Border Glow */}
          <div className="absolute inset-0 border border-gold-500/20 rounded-sm group-hover:border-gold-400/60 transition-colors duration-500"></div>
        </button>

      </footer>

      {/* Right-Bottom Image Upload Widget */}
      <div className="fixed bottom-6 right-6 pointer-events-auto flex flex-col items-end gap-3 z-50">
        
        {/* Thumbnails */}
        {userImages.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 mb-2 max-w-[200px] md:max-w-[300px]">
            {userImages.map((img, idx) => (
              <div key={idx} className="relative group w-14 h-14 border border-gold-500/50 rounded-sm overflow-hidden shadow-lg bg-black/50 backdrop-blur-sm transition-transform hover:scale-110">
                <img src={img} alt="memory" className="w-full h-full object-cover" />
                <button 
                  onClick={() => onRemoveImage(idx)}
                  className="absolute inset-0 bg-red-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Trash2 size={16} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        <label className="cursor-pointer group flex items-center gap-3 px-5 py-3 bg-emerald-950/80 backdrop-blur-md border border-gold-500/50 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:bg-gold-900/40 transition-all duration-300">
           <span className="hidden md:block text-gold-200 font-sans text-xs tracking-widest uppercase font-bold group-hover:text-white">
             Upload Memories
           </span>
           <div className="bg-gold-500/20 p-1.5 rounded-full group-hover:bg-gold-500 group-hover:text-black transition-colors">
             <Upload size={18} className="text-gold-400 group-hover:text-black" />
           </div>
           <input 
             type="file" 
             multiple 
             accept="image/*" 
             className="hidden" 
             onChange={onImageUpload}
           />
        </label>
      </div>

    </div>
  );
};