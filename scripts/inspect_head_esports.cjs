const fs = require('fs');

const code = fs.readFileSync('scratch/xemgi_EsportsPage-CDaY7h-P.js', 'utf8');

// Inspect first 3000 characters of EsportsPage
console.log('First 3000 chars of EsportsPage:\n', code.slice(0, 3000));
