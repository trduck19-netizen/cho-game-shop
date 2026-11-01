const https = require('https');

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = '9e6387498b4b3426ea4bd7656ff5142d';

function cfFetch(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: '/client/v4' + path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  // Query Cloudflare GraphQL for account-level and worker-level request stats
  const now = new Date();
  const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = now.toISOString();

  const query = {
    query: `
      query GetStats($accountTag: String!, $since: String!, $until: String!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            workersInvocationsAdaptive(
              limit: 100,
              filter: { datetime_geq: $since, datetime_leq: $until }
            ) {
              dimensions {
                scriptName
              }
              sum {
                requests
                subrequests
                errors
              }
            }
          }
        }
      }
    `,
    variables: {
      accountTag: accountId,
      since: past7Days,
      until: today
    }
  };

  const res = await cfFetch('/graphql', 'POST', query);
  console.log('Workers Invocations Response:', JSON.stringify(res.data, null, 2));

  // Let's also check zone-level httpRequests1dGroups for codegame.store if zone exists
  const zonesRes = await cfFetch('/zones');
  console.log('Zones:', zonesRes.data?.result?.map(z => ({ name: z.name, id: z.id, status: z.status })));
}

run();
