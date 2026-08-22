const http = require('http');

const PORT = 80;
const TARGET_PORT = 3000;
const TARGET_HOST = '127.0.0.1';

const proxy = http.createServer((req, res) => {
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: req.headers.host || `192.168.1.101:${TARGET_PORT}`,
      'x-forwarded-host': req.headers.host,
      'x-forwarded-proto': 'http',
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<html><body style="font-family:sans-serif;text-align:center;padding:40px;"><h2>Invoice Server Starting...</h2><p>Please refresh in a few seconds.</p></body></html>');
  });

  req.pipe(proxyReq, { end: true });
});

proxy.listen(PORT, '0.0.0.0', () => {
  console.log(`[PROXY] 🌐 Port 80 Proxy Active -> Forwarding http://192.168.1.101 to http://${TARGET_HOST}:${TARGET_PORT}`);
});

proxy.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('[PROXY] ℹ️ Port 80 in use.');
  } else {
    console.warn('[PROXY] Warning:', err.message);
  }
});
