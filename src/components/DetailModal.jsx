import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Play, Pause, Lock, Coins, Plus, Check, Volume2, VolumeX, Maximize2, Minimize2, ShieldAlert } from 'lucide-react';

export default function DetailModal({ item, onClose, onRequireAuth, onRequireShop }) {
  const { currentUser, isEpisodeUnlocked, unlockEpisode, toggleFavorite, isSeriesFavorite, updateWatchProgress, getEpisodeProgress } = useContext(AppContext);
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [unlockError, setUnlockError] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);

  // Custom Player State
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimePct, setCurrentTimePct] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playerInstanceRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const playerContainerRef = useRef(null);
  const gdriveIframeRef = useRef(null);
  const gdriveTimerRef = useRef(null);
  const [isGDrivePlaying, setIsGDrivePlaying] = useState(true);
  const [gdriveReady, setGdriveReady] = useState(false);
  const isFav = isSeriesFavorite(item.id);

  const handleSelectEpisode = (ep) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setActiveEpisode(ep);
    setUnlockError('');
    setPlayerReady(false);
    setIsPlaying(false);
    setCurrentTimePct(0);
    setIsMuted(false);
    // Reset Google Drive state for new episode
    setIsGDrivePlaying(true);
    setGdriveReady(false);
  };

  const handleUnlock = (epId) => {
    const res = unlockEpisode(epId);
    if (!res.success) {
      setUnlockError(res.message);
    } else {
      setUnlockError('');
    }
  };

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // YouTube API Integration
  useEffect(() => {
    if (activeEpisode && isEpisodeUnlocked(activeEpisode.id)) {
      // Load YouTube Player API
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = () => {
          initializeYTPlayer(activeEpisode.youtubeId);
        };
      } else {
        initializeYTPlayer(activeEpisode.youtubeId);
      }
    }

    return () => {
      cleanYTPlayer();
    };
  }, [activeEpisode]);

  const initializeYTPlayer = (videoId) => {
    cleanYTPlayer();

    // The element custom-youtube-player must exist
    playerInstanceRef.current = new window.YT.Player('custom-youtube-player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0, // Disable native controls
        disablekb: 1, // Disable keyboard controls
        modestbranding: 1, // Hide YouTube logo
        rel: 0, // Disable related videos
        showinfo: 0,
        iv_load_policy: 3,
        fs: 0, // Disable native full screen button
        playsinline: 1
      },
      events: {
        onReady: (event) => {
          setPlayerReady(true);
          event.target.playVideo();
          setIsPlaying(true);
          if (isMuted) {
            event.target.mute();
          } else {
            event.target.unMute();
          }
          
          // Start polling watch progress
          startProgressPolling();
        },
        onStateChange: (event) => {
          // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
          if (event.data === 1) {
            setIsPlaying(true);
          } else if (event.data === 2) {
            setIsPlaying(false);
          }
        }
      }
    });
  };

  const cleanYTPlayer = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (playerInstanceRef.current && playerInstanceRef.current.destroy) {
      playerInstanceRef.current.destroy();
    }
    playerInstanceRef.current = null;
  };

  const startProgressPolling = () => {
    progressIntervalRef.current = setInterval(() => {
      const player = playerInstanceRef.current;
      if (player && player.getCurrentTime && player.getDuration) {
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        setCurrentSeconds(current);
        setDurationSeconds(duration);
        if (duration > 0) {
          const pct = Math.floor((current / duration) * 100);
          setCurrentTimePct(pct);
          // Sync with global state
          updateWatchProgress(activeEpisode.id, pct);
        }
      }
    }, 500);
  };

  const handlePlayPause = () => {
    const player = playerInstanceRef.current;
    if (player && playerReady) {
      if (isPlaying) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        player.playVideo();
        setIsPlaying(true);
      }
    }
  };

  const handleMuteUnmute = () => {
    const player = playerInstanceRef.current;
    if (player && playerReady) {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    }
  };

  const handleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      const lockLandscape = () => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      };

      // Push a fake history state so the Android back gesture exits fullscreen
      window.history.pushState({ fullscreen: true }, '');

      if (container.requestFullscreen) {
        container.requestFullscreen().then(lockLandscape).catch(() => {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
        lockLandscape();
      }
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Listen for Android back gesture / back button to exit fullscreen
  useEffect(() => {
    const handlePopState = () => {
      if (document.fullscreenElement) {
        exitFullscreen();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync isFullscreen state with the actual fullscreen status
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleProgressBarClick = (e) => {
    const player = playerInstanceRef.current;
    if (player && playerReady && durationSeconds > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = clickX / rect.width;
      const targetSeconds = pct * durationSeconds;
      player.seekTo(targetSeconds, true);
    }
  };

  // Hide controls after 3 seconds of inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    if (activeEpisode) {
      handleMouseMove();
    }
  }, [activeEpisode, isFullscreen]);

  const formatVideoTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 500,
      backdropFilter: 'blur(12px)',
      padding: 0 // No padding to align with mobile fullscreen
    }}>
      <div 
        className="glass mobile-fullscreen-modal"
        style={{
          width: '100%',
          maxWidth: '850px',
          height: '92vh',
          borderRadius: '12px',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 0 30px rgba(163, 0, 255, 0.25)',
          backgroundColor: 'var(--bg-primary)'
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            color: '#fff',
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            padding: '8px',
            borderRadius: '50%'
          }}
        >
          <X size={18} />
        </button>

        {/* Player Section with Custom Controls Overlay */}
        {activeEpisode && isEpisodeUnlocked(activeEpisode.id) ? (
          (() => {
            const bunnyLibraryId = import.meta.env.VITE_BUNNY_LIBRARY_ID || '711399';
            const rawId = activeEpisode.youtubeId || '';
            const isBunnyStream = rawId.length === 36 || rawId.includes('-') || activeEpisode.isBunny;
            const isGoogleDrive = !isBunnyStream && rawId.length > 15;

            return (
              <div 
                ref={playerContainerRef}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: isFullscreen ? '100vh' : 'auto',
                  paddingBottom: isFullscreen ? '0' : '56.25%',
                  background: '#000',
                  overflow: 'hidden'
                }}
              >
                {isBunnyStream ? (
                  /* Bunny Stream Premium HTML5 Player */
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <iframe
                      src={`https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${rawId}?autoplay=true&loop=false&muted=false&preload=true`}
                      loading="lazy"
                      style={{ border: 'none', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />

                    {/* Floating Controls Overlay (Next Episode) */}
                    <div style={{
                      position: 'absolute',
                      bottom: '60px',
                      right: '20px',
                      zIndex: 50,
                      display: 'flex',
                      gap: '10px',
                      opacity: showControls ? 1 : 0,
                      transition: 'opacity 0.4s ease',
                      pointerEvents: showControls ? 'auto' : 'none'
                    }}>
                      {/* Next Episode Button */}
                      {(() => {
                        const seasonEps = episodes.filter(e => (e.seasonNumber || 1) === (activeEpisode.seasonNumber || 1));
                        const nextEp = seasonEps.find(e => e.number === activeEpisode.number + 1);
                        if (!nextEp) return null;
                        const isUnlocked = isEpisodeUnlocked(nextEp.id);
                        return (
                          <button
                            onClick={() => handleSelectEpisode(nextEp)}
                            className="btn-fire-glow"
                            style={{
                              background: isUnlocked
                                ? 'rgba(0, 240, 255, 0.2)'
                                : 'linear-gradient(45deg, var(--color-secondary-red), var(--color-primary-red))',
                              border: `1px solid ${isUnlocked ? 'var(--color-neon-cyan)' : 'var(--color-primary-red)'}`,
                              color: '#fff',
                              padding: '8px 16px',
                              borderRadius: '20px',
                              fontWeight: 'bold',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              boxShadow: '0 0 15px rgba(0,0,0,0.5)',
                              backdropFilter: 'blur(8px)'
                            }}
                          >
                            <Play size={14} fill="#fff" />
                            {isUnlocked ? `Próximo (Ep ${nextEp.number})` : `Desbloquear Ep ${nextEp.number}`}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                ) : isGoogleDrive ? (
                  /* Google Drive Player — two phases: init (let Drive start) → ready (our controls) */
                  <>
                    {/* The iframe */}
                    <div className="gdrive-player-crop">
                      <iframe
                        ref={gdriveIframeRef}
                        src={`https://drive.google.com/file/d/${activeEpisode.youtubeId}/preview`}
                        className="gdrive-iframe"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none'
                        }}
                        allow="autoplay"
                        onLoad={() => {
                          // After iframe loads, give Drive 3s to start playing, then activate our overlay
                          if (gdriveTimerRef.current) clearTimeout(gdriveTimerRef.current);
                          gdriveTimerRef.current = setTimeout(() => {
                            setGdriveReady(true);
                            setIsGDrivePlaying(true);
                            handleMouseMove();
                          }, 3000);
                        }}
                      />
                    </div>

                    {/* Phase 1: Loading — show animated spinner, let taps pass to iframe */}
                    {!gdriveReady && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <div style={{
                          color: 'var(--color-neon-cyan)',
                          fontSize: '0.85rem',
                          background: 'rgba(0,0,0,0.6)',
                          padding: '8px 18px',
                          borderRadius: '20px',
                          fontWeight: 'bold'
                        }}>
                          Carregando...
                        </div>
                      </div>
                    )}

                    {/* Phase 2: Ready — full blocking overlay + our custom controls */}
                    {gdriveReady && (
                      <div
                        className="gdrive-custom-overlay"
                        onClick={() => {
                          if (isGDrivePlaying) {
                            if (gdriveIframeRef.current) gdriveIframeRef.current.src = 'about:blank';
                            setIsGDrivePlaying(false);
                          } else {
                            if (gdriveIframeRef.current && activeEpisode) {
                              gdriveIframeRef.current.src = `https://drive.google.com/file/d/${activeEpisode.youtubeId}/preview`;
                            }
                            setIsGDrivePlaying(true);
                            // Give Drive 3s to reload, then re-activate overlay
                            setGdriveReady(false);
                            if (gdriveTimerRef.current) clearTimeout(gdriveTimerRef.current);
                            gdriveTimerRef.current = setTimeout(() => {
                              setGdriveReady(true);
                              setIsGDrivePlaying(true);
                              handleMouseMove();
                            }, 3000);
                          }
                          handleMouseMove();
                        }}
                        onMouseMove={handleMouseMove}
                        onTouchStart={handleMouseMove}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 20,
                          cursor: 'pointer',
                          background: !isGDrivePlaying ? 'rgba(0,0,0,0.6)' : 'transparent'
                        }}
                      >
                        {/* Center Play/Pause Icon */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          opacity: showControls || !isGDrivePlaying ? 1 : 0,
                          transition: 'opacity 0.3s ease',
                          pointerEvents: 'none'
                        }}>
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.7)',
                            border: '2px solid rgba(255,255,255,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {isGDrivePlaying
                              ? <Pause size={28} color="#fff" />
                              : <Play size={28} color="#fff" style={{ marginLeft: '3px' }} />
                            }
                          </div>
                        </div>

                        {/* Bottom Controls Bar */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '12px 16px',
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: showControls ? 1 : 0,
                          transition: 'opacity 0.4s ease',
                          pointerEvents: showControls ? 'auto' : 'none'
                        }}>
                          {/* Play/Pause */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isGDrivePlaying) {
                                if (gdriveIframeRef.current) gdriveIframeRef.current.src = 'about:blank';
                                setIsGDrivePlaying(false);
                              } else {
                                if (gdriveIframeRef.current && activeEpisode) {
                                  gdriveIframeRef.current.src = `https://drive.google.com/file/d/${activeEpisode.youtubeId}/preview`;
                                }
                                setIsGDrivePlaying(true);
                                setGdriveReady(false);
                                if (gdriveTimerRef.current) clearTimeout(gdriveTimerRef.current);
                                gdriveTimerRef.current = setTimeout(() => {
                                  setGdriveReady(true);
                                  setIsGDrivePlaying(true);
                                  handleMouseMove();
                                }, 3000);
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
                          >
                            {isGDrivePlaying ? <Pause size={22} /> : <Play size={22} />}
                          </button>

                          {/* Fullscreen / Exit Fullscreen */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isFullscreen) { exitFullscreen(); } else { handleFullscreen(); }
                            }}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
                          >
                            {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* YouTube Player */
                  <>
                    {/* The actual YouTube iframe */}
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        transform: 'scale(1.05)'
                      }}
                    >
                      <div id="custom-youtube-player" style={{ width: '100%', height: '100%' }} />
                    </div>

                    {/* Clickable Transparent Shield */}
                    <div 
                      onClick={handlePlayPause}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 10,
                        cursor: 'pointer'
                      }}
                    />
                  </>
                )}

                {/* CUSTOM PLAYER INTERFACE OVERLAY (Only for YouTube, Google Drive has its own native bar) */}
                {!isGoogleDrive && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                    padding: '20px 24px 16px 24px',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    opacity: showControls ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                    pointerEvents: showControls ? 'auto' : 'none'
                  }}>
              {/* Custom Clickable Seek Progress Bar */}
              <div 
                onClick={handleProgressBarClick}
                style={{
                  width: '100%',
                  height: '10px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <div style={{
                  width: `${currentTimePct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--color-secondary-red), var(--color-primary-red))',
                  borderRadius: '5px'
                }} />
                {/* Glowing Circle Handle */}
                <div style={{
                  position: 'absolute',
                  left: `calc(${currentTimePct}% - 6px)`,
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 0 8px var(--color-primary-red)',
                  border: '2px solid var(--color-primary-red)'
                }} />
              </div>

              {/* Controls layout */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Play/Pause custom button */}
                  <button 
                    onClick={handlePlayPause} 
                    style={{ color: '#fff', display: 'flex', alignItems: 'center' }}
                  >
                    {isPlaying ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
                  </button>

                  {/* Custom Mute/Volume */}
                  <button onClick={handleMuteUnmute} style={{ color: '#fff' }}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>

                  {/* Fullscreen Button */}
                  <button onClick={handleFullscreen} style={{ color: '#fff', display: 'flex', alignItems: 'center' }} title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}>
                    {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                  </button>

                  {/* Timing Text */}
                  <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>
                    {formatVideoTime(currentSeconds)} / {formatVideoTime(durationSeconds)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid var(--color-neon-cyan)',
                    color: 'var(--color-neon-cyan)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <ShieldAlert size={12} />
                    Player Protegido
                  </span>
                  
                  {/* Exit player */}
                  <button 
                    onClick={() => {
                      cleanYTPlayer();
                      setActiveEpisode(null);
                    }}
                    style={{
                      fontSize: '0.8rem',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontWeight: 'bold'
                    }}
                  >
                    Sair do Player
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    })()
  ) : activeEpisode ? (
          /* Lock Panel for Locked Episode */
          <div style={{
            height: '350px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px',
            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            textAlign: 'center',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(163, 0, 255, 0.1)',
              border: '2px solid var(--color-neon-violet)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 0 15px rgba(163, 0, 255, 0.3)'
            }}>
              <Lock size={26} color="var(--color-neon-violet)" />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px', color: '#fff' }}>
              Episódio {activeEpisode.number}: {activeEpisode.title}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: '380px', marginBottom: '16px', fontSize: '0.85rem' }}>
              Este filme completo custa 1 crédito (R$ 1,00) para desbloqueio vitalício.
            </p>

            {unlockError && (
              <div style={{ color: 'var(--color-danger)', marginBottom: '12px', fontSize: '0.85rem', fontWeight: '500' }}>
                {unlockError}
                {unlockError.includes('insuficiente') && (
                  <button 
                    onClick={onRequireShop}
                    style={{ marginLeft: '6px', color: 'var(--color-neon-cyan)', textDecoration: 'underline', fontWeight: 'bold' }}
                  >
                    Recarregar
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setActiveEpisode(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}
              >
                Voltar
              </button>
              <button
                onClick={() => handleUnlock(activeEpisode.id)}
                className="btn-fire-glow"
                style={{
                  background: 'linear-gradient(45deg, var(--color-secondary-red), var(--color-primary-red))',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  boxShadow: '0 0 15px rgba(254, 0, 0, 0.4)'
                }}
              >
                <Coins size={14} />
                Desbloquear (1 CR)
              </button>
            </div>
          </div>
        ) : (
          /* Muted Autoplay Trailer Header */
          <div style={{ position: 'relative', height: '320px', background: '#000', overflow: 'hidden' }}>
            <iframe
              src={`https://www.youtube.com/embed/${item.trailerYoutubeId || 'YtD5-Ynfe3Y'}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${item.trailerYoutubeId || 'YtD5-Ynfe3Y'}&controls=0&modestbranding=1&showinfo=0&rel=0`}
              title="Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              style={{
                position: 'absolute',
                top: '-40px',
                left: 0,
                width: '100%',
                height: 'calc(100% + 80px)',
                pointerEvents: 'none'
              }}
            />
            {/* Dark gradient overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(to bottom, rgba(8, 5, 17, 0.1) 60%, var(--bg-primary) 100%), linear-gradient(to right, rgba(8, 5, 17, 0.8) 30%, transparent 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '20px 24px'
            }}>
              <div style={{ zIndex: 10, maxWidth: '550px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(254, 0, 0, 0.2)',
                    border: '1px solid var(--color-primary-red)',
                    color: 'var(--color-primary-red)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    {item.category}
                  </span>
                  
                  {currentUser && (
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: '1px solid var(--glass-border)',
                        color: isFav ? 'var(--color-primary-red)' : '#fff',
                        padding: '3px 8px',
                        borderRadius: '15px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      {isFav ? <Check size={10} /> : <Plus size={10} />}
                      {isFav ? 'Na Lista' : 'Minha Lista'}
                    </button>
                  )}
                </div>

                <h2 style={{ fontSize: '1.8rem', fontWeight: 950, margin: 0, textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
                  {item.title}
                </h2>
              </div>
            </div>

            {/* Mute/Unmute */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: 'rgba(8, 5, 17, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                borderRadius: '30px',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        )}

        {/* Episode/Movie Action List */}
        <div style={{ padding: '24px' }}>
          {/* Dedicated Synopsis Section */}
          <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-neon-cyan)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Sinopse</h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
              {item.description}
            </p>
          </div>
          {item.type === 'Filme' ? (
            /* Layout for MOVIE */
            <div>
              {item.episodes && item.episodes[0] ? (
                (() => {
                  const filmEp = item.episodes[0];
                  const unlocked = isEpisodeUnlocked(filmEp.id);
                  const progress = getEpisodeProgress(filmEp.id);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Assistir Filme Completo</h3>
                      {unlocked ? (
                        <button
                          onClick={() => handleSelectEpisode(filmEp)}
                          style={{
                            background: 'linear-gradient(45deg, var(--color-neon-cyan), var(--color-neon-violet))',
                            color: '#fff',
                            padding: '12px 30px',
                            borderRadius: '24px',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)'
                          }}
                        >
                          <Play size={18} fill="#fff" />
                          {progress > 0 ? `Continuar Assistindo (${progress}%)` : 'Começar a Assistir'}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Este filme requer 1 crédito para ser desbloqueado.</p>
                          <button
                            onClick={() => handleUnlock(filmEp.id)}
                            style={{
                              background: 'linear-gradient(45deg, #ff0055, var(--color-neon-violet))',
                              color: '#fff',
                              padding: '10px 24px',
                              borderRadius: '24px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              boxShadow: '0 0 10px rgba(255, 0, 85, 0.3)'
                            }}
                          >
                            <Lock size={16} />
                            Desbloquear Filme (1 Crédito)
                          </button>
                          {unlockError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{unlockError}</p>}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Nenhum vídeo cadastrado para este filme ainda.
                </div>
              )}
            </div>
          ) : (
            /* Layout for SERIES (Seasons & Episodes) */
            <div>
              {/* Season Selection Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginRight: '8px' }}>Temporadas:</span>
                {(item.seasons && item.seasons.length > 0 ? item.seasons : [1]).map((sNum) => (
                  <button
                    key={sNum}
                    onClick={() => setSelectedSeason(sNum)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: selectedSeason === sNum ? 'rgba(163, 0, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selectedSeason === sNum ? 'var(--color-neon-violet)' : 'var(--glass-border)'}`,
                      color: selectedSeason === sNum ? 'var(--color-neon-violet)' : '#fff',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    T. {sNum}
                  </button>
                ))}
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
                Episódios - Temporada {selectedSeason}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  const filteredEpisodes = item.episodes 
                    ? item.episodes.filter(ep => (ep.season || 1) === selectedSeason)
                    : [];

                  if (filteredEpisodes.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Nenhum episódio cadastrado nesta temporada ainda.
                      </div>
                    );
                  }

                  return filteredEpisodes.map((ep) => {
                    const unlocked = isEpisodeUnlocked(ep.id);
                    const isActive = activeEpisode?.id === ep.id;
                    const progress = getEpisodeProgress(ep.id);

                    return (
                      <div
                        key={ep.id}
                        onClick={() => handleSelectEpisode(ep)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isActive ? 'rgba(0, 240, 255, 0.05)' : 'var(--bg-secondary)',
                          border: `1px solid ${isActive ? 'var(--color-neon-cyan)' : 'var(--glass-border)'}`,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {/* Episode Thumbnail & Progress Overlay */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                          <div style={{
                            width: '100px',
                            height: '60px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            position: 'relative',
                            background: '#1a1a1a'
                          }}>
                            <img 
                              src={ep.thumbnail} 
                              alt={ep.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              background: 'rgba(0,0,0,0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {unlocked ? (
                                <Play size={16} fill="#fff" color="#fff" />
                              ) : (
                                <Lock size={16} color="var(--color-neon-violet)" />
                              )}
                            </div>
                          </div>
                          
                          {/* Watch Progress Bar */}
                          {progress > 0 && (
                            <div style={{ width: '100px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: progress === 100 ? 'var(--color-success)' : 'var(--color-neon-cyan)'
                              }} />
                            </div>
                          )}
                        </div>

                        {/* Episode Meta */}
                        <div style={{ flexGrow: 1 }}>
                          <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                            Episódio {ep.number}: {ep.title}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              color: unlocked ? 'var(--color-success)' : 'var(--color-neon-cyan)',
                              textTransform: 'uppercase'
                            }}>
                              {unlocked ? 'Desbloqueado' : 'Requer 1 crédito'}
                            </span>
                            {progress > 0 && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                                &bull; {progress === 100 ? 'Assistido' : `${progress}% concluído`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick unlock button if locked */}
                        {!unlocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlock(ep.id);
                            }}
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.8rem',
                              background: 'rgba(163,0,255,0.1)',
                              border: '1px solid var(--color-neon-violet)',
                              borderRadius: '4px',
                              color: '#fff',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            Liberar
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
