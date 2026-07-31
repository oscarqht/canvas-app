const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.MOCK_PORT || 4000;

app.use(cors());
app.use(express.json());

// Mock OAuth Tokens
app.post('/oauth/access_token', (req, res) => {
  res.json({
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 3600,
    token_type: 'Bearer'
  });
});

// Mock OAuth Authorize (Just redirect back immediately for mock)
app.get('/oauth/authorize', (req, res) => {
  const redirectUri = req.query.redirect_uri;
  if (redirectUri) {
    res.redirect(`${redirectUri}?code=mock_auth_code`);
  } else {
    res.status(400).send('Missing redirect_uri');
  }
});

// Mock REST API

// User Profile
app.get('/rest/v1/user', (req, res) => {
  if (req.headers.authorization !== 'Bearer mock_access_token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({
    result: true,
    user: {
      _id: 1,
      fullName: 'Mock User',
      email: 'mock@example.com',
      email_MD5: 'mock_md5',
      pro: true,
      registered: new Date().toISOString()
    }
  });
});

// Collections (Root)
app.get('/rest/v1/collections', (req, res) => {
  if (req.headers.authorization !== 'Bearer mock_access_token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({
    result: true,
    items: [
      {
        _id: 100,
        title: 'Canvas',
        count: 2,
        cover: []
      }
    ]
  });
});

// Collections (Children)
app.get('/rest/v1/collections/childrens', (req, res) => {
  if (req.headers.authorization !== 'Bearer mock_access_token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({
    result: true,
    items: [
      {
        _id: 101,
        title: 'Characters',
        count: 2,
        cover: [],
        parent: { $id: 100 }
      },
      {
        _id: 102,
        title: 'Styles',
        count: 1,
        cover: [],
        parent: { $id: 100 }
      },
      {
        _id: 103,
        title: 'Cyberpunk Anime',
        count: 3,
        cover: [],
        parent: { $id: 102 }
      }
    ]
  });
});

// Raindrops
app.get('/rest/v1/raindrops/:collectionId', (req, res) => {
  if (req.headers.authorization !== 'Bearer mock_access_token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const collectionId = parseInt(req.params.collectionId, 10);

  if (collectionId === 101) {
    // Characters
    return res.json({
      result: true,
      items: [
        {
          _id: 1001,
          title: 'Elena',
          excerpt: 'A fierce warrior with a scar over her left eye.',
          note: 'elena, female warrior',
          type: 'image',
          cover: 'https://placehold.co/400x400/png',
          media: [{ link: 'https://placehold.co/400x400/png', type: 'image' }],
          tags: []
        },
        {
          _id: 1002,
          title: 'Marcus',
          excerpt: 'A wise old wizard with a long silver beard.',
          note: 'marcus, wizard, old man',
          type: 'image',
          cover: 'https://placehold.co/400x400/png',
          media: [{ link: 'https://placehold.co/400x400/png', type: 'image' }],
          tags: []
        }
      ]
    });
  } else if (collectionId === 103) {
    // Cyberpunk Anime Style Pack
    return res.json({
      result: true,
      items: [
        {
          _id: 2001,
          title: 'preview.jpg',
          excerpt: 'Cyberpunk anime style, vibrant neon colors, highly detailed.',
          note: 'Use strong contrast.',
          type: 'image',
          cover: 'https://placehold.co/400x400/png',
          media: [{ link: 'https://placehold.co/400x400/png', type: 'image' }],
          tags: []
        },
        {
          _id: 2002,
          title: 'reference-1.jpg',
          excerpt: '',
          note: '',
          type: 'image',
          cover: 'https://placehold.co/400x400/png',
          media: [{ link: 'https://placehold.co/400x400/png', type: 'image' }],
          tags: []
        },
        {
          _id: 2003,
          title: 'reference-2.png',
          excerpt: '',
          note: '',
          type: 'image',
          cover: 'https://placehold.co/400x400/png',
          media: [{ link: 'https://placehold.co/400x400/png', type: 'image' }],
          tags: []
        }
      ]
    });
  }

  return res.json({
    result: true,
    items: []
  });
});

app.listen(port, () => {
  console.log(`Mock server listening at http://localhost:${port}`);
});
