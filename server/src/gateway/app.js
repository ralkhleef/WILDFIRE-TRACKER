const cors = require('cors');
const express = require('express');

const env = require('../config/env');

const app = express();

const serviceTargets = {
  auth: env.authServiceUrl,
  fire: env.fireServiceUrl,
  alert: env.alertServiceUrl,
  evacuation: env.evacuationServiceUrl,
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.frontendOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[API Gateway] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'API Gateway',
    message: 'WildFire-Tracker API Gateway is running.',
    timestamp: new Date().toISOString(),
    services: serviceTargets,
  });
});

const copyForwardHeaders = (req) => {
  const headers = {};
  ['authorization', 'content-type', 'accept'].forEach((name) => {
    if (req.headers[name]) headers[name] = req.headers[name];
  });
  return headers;
};

const proxyTo = (targetBase) => async (req, res) => {
  const targetUrl = `${targetBase.replace(/\/$/, '')}${req.originalUrl}`;
  const hasBody = !['GET', 'HEAD'].includes(req.method);

  try {
    const headers = copyForwardHeaders(req);
    if (hasBody) headers['content-type'] = 'application/json';

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body || {}) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    res.status(response.status);
    if (contentType.includes('application/json')) {
      const body = await response.json().catch(() => ({}));
      return res.json(body);
    }

    const text = await response.text();
    return res.type(contentType || 'text/plain').send(text);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: 'API Gateway could not reach a downstream service.',
      target: targetBase,
      details: error.message,
    });
  }
};

app.use('/api/auth', proxyTo(serviceTargets.auth));
app.use('/api/users', proxyTo(serviceTargets.auth));
app.use('/api/fires', proxyTo(serviceTargets.fire));
app.use('/api/nws-alerts', proxyTo(serviceTargets.fire));
app.use('/api/locations', proxyTo(serviceTargets.fire));
app.use('/api/resources', proxyTo(serviceTargets.fire));
app.use('/api/air-quality', proxyTo(serviceTargets.fire));
app.use('/api/alerts', proxyTo(serviceTargets.alert));
app.use('/api/evacuation-resources', proxyTo(serviceTargets.evacuation));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Gateway route not found: ${req.method} ${req.originalUrl}`,
  });
});

module.exports = app;
