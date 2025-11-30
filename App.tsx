import React, { useState, useCallback } from 'react';
import { Scene } from './components/Scene';
import { Overlay } from './components/UI/Overlay';
import { generateLuxuryWish } from './services/geminiService';
import { InteractionState, TreeMode } from './types';

const App: React.FC = () => {
  const [interactionState, setInteractionState] = useState<InteractionState>(InteractionState.IDLE);
  // Start in FORMED mode as requested
  const [treeMode, setTreeMode] = useState<TreeMode>(TreeMode.FORMED);
  const [currentWish, setCurrentWish] = useState<string>("");
  const [userImages, setUserImages] = useState<string[]>([]);

  const handleStarClick = useCallback(async () => {
    // Only allow clicking if formed and idle
    if (treeMode !== TreeMode.FORMED) return;
    if (interactionState === InteractionState.GENERATING || interactionState === InteractionState.SHOWING) return;

    setInteractionState(InteractionState.GENERATING);

    // Call Gemini Service
    const wish = await generateLuxuryWish();
    
    setCurrentWish(wish);
    setInteractionState(InteractionState.SHOWING);
  }, [interactionState, treeMode]);

  const handleCloseOverlay = useCallback(() => {
    setInteractionState(InteractionState.IDLE);
    setCurrentWish("");
  }, []);

  const handleAssemble = useCallback(() => {
    setTreeMode(TreeMode.FORMED);
  }, []);

  const handleExplode = useCallback(() => {
    setTreeMode(TreeMode.CHAOS);
    setInteractionState(InteractionState.IDLE);
    setCurrentWish("");
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setUserImages(prev => [...prev, ...newImages]);
    }
  }, []);

  const handleRemoveImage = useCallback((indexToRemove: number) => {
    setUserImages(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  return (
    <div className="w-full h-screen relative bg-[#020402] overflow-hidden">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene 
          onStarClick={handleStarClick} 
          onExplode={handleExplode}
          isGenerating={interactionState === InteractionState.GENERATING} 
          treeMode={treeMode}
          userImages={userImages}
        />
      </div>

      {/* UI Overlay Layer */}
      <Overlay 
        interactionState={interactionState} 
        treeMode={treeMode}
        wish={currentWish} 
        onClose={handleCloseOverlay} 
        onAssemble={handleAssemble}
        onExplode={handleExplode}
        userImages={userImages}
        onImageUpload={handleImageUpload}
        onRemoveImage={handleRemoveImage}
      />
    </div>
  );
};

export default App;