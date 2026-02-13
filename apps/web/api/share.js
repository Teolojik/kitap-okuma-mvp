
export default function handler(req, res) {
    const { img, title, author } = req.query;

    // Basic HTML template with OG meta tags
    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Dynamic Social Tags -->
    <title>Epigraph - "${title}" Alıntısı</title>
    <meta name="description" content="${author} - ${title}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Epigraph - Kitap Alıntısı">
    <meta property="og:description" content="${author} - ${title}">
    <meta property="og:image" content="${img}">
    <meta property="og:url" content="https://epigraphreader.com">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Epigraph - Kitap Alıntısı">
    <meta name="twitter:description" content="${author} - ${title}">
    <meta name="twitter:image" content="${img}">

    <!-- Redirect to home after crawl or if user visits -->
    <script>
        setTimeout(() => {
            window.location.href = "https://epigraphreader.com";
        }, 1500);
    </script>
    
    <style>
        body { 
            background: #0f172a; 
            color: white; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            font-family: sans-serif;
            margin: 0;
        }
        .loader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #f97316;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 2s linear infinite;
            margin-bottom: 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loader"></div>
    <p>Kitap dünyasına yönlendiriliyorsunuz...</p>
</body>
</html>
  `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
}
