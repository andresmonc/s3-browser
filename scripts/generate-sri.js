#!/usr/bin/env node
/**
 * Generate Subresource Integrity (SRI) hashes for external resources
 * 
 * Usage:
 *   node scripts/generate-sri.js <url>
 * 
 * Example:
 *   node scripts/generate-sri.js https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

function generateSRI(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        client.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
                return;
            }

            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const content = Buffer.concat(chunks);
                const hash = crypto.createHash('sha384').update(content).digest('base64');
                const sri = `sha384-${hash}`;
                
                console.log(`\nURL: ${url}`);
                console.log(`SRI Hash: ${sri}`);
                console.log(`\nHTML Usage:`);
                console.log(`  <link rel="stylesheet" href="${url}" integrity="${sri}" crossorigin="anonymous">`);
                console.log(`  <script src="${url}" integrity="${sri}" crossorigin="anonymous"></script>`);
                
                resolve(sri);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Get URL from command line arguments
const url = process.argv[2];

if (!url) {
    console.error('Usage: node scripts/generate-sri.js <url>');
    console.error('Example: node scripts/generate-sri.js https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css');
    process.exit(1);
}

generateSRI(url)
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err.message);
        process.exit(1);
    });

