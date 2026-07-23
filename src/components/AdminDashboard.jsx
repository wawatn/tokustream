import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Plus, Trash, Film, Tv, Video, ArrowLeft, BarChart3, Users, Landmark, PlayCircle, Image, Sparkles, FolderOpen, List, Search, Edit3 } from 'lucide-react';

const SUGGESTED_COVERS = [
  { name: 'Tokyo Neon', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80' },
  { name: 'Robô Sci-Fi', url: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=800&auto=format&fit=crop&q=80' },
  { name: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?w=800&auto=format&fit=crop&q=80' },
  { name: 'Dorama Romance', url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&fit=crop&q=80' },
  { name: 'Templo Ninja', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80' },
  { name: 'Monstro Kaiju', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80' }
];

export default function AdminDashboard({ onClose }) {
  const { catalog, addSeries, deleteSeries, addEpisode, editEpisode, deleteEpisode, users, transactions, categories, addCategory, deleteCategory, addSeason, deleteSeason } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'categories' | 'metrics'
  const [contentSubTab, setContentSubTab] = useState('list'); // 'list' | 'add'
  const [selectedSeriesId, setSelectedSeriesId] = useState(null);
  
  // Search state inside catalog
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('all'); // 'all' | 'Série' | 'Filme'

  // New series state
  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [newSeriesDesc, setNewSeriesDesc] = useState('');
  const [newSeriesType, setNewSeriesType] = useState('Série'); // 'Série' | 'Filme'
  const [newSeriesCategory, setNewSeriesCategory] = useState(categories[0] || 'Drama');
  const [newSeriesCover, setNewSeriesCover] = useState('');
  const [newSeriesTrailer, setNewSeriesTrailer] = useState('');

  // Season selector for editing episodes
  const [selectedSeason, setSelectedSeason] = useState(1);

  // New/Edit episode state
  const [editingEpisodeId, setEditingEpisodeId] = useState(null);
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpNumber, setNewEpNumber] = useState('');
  const [newEpYoutubeUrl, setNewEpYoutubeUrl] = useState('');
  const [newEpThumbnail, setNewEpThumbnail] = useState('');

  // Keep chosen category synchronized with available categories in DB
  useEffect(() => {
    if (categories && categories.length > 0 && !categories.includes(newSeriesCategory)) {
      setNewSeriesCategory(categories[0]);
    }
  }, [categories]);

  // Reset selected season when series changes
  useEffect(() => {
    setSelectedSeason(1);
    setEditingEpisodeId(null);
    setNewEpTitle('');
    setNewEpNumber('');
    setNewEpYoutubeUrl('');
  }, [selectedSeriesId]);

  // Calculations for Metrics Dashboard
  const totalUsers = users.length;
  
  const totalRevenue = transactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.amountInBrl, 0);

  const totalUnlocked = transactions
    .filter(t => t.type === 'unlock')
    .length;

  // Calculate top unlocked episodes
  const unlockCounts = {};
  transactions
    .filter(t => t.type === 'unlock')
    .forEach(t => {
      unlockCounts[t.episodeId] = (unlockCounts[t.episodeId] || 0) + 1;
    });

  // Map to episode details
  const allEpisodes = catalog.flatMap(s => 
    (s.episodes || []).map(e => ({ ...e, seriesTitle: s.title }))
  );

  const topEpisodes = Object.entries(unlockCounts)
    .map(([epId, count]) => {
      const epDetail = allEpisodes.find(e => e.id === epId);
      return {
        id: epId,
        count,
        title: epDetail ? `${epDetail.seriesTitle} - Ep ${epDetail.number}` : 'Episódio Removido'
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const extractYoutubeId = (urlOrId) => {
    if (!urlOrId) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrId.match(regExp);
    return (match && match[2].length === 11) ? match[2] : urlOrId;
  };

  const handleAddSeries = (e) => {
    e.preventDefault();
    if (!newSeriesTitle || !newSeriesDesc) return;
    
    const coverUrl = newSeriesCover || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80';
    const trailerId = extractYoutubeId(newSeriesTrailer);
    
    const newId = addSeries({
      title: newSeriesTitle,
      description: newSeriesDesc,
      category: newSeriesCategory,
      type: newSeriesType,
      cover: coverUrl,
      trailerYoutubeId: trailerId || 'YtD5-Ynfe3Y'
    });

    setNewSeriesTitle('');
    setNewSeriesDesc('');
    setNewSeriesCover('');
    setNewSeriesTrailer('');
    alert('Conteúdo cadastrado com sucesso!');
    
    // Auto-select the newly added content and redirect to Catalog tab
    setSelectedSeriesId(newId);
    setContentSubTab('list');
  };

  const handleAddEpisode = (e) => {
    e.preventDefault();
    if (!selectedSeriesId || !newEpTitle || !newEpYoutubeUrl) return;

    const youtubeId = extractYoutubeId(newEpYoutubeUrl);
    const thumbUrl = newEpThumbnail || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&auto=format&fit=crop&q=80';

    if (editingEpisodeId) {
      editEpisode(selectedSeriesId, editingEpisodeId, {
        title: newEpTitle,
        number: selectedSeries.type === 'Filme' ? 1 : parseInt(newEpNumber, 10),
        youtubeId,
        thumbnail: thumbUrl,
        season: selectedSeries.type === 'Filme' ? 1 : selectedSeason
      });
      setEditingEpisodeId(null);
    } else {
      addEpisode(selectedSeriesId, {
        title: newEpTitle,
        number: selectedSeries.type === 'Filme' ? 1 : parseInt(newEpNumber, 10),
        youtubeId,
        thumbnail: thumbUrl,
        season: selectedSeries.type === 'Filme' ? 1 : selectedSeason
      });
    }

    setNewEpTitle('');
    setNewEpNumber('');
    setNewEpYoutubeUrl('');
    setNewEpThumbnail('');
    alert(editingEpisodeId ? 'Episódio editado com sucesso!' : (selectedSeries.type === 'Filme' ? 'Vídeo do filme cadastrado!' : 'Episódio adicionado com sucesso!'));
  };

  const selectedSeries = catalog.find(s => s.id === selectedSeriesId);

  // Filter existing catalog based on search input and type filter
  const filteredAdminCatalog = catalog.filter(series => {
    const matchesSearch = series.title.toLowerCase().includes(adminSearchQuery.toLowerCase()) || 
                          series.category.toLowerCase().includes(adminSearchQuery.toLowerCase());
    const matchesType = catalogFilter === 'all' ? true : series.type === catalogFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{
      padding: '100px 4% 40px 4%',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <Film size={32} color="var(--color-neon-cyan)" />
            Painel Administrativo
          </h2>
          
          {/* Dashboard Tabs */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <button
              onClick={() => setActiveTab('content')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: activeTab === 'content' ? 'var(--color-neon-cyan)' : '#fff',
                background: activeTab === 'content' ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
                border: activeTab === 'content' ? '1px solid rgba(0, 240, 255, 0.2)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Tv size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Conteúdo
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: activeTab === 'categories' ? 'var(--color-neon-cyan)' : '#fff',
                background: activeTab === 'categories' ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
                border: activeTab === 'categories' ? '1px solid rgba(0, 240, 255, 0.2)' : 'none',
                cursor: 'pointer'
              }}
            >
              <FolderOpen size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Categorias
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: activeTab === 'metrics' ? 'var(--color-neon-cyan)' : '#fff',
                background: activeTab === 'metrics' ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
                border: activeTab === 'metrics' ? '1px solid rgba(0, 240, 255, 0.2)' : 'none',
                cursor: 'pointer'
              }}
            >
              <BarChart3 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Métricas & Vendas
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '6px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          Voltar para a Home
        </button>
      </div>

      {activeTab === 'content' && (
        /* Tab: Content Management (Series / Episodes CRUD) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Content Sub-Tabs Nav */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '2px', marginBottom: '10px' }}>
            <button
              onClick={() => { setContentSubTab('list'); setSelectedSeriesId(null); }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: contentSubTab === 'list' ? '2.5px solid var(--color-neon-cyan)' : '2.5px solid transparent',
                color: contentSubTab === 'list' ? 'var(--color-neon-cyan)' : 'var(--color-text-secondary)',
                padding: '10px 20px',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <List size={16} />
              Filmes & Séries Cadastrados ({catalog.length})
            </button>
            <button
              onClick={() => { setContentSubTab('add'); setSelectedSeriesId(null); }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: contentSubTab === 'add' ? '2.5px solid var(--color-neon-cyan)' : '2.5px solid transparent',
                color: contentSubTab === 'add' ? 'var(--color-neon-cyan)' : 'var(--color-text-secondary)',
                padding: '10px 20px',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Plus size={16} />
              Cadastrar Novo Conteúdo
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: (selectedSeriesId && contentSubTab === 'list') ? '1fr 1fr' : '1fr', gap: '30px' }}>
            
            {/* View 1: Catalog List Subtab */}
            {contentSubTab === 'list' && (
              <div className="glass" style={{ padding: '30px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tv size={20} color="var(--color-neon-cyan)" />
                  Catálogo Existente
                </h3>

                {/* Catalog Search Bar */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <input 
                    type="text" 
                    placeholder="Buscar no catálogo existente..." 
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 16px 10px 40px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--color-text-secondary)' }} />
                </div>

                {/* Catalog Type Filters */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setCatalogFilter('all')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: catalogFilter === 'all' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${catalogFilter === 'all' ? 'var(--color-neon-cyan)' : 'var(--glass-border)'}`,
                      color: catalogFilter === 'all' ? 'var(--color-neon-cyan)' : 'var(--color-text-secondary)'
                    }}
                  >
                    Todos ({catalog.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogFilter('Série')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: catalogFilter === 'Série' ? 'rgba(163, 0, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${catalogFilter === 'Série' ? 'var(--color-neon-violet)' : 'var(--glass-border)'}`,
                      color: catalogFilter === 'Série' ? 'var(--color-neon-violet)' : 'var(--color-text-secondary)'
                    }}
                  >
                    Séries ({catalog.filter(s => s.type === 'Série').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogFilter('Filme')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: catalogFilter === 'Filme' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${catalogFilter === 'Filme' ? 'var(--color-neon-cyan)' : 'var(--glass-border)'}`,
                      color: catalogFilter === 'Filme' ? 'var(--color-neon-cyan)' : 'var(--color-text-secondary)'
                    }}
                  >
                    Filmes ({catalog.filter(s => s.type === 'Filme').length})
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredAdminCatalog.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      Nenhum resultado encontrado no catálogo.
                    </div>
                  ) : (
                    filteredAdminCatalog.map((series) => (
                      <div
                        key={series.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          background: selectedSeriesId === series.id ? 'rgba(0,240,255,0.05)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${selectedSeriesId === series.id ? 'var(--color-neon-cyan)' : 'var(--glass-border)'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flexGrow: 1 }} onClick={() => setSelectedSeriesId(series.id)}>
                          <img src={series.cover} alt="" style={{ width: '50px', height: '35px', objectFit: 'cover', borderRadius: '4px' }} />
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.95rem' }}>{series.title}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                              <span style={{ 
                                color: series.type === 'Filme' ? 'var(--color-neon-cyan)' : 'var(--color-neon-violet)',
                                fontWeight: 'bold',
                                marginRight: '6px'
                              }}>
                                {series.type || 'Série'}
                              </span>
                              • {series.category} • {series.episodes?.length || 0} vídeos
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedSeriesId(selectedSeriesId === series.id ? null : series.id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.85rem',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: selectedSeriesId === series.id ? 'var(--color-neon-cyan)' : '#fff'
                            }}
                          >
                            {selectedSeriesId === series.id ? 'Fechar' : (series.type === 'Filme' ? 'Gerenciar Vídeo' : 'Gerenciar Episódios')}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja deletar "${series.title}"?`)) {
                                deleteSeries(series.id);
                                if (selectedSeriesId === series.id) setSelectedSeriesId(null);
                              }
                            }}
                            style={{
                              padding: '6px',
                              background: 'rgba(255, 0, 85, 0.1)',
                              border: '1px solid var(--color-danger)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: 'var(--color-danger)'
                            }}
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* View 2: Add New Content Form Subtab */}
            {contentSubTab === 'add' && (
              <div className="glass" style={{ padding: '30px', borderRadius: '12px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={20} color="var(--color-neon-cyan)" />
                  Cadastrar Série ou Filme
                </h3>

                <form onSubmit={handleAddSeries} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Type Switch (Filme vs Série) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Tipo de Produto</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setNewSeriesType('Série')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          background: newSeriesType === 'Série' ? 'rgba(163,0,255,0.1)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${newSeriesType === 'Série' ? 'var(--color-neon-violet)' : 'var(--glass-border)'}`,
                          color: newSeriesType === 'Série' ? 'var(--color-neon-violet)' : '#fff'
                        }}
                      >
                        Série (Multi-Episódios & Temporadas)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSeriesType('Filme')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          background: newSeriesType === 'Filme' ? 'rgba(0,240,255,0.1)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${newSeriesType === 'Filme' ? 'var(--color-neon-cyan)' : 'var(--glass-border)'}`,
                          color: newSeriesType === 'Filme' ? 'var(--color-neon-cyan)' : '#fff'
                        }}
                      >
                        Filme (Vídeo Único)
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Título</label>
                    <input
                      type="text"
                      placeholder="Ex: Kamen Rider Black RX"
                      value={newSeriesTitle}
                      onChange={(e) => setNewSeriesTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Categoria / Gênero</label>
                    {categories.length === 0 ? (
                      <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        Crie primeiro uma categoria na aba "Categorias" para poder associar ao conteúdo!
                      </div>
                    ) : (
                      <select
                        value={newSeriesCategory}
                        onChange={(e) => setNewSeriesCategory(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Image/Cover Assistant */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>URL da Capa (Imagem)</label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Cole a URL ou clique em uma sugestão abaixo"
                          value={newSeriesCover}
                          onChange={(e) => setNewSeriesCover(e.target.value)}
                        />
                      </div>
                      <div style={{
                        width: '90px',
                        height: '55px',
                        borderRadius: '6px',
                        border: '1px solid var(--glass-border)',
                        background: '#1a1a1a',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {newSeriesCover ? (
                          <img src={newSeriesCover} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Image size={20} color="var(--color-text-secondary)" />
                        )}
                      </div>
                    </div>

                    {/* Suggestions Library */}
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <Sparkles size={12} color="var(--color-neon-cyan)" />
                        Sugestões Rápidas:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {SUGGESTED_COVERS.map(c => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setNewSeriesCover(c.url)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: newSeriesCover === c.url ? 'var(--color-neon-cyan)' : 'var(--color-text-secondary)'
                            }}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Link do Trailer no YouTube</label>
                    <input
                      type="text"
                      placeholder="Ex: https://www.youtube.com/watch?v=K40kY2puDOc (ou ID do vídeo)"
                      value={newSeriesTrailer}
                      onChange={(e) => setNewSeriesTrailer(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Sinopse / Descrição</label>
                    <textarea
                      placeholder="Uma breve descrição sobre a história..."
                      value={newSeriesDesc}
                      onChange={(e) => setNewSeriesDesc(e.target.value)}
                      rows="3"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={categories.length === 0}
                    style={{
                      background: 'linear-gradient(45deg, #00f0ff, #a300ff)',
                      color: '#fff',
                      padding: '12px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
                      opacity: categories.length === 0 ? 0.5 : 1
                    }}
                  >
                    <Plus size={18} />
                    Adicionar Conteúdo & Continuar Edição
                  </button>
                </form>
              </div>
            )}

            {/* Right Side: Episode / Video Management for Selected Item (Only in list view) */}
            {selectedSeriesId && selectedSeries && contentSubTab === 'list' && (
              <div className="glass" style={{ padding: '30px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={20} color="var(--color-neon-cyan)" />
                  Gerenciando: {selectedSeries.title}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  {selectedSeries.type === 'Filme' 
                    ? 'Adicione ou altere o link/ID de vídeo do filme (Google Drive ou YouTube).'
                    : 'Gerencie temporadas e adicione episódios (Google Drive ou YouTube) para esta série.'}
                </p>

                {/* SEASON MANAGER (Only visible for Series) */}
                {selectedSeries.type === 'Série' && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Temporadas:</span>
                      <button
                        type="button"
                        onClick={() => addSeason(selectedSeries.id)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          background: 'rgba(0, 240, 255, 0.08)',
                          border: '1px solid var(--color-neon-cyan)',
                          borderRadius: '4px',
                          color: 'var(--color-neon-cyan)',
                          cursor: 'pointer'
                        }}
                      >
                        + Adicionar Temporada
                      </button>
                    </div>
                    {/* Season Tabs Selector with Delete Button */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {(selectedSeries.seasons || [1]).map((sNum) => (
                        <div key={sNum} style={{ display: 'flex', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedSeason(sNum)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: (selectedSeries.seasons || []).length > 1 ? '4px 0 0 4px' : '4px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: selectedSeason === sNum ? 'var(--color-neon-violet)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${selectedSeason === sNum ? 'var(--color-neon-violet)' : 'var(--glass-border)'}`,
                              borderRight: (selectedSeries.seasons || []).length > 1 ? 'none' : undefined,
                              color: '#fff'
                            }}
                          >
                            T. {sNum}
                          </button>
                          {(selectedSeries.seasons || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Deseja realmente excluir a Temporada ${sNum} e todos os episódios contidos nela?`)) {
                                  deleteSeason(selectedSeries.id, sNum);
                                  if (selectedSeason === sNum) {
                                    const remaining = (selectedSeries.seasons || []).filter(s => s !== sNum);
                                    setSelectedSeason(remaining[0] || 1);
                                  }
                                }
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '0 4px 4px 0',
                                fontSize: '0.75rem',
                                background: 'rgba(255, 0, 85, 0.15)',
                                border: '1px solid rgba(255, 0, 85, 0.4)',
                                borderLeft: 'none',
                                color: 'var(--color-danger)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title={`Excluir Temporada ${sNum}`}
                            >
                              <Trash size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Video / Episode Form */}
                <form onSubmit={handleAddEpisode} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid var(--glass-border)', marginBottom: '24px' }}>
                  
                  {selectedSeries.type === 'Série' ? (
                    /* Series fields */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Nº Ep.</label>
                        <input
                          type="number"
                          placeholder="Ex: 1"
                          value={newEpNumber}
                          onChange={(e) => setNewEpNumber(e.target.value)}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Título do Episódio</label>
                        <input
                          type="text"
                          placeholder="Ex: O Nascimento do Herói"
                          value={newEpTitle}
                          onChange={(e) => setNewEpTitle(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    /* Movie fields */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Nome do Vídeo (ex: Filme Completo)</label>
                      <input
                        type="text"
                        placeholder="Ex: Filme Completo"
                        value={newEpTitle}
                        onChange={(e) => setNewEpTitle(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>ID do Vídeo (Bunny Stream, Google Drive ou YouTube)</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neon-cyan)', fontWeight: 'bold' }}>⚡ Bunny Stream Ativo (Library 711399)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Cole o ID do Bunny Stream (ex: a1b2c3d4-e5f6-7890...) ou ID do Drive"
                      value={newEpYoutubeUrl}
                      onChange={(e) => setNewEpYoutubeUrl(e.target.value)}
                      required
                    />
                  </div>

                  {/* Episode Thumbnail Input & Live Preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>URL da Thumbnail (Opcional)</label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Ex: https://link-da-imagem.com/thumb.jpg"
                        value={newEpThumbnail}
                        onChange={(e) => setNewEpThumbnail(e.target.value)}
                        style={{ flexGrow: 1 }}
                      />
                      <div style={{
                        width: '70px',
                        height: '40px',
                        borderRadius: '4px',
                        border: '1px solid var(--glass-border)',
                        background: '#1a1a1a',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {newEpThumbnail ? (
                          <img src={newEpThumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Image size={18} color="var(--color-text-secondary)" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        background: 'linear-gradient(45deg, #00f0ff, #a300ff)',
                        color: '#fff',
                        padding: '12px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)'
                      }}
                    >
                      {editingEpisodeId ? <Edit3 size={18} /> : <Plus size={18} />}
                      {editingEpisodeId 
                        ? 'Salvar Alterações do Episódio' 
                        : (selectedSeries.type === 'Filme' ? 'Salvar Vídeo do Filme' : `Adicionar Ep à Temporada ${selectedSeason}`)}
                    </button>
                    {editingEpisodeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEpisodeId(null);
                          setNewEpTitle('');
                          setNewEpNumber('');
                          setNewEpYoutubeUrl('');
                          setNewEpThumbnail('');
                        }}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          color: '#fff',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>

                {/* List of episodes / videos */}
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
                    {selectedSeries.type === 'Filme' ? 'Vídeo Atual' : `Episódios Cadastrados (Temporada ${selectedSeason})`}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
                    {selectedSeries.episodes && selectedSeries.episodes.length > 0 ? (
                      selectedSeries.episodes
                        .filter(ep => selectedSeries.type === 'Filme' || (ep.season || 1) === selectedSeason)
                        .map((ep) => (
                          <div
                            key={ep.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid var(--glass-border)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {selectedSeries.type !== 'Filme' && (
                                <span style={{ fontWeight: 'bold', color: 'var(--color-neon-cyan)', fontSize: '0.9rem' }}>
                                  Ep {ep.number}
                                </span>
                              )}
                              <span style={{ fontSize: '0.9rem' }}>{ep.title}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEpisodeId(ep.id);
                                  setNewEpTitle(ep.title);
                                  setNewEpNumber(ep.number);
                                  setNewEpYoutubeUrl(ep.youtubeId || '');
                                  setNewEpThumbnail(ep.thumbnail || '');
                                }}
                                style={{
                                  padding: '6px',
                                  background: 'rgba(0, 240, 255, 0.1)',
                                  border: '1px solid var(--color-neon-cyan)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  color: 'var(--color-neon-cyan)'
                                }}
                                title="Editar Episódio"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteEpisode(selectedSeriesId, ep.id)}
                                style={{
                                  padding: '6px',
                                  background: 'rgba(255, 0, 85, 0.1)',
                                  border: '1px solid var(--color-danger)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  color: 'var(--color-danger)'
                                }}
                                title="Excluir Episódio"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Nenhum vídeo cadastrado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        /* Tab: Categories Management */
        <div className="glass" style={{ padding: '30px', borderRadius: '12px', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={20} color="var(--color-neon-cyan)" />
            Gerenciar Categorias
          </h3>

          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Adicione ou remova categorias do catálogo. Elas alimentam o dropdown do menu inicial e o formulário de cadastro de conteúdos.
          </p>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const newCat = formData.get('categoryName')?.trim();
            if (newCat) {
              addCategory(newCat);
              e.target.reset();
              alert('Categoria adicionada!');
            }
          }} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input
              name="categoryName"
              type="text"
              placeholder="Nova Categoria (ex: Tokusatsu Clássico)"
              required
              style={{ flexGrow: 1 }}
            />
            <button
              type="submit"
              style={{
                background: 'linear-gradient(45deg, var(--color-neon-cyan), var(--color-neon-violet))',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
              }}
            >
              Adicionar
            </button>
          </form>

          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Categorias Cadastradas</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.length === 0 ? (
                <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
                  Nenhuma categoria cadastrada.
                </div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--glass-border)'
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{cat}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja deletar a categoria "${cat}"? As séries existentes continuarão com ela, mas ela não estará disponível no menu.`)) {
                          deleteCategory(cat);
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 0, 85, 0.1)',
                        border: '1px solid var(--color-danger)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: 'var(--color-danger)',
                        fontSize: '0.8rem'
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        /* Tab: Metrics & Dashboard */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Row of stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="glass" style={{ padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '14px', borderRadius: '8px', color: 'var(--color-neon-cyan)' }}>
                <Users size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block' }}>Usuários Cadastrados</span>
                <strong style={{ fontSize: '1.8rem', color: '#fff' }}>{totalUsers}</strong>
              </div>
            </div>

            <div className="glass" style={{ padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ background: 'rgba(0, 255, 102, 0.1)', padding: '14px', borderRadius: '8px', color: 'var(--color-success)' }}>
                <Landmark size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block' }}>Faturamento Total (PIX/CC)</span>
                <strong style={{ fontSize: '1.8rem', color: 'var(--color-success)' }}>R$ {totalRevenue.toFixed(2)}</strong>
              </div>
            </div>

            <div className="glass" style={{ padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ background: 'rgba(163, 0, 255, 0.1)', padding: '14px', borderRadius: '8px', color: 'var(--color-neon-violet)' }}>
                <PlayCircle size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block' }}>Episódios Desbloqueados</span>
                <strong style={{ fontSize: '1.8rem', color: '#fff' }}>{totalUnlocked}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', flexWrap: 'wrap' }}>
            {/* Visual SVGs Chart for popular episodes */}
            <div className="glass" style={{ padding: '30px', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={20} color="var(--color-neon-cyan)" />
                Ranking de Episódios Mais Vendidos
              </h3>

              {topEpisodes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {topEpisodes.map((ep, idx) => {
                    const maxVal = topEpisodes[0]?.count || 1;
                    const percent = (ep.count / maxVal) * 100;
                    return (
                      <div key={ep.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ fontWeight: 'bold' }}>{idx + 1}. {ep.title}</span>
                          <span style={{ color: 'var(--color-neon-cyan)', fontWeight: 'bold' }}>{ep.count} vendas</span>
                        </div>
                        {/* Styled simulated progress bar chart */}
                        <div style={{ width: '100%', height: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                          <div style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--color-neon-violet), var(--color-neon-cyan))',
                            borderRadius: '10px',
                            boxShadow: '0 0 10px rgba(0, 240, 255, 0.4)',
                            transition: 'width 1s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Nenhum episódio desbloqueado por usuários ainda.
                </div>
              )}
            </div>

            {/* Recent Transactions List */}
            <div className="glass" style={{ padding: '30px', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Atividade Recente</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {transactions.length > 0 ? (
                  transactions.slice(-5).reverse().map((t) => (
                    <div 
                      key={t.id}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--glass-border)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: 'var(--color-neon-cyan)' }}>@{t.username}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {new Date(t.date).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                        <span>
                          {t.type === 'purchase' ? 'Recarga de Créditos' : 'Desbloqueou Ep.'}
                        </span>
                        <span style={{ color: t.type === 'purchase' ? 'var(--color-success)' : 'var(--color-neon-violet)', fontWeight: 'bold' }}>
                          {t.type === 'purchase' ? `+ ${t.credits} CR` : `- ${t.credits} CR`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Nenhuma atividade registrada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
