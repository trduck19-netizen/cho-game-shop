const fs = require('fs');
const path = require('path');

// Test unified search matching on games dataset
const gamesData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/games188.json'), 'utf8'));

// Import textUtils (transpiled via TypeScript or evaluate)
const ts = require('typescript');
const textUtilsCode = fs.readFileSync(path.resolve(__dirname, '../src/utils/textUtils.ts'), 'utf8');
const jsCode = ts.transpile(textUtilsCode);
const vm = require('vm');
const sandbox = { exports: {} };
vm.runInNewContext(jsCode, sandbox);
const { matchGameSearch, calculateGameSearchScore } = sandbox.exports;

console.log('================================================================');
console.log('🧪 KIỂM THỬ TẬP TRUNG: LOGIC TÌM KIẾM DÙNG CHUNG (UNIFIED SEARCH)');
console.log('   Tổng số game trong catalog kiểm tra:', gamesData.length);
console.log('================================================================\n');

function runSearch(query) {
  const scored = gamesData
    .map(g => {
      const scoreRes = calculateGameSearchScore(g, query);
      const isMatch = scoreRes.score > 0 || matchGameSearch(g, query);
      const score = isMatch ? (scoreRes.score > 0 ? scoreRes.score : 5000) : 0;
      return { game: g, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(item => item.game.name);
}

const testCases = [
  {
    query: 'Ky Tich Tro Lai',
    expectedFirst: 'Kỳ Tích Trở Lại',
    shouldFind: true,
    desc: 'Gõ không dấu Ky Tich Tro Lai -> phải ra Kỳ Tích Trở Lại'
  },
  {
    query: 'Thuc Than Ky',
    expectedFirst: 'Thức Thần Ký',
    shouldFind: true,
    desc: 'Gõ không dấu Thuc Than Ky -> phải ra Thức Thần Ký'
  },
  {
    query: 'Kỳ Tích Trở Lại',
    expectedFirst: 'Kỳ Tích Trở Lại',
    shouldFind: true,
    desc: 'Gõ đúng dấu Kỳ Tích Trở Lại -> phải ra Kỳ Tích Trở Lại'
  },
  {
    query: 'thuc-than-ky',
    expectedFirst: 'Thức Thần Ký',
    shouldFind: true,
    desc: 'Gõ dạng slug thuc-than-ky -> phải ra Thức Thần Ký'
  },
  {
    query: 'Genshin',
    expectedFirst: 'Genshin Impact',
    shouldFind: true,
    desc: 'Gõ tên tiếng Anh Genshin -> phải ra Genshin Impact'
  },
  {
    query: 'Thực Thần Ký',
    expectedFirst: null,
    shouldFind: false,
    desc: 'Gõ Thực Thần Ký (sai dấu ự vs ứ) -> phải trả về 0 kết quả (không đoán bừa)'
  },
  {
    query: 'Kỳ Tích',
    expectedFirst: null,
    mustContain: ['Kỳ Tích Trở Lại', 'Kỳ Tích Atlans'],
    shouldFind: true,
    desc: 'Gõ Kỳ Tích -> ra cả Kỳ Tích Trở Lại và Kỳ Tích Atlans'
  },
  {
    query: 'Ký',
    expectedFirst: null,
    mustContain: ['Thức Thần Ký'],
    shouldFind: true,
    desc: 'Gõ Ký -> ra Thức Thần Ký'
  }
];

let allPassed = true;

testCases.forEach((tc, idx) => {
  const results = runSearch(tc.query);
  console.log(`▶ [${idx + 1}/${testCases.length}] Truy vấn: "${tc.query}"`);
  console.log(`   Mô tả: ${tc.desc}`);
  console.log(`   Kết quả (${results.length} game):`, results.slice(0, 3).join(', ') || '(không có)');

  if (!tc.shouldFind) {
    if (results.length === 0) {
      console.log('   ✅ ĐẠT: Đúng 0 kết quả như yêu cầu!\n');
    } else {
      console.error(`   ❌ THẤT BẠI: Đòi hỏi 0 kết quả nhưng lại ra: ${results.join(', ')}\n`);
      allPassed = false;
    }
  } else if (tc.expectedFirst) {
    if (results[0] === tc.expectedFirst) {
      console.log(`   ✅ ĐẠT: Top #1 đúng là "${tc.expectedFirst}"!\n`);
    } else {
      console.error(`   ❌ THẤT BẠI: Top #1 không phải "${tc.expectedFirst}", thực tế: "${results[0]}"\n`);
      allPassed = false;
    }
  } else if (tc.mustContain) {
    const missing = tc.mustContain.filter(item => !results.includes(item));
    if (missing.length === 0) {
      console.log(`   ✅ ĐẠT: Chứa đủ các game [${tc.mustContain.join(', ')}]!\n`);
    } else {
      console.error(`   ❌ THẤT BẠI: Thiếu các game: ${missing.join(', ')}\n`);
      allPassed = false;
    }
  }
});

if (allPassed) {
  console.log('================================================================');
  console.log('🎉 TẤT CẢ CÁC CA KIỂM THỬ TÌM KIẾM ĐÃ VƯỢT QUA 100%!');
  console.log('================================================================');
  process.exit(0);
} else {
  console.error('❌ CÓ BÀI KIỂM THỬ THẤT BẠI!');
  process.exit(1);
}
