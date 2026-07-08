/**
 * Cloud Links Hub App — Niche-Based Content Server
 * 
 * Serves content organised by industry niche:
 *   GET  /                          → homepage with niche index
 *   GET  /:niche                    → niche landing page with post list
 *   GET  /:niche/:slug              → individual post page
 *   POST /api/posts                 → create/update a post (internal API)
 *   GET  /api/posts                 → list all posts (internal API)
 *   GET  /ghost/api/admin/site/     → Ghost API compatibility check
 *   POST /ghost/api/admin/posts/    → Ghost Admin API compatibility (publish)
 */

const express = require('express');
const { marked } = require('marked');
const app = express();
app.use(express.json({ limit: '10mb' }));

// In-memory store: { [niche]: { [slug]: post } }
const store = {};
let idCounter = 1;

const PLATFORM_NAME = process.env.PLATFORM_NAME || 'Cloud Links Hub';
const PLATFORM_COLOR = process.env.PLATFORM_COLOR || '#15171a';
const PLATFORM_ACCENT = process.env.PLATFORM_ACCENT || '#ff0095';

function slugify(text) {
  return (text || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeNiche(niche) {
  return slugify(niche || 'general');
}

function htmlPage(title, bodyHtml, niche) {
  const breadcrumb = niche
    ? `<nav><a href="/">Home</a> › <a href="/${niche}">${niche}</a></nav>`
    : `<nav><a href="/">Home</a></nav>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} | ${PLATFORM_NAME}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Georgia,serif;max-width:860px;margin:0 auto;padding:24px;color:#333;line-height:1.7}
    h1,h2,h3{color:${PLATFORM_COLOR};font-family:system-ui,sans-serif}
    a{color:${PLATFORM_ACCENT};text-decoration:none}
    a:hover{text-decoration:underline}
    nav{font-size:0.85em;margin-bottom:16px;color:#888}
    nav a{color:#888}
    .niche-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin:24px 0}
    .niche-card{border:1px solid #eee;border-radius:8px;padding:16px}
    .niche-card h3{margin:0 0 8px;font-size:1em}
    .post-list{list-style:none;padding:0}
    .post-list li{border-bottom:1px solid #f0f0f0;padding:12px 0}
    .post-list li:last-child{border-bottom:none}
    .post-meta{font-size:0.8em;color:#999;margin-top:4px}
    article{max-width:720px}
    article h1{font-size:2em;margin-bottom:8px}
    .post-date{color:#999;font-size:0.85em;margin-bottom:24px}
  </style>
</head>
<body>
${breadcrumb}
${bodyHtml}
</body>
</html>`;
}

// Homepage — list all niches
app.get('/', (req, res) => {
  const niches = Object.keys(store);
  if (niches.length === 0) {
    return res.send(htmlPage(PLATFORM_NAME, `
      <h1>${PLATFORM_NAME}</h1>
      <p>Authority content hub. No content published yet.</p>
    `));
  }
  const nicheCards = niches.map(niche => {
    const count = Object.keys(store[niche]).length;
    const posts = Object.values(store[niche]).slice(0, 3);
    const preview = posts.map(p => `<li><a href="/${niche}/${p.slug}">${p.title}</a></li>`).join('');
    return `<div class="niche-card">
      <h3><a href="/${niche}">${niche.replace(/-/g, ' ')}</a></h3>
      <ul style="list-style:none;padding:0;margin:0;font-size:0.85em">${preview}</ul>
      <p style="font-size:0.75em;color:#999;margin:8px 0 0">${count} article${count !== 1 ? 's' : ''}</p>
    </div>`;
  }).join('');
  res.send(htmlPage(PLATFORM_NAME, `
    <h1>${PLATFORM_NAME}</h1>
    <p>Authority content organised by industry.</p>
    <div class="niche-grid">${nicheCards}</div>
  `));
});

// Niche landing page
app.get('/:niche', (req, res, next) => {
  // Skip API and ghost routes
  if (req.params.niche === 'api' || req.params.niche === 'ghost') return next();
  const niche = normalizeNiche(req.params.niche);
  if (!store[niche] || Object.keys(store[niche]).length === 0) {
    return res.status(404).send(htmlPage('Not Found', `<h1>Section not found</h1><p>No content in this section yet.</p>`));
  }
  const posts = Object.values(store[niche]).sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  const postItems = posts.map(p => `
    <li>
      <a href="/${niche}/${p.slug}"><strong>${p.title}</strong></a>
      <div class="post-meta">${new Date(p.published_at).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}</div>
    </li>`).join('');
  res.send(htmlPage(niche.replace(/-/g, ' '), `
    <h1>${niche.replace(/-/g, ' ')}</h1>
    <ul class="post-list">${postItems}</ul>
  `, niche));
});

// Individual post page
app.get('/:niche/:slug', (req, res) => {
  const niche = normalizeNiche(req.params.niche);
  const post = store[niche]?.[req.params.slug];
  if (!post) return res.status(404).send(htmlPage('Not Found', `<h1>Post not found</h1>`));
  const content = post.html || (post.markdown ? marked(post.markdown) : '') || marked(post.mobiledoc || '');
  const dateStr = new Date(post.published_at).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});
  res.send(htmlPage(post.title, `
    <article>
      <h1>${post.title}</h1>
      <div class="post-date">Published ${dateStr}</div>
      <div class="post-body">${content}</div>
    </article>
  `, niche));
});

// Internal API — create/update post
app.post('/api/posts', (req, res) => {
  const { title, content, html, markdown, niche: rawNiche, slug: rawSlug, published_at } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const niche = normalizeNiche(rawNiche || 'general');
  const id = String(idCounter++);
  const slug = rawSlug || slugify(title) + '-' + id;
  if (!store[niche]) store[niche] = {};
  const post = {
    id, slug, niche, title,
    html: html || (markdown ? marked(markdown) : '') || '',
    markdown: markdown || '',
    mobiledoc: '',
    status: 'published',
    published_at: published_at || new Date().toISOString(),
    created_at: new Date().toISOString(),
    url: `/${niche}/${slug}`
  };
  store[niche][slug] = post;
  res.status(201).json({ post, url: post.url });
});

// Internal API — list posts
app.get('/api/posts', (req, res) => {
  const { niche } = req.query;
  if (niche) {
    const n = normalizeNiche(niche);
    return res.json({ posts: Object.values(store[n] || {}) });
  }
  const all = Object.values(store).flatMap(n => Object.values(n));
  res.json({ posts: all, total: all.length });
});

// Ghost Admin API compatibility — site info
app.get('/ghost/api/admin/site/', (req, res) => {
  res.json({ site: { title: PLATFORM_NAME, version: '5.0.0' } });
});

// Ghost Admin API compatibility — publish post
app.post('/ghost/api/admin/posts/', (req, res) => {
  const postData = req.body.posts?.[0] || req.body;
  const title = postData.title || 'Untitled';
  // Extract niche from tags if provided
  const tags = postData.tags || [];
  const nicheTag = tags.find(t => t.name?.startsWith('niche:'));
  const rawNiche = nicheTag ? nicheTag.name.replace('niche:', '') : (postData.niche || 'general');
  const niche = normalizeNiche(rawNiche);
  const id = String(idCounter++);
  const slug = postData.slug || slugify(title) + '-' + id;
  if (!store[niche]) store[niche] = {};
  const post = {
    id, slug, niche, title,
    html: postData.html || (postData.mobiledoc ? marked(postData.mobiledoc) : '') || '',
    mobiledoc: postData.mobiledoc || '',
    status: postData.status || 'published',
    published_at: postData.published_at || new Date().toISOString(),
    created_at: new Date().toISOString(),
    url: `/${niche}/${slug}`
  };
  store[niche][slug] = post;
  res.status(201).json({ posts: [{ ...post, url: `/${niche}/${slug}` }] });
});

app.get('/ghost/api/admin/posts/', (req, res) => {
  const all = Object.values(store).flatMap(n => Object.values(n));
  res.json({ posts: all });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`${PLATFORM_NAME} hub running on port ${PORT}`));
