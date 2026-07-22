import React, { useContext, useState } from 'react';
import { AppContext } from './context/AppContext';
import Navbar from './components/Navbar';
import MovieRow from './components/MovieRow';
import DetailModal from './components/DetailModal';
import AuthModal from './components/AuthModal';
import CreditShop from './components/CreditShop';
import AdminDashboard from './components/AdminDashboard';
import { Play, Search } from 'lucide-react';

export default function App() {
  const { catalog, searchQuery, setSearchQuery, currentUser, myList } = useContext(AppContext);
  
  // Navigation & Modals state
  const [view, setView] = useState('home'); // 'home' | 'admin'
  const [showAuth, setShowAuth] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('Todos');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pick a featured series for the Background Wallpaper
  const featured = catalog[0] || null;

  // Curated list of all categories in database
  const categories = ['Todos', ...new Set(catalog.map(item => item.category))];

  // Get user's favorites catalog objects
  const favoriteItems = catalog.filter(item => myList.includes(item.id));

  // Filter catalog based on search
  const filteredCatalog = catalog.filter(item => {
    return searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
  });

  return (
    <div id="aa-wp" className={`cont ${isMobileMenuOpen ? 'on' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Background wallpaper (ToroFilm native .bghd class) */}
      {!searchQuery && selectedCategoryTab === 'Todos' && featured && (
        <div className="bghd">
          <img src={featured.cover} alt="" style={{ opacity: 0.4 }} />
        </div>
      )}

      {/* Header Menu */}
      <Navbar 
        onOpenAuth={() => setShowAuth(true)}
        onOpenShop={() => {
          if (!currentUser) setShowAuth(true);
          else setShowShop(true);
        }}
        onOpenAdmin={() => setView('admin')}
        onViewHome={() => {
          setView('home');
          setSelectedCategoryTab('Todos');
        }}
        isMenuOpen={isMobileMenuOpen}
        onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {view === 'admin' && currentUser?.isAdmin ? (
        <AdminDashboard onClose={() => setView('home')} />
      ) : (
        /* Body Content Wrapper */
        <div className="bd">
          
          {/* Centered Hero Logo & Search (ToroFilm home-search class) */}
          <div className="home-search hdd shwc" style={{ margin: '40px auto 40px auto' }}>
            <figure className="logo tac">
              <h1 className="glow-text-cyan" style={{
                fontSize: '3.5rem',
                fontWeight: 900,
                letterSpacing: '4px',
                color: '#fff',
                marginBottom: '16px',
                background: 'linear-gradient(45deg, var(--color-neon-cyan), var(--color-neon-violet))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: 'center'
              }}>
                TOKUSTREAM
              </h1>
            </figure>
            <form className="search full" onSubmit={(e) => e.preventDefault()}>
              <input
                id="tr_live_search"
                type="text"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn npd lnk">
                <i className="fa-solid fa-search" style={{ color: 'var(--color-neon-cyan)', fontSize: '1.25rem' }}></i>
              </button>
            </form>
          </div>

          {/* Main Grid Section */}
          <div className="dfxc">
            <main className="main-site">
              
              {searchQuery ? (
                /* Searched Grid Layout */
                <section className="wdgt-home widget section widget_list_movies_series movies" style={{ marginBottom: '30px' }}>
                  <header className="section-header">
                    <div className="rw alg-cr jst-sb">
                      <h3 className="section-title">
                        Resultados para "{searchQuery}"
                      </h3>
                    </div>
                  </header>
                  <div className="aa-cn">
                    <div className="aa-tb hdd on" style={{ display: 'block' }}>
                      <ul className="post-lst rw sm rcl2 rcl3a rcl4b rcl3c rcl4d rcl6e">
                        {filteredCatalog.map(item => (
                          <li
                            key={item.id}
                            onClick={() => setSelectedSeries(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            <article className="post dfx fcl movies" style={{ width: '100%' }}>
                              <header className="entry-header">
                                <h2 className="entry-title">{item.title}</h2>
                                <div className="entry-meta">
                                  <span className="vote">
                                    <span>TMDB</span> {item.rating || '9.5'}
                                  </span>
                                </div>
                              </header>
                              <div className="post-thumbnail or-1">
                                <figure>
                                  <img loading="lazy" src={item.cover} alt={item.title} />
                                </figure>
                                <span className="post-ql">
                                  <span className="Qlty">HD</span>
                                </span>
                                <span className="year">2026</span>
                                <span className="watch btn sm">Assistir</span>
                                <span className="play fa-play" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Play size={18} fill="#fff" style={{ marginLeft: '3px' }} />
                                </span>
                              </div>
                            </article>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {filteredCatalog.length === 0 && (
                    <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '20px' }}>
                      Nenhuma série ou filme encontrado.
                    </p>
                  )}
                </section>
              ) : (
                /* Default Home Section List */
                <div style={{ position: 'relative', zIndex: 10 }}>
                  {/* Row 1: Minha Lista (Favorites) */}
                  {currentUser && favoriteItems.length > 0 && (
                    <MovieRow 
                      title="Minha Lista"
                      items={favoriteItems}
                      onOpenDetail={setSelectedSeries}
                    />
                  )}

                  {/* Row: Lançamentos */}
                  <div id="row-lancamentos">
                    <MovieRow 
                      title="Lançamentos"
                      items={catalog}
                      onOpenDetail={setSelectedSeries}
                    />
                  </div>

                  {/* Row: Últimas Adicionadas */}
                  <MovieRow 
                    title="Últimas Adicionadas"
                    items={[...catalog].reverse()}
                    onOpenDetail={setSelectedSeries}
                  />
                </div>
              )}
            </main>
          </div>

        </div>
      )}

      {/* Footer */}
      <footer className="ft" style={{ borderTop: '1px solid var(--glass-border)', marginTop: '80px', padding: '40px 0' }}>
        <div className="tac">
          <p>&copy; 2026 TOKUSTREAM. Todos os direitos reservados.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '8px', opacity: 0.5 }}>
            Desenvolvido com carinho para fãs de Tokusatsu & Doramas.
          </p>
        </div>
      </footer>

      {/* Modals */}
      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}

      {showShop && (
        <CreditShop onClose={() => setShowShop(false)} />
      )}

      {selectedSeries && (
        <DetailModal 
          item={selectedSeries}
          onClose={() => setSelectedSeries(null)}
          onRequireAuth={() => {
            setSelectedSeries(null);
            setShowAuth(true);
          }}
          onRequireShop={() => {
            setSelectedSeries(null);
            setShowShop(true);
          }}
        />
      )}
    </div>
  );
}
