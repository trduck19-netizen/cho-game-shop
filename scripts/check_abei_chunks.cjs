const fs = require('fs');

async function checkAllChunks() {
  const scripts = [
    '5097-2a9ac695eb8741cd.js',
    '2943-c11181ace7410eb1.js',
    '8990-236d95158ebd697f.js',
    '2984-90e55d8ca7c3fa85.js',
    '59-c7937606b448efb2.js',
    '3665-737f6344eb1aa3b2.js',
    '4424-fbda8a78d46463f7.js',
    '3394-fc2caccb97c19978.js',
    '5878-911f5bb690fc87bb.js'
  ];

  for (const s of scripts) {
    const res = await fetch(`https://giayphep.abei.gov.vn/_next/static/chunks/${s}`);
    const code = await res.text();
    const matches = code.match(/(https?:\/\/[a-zA-Z0-9_\-\.:]+\/[^\s"']+|\/api\/[^\s"']+|NEXT_PUBLIC_[A-Z_]+)/g);
    if (matches) {
      console.log(`Chunk ${s}:`, [...new Set(matches)]);
    }
  }
}

checkAllChunks();
