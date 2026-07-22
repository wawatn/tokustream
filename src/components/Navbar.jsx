import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Play, Tv, Star, Menu, Coins, LogOut, Shield, ChevronDown } from 'lucide-react';

export default function Navbar({ onOpenAuth, onOpenShop, onOpenAdmin, onViewHome, isMenuOpen, onToggleMenu }) {
  const { currentUser, logoutUser, searchQuery, setSearchQuery, categories } = useContext(AppContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false); // Collapsed by default

  return (
    <header className="hd dfx alg-cr" style={{ justifyContent: 'space-between', padding: '0 4%', position: 'relative', zIndex: 110 }}>
      {/* Mobile Hamburger Button */}
      <button 
        type="button" 
        className="btn menu-btn npd lnk aa-tgl hddc"
        onClick={onToggleMenu}
        style={{ 
          color: '#fff', 
          fontSize: '1.5rem', 
          background: 'transparent',
          cursor: 'pointer',
          padding: '8px'
        }}
      >
        <i className={isMenuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"}></i>
      </button>

      {/* Brand logo for Mobile Navbar */}
      <h1 
        className="glow-text-cyan shw hddc" 
        onClick={onViewHome}
        style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: 900,
          letterSpacing: '1px',
          color: '#fff',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          background: 'linear-gradient(45deg, var(--color-neon-cyan), var(--color-neon-violet))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        TOKUSTREAM
      </h1>

      {/* Navigation menu overlay */}
      <nav id="menu" className={`hdd dfxc fg1 jst-sb alg-cr ${isMenuOpen ? 'swh' : ''}`} style={{ display: isMenuOpen ? 'block' : undefined }}>
        
        {/* Mobile Search Bar inside menu (visible on mobile only) */}
        {isMenuOpen && (
          <ul className="rw dv shw hddc" style={{ listStyle: 'none', margin: '0 0 16px 0', padding: 0 }}>
            <li className="cl1" style={{ width: '100%' }}>
              <form className="search full" onSubmit={(e) => e.preventDefault()} style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff'
                  }}
                />
                <button type="submit" className="btn npd lnk" style={{ position: 'absolute', right: '12px', top: '6px' }}>
                  <i className="fa-solid fa-search" style={{ color: 'var(--color-neon-cyan)' }}></i>
                </button>
              </form>
            </li>
          </ul>
        )}

        {/* Center Menu Links (ToroFilm layout from teste.html) */}
        <ul className="menu dfxc dv or-1">
          <li className="menu-item current-menu-item">
            <a href="#" onClick={(e) => { 
              e.preventDefault(); 
              setSearchQuery('');
              onViewHome(); 
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if(isMenuOpen && onToggleMenu) onToggleMenu(); 
            }}>
              <i className="fa-solid fa-play" style={{ color: 'var(--color-primary-red)', marginRight: '6px' }}></i> 
              Inicio
            </a>
          </li>
          <li className="menu-item">
            <a href="#" onClick={(e) => { 
              e.preventDefault(); 
              setSearchQuery('Drama');
              onViewHome(); 
              if(isMenuOpen && onToggleMenu) onToggleMenu(); 
            }}>
              <i className="fa-solid fa-tv" style={{ color: 'var(--color-primary-red)', marginRight: '6px' }}></i> 
              Doramas
            </a>
          </li>
          <li className="menu-item">
            <a href="#" onClick={(e) => { 
              e.preventDefault(); 
              setSearchQuery('');
              onViewHome(); 
              setTimeout(() => {
                document.getElementById('row-lancamentos')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
              if(isMenuOpen && onToggleMenu) onToggleMenu(); 
            }}>
              <i className="fa-solid fa-star" style={{ color: 'var(--color-primary-red)', marginRight: '6px' }}></i> 
              Lancamentos
            </a>
          </li>
          <li className={`menu-item menu-item-has-children ${isCategoriesOpen ? 'on' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setIsCategoriesOpen(!isCategoriesOpen); }}>
              <i className="fa-solid fa-bars" style={{ color: 'var(--color-primary-red)', marginRight: '6px' }}></i> 
              Categorias
            </a>
            <ul className="sub-menu" style={{ 
              display: isCategoriesOpen ? 'block' : 'none', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--glass-border)' 
            }}>
              {categories.map((cat) => (
                <li key={cat}>
                  <a 
                    href="#" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      setSearchQuery(cat);
                      onViewHome();
                      if(isMenuOpen && onToggleMenu) onToggleMenu(); 
                    }}
                  >
                    {cat}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>

      {/* Right side: Coins & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
        {currentUser ? (
          <>
            {/* Coins / Credits Section */}
            <div 
              onClick={onOpenShop}
              className="glass btn-fire-glow"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                cursor: 'pointer',
                borderColor: 'var(--color-primary-red)',
                background: 'rgba(0, 240, 255, 0.05)',
                transition: 'all 0.3s ease'
              }}
            >
              <Coins size={14} color="var(--color-primary-red)" />
              <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--color-primary-red)', whiteSpace: 'nowrap' }}>
                {currentUser.isAdmin ? 'Admin' : `${currentUser.credits} CR`}
              </span>
            </div>

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, var(--color-primary-red), var(--color-secondary-red))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  color: '#fff'
                }}>
                  {currentUser.username[0].toUpperCase()}
                </div>
                <ChevronDown size={12} color="var(--color-text-secondary)" />
              </div>

              {showDropdown && (
                <div className="glass" style={{
                  position: 'absolute',
                  top: '36px',
                  right: 0,
                  width: '160px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  padding: '6px 0',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  backgroundColor: 'var(--bg-secondary)',
                  zIndex: 200
                }}>
                  <div style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                    Olá, <strong>{currentUser.username}</strong>
                  </div>

                  {currentUser.isAdmin && (
                    <button 
                      onClick={() => { setShowDropdown(false); onOpenAdmin(); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--color-primary-red)'
                      }}
                    >
                      <Shield size={14} />
                      Painel Admin
                    </button>
                  )}

                  <button 
                    onClick={() => { setShowDropdown(false); logoutUser(); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--color-danger)'
                    }}
                  >
                    <LogOut size={14} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button 
            onClick={onOpenAuth}
            className="btn-fire-glow"
            style={{
              background: 'linear-gradient(45deg, var(--color-secondary-red), var(--color-primary-red))',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              boxShadow: '0 0 10px rgba(0, 240, 255, 0.4)'
            }}
          >
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}
