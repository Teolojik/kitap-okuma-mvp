export default function handler(req, res) {
    const { img, title, author, text } = req.query;
    const cleanText = text ? decodeURIComponent(text).slice(0, 160) + '...' : 'Kitaptan bir alıntı paylaşıldı.';

    // Basic HTML template with OG meta tags and rich Schema.org data
    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    <meta name="keywords" content="${title}, ${author}, kitap alıntıları, book quotes, epigraphreader, okuma notları, dijital kütüphane">
    
    <!-- Dynamic Social Tags -->
    <title>${title} - ${author} | epigraphreader.com Alıntıları</title>
    <meta name="description" content="${cleanText}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="article:author" content="${author}">
    <meta property="og:title" content="${title} | ${author} - epigraphreader.com">
    <meta property="og:description" content="${cleanText}">
    <meta property="og:image" content="${img}">
    <meta property="og:url" content="https://www.epigraphreader.com/api/share?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@epigraphreader">
    <meta name="twitter:title" content="${title} | ${author}">
    <meta name="twitter:description" content="${cleanText}">
    <meta name="twitter:image" content="${img}">

    <!-- Schema.org Rich Result for Google -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Quotation",
      "text": "${text ? decodeURIComponent(text).replace(/"/g, '&quot;') : ''}",
      "creator": {
        "@type": "Person",
        "name": "${author}"
      },
      "citation": {
        "@type": "CreativeWork",
        "name": "${title}"
      },
      "publisher": {
        "@type": "Organization",
        "name": "epigraphreader.com",
        "logo": "https://www.epigraphreader.com/og-card.png"
      }
    }
    </script>

    <!-- Auto-redirect for users, crawlers see the content -->
    <script>
        if (!/bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent)) {
            setTimeout(() => {
                window.location.href = "https://www.epigraphreader.com/";
            }, 3000);
        }
    </script>
    
    <style>
        body { 
            background: #0f172a; 
            color: #f8fafc; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            font-family: 'Inter', -apple-system, sans-serif;
            margin: 0;
            text-align: center;
            padding: 20px;
        }
        .card {
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 24px;
            max-width: 600px;
            backdrop-filter: blur(12px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .quote {
            font-size: 1.25rem;
            font-style: italic;
            line-height: 1.6;
            margin-bottom: 24px;
            color: #e2e8f0;
        }
        .meta {
            font-weight: 700;
            color: #f97316;
            letter-spacing: -0.025em;
        }
        .loader {
            border: 3px solid rgba(249, 115, 22, 0.1);
            border-top: 3px solid #f97316;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            display: inline-block;
            vertical-align: middle;
            margin-right: 12px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .branding {
            margin-top: 32px;
            font-size: 0.875rem;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="quote">"${cleanText}"</div>
        <div class="meta">${title} — ${author}</div>
        <div class="branding">epigraphreader.com</div>
    </div>
    <div style="margin-top: 40px;">
        <div class="loader"></div>
        <span style="opacity: 0.7; font-size: 0.9rem;">Uygulamaya yönlendiriliyorsunuz...</span>
    </div>
</body>
</html>
  `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
}
