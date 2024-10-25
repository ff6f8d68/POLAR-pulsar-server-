const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const AnonymizeUA = require('puppeteer-extra-plugin-anonymize-ua');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(AnonymizeUA());
puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000; // Use the port set by the hosting service

app.use(bodyParser.json());

const clients = new Map(); // Map to keep track of clients and their browser instances

app.post('/start-vpn', async (req, res) => {
    const clientId = req.body.clientId;
    if (!clientId) return res.status(400).send({ error: 'Client ID is required' });

    if (clients.has(clientId)) {
        return res.status(400).send({ error: 'VPN already connected for this client' });
    }

    try {
        const browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        clients.set(clientId, { browserInstance });
        res.send({ status: 'VPN connected' });
    } catch (error) {
        console.error('Error in startVpn:', error);
        res.status(500).send({ error: 'Failed to connect VPN', details: error.toString() });
    }
});

app.post('/stop-vpn', async (req, res) => {
    const clientId = req.body.clientId;
    if (!clientId || !clients.has(clientId)) {
        return res.status(400).send({ error: 'Client not connected' });
    }

    const client = clients.get(clientId);
    try {
        await client.browserInstance.close();
        clients.delete(clientId);
        res.send({ status: 'VPN disconnected' });
    } catch (error) {
        console.error('Error in stopVpn:', error);
        res.status(500).send({ error: 'Failed to disconnect VPN', details: error.toString() });
    }
});

app.post('/browse', async (req, res) => {
    const clientId = req.body.clientId;
    const url = req.body.url;
    const options = req.body.options || {};

    if (!clientId || !clients.has(clientId)) {
        return res.status(400).send({ error: 'VPN is not connected' });
    }

    const client = clients.get(clientId);
    const page = await client.browserInstance.newPage();
    try {
        console.log('Browsing to:', url);

        // Apply settings for maximum anonymity
        if (options.userAgent) {
            await page.setUserAgent(options.userAgent);
        }

        if (options.extraHeaders) {
            await page.setExtraHTTPHeaders(options.extraHeaders);
        }

        if (options.deleteCookies) {
            await page.deleteCookie(...await page.cookies());
        } else if (options.customCookies) {
            await page.setCookie(...options.customCookies.map(cookie => ({
                name: cookie.name,
                value: cookie.value,
                domain: new URL(url).hostname,
            })));
        }

        // IP Spoofing Headers
        await page.setExtraHTTPHeaders({
            'X-Forwarded-For': options.fakeIp || '192.168.0.1',
            'Client-IP': options.fakeIp || '192.168.0.1',
            'X-Real-IP': options.fakeIp || '192.168.0.1',
            ...options.extraHeaders,
        });

        // Navigate to page
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        const content = await page.content();
        res.send({ content });
    } catch (error) {
        console.error('Error in browse:', error);
        res.status(500).send({ error: 'Failed to browse', details: error.toString() });
    } finally {
        await page.close();
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
