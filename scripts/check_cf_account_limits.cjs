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
  console.log('=== THÔNG TIN TÀI KHOẢN & CLOUDFLARE PAGES ===');
  
  // 1. Check Deployments count & history
  const deploysRes = await cfFetch(`/accounts/${accountId}/pages/projects/codegamestore/deployments?per_page=25`);
  if (deploysRes.status === 200 && deploysRes.data.result) {
    const deploys = deploysRes.data.result;
    console.log(`- Tổng số lần Deploy đã thực hiện: ${deploysRes.data.result_info?.total_count || deploys.length} lần`);
    console.log(`- Lần deploy gần nhất: ${deploys[0]?.created_on} (URL: ${deploys[0]?.url})`);
  }

  // 2. Check token permissions details
  const tokenVerify = await cfFetch('/user/tokens/verify');
  console.log('- Trạng thái Token API:', tokenVerify.data?.result?.status);
  console.log('- Token ID:', tokenVerify.data?.result?.id);

  // 3. Check account details
  const acc = await cfFetch(`/accounts/${accountId}`);
  console.log('- Tên tài khoản:', acc.data?.result?.name);
  console.log('- Loại tài khoản (Type):', acc.data?.result?.type || 'Standard Free Plan');
}

run();
