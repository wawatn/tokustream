import React from 'react';
import { Play } from 'lucide-react';

export default function MovieRow({ title, items, onOpenDetail }) {
  if (items.length === 0) return null;

  return (
    <section className="wdgt-home widget section widget_list_movies_series movies" style={{ marginBottom: '30px' }}>
      {/* ToroFilm Section Header */}
      <header className="section-header">
        <div className="rw alg-cr jst-sb" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 className="section-title" style={{ margin: 0 }}>{title}</h3>
          <ul className="rw" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            <li>
              <span 
                className="btn lnk more fa-plus" 
                style={{ 
                  cursor: 'pointer', 
                  fontSize: '0.8rem', 
                  color: 'var(--color-primary-red)', 
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Ver mais
              </span>
            </li>
          </ul>
        </div>
      </header>

      {/* Grid of Posters (ToroFilm layout) */}
      <div className="aa-cn">
        <div className="aa-tb hdd on" style={{ display: 'block' }}>
          <ul className="post-lst rw sm rcl2 rcl3a rcl4b rcl3c rcl4d rcl6e">
            {items.map((item) => (
              <li
                key={item.id}
                onClick={() => onOpenDetail(item)}
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
                    <span className="year">{item.year || '2026'}</span>
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
    </section>
  );
}
