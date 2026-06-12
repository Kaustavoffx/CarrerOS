"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  
  // Transition states
  const [videoFading, setVideoFading] = useState(false);
  const [appRevealing, setAppRevealing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const initialOrientationRef = useRef<"portrait" | "landscape" | null>(null);

  // Check orientation safely only once
  useEffect(() => {
    if (typeof window !== "undefined") {
      setMounted(true);
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      initialOrientationRef.current = isPortrait ? "portrait" : "landscape";

      const prefs = window.matchMedia("(prefers-reduced-motion: reduce)");
      const hasSeen = localStorage.getItem("careeros_intro_seen");

      if (!hasSeen && !prefs.matches) {
        setShowIntro(true);
      } else {
        // App is already revealed if skipped
        setAppRevealing(true);
      }
    }
  }, []);

  // Show skip button after 1.5s
  useEffect(() => {
    if (!showIntro) return;
    const timer = setTimeout(() => setShowSkip(true), 1500);
    return () => clearTimeout(timer);
  }, [showIntro]);

  // Handle replay and demo events
  useEffect(() => {
    const handleReplay = () => {
      localStorage.removeItem("careeros_intro_seen");
      setVideoFading(false);
      setAppRevealing(false);
      setShowSkip(false);
      setShowIntro(true);
    };

    const handlePlayDemo = () => {
      // Demo playback does not clear localStorage, just forces playback
      setVideoFading(false);
      setAppRevealing(false);
      setShowSkip(false);
      setShowIntro(true);
    };

    window.addEventListener("careeros:replay-intro", handleReplay);
    window.addEventListener("careeros:play-demo", handlePlayDemo);
    
    return () => {
      window.removeEventListener("careeros:replay-intro", handleReplay);
      window.removeEventListener("careeros:play-demo", handlePlayDemo);
    };
  }, []);

  const triggerExitTransition = useCallback(() => {
    // PHASE 01: Reached
    // PHASE 02: Video fade
    setVideoFading(true);
    
    // Set localStorage
    localStorage.setItem("careeros_intro_seen", "true");

    // PHASE 03: App reveal (starts slightly after or concurrently)
    setTimeout(() => {
      setAppRevealing(true);
    }, 50); // Small offset to ensure video fade starts

    // Cleanup video after transition
    setTimeout(() => {
      setShowIntro(false);
    }, 450); // Max duration of transitions
  }, []);

  const skipIntro = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    triggerExitTransition();
  };

  useEffect(() => {
    if (!showIntro || !videoRef.current) return;
    
    const video = videoRef.current;
    
    const handleEnded = () => {
      triggerExitTransition();
    };

    const handleError = () => {
      // Failsafe gracefully
      triggerExitTransition();
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay blocked or error
        triggerExitTransition();
      });
    }

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, [showIntro, triggerExitTransition]);

  // Scroll lock during intro playback
  useEffect(() => {
    if (showIntro) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
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
            transition: "opacity 350ms ease-out",
            willChange: "opacity"
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            preload="metadata"
            // @ts-expect-error fetchPriority is valid but React types might not include it yet
            fetchPriority="high"
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            className="w-full h-full object-contain pointer-events-none"
            style={{ objectPosition: "center center" }}
          >
            <source src={isPortrait ? "/intro_portrait.mp4" : "/intro_landscape.mp4"} type="video/mp4" />
          </video>
          
          {showSkip && (
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
        className="relative w-full min-h-screen bg-[#030712]"
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
