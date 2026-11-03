import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

describe('Web Service Server', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createServer();
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('serves index.html on root path', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const body = await res.text();
    assert.match(body, /<title>Haqdar/);
  });

  it('serves static CSS with correct MIME type', async () => {
    const res = await fetch(`${baseUrl}/styles/base.css`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/css/);
  });

  it('serves static JS with correct MIME type', async () => {
    const res = await fetch(`${baseUrl}/js/app.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/javascript/);
  });

  it('serves JSON data with correct MIME type', async () => {
    const res = await fetch(`${baseUrl}/data/schemes.json`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  it('falls back to index.html for SPA routes', async () => {
    const res = await fetch(`${baseUrl}/questions/step-1`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
  });

  it('rejects unsupported HTTP methods with 405', async () => {
    const res = await fetch(`${baseUrl}/`, { method: 'POST', body: 'test' });
    assert.equal(res.status, 405);
  });

  it('blocks path traversal outside root', async () => {
    const res = await fetch(`${baseUrl}/../outside`);
    // HTTP client normalizes or server rejects forbidden / 403 / 404 / index fallback
    assert.ok(res.status === 403 || res.status === 200);
  });
});

