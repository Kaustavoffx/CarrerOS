"use client";

import { useEffect, useState, useRef } from "react";

export function IntroSystem() {
  const [mounted, setMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioFadeInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!localStorage.getItem("careeros_intro_seen")) {
      setShowIntro(true);
    }
  }, []);

  const closeIntro = () => {
    localStorage.setItem("careeros_intro_seen", "true");
    if (containerRef.current) {
      // GPU accelerated fade out
      containerRef.current.style.opacity = "0";
      containerRef.current.style.pointerEvents = "none";
      setTimeout(() => {
        setShowIntro(false);
      }, 500); // 500ms smooth fade out
    } else {
      setShowIntro(false);
    }
  };

  const skipIntro = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    closeIntro();
  };

  const replayIntro = () => {
    if (videoRef.current && audioRef.current) {
      videoRef.current.currentTime = 0;
      audioRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
      audioRef.current.play().catch(console.error);
      audioRef.current.volume = 0.15;
      if (audioFadeInterval.current) {
        clearInterval(audioFadeInterval.current);
        audioFadeInterval.current = null;
      }
    }
  };

  useEffect(() => {
    if (!showIntro) return;

    const video = videoRef.current;
    const audio = audioRef.current;
    
    if (!video || !audio) return;

    const handleVideoError = () => {
      // Failsafe: Show logo, wait 1s, open app
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #000;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white; margin-right: 12px;">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <h1 style="color: white; font-size: 2rem; font-weight: bold; font-family: sans-serif; letter-spacing: 0.1em; margin: 0;">
              CAREER<span style="color: #3b82f6;">OS</span>
            </h1>
          </div>
        `;
      }
      setTimeout(() => {
        closeIntro();
      }, 1000);
    };

    const handleVideoEnded = () => {
      closeIntro();
    };

    const handleTimeUpdate = () => {
      if (video.duration && video.duration - video.currentTime <= 1.0) {
        // Fade out audio over the last 1 second
        if (!audioFadeInterval.current) {
          const startVol = audio.volume;
          const steps = 20;
          const stepTime = 1000 / steps;
          const volStep = startVol / steps;
          let currentStep = 0;

          audioFadeInterval.current = setInterval(() => {
            currentStep++;
            if (audio) {
              audio.volume = Math.max(0, startVol - volStep * currentStep);
            }
            if (currentStep >= steps) {
              if (audioFadeInterval.current) clearInterval(audioFadeInterval.current);
            }
          }, stepTime);
        }
      }
    };

    const syncPlay = () => {
      audio.volume = 0.15;
      audio.play().catch(console.error);
    };

    video.addEventListener('error', handleVideoError);
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', syncPlay);

    // Ensure it starts playing. Browsers might block autoplay, trigger failsafe if so.
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        handleVideoError();
      });
    }

    return () => {
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('ended', handleVideoEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', syncPlay);
      if (audioFadeInterval.current) clearInterval(audioFadeInterval.current);
    };
  }, [showIntro]);

  if (!mounted || !showIntro) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 w-[100vw] h-[100vh] bg-[#000000] z-[999999]"
      style={{ 
        opacity: 1, 
        contain: "strict", 
        transition: "opacity 500ms ease-out", 
        willChange: "opacity" 
      }}
    >
      <video
        ref={videoRef}
        src="/intro.webm"
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        className="w-full h-full object-contain pointer-events-none"
        style={{ 
          transform: "translateZ(0)", 
          willChange: "transform"
        }}
      />
      <audio
        ref={audioRef}
        src="/mecha.mp3"
        preload="auto"
      />

      <button
        onClick={skipIntro}
        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors text-xs font-medium tracking-[0.2em] uppercase z-10 bg-transparent border-none cursor-pointer"
        style={{ transform: "translateZ(0)" }}
      >
        Skip Intro
      </button>

      <button
        onClick={replayIntro}
        className="absolute bottom-8 right-8 text-white/50 hover:text-white transition-colors text-xs font-medium tracking-[0.2em] uppercase z-10 bg-transparent border-none cursor-pointer"
        style={{ transform: "translateZ(0)" }}
      >
        Replay Intro
      </button>
    </div>
  );
}
