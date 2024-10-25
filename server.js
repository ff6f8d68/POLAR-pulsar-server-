const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const wsServer = new WebSocket.Server({ port: 80 });
let browserInstance;

wsServer.on('connection', (ws) => {
    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        
        switch (data.action) {
            case 'startVpn':
                await startVpn(ws);
                break;
            case 'stopVpn':
                await stopVpn(ws);
                break;
            case 'browse':
                if (data.url) {
                    await browse(ws, data.url);
                } else {
                    ws.send(JSON.stringify({ error: 'No URL provided' }));
                }
                break;
            default:
                ws.send(JSON.stringify({ error: 'Unknown action' }));
                break;
        }
    });
});

// Start VPN (Puppeteer instance to simulate browsing)
async function startVpn(ws) {
    try {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        ws.send(JSON.stringify({ status: 'VPN connected' }));
    } catch (error) {
        ws.send(JSON.stringify({ error: 'Failed to connect VPN', details: error.toString() }));
    }
}

// Stop VPN (Close Puppeteer instance)
async function stopVpn(ws) {
    try {
        await browserInstance?.close();
        browserInstance = null;
        ws.send(JSON.stringify({ status: 'VPN disconnected' }));
    } catch (error) {
        ws.send(JSON.stringify({ error: 'Failed to disconnect VPN', details: error.toString() }));
    }
}

// Browse a URL (navigate in a new page in Puppeteer)
async function browse(ws, url) {
    if (!browserInstance) {
        ws.send(JSON.stringify({ error: 'VPN is not connected' }));
        return;
    }

    const page = await browserInstance.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        const content = await page.content();
        ws.send(JSON.stringify({ content }));
    } catch (error) {
        ws.send(JSON.stringify({ error: 'Failed to browse', details: error.toString() }));
    } finally {
        await page.close();
    }
}
