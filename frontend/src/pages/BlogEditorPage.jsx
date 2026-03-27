import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams }  from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Image compression (canvas API — no dependencies) ─────────────────────────
function compressImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio  = Math.min(maxWidth / img.width, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Rich Text Editor ──────────────────────────────────────────────────────────
function RichTextEditor({ initialValue, onChange }) {
  const editorRef   = useRef(null);
  const initialised = useRef(false);
  const imgInputRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && initialValue && !initialised.current) {
      editorRef.current.innerHTML = initialValue;
      initialised.current = true;
    }
  }, [initialValue]);

  const exec = useCallback((cmd, arg = null) => {
    editorRef.current.focus();
    document.execCommand(cmd, false, arg);
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleInsertLink = useCallback((e) => {
    e.preventDefault();
    const url = window.prompt('Enter URL (include https://):');
    if (url) exec('createLink', url);
  }, [exec]);

  const handleInsertImage = useCallback((e) => {
    e.preventDefault();
    imgInputRef.current?.click();
  }, []);

  const onImageFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const src = await compressImage(file, 900, 0.85);
      editorRef.current.focus();
      document.execCommand(
        'insertHTML', false,
        `<img src="${src}" alt="" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;display:block;" />`
      );
      onChange(editorRef.current.innerHTML);
    } catch {
      alert('Image could not be processed. Please try a different file.');
    }
    e.target.value = '';
  }, [onChange]);

  const Btn = ({ cmd, arg, title, onClick, children }) => (
    <button
      type="button"
      title={title}
      className="rte-btn"
      onMouseDown={(e) => {
        e.preventDefault();
        if (onClick) onClick(e);
        else exec(cmd, arg);
      }}
    >
      {children}
    </button>
  );

  return (
    <div className="rte-wrap">
      {/* Hidden file input for inline images */}
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onImageFileChange}
      />

      <div className="rte-toolbar">
        <Btn cmd="bold"          title="Bold">        <b>B</b></Btn>
        <Btn cmd="italic"        title="Italic">      <em>I</em></Btn>
        <Btn cmd="underline"     title="Underline">   <u>U</u></Btn>
        <Btn cmd="strikeThrough" title="Strikethrough"><s>S</s></Btn>
        <span className="rte-sep" />
        <Btn cmd="formatBlock" arg="h2" title="Heading 2">H2</Btn>
        <Btn cmd="formatBlock" arg="h3" title="Heading 3">H3</Btn>
        <Btn cmd="formatBlock" arg="p"  title="Paragraph">¶</Btn>
        <span className="rte-sep" />
        <Btn cmd="insertUnorderedList" title="Bullet list">• List</Btn>
        <Btn cmd="insertOrderedList"   title="Numbered list">1. List</Btn>
        <span className="rte-sep" />
        <Btn cmd="formatBlock" arg="blockquote" title="Blockquote">❝ Quote</Btn>
        <Btn cmd="insertHorizontalRule" title="Horizontal rule">― Divider</Btn>
        <span className="rte-sep" />
        <Btn title="Insert link"  onClick={handleInsertLink}>🔗 Link</Btn>
        <Btn cmd="unlink"         title="Remove link">Unlink</Btn>
        <span className="rte-sep" />
        <Btn title="Insert image" onClick={handleInsertImage}>🖼 Image</Btn>
        <span className="rte-sep" />
        <Btn cmd="removeFormat" title="Clear formatting">✕ Clear</Btn>
      </div>

      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable
        onInput={() => onChange(editorRef.current.innerHTML)}
        onBlur={()  => onChange(editorRef.current.innerHTML)}
        suppressContentEditableWarning
      />
    </div>
  );
}

// ── Content types ─────────────────────────────────────────────────────────────
const CATEGORIES = ['Trading Strategy', 'Investing Strategy', 'Blog'];

// ── BlogEditorPage ────────────────────────────────────────────────────────────
export default function BlogEditorPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { token } = useAuth();

  const [title,         setTitle]         = useState('');
  const [content,       setContent]       = useState('');
  const [excerpt,       setExcerpt]       = useState('');
  const [category,      setCategory]      = useState('Blog');
  const [tags,          setTags]          = useState('');
  const [published,     setPublished]     = useState(false);
  const [featuredImage, setFeaturedImage] = useState('');
  const [imgUploading,  setImgUploading]  = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [loadingPost,   setLoadingPost]   = useState(!!id);

  const featImgInputRef = useRef(null);

  // Load existing post when editing
  useEffect(() => {
    if (!id) return;
    fetch(`/api/blog/admin/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error('Post not found'); return r.json(); })
      .then(post => {
        setTitle(post.title          || '');
        setContent(post.content      || '');
        setExcerpt(post.excerpt      || '');
        setCategory(post.category    || 'Blog');
        setTags((post.tags || []).join(', '));
        setPublished(post.published  || false);
        setFeaturedImage(post.featuredImage || '');
        setLoadingPost(false);
      })
      .catch(err => { setError(err.message); setLoadingPost(false); });
  }, [id, token]);

  const handleFeaturedImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const compressed = await compressImage(file, 1200, 0.82);
      setFeaturedImage(compressed);
    } catch {
      setError('Image could not be processed.');
    } finally {
      setImgUploading(false);
      e.target.value = '';
    }
  };

  const save = async (publishNow) => {
    if (!title.trim()) { setError('Title is required.'); return; }
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (!plainText) { setError('Content is required.'); return; }

    setSaving(true);
    setError('');

    const body = {
      title:         title.trim(),
      content,
      excerpt:       excerpt.trim(),
      category,
      tags:          tags.split(',').map(t => t.trim()).filter(Boolean),
      published:     publishNow,
      featuredImage: featuredImage || '',
    };

    try {
      const url    = id ? `/api/blog/${id}` : '/api/blog';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('Session expired — please log out and log back in.');
        throw new Error(data.error || data.message || 'Save failed');
      }
      navigate('/admin?tab=content');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingPost) {
    return <div className="blog-editor-page"><p className="loading-text" style={{padding:'80px 24px'}}>Loading post…</p></div>;
  }

  return (
    <div className="blog-editor-page">

      <div className="blog-editor-header">
        <div>
          <div className="section-eyebrow">Content Management</div>
          <h1 className="blog-editor-title">{id ? 'Edit Post' : 'New Post'}</h1>
        </div>
        <button className="blog-editor-back" onClick={() => navigate('/admin?tab=content')}>
          ← Back to Admin
        </button>
      </div>

      {error && <div className="blog-editor-error">{error}</div>}

      <div className="blog-editor-body">

        {/* Main column */}
        <div className="blog-editor-main">

          <div className="blog-field">
            <label className="blog-field-label">Title</label>
            <input
              className="blog-field-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter post title…"
              maxLength={160}
            />
          </div>

          <div className="blog-field">
            <label className="blog-field-label">Content</label>
            <RichTextEditor initialValue={content} onChange={setContent} />
          </div>

        </div>

        {/* Sidebar */}
        <div className="blog-editor-sidebar">

          {/* Publish */}
          <div className="blog-sidebar-card">
            <h3>Publish</h3>
            <div className="blog-publish-status">
              Status: <strong>{published ? '🟢 Published' : '⚪ Draft'}</strong>
            </div>
            <div className="blog-publish-actions">
              <button className="blog-btn blog-btn-secondary" onClick={() => save(false)} disabled={saving}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button className="blog-btn blog-btn-primary" onClick={() => save(true)} disabled={saving}>
                {saving ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>

          {/* Featured Image */}
          <div className="blog-sidebar-card">
            <h3>Featured Image</h3>
            <input
              ref={featImgInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFeaturedImageChange}
            />

            {featuredImage ? (
              <div className="feat-img-preview-wrap">
                <img src={featuredImage} alt="Featured" className="feat-img-preview" />
                <div className="feat-img-actions">
                  <button
                    type="button"
                    className="blog-action-btn"
                    onClick={() => featImgInputRef.current?.click()}
                    disabled={imgUploading}
                  >
                    {imgUploading ? 'Processing…' : 'Replace'}
                  </button>
                  <button
                    type="button"
                    className="blog-action-btn danger"
                    onClick={() => setFeaturedImage('')}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="feat-img-upload-btn"
                onClick={() => featImgInputRef.current?.click()}
                disabled={imgUploading}
              >
                {imgUploading ? 'Processing…' : '+ Upload Image'}
              </button>
            )}
            <p className="blog-field-hint">Displayed as thumbnail and at the top of the post. Auto-compressed.</p>
          </div>

          {/* Content Type */}
          <div className="blog-sidebar-card">
            <h3>Content Type</h3>
            <select
              className="blog-field-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Tags */}
          <div className="blog-sidebar-card">
            <h3>Tags</h3>
            <input
              className="blog-field-input"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="asx, investing, etf (comma-separated)"
            />
            <p className="blog-field-hint">Separate tags with commas</p>
          </div>

          {/* Excerpt */}
          <div className="blog-sidebar-card">
            <h3>Excerpt</h3>
            <textarea
              className="blog-field-textarea"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Short summary shown in blog listing. Auto-generated from content if left blank."
              rows={4}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
