const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('No URL provided');

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': req.headers['user-agent'],
                'Accept': req.headers['accept'],
                'Referer': new URL(targetUrl).origin
            }
        });

        const contentType = response.headers.get('content-type');
        const body = await response.buffer();

        // Strip security headers
        const headers = {};
        response.headers.forEach((v, k) => {
            const lowKey = k.toLowerCase();
            if (!['content-security-policy', 'x-frame-options', 'content-encoding', 'transfer-encoding'].includes(lowKey)) {
                headers[k] = v;
            }
        });

        headers['Access-Control-Allow-Origin'] = '*';
        headers['X-Frame-Options'] = 'ALLOWALL';

        res.set(headers);

        if (contentType && contentType.includes('text/html')) {
            let html = body.toString();
            const baseUrl = new URL(targetUrl).origin;
            
            // Injection: Monkeypatching window.location and document.domain
            const injection = `
            <script>
                (function() {
                    const target = '${targetUrl}';
                    const targetOrigin = '${baseUrl}';
                    
                    // Spoof Location
                    const fakeLoc = new URL(target);
                    Object.defineProperty(window, 'location', {
                        value: new Proxy(window.location, {
                            get: (t, p) => p === 'href' ? fakeLoc.href : p === 'origin' ? targetOrigin : t[p]
                        }),
                        configurable: true
                    });

                    // Spoof Domain
                    try { Object.defineProperty(document, 'domain', { get: () => fakeLoc.hostname }); } catch(e) {}
                    
                    // Intercept Links
                    document.addEventListener('click', e => {
                        const a = e.target.closest('a');
                        if (a && a.href && !a.href.startsWith(location.origin)) {
                            e.preventDefault();
                            window.location.href = '/proxy?url=' + encodeURIComponent(a.href);
                        }
                    });
                })();
            </script>
            `;
            html = html.replace('<head>', '<head>' + injection);
            return res.send(html);
        }

        res.send(body);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.listen(PORT, () => console.log('Proxy running on port ' + PORT));
