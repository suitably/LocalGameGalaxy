const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const express = require('express');
const config = require('../../config');

const requireAuth = (req, res, next) => {
    if (req.method === 'OPTIONS') return next();

    if (req.path === '/' || req.path === '/favicon.ico') {
        return next();
    }
    const token = req.headers['authorization'] || req.query.token;
    const cleanToken = token?.replace('Bearer ', '');

    req.isMasterToken = false;

    if (token === config.token || cleanToken === config.token) {
        req.isMasterToken = true;
        return next();
    }
    
    const validApiKey = config.apiKeys.find(k => k.token === token || k.token === cleanToken);
    if (validApiKey) {
        req.apiKey = validApiKey;
        return next();
    }
    
    res.status(401).json({ error: 'Unauthorized. Invalid Token.' });
};

const helmetMiddlewareInstance = helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    strictTransportSecurity: false
});

const helmetMiddleware = (req, res, next) => {
    if (req.path === '/media') {
        // Skip helmet for media to prevent strict ORB/CORP issues in Firefox
        return next();
    }
    helmetMiddlewareInstance(req, res, next);
};

// CORS configuration
const ENV_ORIGINS = process.env.ALLOWED_ORIGINS;
const RESTRICT_ORIGINS = !!ENV_ORIGINS;
const ALLOWED_ORIGINS = RESTRICT_ORIGINS
    ? [
        ...ENV_ORIGINS.split(',').map(o => o.trim()).filter(Boolean),
        'http://localhost',   // Always allow local dev
        'http://127.0.0.1',  // Always allow local dev
      ]
    : [];

if (RESTRICT_ORIGINS) {
    console.log(`[CORS] Restricted mode. Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
} else {
    console.log('[CORS] Open mode (no ALLOWED_ORIGINS set). All origins permitted.');
}

const isOriginAllowed = (origin) => {
    if (!origin) return true;  // No origin = direct access (curl, browser nav), handled by token auth
    if (!RESTRICT_ORIGINS) return true; // Open mode: allow everything
    return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed + ':'));
};

const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Limit');

    if (req.method === 'OPTIONS') {
        if (origin && !isOriginAllowed(origin)) {
            return res.sendStatus(403);
        }
        res.sendStatus(200);
    } else {
        next();
    }
};

const createLimiter = (windowMs, limitField, defaultLimit) => rateLimit({
    windowMs,
    max: (req, res) => {
        if (req.apiKey && req.apiKey[limitField] !== null && req.apiKey[limitField] !== undefined) {
            return req.apiKey[limitField];
        }
        return defaultLimit;
    },
    keyGenerator: (req) => {
        if (req.apiKey) return req.apiKey.id;
        return req.ip;
    },
    skip: (req, res) => {
        if (req.isMasterToken) return true;
        if (req.apiKey) {
            return req.apiKey[limitField] === null || req.apiKey[limitField] === undefined;
        }
        return false;
    },
    validate: { ip: false },
    standardHeaders: true,
    legacyHeaders: false,
});

const limitSecond = createLimiter(1000, 'rateLimitSecond', 50);
const limitMinute = createLimiter(60 * 1000, 'rateLimitMinute', 1000);
const limitHour = createLimiter(60 * 60 * 1000, 'rateLimitHour', 10000);

const rateLimitMiddleware = (req, res, next) => {
    if (config.disableRateLimit) {
        return next();
    }
    limitSecond(req, res, (err) => {
        if (err) return next(err);
        limitMinute(req, res, (err) => {
            if (err) return next(err);
            limitHour(req, res, next);
        });
    });
};

module.exports = {
    requireAuth,
    helmetMiddleware,
    corsMiddleware,
    rateLimitMiddleware
};
