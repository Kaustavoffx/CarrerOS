"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  
  // Video & Audio states
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  
  // Transition states
  const [videoFading, setVideoFading] = useState(false);
  const [appRevealing, setAppRevealing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialOrientationRef = useRef<"portrait" | "landscape" | null>(null);
  const faderRef = useRef<number | null>(null);

  // Initial mount check
  useEffect(() => {
    if (typeof window !== "undefined") {
      setMounted(true);
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      initialOrientationRef.current = isPortrait ? "portrait" : "landscape";

      const prefs = window.matchMedia("(prefers-reduced-motion: reduce)");
      const hasSeen = localStorage.getItem("careeros_intro_seen");

      if (!hasSeen && !prefs.matches) {
        setShowIntro(true);
        audioRef.current = new Audio('/mecha.mp3');
        audioRef.current.volume = 0; // Start at 0 for fade-in
      } else {
        setAppRevealing(true);
      }
    }
  }, []);

  // Show skip button after 1.5s (only if video is playing)
  useEffect(() => {
    if (!showIntro || audioBlocked || !isVideoReady) return;
    const timer = setTimeout(() => setShowSkip(true), 1500);
    return () => clearTimeout(timer);
  }, [showIntro, audioBlocked, isVideoReady]);

  // Handle replay and demo events
  useEffect(() => {
    const handleReplay = () => {
      localStorage.removeItem("careeros_intro_seen");
      if (!audioRef.current) audioRef.current = new Audio('/mecha.mp3');
      resetAndPlay();
    };

    const handlePlayDemo = () => {
      if (!audioRef.current) audioRef.current = new Audio('/mecha.mp3');
      resetAndPlay();
    };

    const resetAndPlay = () => {
      setVideoFading(false);
      setAppRevealing(false);
      setShowSkip(false);
      setIsVideoReady(false);
      setAudioBlocked(false);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      setShowIntro(true);
    };

    window.addEventListener("careeros:replay-intro", handleReplay);
    window.addEventListener("careeros:play-demo", handlePlayDemo);
    
    return () => {
      window.removeEventListener("careeros:replay-intro", handleReplay);
      window.removeEventListener("careeros:play-demo", handlePlayDemo);
    };
  }, []);

  // Audio Fade Utilities
  const fadeAudio = useCallback((targetVol: number, duration: number) => {
    if (!audioRef.current) return;
    if (faderRef.current) clearInterval(faderRef.current);
    
    const startVol = audioRef.current.volume;
    const distance = targetVol - startVol;
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = distance / steps;
    let currentStep = 0;
    
    faderRef.current = window.setInterval(() => {
      currentStep++;
      if (!audioRef.current) {
         if (faderRef.current) clearInterval(faderRef.current);
         return;
      }
      
      let newVol = startVol + (volStep * currentStep);
      if (newVol > 1) newVol = 1;
      if (newVol < 0) newVol = 0;
      
      audioRef.current.volume = newVol;
      
      if (currentStep >= steps) {
        audioRef.current.volume = targetVol;
        if (faderRef.current) clearInterval(faderRef.current);
      }
    }, stepTime);
  }, []);

  const triggerExitTransition = useCallback(() => {
    setVideoFading(true);
    fadeAudio(0, 300); // Fade out over 300ms
    
    localStorage.setItem("careeros_intro_seen", "true");

    setTimeout(() => {
      setAppRevealing(true);
    }, 50);

    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setShowIntro(false);
    }, 450);
  }, [fadeAudio]);

  const skipIntro = () => {
    if (videoRef.current) videoRef.current.pause();
    triggerExitTransition();
  };

  // Attempt synchronized playback
  const startPlayback = useCallback(async () => {
    if (!videoRef.current || !audioRef.current) return;
    
    try {
      // Must start both simultaneously
      const vPromise = videoRef.current.play();
      const aPromise = audioRef.current.play();
      
      if (vPromise !== undefined) await vPromise;
      if (aPromise !== undefined) await aPromise;
      
      // Success! Fade in audio
      fadeAudio(0.85, 400);
      setAudioBlocked(false);
    } catch (err) {
      // Autoplay blocked
      setAudioBlocked(true);
      videoRef.current.pause();
      audioRef.current.pause();
    }
  }, [fadeAudio]);

  // Start playback once video metadata is loaded
  useEffect(() => {
    if (!showIntro || !isVideoReady || audioBlocked) return;
    
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => triggerExitTransition();
    const handleError = () => triggerExitTransition();

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    startPlayback();

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, [showIntro, isVideoReady, audioBlocked, triggerExitTransition, startPlayback]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (faderRef.current) clearInterval(faderRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = showIntro ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showIntro]);

  if (!mounted) return null;

  const isPortrait = initialOrientationRef.current === "portrait";

  return (
    <>
      {showIntro && (
        <div 
          className="fixed inset-0 w-[100vw] h-[100vh] overflow-hidden flex items-center justify-center bg-[#000000] z-[999999]"
          style={{
            opacity: videoFading ? 0 : 1,
            transition: "opacity 350ms cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "opacity"
          }}
        >
          {/* Autoplay Fallback Overlay */}
          {audioBlocked && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
              <button 
                onClick={startPlayback}
                className="px-8 py-4 rounded-full border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 font-bold tracking-widest uppercase text-xs shadow-[0_0_40px_rgba(34,211,238,0.15)] transition-all active:scale-95"
              >
                Tap to Enter CareerOS
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            muted // We handle audio separately via HTMLAudioElement to ensure precise sync and avoid double audio tracks
            playsInline
            preload="metadata"
            onLoadedMetadata={() => setIsVideoReady(true)}
            // @ts-expect-error fetchPriority is valid but React types might not include it yet
            fetchPriority="high"
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            className="w-full h-full object-contain pointer-events-none"
            style={{ 
              objectPosition: "center center",
              opacity: isVideoReady ? 1 : 0, // Wait for dimensions to settle
              transition: "opacity 200ms ease-out"
            }}
          >
            <source src={isPortrait ? "/intro_portrait.mp4" : "/intro_landscape.mp4"} type="video/mp4" />
          </video>
          
          {showSkip && isVideoReady && !audioBlocked && (
            <button
              onClick={skipIntro}
              className="absolute top-6 right-6 px-4 py-2 text-[10px] font-bold text-white/70 hover:text-white uppercase tracking-[0.2em] z-10 transition-all duration-300 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
            >
              Skip Intro
            </button>
          )}
        </div>
      )}

      <div
        className="relative w-full min-h-screen"
        style={{
          opacity: appRevealing ? 1 : 0,
          transition: "opacity 450ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "opacity"
        }}
      >
        {children}
      </div>
    </>
  );
}
