const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

test('Server Config - Environment Variables & Directory Discovery', async (t) => {
    await t.test('reads PORT and SECURITY_TOKEN from environment', () => {
        // Set test env variables
        const testToken = 'my_custom_secure_test_token_123';
        process.env.SECURITY_TOKEN = testToken;
        process.env.PORT = '3500';
        process.env.MUSIC_DIR = '/tmp/test_music_dir_1,/tmp/test_music_dir_2';

        // Clear module cache to re-run loadConfig()
        const configPath = path.resolve(__dirname, '../config.js');
        delete require.cache[configPath];
        const config = require('../config.js');

        assert.strictEqual(config.port, 3500, 'Port should match PORT env variable');
        assert.strictEqual(config.token, testToken, 'Token should match SECURITY_TOKEN env variable');
        assert.ok(
            config.directories.includes('/tmp/test_music_dir_1'),
            'MUSIC_DIR directories should be included in config.directories'
        );
        assert.ok(
            config.directories.includes('/tmp/test_music_dir_2'),
            'MUSIC_DIR directories should be included in config.directories'
        );

        // Clean up
        delete process.env.SECURITY_TOKEN;
        delete process.env.PORT;
        delete process.env.MUSIC_DIR;
    });

    await t.test('generates random token if none provided', () => {
        delete process.env.SECURITY_TOKEN;
        delete process.env.TOKEN;

        const configPath = path.resolve(__dirname, '../config.js');
        delete require.cache[configPath];
        const config = require('../config.js');

        assert.ok(config.token, 'A token should be present');
        assert.ok(config.token.length >= 16, 'Generated token should be at least 16 chars');
    });
});

test('Auth & CORS Middleware', async (t) => {
    await t.test('CORS in open mode (ALLOWED_ORIGINS=*) allows cross-origin requests and OPTIONS preflight', () => {
        process.env.ALLOWED_ORIGINS = '*';

        const authPath = path.resolve(__dirname, '../src/middleware/auth.js');
        delete require.cache[authPath];
        const { corsMiddleware } = require('../src/middleware/auth.js');

        let headers = {};
        let statusSet = null;
        const mockRes = {
            setHeader: (k, v) => { headers[k] = v; },
            sendStatus: (code) => { statusSet = code; },
        };

        const mockReqOptions = {
            method: 'OPTIONS',
            headers: { origin: 'http://localhost:5173' },
        };

        let nextCalled = false;
        corsMiddleware(mockReqOptions, mockRes, () => { nextCalled = true; });

        assert.strictEqual(statusSet, 200, 'OPTIONS preflight should return 200 OK');
        assert.strictEqual(
            headers['Access-Control-Allow-Origin'],
            'http://localhost:5173',
            'Access-Control-Allow-Origin should allow the requesting origin'
        );

        // Test normal GET request
        headers = {};
        statusSet = null;
        nextCalled = false;
        const mockReqGet = {
            method: 'GET',
            headers: { origin: 'http://192.168.1.50:3000' },
        };
        corsMiddleware(mockReqGet, mockRes, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true, 'GET request should call next()');
        assert.strictEqual(
            headers['Access-Control-Allow-Origin'],
            'http://192.168.1.50:3000',
            'Access-Control-Allow-Origin should match origin'
        );

        delete process.env.ALLOWED_ORIGINS;
    });

    await t.test('requireAuth correctly validates Bearer token and rejects invalid tokens', () => {
        process.env.SECURITY_TOKEN = 'secret_test_token';
        const configPath = path.resolve(__dirname, '../config.js');
        delete require.cache[configPath];
        const authPath = path.resolve(__dirname, '../src/middleware/auth.js');
        delete require.cache[authPath];
        const { requireAuth } = require('../src/middleware/auth.js');

        let statusCode = null;
        let responseJson = null;
        let responseHeaders = {};
        const mockRes = {
            setHeader: (k, v) => { responseHeaders[k] = v; },
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => { responseJson = data; }
                };
            }
        };

        // 1. Valid token
        let nextCalled = false;
        const reqValid = {
            method: 'GET',
            path: '/api/status',
            headers: { authorization: 'Bearer secret_test_token' },
            query: {}
        };
        requireAuth(reqValid, mockRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, 'Valid token should pass requireAuth');
        assert.strictEqual(reqValid.isMasterToken, true, 'isMasterToken should be true');

        // 2. Invalid token
        nextCalled = false;
        statusCode = null;
        const reqInvalid = {
            method: 'GET',
            path: '/api/status',
            headers: { authorization: 'Bearer wrong_token' },
            query: {}
        };
        requireAuth(reqInvalid, mockRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false, 'Invalid token should not call next()');
        assert.strictEqual(statusCode, 401, 'Invalid token should return 401');

        // 3. Missing token
        nextCalled = false;
        statusCode = null;
        const reqMissing = {
            method: 'GET',
            path: '/api/status',
            headers: {},
            query: {}
        };
        requireAuth(reqMissing, mockRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false, 'Missing token should not call next()');
        assert.strictEqual(statusCode, 401, 'Missing token should return 401');

        delete process.env.SECURITY_TOKEN;
    });
});
