const WebSocket = require('ws');
const express = require('express');
const app = express();
const PORT = 80;

// Serve the dashboard HTML
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>POLAR VPN Dashboard</title>
        </head>
        <body>
            <h1>POLAR VPN Dashboard</h1>
            <button onclick="startVpn()">Start VPN</button>
            <button onclick="stopVpn()">Stop VPN</button>
            <input type="text" id="url" placeholder="Enter URL">
            <button onclick="browse()">Browse</button>
            <div id="output"></div>
            <script>
                const ws = new WebSocket('ws://localhost:9091');

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    const output = document.getElementById('output');
                    if (data.status) {
                        output.textContent = data.status;
                    } else if (data.content) {
                        output.innerHTML = data.content;
                    } else if (data.error) {
                        output.textContent = 'Error: ' + data.error;
                    }
                };

                function startVpn() {
                    ws.send(JSON.stringify({ action: 'startVpn' }));
                }

                function stopVpn() {
                    ws.send(JSON.stringify({ action: 'stopVpn' }));
                }

                function browse() {
                    const url = document.getElementById('url').value;
                    ws.send(JSON.stringify({ action: 'browse', url }));
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Client dashboard running at http://localhost:${PORT}`);
});
