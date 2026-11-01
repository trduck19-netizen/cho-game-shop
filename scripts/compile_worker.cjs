const { execSync } = require('child_process');

let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {}
const buildTime = new Date().toISOString();
console.log(`   🏷️ Injected Build ID: ${commitHash} (${buildTime})`);
execSync(`npx esbuild functions/_worker.ts --bundle --target=es2022 --format=esm --define:__BUILD_ID__="'${commitHash}'" --define:__BUILD_TIME__="'${buildTime}'" --outfile=dist/_worker.js`, { stdio: 'inherit' });
console.log('✅ Worker compiled successfully.');
