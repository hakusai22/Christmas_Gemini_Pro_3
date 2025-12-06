import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene';
import { Overlay } from './components/UI/Overlay';
import { generateLuxuryWish } from './services/geminiService';
import { InteractionState, TreeMode } from './types';

const DEFAULT_AUDIO = "https://upload.wikimedia.org/wikipedia/commons/e/e9/We_Wish_You_a_Merry_Christmas_%28Kevin_MacLeod%29_%28ISRC_USUAN1100306%29.mp3";

const App: React.FC = () => {
  const [interactionState, setInteractionState] = useState<InteractionState>(InteractionState.IDLE);
  // Start in FORMED mode as requested
  const [treeMode, setTreeMode] = useState<TreeMode>(TreeMode.FORMED);
  const [currentWish, setCurrentWish] = useState<string>("");
  const [userImages, setUserImages] = useState<string[]>([]);
  
  // Audio State
  const [audioSrc, setAudioSrc] = useState<string>(DEFAULT_AUDIO);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);

  // Attempt Autoplay on Mount with Robust Fallback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.4; // Set reasonable volume

    const playAudio = async () => {
      try {
        await audio.play();
        setIsMusicPlaying(true);
        console.log("Autoplay successful");
      } catch (err) {
        console.warn("Autoplay blocked. Waiting for user interaction...");
        setIsMusicPlaying(false);
        
        // Add a one-time listener to start music on ANY interaction
        const enableAudio = () => {
          audio.play().then(() => {
            setIsMusicPlaying(true);
            console.log("Audio started after user interaction");
          }).catch(e => console.error("Still failed to play:", e));
          
          window.removeEventListener('click', enableAudio);
          window.removeEventListener('touchstart', enableAudio);
          window.removeEventListener('keydown', enableAudio);
        };

        window.addEventListener('click', enableAudio);
        window.addEventListener('touchstart', enableAudio);
        window.addEventListener('keydown', enableAudio);
      }
    };

    if (audioSrc === DEFAULT_AUDIO) {
        playAudio();
    }
  }, []);

  // Effect: When audio source changes (e.g. upload), play immediately
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioSrc !== DEFAULT_AUDIO) {
      audio.play()
        .then(() => setIsMusicPlaying(true))
        .catch(e => console.error("Failed to play new track:", e));
    }
  }, [audioSrc]);

  const toggleMusic = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      if (isMusicPlaying) {
        audio.pause();
      } else {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.error("Manual play failed:", e);
          });
        }
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  }, [isMusicPlaying]);

  const handleAudioError = useCallback((e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error("Audio playback error:", e);
    // Fallback logic is less necessary with a reliable CDN, but kept for safety
    if (isMusicPlaying) setIsMusicPlaying(false);
  }, [isMusicPlaying]);

  const handleMusicUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
    }
  }, []);

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
      const newImages = Array.from(e.target.files).map((file: File) => URL.createObjectURL(file));
      setUserImages(prev => [...prev, ...newImages]);
    }
  }, []);

  const handleRemoveImage = useCallback((indexToRemove: number) => {
    setUserImages(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  return (
    <div className="w-full h-screen relative bg-[#020402] overflow-hidden">
      {/* Background Music */}
      <audio 
        ref={audioRef} 
        src={audioSrc} 
        loop 
        preload="auto"
        crossOrigin="anonymous"
        playsInline
        onError={handleAudioError}
      />

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
        isMusicPlaying={isMusicPlaying}
        onToggleMusic={toggleMusic}
        onMusicUpload={handleMusicUpload}
      />
    </div>
  );
};

export default App;