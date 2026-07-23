import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Play, Pause, Lock, Coins, Plus, Check, Volume2, VolumeX, Maximize2, Minimize2, ShieldAlert, ArrowLeft, ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';

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

  // Calculate current season episodes for Next/Prev navigation
  const currentSeasonEps = item.episodes 
    ? item.episodes
        .filter(ep => (parseInt(ep.season, 10) || 1) === parseInt(activeEpisode?.season || selectedSeason, 10))
        .sort((a, b) => (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0))
    : [];

  const currentEpIndex = activeEpisode ? currentSeasonEps.findIndex(e => e.id === activeEpisode.id) : -1;
  const prevEp = currentEpIndex > 0 ? currentSeasonEps[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex >= 0 && currentEpIndex < currentSeasonEps.length - 1 ? currentSeasonEps[currentEpIndex + 1] : null;

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
      padding: 0
    }}>
      <div 
        className="glass mobile-fullscreen-modal"
        style={{
          width: '100%',
          maxWidth: activeEpisode ? '1050px' : '850px',
          height: '92vh',
          borderRadius: '12px',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 0 30px rgba(163, 0, 255, 0.25)',
          backgroundColor: 'var(--bg-primary)',
          transition: 'all 0.3s ease'
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Close Modal Button */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            color: '#fff',
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid var(--glass-border)',
            padding: '8px',
            borderRadius: '50%',
            cursor: 'pointer'
          }}
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* ======================================================== */}
        {/* SCREEN 2: DEDICATED VIDEO PLAYER SCREEN (TELA DO VÍDEO)  */}
        {/* ======================================================== */}
        {activeEpisode ? (
          <div>
            {/* Player Top Navigation Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--glass-border)',
              background: 'rgba(10, 5, 25, 0.9)',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setActiveEpisode(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(0, 240, 255, 0.08)',
                  border: '1px solid var(--color-neon-cyan)',
                  color: 'var(--color-neon-cyan)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <ArrowLeft size={16} />
                Voltar para os episódios
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, justifyContent: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>{item.title}</span>
                <span style={{ fontSize: '0.75rem', background: 'var(--color-neon-violet)', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                  T.{activeEpisode.season || selectedSeason} Ep.{activeEpisode.number} - {activeEpisode.title}
                </span>
              </div>
            </div>

            {/* Video Player Box or Lock Screen */}
            {isEpisodeUnlocked(activeEpisode.id) ? (
              (() => {
                const bunnyLibraryId = import.meta.env.VITE_BUNNY_LIBRARY_ID || '711399';
                const rawId = (activeEpisode.youtubeId || '').trim();

                const isGoogleDriveUrl = rawId.includes('drive.google.com') || rawId.includes('/file/d/');
                const isYouTubeUrl = rawId.includes('youtube.com') || rawId.includes('youtu.be');

                let cleanVideoId = rawId;
                if (isGoogleDriveUrl) {
                  const match = rawId.match(/\/file\/d\/([^\/]+)/);
                  if (match && match[1]) cleanVideoId = match[1];
                } else if (isYouTubeUrl) {
                  const match = rawId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                  if (match && match[1]) cleanVideoId = match[1];
                }

                const isBunnyStream = !isGoogleDriveUrl && !isYouTubeUrl && (cleanVideoId.length === 36 || (cleanVideoId.includes('-') && cleanVideoId.length > 20) || activeEpisode.isBunny);
                const isGoogleDrive = isGoogleDriveUrl || (!isBunnyStream && !isYouTubeUrl && cleanVideoId.length > 15);

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
                      /* 100% Native Bunny Stream Player */
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                        <iframe
                          src={`https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${cleanVideoId}?autoplay=true&loop=false&muted=false&preload=true`}
                          loading="lazy"
                          style={{
                            border: 'none',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%'
                          }}
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen *; display-capture"
                          allowFullScreen={true}
                          webkitallowfullscreen="true"
                          mozallowfullscreen="true"
                        />

                        {/* Hidden Fullscreen Helper Trigger */}
                        <button
                          id="bunny-hidden-fullscreen-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isFullscreen) {
                              exitFullscreen();
                            } else {
                              handleFullscreen();
                            }
                          }}
                          style={{
                            position: 'absolute',
                            left: '-9999px',
                            top: '-9999px',
                            width: '1px',
                            height: '1px',
                            opacity: 0,
                            pointerEvents: 'none',
                            visibility: 'hidden'
                          }}
                          aria-hidden="true"
                          tabIndex="-1"
                        />
                      </div>
                    ) : isGoogleDrive ? (
                      /* Google Drive Player */
                      <>
                        <div className="gdrive-player-crop">
                          <iframe
                            ref={gdriveIframeRef}
                            src={`https://drive.google.com/file/d/${cleanVideoId}/preview`}
                            className="gdrive-iframe"
                            style={{
                              width: '100%',
                              height: '100%',
                              border: 'none'
                            }}
                            allow="autoplay"
                            onLoad={() => {
                              if (gdriveTimerRef.current) clearTimeout(gdriveTimerRef.current);
                              gdriveTimerRef.current = setTimeout(() => {
                                setGdriveReady(true);
                                setIsGDrivePlaying(true);
                                handleMouseMove();
                              }, 3000);
                            }}
                          />
                        </div>

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
                              Carregando vídeo...
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* YouTube Player API */
                      <>
                        <div id="custom-youtube-player" style={{ width: '100%', height: '100%' }} />
                      </>
                    )}
                  </div>
                );
              })()
            ) : (
              /* Locked Episode Card */
              <div style={{
                position: 'relative',
                height: '350px',
                background: 'linear-gradient(135deg, #110525, #080511)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center'
              }}>
                <ShieldAlert size={54} color="var(--color-primary-red)" style={{ marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem' }}>Episódio Bloqueado</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', maxWidth: '420px', marginBottom: '20px' }}>
                  O Episódio {activeEpisode.number} ({activeEpisode.title}) requer 1 crédito para ser liberado.
                </p>
                {unlockError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', margin: '-10px 0 16px 0' }}>{unlockError}</p>}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setActiveEpisode(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--glass-border)',
                      color: '#fff',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Voltar aos episódios
                  </button>
                  <button
                    onClick={() => handleUnlock(activeEpisode.id)}
                    className="btn-fire-glow"
                    style={{
                      background: 'linear-gradient(45deg, var(--color-secondary-red), var(--color-primary-red))',
                      color: '#fff',
                      padding: '10px 24px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.9rem',
                      boxShadow: '0 0 15px rgba(254, 0, 0, 0.4)',
                      cursor: 'pointer'
                    }}
                  >
                    <Coins size={16} />
                    Desbloquear Episódio (1 CR)
                  </button>
                </div>
              </div>
            )}

            {/* Quick Binge Navigation Controls Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid var(--glass-border)',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                disabled={!prevEp}
                onClick={() => prevEp && handleSelectEpisode(prevEp)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: prevEp ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${prevEp ? 'var(--color-neon-cyan)' : 'rgba(255,255,255,0.05)'}`,
                  color: prevEp ? '#fff' : 'var(--color-text-secondary)',
                  cursor: prevEp ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}
              >
                <SkipBack size={16} />
                Episódio Anterior
              </button>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neon-cyan)', fontWeight: 'bold' }}>
                  Episódio {activeEpisode.number} de {currentSeasonEps.length}
                </span>
              </div>

              <button
                disabled={!nextEp}
                onClick={() => nextEp && handleSelectEpisode(nextEp)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '20px',
                  background: nextEp ? 'linear-gradient(45deg, var(--color-neon-cyan), var(--color-neon-violet))' : 'rgba(255,255,255,0.02)',
                  border: 'none',
                  color: nextEp ? '#fff' : 'var(--color-text-secondary)',
                  cursor: nextEp ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  boxShadow: nextEp ? '0 0 12px rgba(0, 240, 255, 0.3)' : 'none'
                }}
              >
                Próximo Episódio
                <SkipForward size={16} />
              </button>
            </div>

            {/* Quick Episode Selector Drawer */}
            <div style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '14px', fontWeight: 'bold' }}>
                Outros episódios desta temporada:
              </h4>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px' }}>
                {currentSeasonEps.map((ep) => {
                  const unlocked = isEpisodeUnlocked(ep.id);
                  const isCurrent = ep.id === activeEpisode.id;
                  const progress = getEpisodeProgress(ep.id);

                  return (
                    <div
                      key={ep.id}
                      onClick={() => handleSelectEpisode(ep)}
                      style={{
                        width: '140px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: isCurrent ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isCurrent ? 'var(--color-neon-cyan)' : 'var(--glass-border)'}`,
                        padding: '8px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: '100%',
                        height: '75px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#1a1a1a',
                        marginBottom: '6px'
                      }}>
                        <img 
                          src={ep.thumbnail || item.cover} 
                          alt="" 
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
                          {unlocked ? <Play size={16} fill="#fff" color="#fff" /> : <Lock size={16} color="var(--color-neon-violet)" />}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Ep {ep.number}: {ep.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* SCREEN 1: DORAMA OVERVIEW & DETAILS SCREEN               */
          /* ======================================================== */
          <div>
            {/* Banner Header with Trailer or Cover */}
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
                background: 'linear-gradient(to bottom, rgba(8, 5, 17, 0.1) 50%, var(--bg-primary) 100%), linear-gradient(to right, rgba(8, 5, 17, 0.8) 30%, transparent 100%)',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '20px 24px'
              }}>
                <div style={{ zIndex: 10, maxWidth: '550px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {(item.categories || (item.category ? item.category.split(',').map(c => c.trim()) : ['Dorama'])).map(cat => (
                      <span key={cat} style={{
                        background: 'rgba(254, 0, 0, 0.2)',
                        border: '1px solid var(--color-primary-red)',
                        color: 'var(--color-primary-red)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {cat}
                      </span>
                    ))}
                    
                    <span style={{
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid var(--color-neon-cyan)',
                      color: 'var(--color-neon-cyan)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      📅 {item.year || '2026'}
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

              {/* Mute/Unmute Trailer Button */}
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

            {/* Dorama Details & Episodes List */}
            <div style={{ padding: '24px' }}>
              {/* Synopsis Section */}
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--color-neon-cyan)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Sinopse</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                  {item.description}
                </p>
              </div>

              {item.type === 'Filme' ? (
                /* MOVIE Layout */
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
                /* SERIES Layout (Seasons & Episodes) */
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
                        ? item.episodes
                            .filter(ep => (parseInt(ep.season, 10) || 1) === parseInt(selectedSeason, 10))
                            .sort((a, b) => (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0))
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
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--glass-border)',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {/* Episode Thumbnail */}
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
                                  src={ep.thumbnail || item.cover} 
                                  alt={ep.title}
                                  onError={(e) => { e.target.src = item.cover; }}
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

                            {/* Assistir / Unlock Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (unlocked) {
                                  handleSelectEpisode(ep);
                                } else {
                                  handleUnlock(ep.id);
                                }
                              }}
                              style={{
                                padding: '8px 16px',
                                fontSize: '0.85rem',
                                background: unlocked ? 'linear-gradient(45deg, var(--color-neon-cyan), var(--color-neon-violet))' : 'rgba(163,0,255,0.1)',
                                border: unlocked ? 'none' : '1px solid var(--color-neon-violet)',
                                borderRadius: '20px',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {unlocked ? <Play size={14} fill="#fff" /> : <Lock size={14} />}
                              {unlocked ? 'Assistir' : 'Liberar'}
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
