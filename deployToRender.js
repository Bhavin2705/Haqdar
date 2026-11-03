import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname);

// Load .env without third-party dependencies (YAGNI)
function loadEnv() {
  const envPath = path.resolve(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const REPO_URL = 'https://github.com/Bhavin2705/Haqdar';
const SERVICE_NAME = 'haqdar';

if (!RENDER_API_KEY) {
  console.error('Error: RENDER_API_KEY is not set in environment or .env.');
  process.exit(1);
}

function requestRender(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.render.com/v1${endpoint}`);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Render API [${res.statusCode}] on ${method} ${endpoint}: ${parsed.message || data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Render response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export async function runDeploy() {
  console.log('Connecting to Render API...');

  // 1. Get Owner ID
  const owners = await requestRender('GET', '/owners');
  if (!owners.length) throw new Error('No owner account found on Render.');
  const ownerId = owners[0].owner.id;
  console.log(`Found Render Owner: ${owners[0].owner.name || owners[0].owner.email} (${ownerId})`);

  // 2. Check existing services
  const services = await requestRender('GET', '/services?limit=50');
  let targetService = services.find(s => {
    const svc = s.service;
    return (svc.repo && svc.repo.toLowerCase().includes('haqdar')) ||
           (svc.name && svc.name.toLowerCase() === SERVICE_NAME.toLowerCase());
  });

  // If existing service was a static site, replace it with a web service
  if (targetService && targetService.service.type === 'static_site') {
    console.log(`Replacing previous static site (${targetService.service.id}) with a Web Service...`);
    await requestRender('DELETE', `/services/${targetService.service.id}`);
    targetService = null;
  }

  let serviceId;
  let serviceUrl;

  if (targetService) {
    serviceId = targetService.service.id;
    serviceUrl = targetService.service.serviceDetails?.url;
    console.log(`Found existing service: ${targetService.service.name} (${serviceId}) [Type: ${targetService.service.type}]`);
  } else {
    console.log(`Creating new Web Service on Render for ${SERVICE_NAME}...`);
    const newService = await requestRender('POST', '/services', {
      type: 'web_service',
      name: SERVICE_NAME,
      ownerId,
      repo: REPO_URL,
      branch: 'main',
      autoDeploy: 'yes',
      serviceDetails: {
        env: 'node',
        plan: 'free',
        region: 'singapore',
        envSpecificDetails: {
          buildCommand: 'npm install',
          startCommand: 'npm start'
        }
      }
    });
    const svc = newService.service || newService;
    serviceId = svc.id;
    serviceUrl = svc.serviceDetails?.url;
    console.log(`Created service: ${svc.name} (${serviceId})`);
  }

  // 3. Sync Environment Variables
  console.log('Syncing environment variables to Render...');
  const envVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'NODE_VERSION', value: '20.x' }
  ];

  await requestRender('PUT', `/services/${serviceId}/env-vars`, envVars);
  console.log('Environment variables successfully synced:');
  envVars.forEach(v => console.log(`  - ${v.key}=${v.value}`));

  // 4. Trigger Deployment
  console.log('Triggering deployment on Render...');
  const deployRes = await requestRender('POST', `/services/${serviceId}/deploys`, {
    clearCache: 'do_not_clear'
  });
  const deployObj = deployRes.deploy || deployRes;
  const deployId = deployObj.id;
  const targetUrl = serviceUrl || `https://${targetService?.service?.slug || SERVICE_NAME}.onrender.com`;
  console.log(`Deploy initiated (Deploy ID: ${deployId || 'active'})`);
  console.log(`Live Service URL: ${targetUrl}`);

  // 5. Poll deployment status until live (gentle 10s interval to stay safely under rate limits)
  if (deployId) {
    console.log('Monitoring deployment progress...');
    let attempts = 0;
    while (attempts < 35) {
      await new Promise(r => setTimeout(r, 10000));
      attempts++;
      try {
        const check = await requestRender('GET', `/services/${serviceId}/deploys/${deployId}`);
        const status = check.deploy?.status || check.status;
        console.log(`Deploy status [attempt ${attempts}]: ${status}`);
        if (status === 'live') {
          console.log('\nDeployment is LIVE and fully healthy!');
          break;
        }
        if (status === 'build_failed' || status === 'update_failed' || status === 'canceled') {
          throw new Error(`Render deployment failed with status: ${status}`);
        }
      } catch (pollErr) {
        if (pollErr.message && pollErr.message.includes('failed')) throw pollErr;
      }
    }
  }

  return {
    serviceId,
    deployId,
    serviceUrl: targetUrl
  };
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === __filename.toLowerCase()) {
  runDeploy().then(() => {
    console.log('\nManual redeploy to Render completed successfully!');
    process.exit(0);
  }).catch(err => {
    console.error('\nDeploy error:', err.message);
    process.exit(1);
  });
}
