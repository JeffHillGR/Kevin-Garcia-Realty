export default async function handler(req, res) {
  const { postId } = req.query;
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9g7BFlNMQnt3Jas-94ZiG0iHvaXAmyaDkr6GWJWlZT6O4Y6CnXjQebEAcF-hD2sv2/exec';

  try {
    // Fetch blog posts from Google Sheets
    const response = await fetch(GOOGLE_SCRIPT_URL + '?type=kevin_blog');
    const posts = await response.json();

    if (!posts || posts.length === 0) {
      return redirectToMain(res, 'No posts found');
    }

    // Find the post by ID or index
    let post = posts.find(p => p.id === postId);

    // If not found by ID, try by index (for backwards compatibility)
    if (!post && !isNaN(postId)) {
      const index = parseInt(postId);
      if (index >= 0 && index < posts.length) {
        post = posts[index];
      }
    }

    // If still not found, use the first/latest post
    if (!post) {
      post = posts[0];
    }

    // Extract image from content if present
    let imageUrl = post.image || '';
    if (!imageUrl && post.content) {
      const imgMatch = post.content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }
    }
    // Fallback to a default image
    if (!imageUrl) {
      imageUrl = 'https://www.exploregr.com/images/Kevin%20Headshot%202.png';
    }

    // Sanitize strings
    const sanitize = (str) => {
      if (!str) return '';
      return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/<[^>]*>/g, '');
    };

    const safeTitle = sanitize(post.title);

    // Extract plain text description from content
    let description = sanitize(post.content || '').substring(0, 200);
    if (post.content && post.content.length > 200) {
      description += '...';
    }

    // Format date
    let formattedDate = '';
    try {
      formattedDate = new Date(post.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      formattedDate = post.date || '';
    }

    const siteUrl = 'https://www.exploregr.com';
    const shareUrl = `${siteUrl}/api/share/${postId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary Meta Tags -->
  <title>${safeTitle} | Kevin Garcia Real Estate</title>
  <meta name="title" content="${safeTitle}">
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:site_name" content="Kevin Garcia Real Estate">
  <meta property="og:locale" content="en_US">
  <meta property="article:author" content="${sanitize(post.author) || 'Kevin Garcia'}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${shareUrl}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:alt" content="${safeTitle}">

  <!-- LinkedIn -->
  <meta property="og:type" content="article">
  <meta property="article:published_time" content="${post.date || ''}">

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      text-align: center;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    h1 {
      color: #1a3a5c;
      margin-bottom: 10px;
      font-size: 24px;
    }
    .date {
      color: #c9a227;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .author {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 20px;
      text-align: left;
    }
    a.btn {
      display: inline-block;
      background: #1a3a5c;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 20px;
    }
    a.btn:hover {
      background: #2a4a6c;
    }
    .redirect-message {
      color: #999;
      font-size: 14px;
      margin-top: 20px;
    }
  </style>

  <!-- Redirect real users (crawlers don't execute JavaScript) -->
  <script>
    if (document.visibilityState !== 'prerender') {
      setTimeout(function() {
        window.location.replace('${siteUrl}#insights');
      }, 50);
    }
  </script>
</head>
<body>
  <div class="container">
    ${imageUrl ? `<img src="${imageUrl}" alt="${safeTitle}">` : ''}
    <h1>${safeTitle}</h1>
    ${formattedDate ? `<p class="date">${formattedDate}</p>` : ''}
    ${post.author ? `<p class="author">By ${sanitize(post.author)}</p>` : ''}
    <p>${description}</p>
    <a href="${siteUrl}#insights" class="btn">Read Full Article</a>
    <p class="redirect-message">Redirecting you to the article...</p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(html);

  } catch (error) {
    console.error('Error generating share page:', error);
    return redirectToMain(res, error.message);
  }
}

function redirectToMain(res, message) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="Kevin Garcia Real Estate">
  <meta property="og:description" content="Your trusted West Michigan real estate professional">
  <meta property="og:image" content="https://www.exploregr.com/images/Kevin%20Headshot%202.png">
  <script>window.location.replace('https://www.exploregr.com');</script>
</head>
<body>
  <p>Redirecting...</p>
  <a href="https://www.exploregr.com">Click here</a>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
