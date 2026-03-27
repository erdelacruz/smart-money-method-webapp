import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const TYPE_META = {
  'Trading Strategy': {
    eyebrow:  'Learn · Trading Strategy',
    title:    'Trading Strategies',
    subtitle: 'In-depth guides and strategies for ASX share traders.',
  },
  'Investing Strategy': {
    eyebrow:  'Learn · Investing Strategy',
    title:    'Investing Strategies',
    subtitle: 'Long-term investment guides for Australian investors.',
  },
  'Blog': {
    eyebrow:  'Learn · Blog',
    title:    'Smart Money Blog',
    subtitle: 'Financial tips and insights for everyday Australians.',
  },
};

export default function BlogListPage({ type = 'Blog' }) {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [search,  setSearch]  = useState('');
  const [query,   setQuery]   = useState('');
  const debounceRef = useRef(null);

  const meta = TYPE_META[type] || TYPE_META['Blog'];

  useEffect(() => {
    setPage(1);
    setSearch('');
    setQuery('');
  }, [type]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(val);
      setPage(1);
    }, 350);
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 12, category: type });
    if (query) params.set('search', query);
    fetch(`/api/blog?${params}`)
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || []);
        setPages(data.pages || 1);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load posts.');
        setLoading(false);
      });
  }, [type, page, query]);

  return (
    <div className="blog-list-page">
      <div className="blog-list-hero page-hero">
        <div className="section-eyebrow">{meta.eyebrow}</div>
        <h1 className="blog-list-title">{meta.title}</h1>
        <p className="blog-list-sub">{meta.subtitle}</p>
      </div>

      <div className="blog-list-body">
        <div className="blog-list-card">
          {/* Sub-nav tabs + search */}
          <div className="learn-tabs-row">
            <div className="learn-tabs">
              <Link to="/learn/trading-strategy"  className={`learn-tab${type === 'Trading Strategy'  ? ' active' : ''}`}>📈 Trading Strategy</Link>
              <Link to="/learn/investing-strategy" className={`learn-tab${type === 'Investing Strategy' ? ' active' : ''}`}>💰 Investing Strategy</Link>
              <Link to="/learn/blog"              className={`learn-tab${type === 'Blog'               ? ' active' : ''}`}>✍️ Blog</Link>
            </div>
            <div className="learn-search-wrap">
              <svg className="learn-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                className="learn-search-input"
                type="text"
                placeholder="Search articles…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {search && (
                <button className="learn-search-clear" onClick={() => handleSearch('')}>✕</button>
              )}
            </div>
          </div>

          {loading && <p className="loading-text">Loading posts…</p>}
          {error   && <p className="error-banner">{error}</p>}

          {!loading && !error && posts.length === 0 && (
            <div className="blog-empty">
              <p>No posts published yet. Check back soon.</p>
            </div>
          )}

          <div className="blog-grid">
            {posts.map(post => (
              <Link key={post._id} to={`/learn/${post.slug}`} className="blog-card" aria-label={`Read: ${post.title}`}>
                {post.featuredImage && (
                  <div className="blog-card-img-wrap">
                    <img src={post.featuredImage} alt={post.title} className="blog-card-img" loading="lazy" decoding="async" />
                  </div>
                )}
                <div className="blog-card-meta">
                  <span className="blog-card-cat">{post.category}</span>
                  <span className="blog-card-read">{post.readTime} min read</span>
                </div>
                <h2 className="blog-card-title">{post.title}</h2>
                <p className="blog-card-excerpt">{post.excerpt}</p>
                <div className="blog-card-footer">
                  <div>
                    <div className="blog-card-author">By {post.author}</div>
                    <span className="blog-card-date">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>
                  <span className="blog-card-cta">Read →</span>
                </div>
              </Link>
            ))}
          </div>

          {pages > 1 && (
            <div className="blog-pagination">
              <button disabled={page <= 1}     onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span>Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
