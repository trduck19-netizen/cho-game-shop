const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const missing = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'missing_icons.json'), 'utf8'));
const iconsDir = path.resolve(__dirname, '../public/game_icons');

const gameThemes = {
  'lien-minh-huyen-thoai': {
    title: 'LOL',
    subtitle: 'LEAGUE OF LEGENDS',
    gradient: ['#091428', '#0A323C'],
    accent: '#C89B3C',
    iconText: '⚔️'
  },
  'valorant': {
    title: 'VALORANT',
    subtitle: 'TACTICAL FPS',
    gradient: ['#0F1923', '#BD3944'],
    accent: '#FF4655',
    iconText: '🎯'
  },
  'ea-sports-fc-online': {
    title: 'FC ONLINE',
    subtitle: 'EA SPORTS',
    gradient: ['#022B1C', '#064E3B'],
    accent: '#10B981',
    iconText: '⚽'
  },
  'audition-vtc': {
    title: 'AUDITION',
    subtitle: 'VTC GAME',
    gradient: ['#831843', '#DB2777'],
    accent: '#F472B6',
    iconText: '🎵'
  },
  'dot-kich-vtc': {
    title: 'ĐỘT KÍCH',
    subtitle: 'CROSSFIRE VTC',
    gradient: ['#18181B', '#C2410C'],
    accent: '#F97316',
    iconText: '🔥'
  },
  'silkroad-origin-vtc': {
    title: 'SILKROAD',
    subtitle: 'CON ĐƯỜNG TƠ LỤA',
    gradient: ['#451A03', '#9A3412'],
    accent: '#FBBF24',
    iconText: '🐫'
  },
  'phi-doi-vtc': {
    title: 'PHI ĐỘI',
    subtitle: 'ACE ONLINE VTC',
    gradient: ['#172554', '#1D4ED8'],
    accent: '#38BDF8',
    iconText: '✈️'
  },
  'cuu-am-chan-kinh-2': {
    title: 'CỬU ÂM 2',
    subtitle: 'GOSU WUXIA',
    gradient: ['#064E3B', '#047857'],
    accent: '#34D399',
    iconText: '🗡️'
  },
  'cuu-long-chi-ton': {
    title: 'CỬU LONG',
    subtitle: '9DRAGONS DZOGAME',
    gradient: ['#881337', '#BE123C'],
    accent: '#F43F5E',
    iconText: '🐉'
  },
  'bangbang-online': {
    title: 'BANGBANG',
    subtitle: 'CMN ONLINE',
    gradient: ['#78350F', '#D97706'],
    accent: '#FBBF24',
    iconText: '🛡️'
  },
  'ngoc-rong-online': {
    title: 'NGỌC RỒNG',
    subtitle: 'CHÚ BÉ RỒNG',
    gradient: ['#7C2D12', '#EA580C'],
    accent: '#FDE047',
    iconText: '⭐'
  },
  'ninja-school-online': {
    title: 'NINJA SCHOOL',
    subtitle: 'TEAMOBI',
    gradient: ['#18181B', '#B91C1C'],
    accent: '#EF4444',
    iconText: '🥷'
  },
  'hai-tac-ti-hon': {
    title: 'HẢI TẶC',
    subtitle: 'TEAMOBI',
    gradient: ['#0C4A6E', '#0284C7'],
    accent: '#38BDF8',
    iconText: '⚓'
  },
  'satisdom': {
    title: 'SATISDOM',
    subtitle: 'PERFECT TIDY',
    gradient: ['#134E4A', '#0D9488'],
    accent: '#2DD4BF',
    iconText: '✨'
  },
  'thetan-rivals': {
    title: 'THETAN RIVALS',
    subtitle: 'WOLFFUN GAME',
    gradient: ['#3B0764', '#7C3AED'],
    accent: '#C084FC',
    iconText: '🏃'
  },
  'heroes-strike': {
    title: 'HEROES STRIKE',
    subtitle: 'WOLFFUN GAME',
    gradient: ['#1E1B4B', '#4F46E5'],
    accent: '#818CF8',
    iconText: '⚡'
  },
  'hair-salon-barber-shop': {
    title: 'HAIR SALON',
    subtitle: 'BARBER SHOP',
    gradient: ['#7F1D1D', '#1E3A8A'],
    accent: '#F59E0B',
    iconText: '✂️'
  },
  'merge-defense-shadow-action-series': {
    title: 'MERGE DEFENSE',
    subtitle: 'BRAVESTARS',
    gradient: ['#2E1065', '#581C87'],
    accent: '#A855F7',
    iconText: '🛡️'
  },
  'sky-dancer-escapingfromeden': {
    title: 'SKY DANCER',
    subtitle: 'TOPEBOX',
    gradient: ['#78350F', '#B45309'],
    accent: '#FCD34D',
    iconText: '🌌'
  },
  'pocket-army-ark-of-war-series': {
    title: 'POCKET ARMY',
    subtitle: 'TOPEBOX',
    gradient: ['#1F2937', '#374151'],
    accent: '#60A5FA',
    iconText: '🎖️'
  },
  'wood-screw-puzzle': {
    title: 'WOOD SCREW',
    subtitle: 'IKAME / ZEGO',
    gradient: ['#451A03', '#78350F'],
    accent: '#F59E0B',
    iconText: '🔩'
  },
  'farm-city-farming-building': {
    title: 'FARM CITY',
    subtitle: 'IKAME / ZEGO',
    gradient: ['#14532D', '#15803D'],
    accent: '#4ADE80',
    iconText: '🚜'
  },
  'car-race-3d': {
    title: 'CAR RACE 3D',
    subtitle: 'IKAME / ZEGO',
    gradient: ['#7F1D1D', '#DC2626'],
    accent: '#F87171',
    iconText: '🏎️'
  },
  'hotpot-frenzy': {
    title: 'HOTPOT',
    subtitle: 'HIKER GAMES',
    gradient: ['#7F1D1D', '#EA580C'],
    accent: '#FBBF24',
    iconText: '🍲'
  },
  'unscrew-master-color-nut-bolt': {
    title: 'UNSCREW',
    subtitle: 'HIKER GAMES',
    gradient: ['#0F172A', '#334155'],
    accent: '#38BDF8',
    iconText: '🔧'
  },
  'tangled-line-3d': {
    title: 'TANGLED 3D',
    subtitle: 'HIKER GAMES',
    gradient: ['#312E81', '#6366F1'],
    accent: '#A5B4FC',
    iconText: '🧶'
  },
  'numberland': {
    title: 'NUMBERLAND',
    subtitle: 'HIKER GAMES',
    gradient: ['#1E1B4B', '#9333EA'],
    accent: '#F472B6',
    iconText: '🔢'
  },
  'toy-factory': {
    title: 'TOY FACTORY',
    subtitle: 'HIKER GAMES',
    gradient: ['#065F46', '#0284C7'],
    accent: '#FBBF24',
    iconText: '🧸'
  },
  'meow-vs-zombie': {
    title: 'MEOW VS ZOMBIE',
    subtitle: 'HIKER GAMES',
    gradient: ['#365314', '#65A30D'],
    accent: '#FDE047',
    iconText: '🐾'
  }
};

function generateSvgIcon(theme) {
  const g1 = theme.gradient[0];
  const g2 = theme.gradient[1];
  const accent = theme.accent;
  const title = theme.title;
  const subtitle = theme.subtitle;
  const icon = theme.iconText || '🎮';

  return `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${g1}"/>
        <stop offset="100%" stop-color="${g2}"/>
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.3"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>

    <!-- Base rounded card -->
    <rect width="512" height="512" rx="108" fill="url(#bg)"/>
    
    <!-- Glossy top reflection -->
    <path d="M 0,108 C 0,48 48,0 108,0 L 404,0 C 464,0 512,48 512,108 L 512,240 Q 256,280 0,240 Z" fill="url(#glow)"/>

    <!-- Outer subtle border -->
    <rect x="8" y="8" width="496" height="496" rx="100" fill="none" stroke="url(#borderGrad)" stroke-width="8"/>

    <!-- Central emblem badge -->
    <g filter="url(#shadow)">
      <circle cx="256" cy="210" r="105" fill="#030712" fill-opacity="0.5" stroke="${accent}" stroke-width="4"/>
      <text x="256" y="240" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="95" text-anchor="middle" dominant-baseline="middle">${icon}</text>
    </g>

    <!-- Title Banner -->
    <g filter="url(#shadow)">
      <text x="256" y="375" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">${title}</text>
      <text x="256" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="3">${subtitle}</text>
    </g>
  </svg>
  `;
}

async function main() {
  console.log(`Generating high-res 512x512 icons for ${missing.length} games...`);

  for (const game of missing) {
    const theme = gameThemes[game.slug] || {
      title: game.name.slice(0, 15).toUpperCase(),
      subtitle: (game.publisher_brand || 'CODEGAME').toUpperCase().slice(0, 18),
      gradient: ['#1e1b4b', '#4338ca'],
      accent: '#38bdf8',
      iconText: '🎮'
    };

    const svg = generateSvgIcon(theme);
    const webpPath = path.join(iconsDir, `${game.slug}.webp`);
    const jpgPath = path.join(iconsDir, `${game.slug}.jpg`);

    const svgBuf = Buffer.from(svg);
    await sharp(svgBuf).resize(512, 512).webp({ quality: 90 }).toFile(webpPath);
    await sharp(svgBuf).resize(512, 512).jpeg({ quality: 90 }).toFile(jpgPath);

    console.log(`✓ Created 512x512 icons for ${game.slug}`);
  }

  console.log('\nAll 29 missing icons successfully generated and saved!');
}

main().catch(console.error);
