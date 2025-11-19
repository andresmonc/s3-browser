/**
 * Utility to help users download the application as an offline bundle
 */

import JSZip from 'jszip';

/**
 * Download the application as a zip file containing HTML, JS, and CSS
 */
export async function downloadOfflineBundle() {
    try {
        const zip = new JSZip();
        const assetsFolder = zip.folder('assets');
        
        if (!assetsFolder) {
            throw new Error('Failed to create assets folder in zip');
        }
        
        // Find and fetch all CSS and JS files from the page
        // Only include local assets, exclude CDN resources
        const stylesheets: Array<{ url: string; filename: string }> = [];
        const scripts: Array<{ url: string; filename: string }> = [];
        
        // Get all stylesheet links (only local files, exclude CDN)
        document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
            const href = (link as HTMLLinkElement).href;
            // Only include local files (same origin or relative paths)
            // Exclude CDN resources and data/blob URLs
            if (href && 
                !href.startsWith('data:') && 
                !href.startsWith('blob:') &&
                !href.includes('cdn.jsdelivr.net') &&
                !href.includes('cdnjs.cloudflare.com') &&
                (href.startsWith(window.location.origin) || href.startsWith('/'))) {
                
                // Extract filename from URL, handling query params and paths
                let filename = href.split('/').pop()?.split('?')[0] || 'style.css';
                // If filename doesn't have extension, try to get it from the path
                if (!filename.includes('.')) {
                    const pathParts = href.split('/');
                    filename = pathParts[pathParts.length - 2] + '/' + filename;
                }
                // Ensure it's just the filename, not a path
                filename = filename.split('/').pop() || 'style.css';
                stylesheets.push({ url: href, filename });
            }
        });
        
        // Get all script sources (only local files, exclude CDN)
        document.querySelectorAll('script[src]').forEach((script) => {
            const src = (script as HTMLScriptElement).src;
            // Only include local files (same origin or relative paths)
            // Exclude CDN resources and data/blob URLs
            if (src && 
                !src.startsWith('data:') && 
                !src.startsWith('blob:') &&
                !src.includes('cdn.jsdelivr.net') &&
                !src.includes('cdnjs.cloudflare.com') &&
                (src.startsWith(window.location.origin) || src.startsWith('/'))) {
                
                // Extract filename from URL, handling query params
                let filename = src.split('/').pop()?.split('?')[0] || 'script.js';
                // Handle Vite's asset structure (might be in assets folder)
                if (src.includes('/assets/')) {
                    filename = src.split('/assets/').pop()?.split('?')[0] || filename;
                }
                // Ensure it's just the filename
                filename = filename.split('/').pop() || 'script.js';
                scripts.push({ url: src, filename });
            }
        });
        
        // Fetch and add CSS files
        for (const { url, filename } of stylesheets) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const cssContent = await response.text();
                    assetsFolder.file(filename, cssContent);
                }
            } catch (error) {
                console.warn(`Failed to fetch CSS: ${url}`, error);
            }
        }
        
        // Fetch and add JS files
        for (const { url, filename } of scripts) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const jsContent = await response.text();
                    assetsFolder.file(filename, jsContent);
                }
            } catch (error) {
                console.warn(`Failed to fetch JS: ${url}`, error);
            }
        }
        
        // Create HTML file with updated paths (relative paths for offline use)
        // Include strict CSP and security headers
        const htmlTemplate = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https:; font-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none';">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
    <title>S3 Browser</title>
    ${stylesheets.length > 0 ? stylesheets.map(({ filename }) => `<link rel="stylesheet" href="./assets/${filename}" />`).join('\n    ') : ''}
  </head>
  <body>
    <div id="root"></div>
    ${scripts.length > 0 ? scripts.map(({ filename }) => `<script type="module" src="./assets/${filename}"></script>`).join('\n    ') : '<script>alert("No scripts found. Please build the application first (npm run build) and download the bundle from the built version.");</script>'}
  </body>
</html>`;
        
        zip.file('index.html', htmlTemplate);
        
        // Create a README with instructions
        const readme = `# S3 Browser - Offline Bundle

## ⚠️ IMPORTANT: You Must Serve via HTTP

**This application CANNOT be opened directly from the file system** (double-clicking index.html won't work).

Browsers block loading JavaScript modules from the \`file://\` protocol due to security restrictions. You MUST serve these files via HTTP.

## How to Use

1. Extract this zip file to a folder
2. **Open a terminal/command prompt** in that folder
3. Serve the files using any static file server:

   **Using Python (recommended):**
   \`\`\`bash
   python3 -m http.server 8000
   \`\`\`
   
   **Using Node.js (http-server):**
   \`\`\`bash
   npx http-server . -p 8000
   \`\`\`
   
   **Using PHP:**
   \`\`\`bash
   php -S localhost:8000
   \`\`\`

4. Open your browser and navigate to \`http://localhost:8000\`

## Why HTTP is Required

Modern browsers enforce CORS (Cross-Origin Resource Sharing) policies that prevent loading ES modules from \`file://\` URLs. This is a security feature. Serving via HTTP (even locally) satisfies these requirements.

## Important Notes

- The application requires a modern browser with Web Crypto API support
- All credentials are encrypted and stored locally in your browser
- The application works completely offline once served via HTTP
- Make sure to keep your encryption password secure

## Security

Remember that this is a client-side application. Credentials are encrypted locally but still stored in your browser's localStorage. Use strong passwords and keep your device secure.
`;
        zip.file('README.md', readme);
        
        // Check if we have any assets
        if (stylesheets.length === 0 && scripts.length === 0) {
            alert('No local assets found. This feature works best when the application is built (npm run build) and served from the dist folder. Please build the application first, then download the bundle.');
            return;
        }
        
        // Generate the zip file
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        
        // Download the zip
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 's3-browser-offline-bundle.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Failed to create offline bundle:', error);
        alert('Failed to create offline bundle. Please check the browser console for details. Note: This feature works best when the application is built (npm run build) and served from the dist folder.');
    }
}

