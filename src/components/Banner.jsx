import React from 'react';
import { Play, Info } from 'lucide-react';

export default function Banner({ featured, onOpenDetail }) {
  if (!featured) return null;

  return (
    <div style={{
      position: 'relative',
      height: '65vh',
      width: '100%',
      backgroundImage: `linear-gradient(to bottom, rgba(8, 5, 17, 0.1), rgba(8, 5, 17, 0.95)), url(${featured.cover})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      padding: '0 4%',
      marginBottom: '-30px'
    }}>
      {/* Glow overlays */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '50%',
        height: '100%',
        background: 'linear-gradient(to right, rgba(8, 5, 17, 0.8), rgba(8, 5, 17, 0))',
        pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: '600px', zIndex: 10, position: 'relative' }}>
        <span style={{
          background: 'rgba(254, 0, 0, 0.15)',
          border: '1px solid var(--color-primary-red)',
          color: 'var(--color-primary-red)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Destaque
        </span>
        <h2 className="banner-title" style={{
          fontSize: '3rem',
          margin: '12px 0',
          fontWeight: 900,
          lineHeight: '1.1',
          textShadow: '2px 2px 10px rgba(0,0,0,0.8)'
        }}>
          {featured.title}
        </h2>
        <p className="banner-description" style={{
          fontSize: '1rem',
          color: 'var(--color-text-secondary)',
          lineHeight: '1.5',
          marginBottom: '24px',
          textShadow: '1px 1px 5px rgba(0,0,0,0.8)'
        }}>
          {featured.description}
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onOpenDetail(featured)}
            className="btn-fire-glow"
            style={{
              background: 'linear-gradient(45deg, var(--color-primary-red), var(--color-secondary-red))',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              boxShadow: '0 0 15px rgba(254, 0, 0, 0.4)'
            }}
          >
            <Play size={16} fill="#fff" />
            Assistir
          </button>
          <button
            onClick={() => onOpenDetail(featured)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem'
            }}
          >
            <Info size={16} />
            Mais Informações
          </button>
        </div>
      </div>
    </div>
  );
}
