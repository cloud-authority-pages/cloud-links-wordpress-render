const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const posts = {};
let postIdCounter = 1;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

app.get('/', (req, res) => {
  const postList = Object.values(posts).reverse().map(p =>
    `<article style="margin-bottom:30px;padding-bottom:20px;border-bottom:1px solid #eee">
      <h2><a href="/post/${p.slug}" style="color:#1a1a1a;text-decoration:none">${p.title}</a></h2>
      <p style="color:#666;font-size:14px">${new Date(p.date).toLocaleDateString()} by ${p.author}</p>
      <p>${p.excerpt}</p>
    </article>`
  ).join('') || '<p>No posts yet.</p>';

  res.send(\`<!DOCTYPE html>
<html>
<head><title>Cloud Links Blog</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:20px}
h1{color:#1a1a1a;border-bottom:2px solid #0073aa;padding-bottom:10px}
a{color:#0073aa}</style>
</head>
<body>
<h1>Cloud Links Blog</h1>
<p>Cloud authority resources, SEO strategies, and link building insights.</p>
\${postList}
</body></html>\`);
});

app.get('/post/:slug', (req, res) => {
  const post = Object.values(posts).find(p => p.slug === req.params.slug);
  if (!post) return res.status(404).send('Post not found');
  res.send(\`<!DOCTYPE html>
<html>
<head><title>\${post.title} - Cloud Links Blog</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:20px}</style>
</head>
<body>
<p><a href="/">← Back to Blog</a></p>
<h1>\${post.title}</h1>
<p style="color:#666">\${new Date(post.date).toLocaleDateString()} by \${post.author}</p>
<div>\${post.content}</div>
</body></html>\`);
});

// REST API for the CAB adapter
app.get('/wp-json/wp/v2/posts', (req, res) => {
  res.json(Object.values(posts).map(p => ({
    id: p.id, slug: p.slug, title: { rendered: p.title },
    content: { rendered: p.content }, link: \`/post/\${p.slug}\`
  })));
});

app.post('/wp-json/wp/v2/posts', (req, res) => {
  const id = postIdCounter++;
  const title = req.body.title || 'Untitled';
  const slug = req.body.slug || slugify(title) + '-' + id;
  const post = {
    id, slug, title,
    content: req.body.content || '',
    excerpt: (req.body.content || '').replace(/<[^>]+>/g, '').slice(0, 150) + '...',
    author: req.body.author || 'Cloud Links',
    status: req.body.status || 'publish',
    date: new Date().toISOString()
  };
  posts[slug] = post;
  res.status(201).json({ id, slug, link: \`/post/\${slug}\` });
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log('Cloud Links Blog running on port', PORT));
