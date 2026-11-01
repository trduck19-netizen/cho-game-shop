const https = require('https');

const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = '4723034ae7540463270a925ad9758c07'; // codegame.store
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
  console.log('=== PHÂN TÍCH LƯỢT TRUY VẤN VÀ HẠN MỨC TRÊN CLOUDFLARE (CODEGAME.STORE) ===\n');

  // 1. Zone Analytics Dashboard (Last 24 hours & 7 days)
  const dashboard24h = await cfFetch(`/zones/${zoneId}/analytics/dashboard?since=-1440`);
  const dashboard7d = await cfFetch(`/zones/${zoneId}/analytics/dashboard?since=-10080`);

  if (dashboard24h.data?.result?.totals) {
    const t24 = dashboard24h.data.result.totals;
    const t7 = dashboard7d.data?.result?.totals || {};
    
    console.log('📈 TỔNG SỐ LƯỢT TRUY VẬN (REQUESTS):');
    console.log(`- 24 Giờ qua: ${t24.requests?.all?.toLocaleString()} lượt`);
    console.log(`  + Đã Cache (miễn phí băng thông/không tốn tài nguyên): ${t24.requests?.cached?.toLocaleString()} (${((t24.requests?.cached / (t24.requests?.all || 1)) * 100).toFixed(1)}%)`);
    console.log(`  + Chưa Cache (xử lý động): ${t24.requests?.uncached?.toLocaleString()}`);
    console.log(`- 7 Ngày qua: ${t7.requests?.all?.toLocaleString()} lượt (Cached: ${t7.requests?.cached?.toLocaleString()})`);
    console.log(`- Băng thông 24h: ${(t24.bandwidth?.all / (1024 * 1024)).toFixed(2)} MB (Đã Cache: ${(t24.bandwidth?.cached / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`- Số khách truy cập duy nhất (Unique Visitors 24h): ${t24.uniques?.all?.toLocaleString()}`);
    console.log('');
  }

  // 2. GraphQL Detailed breakdown by Path / Host / Content Type / Status Code
  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const today = now.toISOString();

  const queryPaths = {
    query: `
      query GetZoneRequests($zoneTag: String!, $since: String!, $until: String!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            httpRequestsAdaptiveGroups(
              limit: 25,
              filter: { datetime_geq: $since, datetime_leq: $until }
              orderBy: [count_DESC]
            ) {
              count
              sum {
                edgeResponseBytes
              }
              dimensions {
                clientRequestHTTPHost
                clientRequestPath
                clientRequestHTTPMethodName
                edgeResponseStatus
              }
            }
            httpRequestsByContentType: httpRequestsAdaptiveGroups(
              limit: 15,
              filter: { datetime_geq: $since, datetime_leq: $until }
              orderBy: [count_DESC]
            ) {
              count
              dimensions {
                edgeResponseContentTypeName
              }
            }
          }
        }
      }
    `,
    variables: {
      zoneTag: zoneId,
      since: past24h,
      until: today
    }
  };

  const gqlRes = await cfFetch('/graphql', 'POST', queryPaths);

  if (gqlRes.data?.data?.viewer?.zones?.[0]) {
    const zoneData = gqlRes.data.data.viewer.zones[0];
    const topPaths = zoneData.httpRequestsAdaptiveGroups || [];
    const topContentTypes = zoneData.httpRequestsByContentType || [];

    console.log('🏆 CÁC MỤC / ĐƯỜNG DẪN TỐN NHIỀU LƯỢT TRUY VẤN NHẤT (TOP 25 PATHS TRONG 24H):');
    topPaths.forEach((p, idx) => {
      const path = p.dimensions?.clientRequestPath;
      const method = p.dimensions?.clientRequestHTTPMethodName;
      const status = p.dimensions?.edgeResponseStatus;
      const count = p.count;
      const kb = (p.sum?.edgeResponseBytes / 1024).toFixed(1);
      console.log(`  ${idx + 1}. [${method}] ${path} (HTTP ${status}) -> ${count.toLocaleString()} lượt (${kb} KB)`);
    });
    console.log('');

    console.log('📂 PHÂN LOẠI TRUY VẤN THEO ĐỊNH DẠNG TÀI NGUYÊN (CONTENT TYPE):');
    topContentTypes.forEach((ct, idx) => {
      console.log(`  ${idx + 1}. ${ct.dimensions?.edgeResponseContentTypeName || 'Không xác định'} -> ${ct.count.toLocaleString()} lượt`);
    });
    console.log('');
  } else {
    console.log('GQL detail:', JSON.stringify(gqlRes.data || {}));
  }
}

run();
