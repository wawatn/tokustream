import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const AppContext = createContext();

const INITIAL_CATALOG = [];

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('tokustream_users');
    return saved ? JSON.parse(saved) : [{ username: 'admin', password: '123', isAdmin: true, credits: 9999 }];
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('tokustream_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [catalog, setCatalog] = useState(() => {
    const saved = localStorage.getItem('tokustream_catalog');
    return saved ? JSON.parse(saved) : INITIAL_CATALOG;
  });

  const [unlockedEpisodes, setUnlockedEpisodes] = useState(() => {
    const saved = localStorage.getItem('tokustream_unlocked_episodes');
    return saved ? JSON.parse(saved) : {};
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('tokustream_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [myList, setMyList] = useState(() => {
    const saved = localStorage.getItem('tokustream_mylist');
    return saved ? JSON.parse(saved) : {};
  });

  const [watchProgress, setWatchProgress] = useState(() => {
    const saved = localStorage.getItem('tokustream_progress');
    return saved ? JSON.parse(saved) : {};
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [dbCategories, setDbCategories] = useState(() => {
    const saved = localStorage.getItem('tokustream_categories');
    return saved ? JSON.parse(saved) : ['Ação', 'Drama', 'Romance', 'Comédia', 'Policial', 'Artes Marciais', 'Paródia'];
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Supabase Auth Session Listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user profile from Supabase profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: profile.id,
            email: session.user.email,
            username: profile.username || session.user.email.split('@')[0],
            isAdmin: profile.is_admin || false,
            credits: profile.credits || 0
          });
        } else {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            username: session.user.email.split('@')[0],
            isAdmin: false,
            credits: 0
          });
        }
      } else {
        // Keep admin local user fallback if manually logged in
        setCurrentUser(prev => (prev?.isAdmin && !prev?.id ? prev : null));
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const getStoredEpThumbnails = () => {
    try {
      return JSON.parse(localStorage.getItem('tokustream_ep_thumbnails') || '{}');
    } catch (e) {
      return {};
    }
  };

  const saveEpThumbnail = (key, thumbUrl) => {
    try {
      const stored = getStoredEpThumbnails();
      if (thumbUrl) {
        stored[key] = thumbUrl;
      } else {
        delete stored[key];
      }
      localStorage.setItem('tokustream_ep_thumbnails', JSON.stringify(stored));
    } catch (e) {}
  };

  // Load catalog and episodes from Supabase Cloud DB
  const fetchCatalogFromSupabase = async () => {
    try {
      const { data: catData, error: catError } = await supabase
        .from('catalog')
        .select('*');

      if (!catError && catData && catData.length > 0) {
        const { data: epData } = await supabase
          .from('episodes')
          .select('*');

        const storedThumbs = getStoredEpThumbnails();
        setCatalog(prev => {
          return catData.map(item => {
            const seriesEpsFromDb = (epData || [])
              .filter(ep => ep.catalog_id === item.id)
              .map(ep => {
                const epNum = parseInt(ep.episode_number, 10) || 1;
                const seasonNum = parseInt(ep.season_number, 10) || 1;
                const thumbKey = `${item.id}-s${seasonNum}-ep${epNum}`;
                const foundThumb = ep.thumbnail_url || ep.thumbnail || storedThumbs[ep.id] || storedThumbs[thumbKey] || storedThumbs[`${item.id}-ep-${epNum}`] || null;

                return {
                  id: ep.id,
                  number: epNum,
                  title: ep.title,
                  youtubeId: ep.video_id,
                  season: seasonNum,
                  thumbnail: foundThumb
                };
              });

            const existingSeries = prev.find(s => s.id === item.id);
            const existingLocalEps = existingSeries ? (existingSeries.episodes || []) : [];

            const mergedMap = new Map();
            existingLocalEps.forEach(e => {
              const key = `${e.season || 1}-${e.number}`;
              mergedMap.set(key, e);
            });
            seriesEpsFromDb.forEach(e => {
              const key = `${e.season || 1}-${e.number}`;
              mergedMap.set(key, { ...mergedMap.get(key), ...e });
            });

            const mergedEpisodes = Array.from(mergedMap.values()).sort((a, b) => (a.number || 0) - (b.number || 0));

            const epSeasons = mergedEpisodes.map(e => e.season || 1);
            let seasonsList = [1];
            if (item.seasons) {
              if (Array.isArray(item.seasons) && item.seasons.length > 0) {
                seasonsList = item.seasons;
              } else if (typeof item.seasons === 'string') {
                try { seasonsList = JSON.parse(item.seasons); } catch(e){}
              }
            } else {
              seasonsList = Array.from(new Set([1, ...epSeasons])).sort((a, b) => a - b);
            }

            const catStr = item.category || 'Ação';
            const catList = catStr.includes(',') ? catStr.split(',').map(c => c.trim()).filter(Boolean) : [catStr.trim()];

            return {
              id: item.id,
              title: item.title,
              description: item.description,
              category: catList[0] || 'Ação',
              categories: catList,
              cover: item.cover_url,
              cover_url: item.cover_url,
              trailerYoutubeId: item.trailer_url || 'YtD5-Ynfe3Y',
              type: item.type || 'Série',
              year: item.year || '2026',
              rating: item.rating || '9.5',
              seasons: seasonsList,
              episodes: mergedEpisodes
            };
          });
        });
      }
    } catch (err) {
      console.error('Erro ao buscar catálogo no Supabase:', err);
    }
  };

  useEffect(() => {
    fetchCatalogFromSupabase();
  }, []);

  // Connect to local database server via Vite proxy as fallback
  useEffect(() => {
    fetch('/api/db')
      .then(res => res.json())
      .then(data => {
        if (data && data.catalog && data.catalog.length > 0) {
          setCatalog(prev => prev.length > 0 ? prev : data.catalog);
          if (data.users && data.users.length > 0) setUsers(data.users);
          if (data.categories && data.categories.length > 0) setDbCategories(data.categories);
          if (data.unlockedEpisodes) setUnlockedEpisodes(data.unlockedEpisodes);
          if (data.transactions) setTransactions(data.transactions);
          if (data.myList) setMyList(data.myList);
          if (data.watchProgress) setWatchProgress(data.watchProgress);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const syncToServer = (newDb) => {
    if (!isLoaded) return;
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDb)
    }).catch(() => {});
  };

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('tokustream_users', JSON.stringify(users));
    localStorage.setItem('tokustream_catalog', JSON.stringify(catalog));
    localStorage.setItem('tokustream_categories', JSON.stringify(dbCategories));
    localStorage.setItem('tokustream_unlocked_episodes', JSON.stringify(unlockedEpisodes));
    localStorage.setItem('tokustream_transactions', JSON.stringify(transactions));
    localStorage.setItem('tokustream_mylist', JSON.stringify(myList));
    localStorage.setItem('tokustream_progress', JSON.stringify(watchProgress));

    syncToServer({ catalog, users, categories: dbCategories, unlockedEpisodes, transactions, myList, watchProgress });
  }, [isLoaded, catalog, users, dbCategories, unlockedEpisodes, transactions, myList, watchProgress]);

  useEffect(() => {
    localStorage.setItem('tokustream_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const registerUser = async (email, password, username) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });

      if (error) {
        return { success: false, message: error.message };
      }

      const userId = data?.user?.id;
      if (userId) {
        // Insert/upsert profile row into Supabase profiles table
        try {
          await supabase.from('profiles').upsert({
            id: userId,
            username: username || email.split('@')[0],
            credits: 0,
            is_admin: false
          });
        } catch (pe) {}

        const newUserObj = {
          id: userId,
          email,
          username: username || email.split('@')[0],
          isAdmin: false,
          credits: 0
        };
        
        if (data.session) {
          setCurrentUser(newUserObj);
        }
      }

      return { 
        success: true, 
        autoLoggedIn: !!data?.session,
        message: 'Conta criada com sucesso! Seja bem-vindo ao Tokustream.' 
      };
    } catch (err) {
      return { success: false, message: 'Erro ao se conectar com o servidor.' };
    }
  };

  const loginUser = async (email, password) => {
    if (email === 'admin' || email === 'admin@tokustream.com') {
      const adminUser = users.find(u => u.username === 'admin' && u.password === password);
      if (adminUser) {
        setCurrentUser(adminUser);
        return { success: true };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          return { success: false, message: 'Por favor, confirme seu e-mail na caixa de entrada antes de fazer login na plataforma.' };
        }
        return { success: false, message: 'E-mail ou senha inválidos.' };
      }

      return { success: true };
    } catch (err) {
      const user = users.find(u => (u.email === email || u.username === email) && u.password === password);
      if (user) {
        setCurrentUser(user);
        return { success: true };
      }
      return { success: false, message: 'E-mail ou senha incorretos.' };
    }
  };

  const logoutUser = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {}
    setCurrentUser(null);
  };

  const addCredits = (amount) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, credits: currentUser.credits + amount };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.username === currentUser.username ? updatedUser : u));

    setTransactions([
      ...transactions,
      {
        id: Date.now(),
        type: 'purchase',
        username: currentUser.username,
        credits: amount,
        amountInBrl: amount,
        date: new Date().toISOString()
      }
    ]);
  };

  const unlockEpisode = (episodeId) => {
    if (!currentUser) return { success: false, message: 'Faça login para desbloquear!' };
    
    const userUnlocked = unlockedEpisodes[currentUser.username] || [];
    if (userUnlocked.includes(episodeId)) return { success: true };

    if (currentUser.credits < 1) {
      return { success: false, message: 'Saldo de créditos insuficiente! Recarregue seus créditos.' };
    }

    const updatedUser = { ...currentUser, credits: currentUser.credits - 1 };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.username === currentUser.username ? updatedUser : u));

    setUnlockedEpisodes({
      ...unlockedEpisodes,
      [currentUser.username]: [...userUnlocked, episodeId]
    });

    setTransactions([
      ...transactions,
      {
        id: Date.now(),
        type: 'unlock',
        username: currentUser.username,
        credits: 1,
        episodeId,
        date: new Date().toISOString()
      }
    ]);

    return { success: true };
  };

  const isEpisodeUnlocked = (episodeId) => {
    if (!currentUser) return false;
    if (currentUser.isAdmin) return true;
    const userUnlocked = unlockedEpisodes[currentUser.username] || [];
    return userUnlocked.includes(episodeId);
  };

  const toggleFavorite = (seriesId) => {
    if (!currentUser) return;
    const userFavs = myList[currentUser.username] || [];
    const isFav = userFavs.includes(seriesId);
    
    const updatedFavs = isFav
      ? userFavs.filter(id => id !== seriesId)
      : [...userFavs, seriesId];

    setMyList({
      ...myList,
      [currentUser.username]: updatedFavs
    });
  };

  const isSeriesFavorite = (seriesId) => {
    if (!currentUser) return false;
    const userFavs = myList[currentUser.username] || [];
    return userFavs.includes(seriesId);
  };

  const updateWatchProgress = (episodeId, percentage) => {
    if (!currentUser) return;
    const userProgress = watchProgress[currentUser.username] || {};
    setWatchProgress({
      ...watchProgress,
      [currentUser.username]: {
        ...userProgress,
        [episodeId]: percentage
      }
    });
  };

  const getEpisodeProgress = (episodeId) => {
    if (!currentUser) return 0;
    const userProgress = watchProgress[currentUser.username] || {};
    return userProgress[episodeId] || 0;
  };

  const addSeries = async (series) => {
    const safeId = `${series.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const catStr = Array.isArray(series.categories) 
      ? series.categories.join(', ') 
      : (series.category || 'Ação');
    const catList = Array.isArray(series.categories) 
      ? series.categories 
      : (catStr.includes(',') ? catStr.split(',').map(c => c.trim()).filter(Boolean) : [catStr.trim()]);

    const newSeries = {
      ...series,
      id: safeId,
      category: catList[0] || 'Ação',
      categories: catList,
      cover: series.cover || series.cover_url,
      cover_url: series.cover || series.cover_url,
      type: series.type || 'Série',
      year: series.year || '2026',
      seasons: series.type === 'Série' ? [1] : [],
      trailerYoutubeId: series.trailerYoutubeId || 'YtD5-Ynfe3Y',
      episodes: []
    };

    setCatalog(prev => [newSeries, ...prev]);

    // Insert into Supabase catalog table
    try {
      await supabase.from('catalog').insert({
        title: series.title,
        description: series.description,
        category: catStr,
        cover_url: series.cover || series.cover_url,
        trailer_url: series.trailerYoutubeId,
        type: series.type || 'Série',
        year: series.year || '2026',
        rating: series.rating || '9.5'
      });
      fetchCatalogFromSupabase();
    } catch (err) {
      console.error('Erro ao salvar no Supabase:', err);
    }

    return safeId;
  };

  const editSeries = async (seriesId, updatedData) => {
    const catStr = Array.isArray(updatedData.categories) 
      ? updatedData.categories.join(', ') 
      : (updatedData.category || 'Ação');
    const catList = Array.isArray(updatedData.categories) 
      ? updatedData.categories 
      : (catStr.includes(',') ? catStr.split(',').map(c => c.trim()).filter(Boolean) : [catStr.trim()]);

    setCatalog(prev => prev.map(s => {
      if (s.id === seriesId) {
        return {
          ...s,
          title: updatedData.title,
          description: updatedData.description,
          category: catList[0] || 'Ação',
          categories: catList,
          cover: updatedData.cover || updatedData.cover_url,
          cover_url: updatedData.cover || updatedData.cover_url,
          trailerYoutubeId: updatedData.trailerYoutubeId || s.trailerYoutubeId,
          type: updatedData.type || s.type || 'Série',
          year: updatedData.year || '2026',
          rating: updatedData.rating || '9.5'
        };
      }
      return s;
    }));

    try {
      await supabase.from('catalog').update({
        title: updatedData.title,
        description: updatedData.description,
        category: catStr,
        cover_url: updatedData.cover || updatedData.cover_url,
        trailer_url: updatedData.trailerYoutubeId,
        type: updatedData.type || 'Série',
        year: updatedData.year || '2026',
        rating: updatedData.rating || '9.5'
      }).eq('id', seriesId);
      fetchCatalogFromSupabase();
    } catch (err) {
      console.error('Erro ao editar série no Supabase:', err);
    }
  };

  const deleteSeries = async (seriesId) => {
    setCatalog(prev => prev.filter(s => s.id !== seriesId));
    try {
      await supabase.from('catalog').delete().eq('id', seriesId);
      fetchCatalogFromSupabase();
    } catch (err) {}
  };

  const addEpisode = async (seriesId, episode) => {
    const epId = episode.id || `${seriesId}-ep-${Date.now()}`;
    const seasonNum = episode.season ? parseInt(episode.season, 10) : 1;
    const epNum = parseInt(episode.number, 10) || 1;
    const thumb = episode.thumbnail || null;

    if (thumb) {
      saveEpThumbnail(epId, thumb);
      saveEpThumbnail(`${seriesId}-s${seasonNum}-ep${epNum}`, thumb);
    }

    const newEpisode = {
      ...episode,
      id: epId,
      season: seasonNum,
      number: epNum,
      thumbnail: thumb
    };

    setCatalog(prev => prev.map(s => {
      if (s.id === seriesId) {
        return {
          ...s,
          episodes: [...(s.episodes || []), newEpisode]
        };
      }
      return s;
    }));

    // Insert into Supabase episodes table gracefully
    try {
      let { error } = await supabase.from('episodes').insert({
        catalog_id: seriesId,
        season_number: seasonNum,
        episode_number: epNum,
        title: episode.title || `Episódio ${epNum}`,
        video_id: episode.youtubeId || episode.video_id || '',
        thumbnail_url: thumb
      });

      if (error && error.message && error.message.includes('thumbnail_url')) {
        const res = await supabase.from('episodes').insert({
          catalog_id: seriesId,
          season_number: seasonNum,
          episode_number: epNum,
          title: episode.title || `Episódio ${epNum}`,
          video_id: episode.youtubeId || episode.video_id || ''
        });
        error = res.error;
      }

      if (error) {
        console.error('Aviso ao salvar episódio no Supabase (mantido localmente):', error);
      } else {
        fetchCatalogFromSupabase();
      }
    } catch (err) {
      console.error('Erro ao salvar episódio no Supabase:', err);
    }
  };

  const editEpisode = async (seriesId, episodeId, updatedEpisode) => {
    const seasonNum = updatedEpisode.season ? parseInt(updatedEpisode.season, 10) : 1;
    const epNum = parseInt(updatedEpisode.number, 10) || 1;
    const thumb = updatedEpisode.thumbnail || null;

    saveEpThumbnail(episodeId, thumb);
    if (epNum) {
      saveEpThumbnail(`${seriesId}-s${seasonNum}-ep${epNum}`, thumb);
    }

    setCatalog(prev => prev.map(s => {
      if (s.id === seriesId) {
        return {
          ...s,
          episodes: (s.episodes || []).map(ep => 
            ep.id === episodeId
              ? {
                  ...ep,
                  title: updatedEpisode.title,
                  number: epNum,
                  youtubeId: updatedEpisode.youtubeId,
                  thumbnail: thumb,
                  season: seasonNum
                }
              : ep
          )
        };
      }
      return s;
    }));

    try {
      let { error } = await supabase.from('episodes').update({
        season_number: seasonNum,
        episode_number: epNum,
        title: updatedEpisode.title,
        video_id: updatedEpisode.youtubeId,
        thumbnail_url: thumb
      }).eq('id', episodeId);

      if (error && error.message && error.message.includes('thumbnail_url')) {
        const res = await supabase.from('episodes').update({
          season_number: seasonNum,
          episode_number: epNum,
          title: updatedEpisode.title,
          video_id: updatedEpisode.youtubeId
        }).eq('id', episodeId);
        error = res.error;
      }

      if (error) {
        console.error('Aviso ao editar episódio no Supabase (mantido localmente):', error);
      } else {
        fetchCatalogFromSupabase();
      }
    } catch (err) {
      console.error('Erro ao editar episódio no Supabase:', err);
    }
  };

  const deleteEpisode = async (seriesId, episodeId) => {
    setCatalog(prev => prev.map(s => {
      if (s.id === seriesId) {
        return {
          ...s,
          episodes: (s.episodes || []).filter(ep => ep.id !== episodeId)
        };
      }
      return s;
    }));

    try {
      await supabase.from('episodes').delete().eq('id', episodeId);
      fetchCatalogFromSupabase();
    } catch (err) {}
  };

  const addSeason = async (seriesId) => {
    let newSeasonsList = [1];
    setCatalog(prev => prev.map(s => {
      if (s.id === seriesId) {
        const seasons = s.seasons || [1];
        const nextSeason = seasons.length > 0 ? Math.max(...seasons) + 1 : 1;
        newSeasonsList = [...seasons, nextSeason];
        return {
          ...s,
          seasons: newSeasonsList
        };
      }
      return s;
    }));

    try {
      await supabase.from('catalog').update({ seasons: newSeasonsList }).eq('id', seriesId);
    } catch (err) {}
  };

  const deleteSeason = async (seriesId, seasonNumber) => {
    let newSeasonsList = [1];
    setCatalog(prev => prev.map(s => {
      if (s.id === seriesId) {
        const remainingSeasons = (s.seasons || [1]).filter(sn => sn !== seasonNumber);
        newSeasonsList = remainingSeasons.length > 0 ? remainingSeasons : [1];
        return {
          ...s,
          seasons: newSeasonsList,
          episodes: (s.episodes || []).filter(ep => (ep.season || 1) !== seasonNumber)
        };
      }
      return s;
    }));

    try {
      await supabase.from('catalog').update({ seasons: newSeasonsList }).eq('id', seriesId);
      await supabase.from('episodes').delete().eq('catalog_id', seriesId).eq('season_number', seasonNumber);
      fetchCatalogFromSupabase();
    } catch (err) {
      console.error('Erro ao remover temporada no Supabase:', err);
    }
  };



  const addDbCategory = (newCat) => {
    if (newCat && !dbCategories.includes(newCat)) {
      setDbCategories([...dbCategories, newCat]);
    }
  };

  const deleteDbCategory = (catToDelete) => {
    setDbCategories(dbCategories.filter(c => c !== catToDelete));
  };

  const resetCatalogToDefault = () => {
    setCatalog(INITIAL_CATALOG);
  };

  const [mpConfig, setMpConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('tokustream_mp_config');
      return saved ? JSON.parse(saved) : { accessToken: '', publicKey: '' };
    } catch(e) {
      return { accessToken: '', publicKey: '' };
    }
  });

  useEffect(() => {
    supabase.from('app_config').select('*').eq('key', 'mp_config').single()
      .then(({ data }) => {
        if (data && data.value) {
          try {
            const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            if (parsed && parsed.accessToken) {
              setMpConfig(parsed);
              localStorage.setItem('tokustream_mp_config', JSON.stringify(parsed));
            }
          } catch(e) {}
        }
      }).catch(() => {});
  }, []);

  const saveMpConfig = async (config) => {
    setMpConfig(config);
    try {
      localStorage.setItem('tokustream_mp_config', JSON.stringify(config));
      await supabase.from('app_config').upsert({
        key: 'mp_config',
        value: JSON.stringify(config)
      });
    } catch(e) {}
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      users,
      catalog,
      transactions,
      searchQuery,
      setSearchQuery,
      registerUser,
      loginUser,
      logoutUser,
      addCredits,
      unlockEpisode,
      isEpisodeUnlocked,
      addSeries,
      editSeries,
      deleteSeries,
      addEpisode,
      editEpisode,
      deleteEpisode,
      myList: currentUser ? (myList[currentUser.username] || []) : [],
      toggleFavorite,
      isSeriesFavorite,
      updateWatchProgress,
      getEpisodeProgress,
      resetCatalogToDefault,
      categories: dbCategories,
      addCategory: addDbCategory,
      deleteCategory: deleteDbCategory,
      addSeason,
      deleteSeason,
      mpConfig,
      saveMpConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};
