const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 1. Update GameCard.tsx
const gameCardPath = path.join(ROOT, 'src/components/GameCard.tsx');
let gc = fs.readFileSync(gameCardPath, 'utf8');

const gcTarget1 = 'setCurrentIconSrc(`/api/game-icon?slug=${encodeURIComponent(slug)}`);';
const gcRepl1 = 'const rawUrl = game.icon_url && game.icon_url.startsWith(\'http\') ? game.icon_url : \'\';\n      setCurrentIconSrc(`/api/game-icon?slug=${encodeURIComponent(slug)}${rawUrl ? `&url=${encodeURIComponent(rawUrl)}` : \'\'}`);';
if (gc.includes(gcTarget1)) {
  gc = gc.replace(gcTarget1, gcRepl1);
}

const gcTarget2 = 'src={currentIconSrc}\n          alt={game.name}';
const gcRepl2 = 'src={currentIconSrc}\n          alt={game.name}\n          referrerPolicy="no-referrer"';
if (gc.includes(gcTarget2)) {
  gc = gc.replace(gcTarget2, gcRepl2);
}

fs.writeFileSync(gameCardPath, gc, 'utf8');
console.log('✓ Updated GameCard.tsx');

// 2. Update GameDetailModal.tsx
const modalPath = path.join(ROOT, 'src/components/GameDetailModal.tsx');
let modal = fs.readFileSync(modalPath, 'utf8');

const modalTarget1 = 'alt={currentGame.name}\n                    decoding="async"';
const modalRepl1 = 'alt={currentGame.name}\n                    referrerPolicy="no-referrer"\n                    decoding="async"';

if (modal.includes(modalTarget1)) {
  modal = modal.replace(modalTarget1, modalRepl1);
} else {
  const modalTarget1CRLF = 'alt={currentGame.name}\r\n                    decoding="async"';
  const modalRepl1CRLF = 'alt={currentGame.name}\r\n                    referrerPolicy="no-referrer"\r\n                    decoding="async"';
  if (modal.includes(modalTarget1CRLF)) {
    modal = modal.replace(modalTarget1CRLF, modalRepl1CRLF);
  }
}

const modalTarget2 = ': modalFallbackStage === 2\n                        ? `/api/game-icon?slug=${encodeURIComponent(currentGame.slug)}`';
const modalRepl2 = `: modalFallbackStage === 2\n                        ? \`/api/game-icon?slug=\${encodeURIComponent(currentGame.slug)}\${currentGame.icon_url && currentGame.icon_url.startsWith('http') ? \`&url=\${encodeURIComponent(currentGame.icon_url)}\` : ''}\``;

if (modal.includes(modalTarget2)) {
  modal = modal.replace(modalTarget2, modalRepl2);
} else {
  const modalTarget2CRLF = ': modalFallbackStage === 2\r\n                        ? `/api/game-icon?slug=${encodeURIComponent(currentGame.slug)}`';
  const modalRepl2CRLF = `: modalFallbackStage === 2\r\n                        ? \`/api/game-icon?slug=\${encodeURIComponent(currentGame.slug)}\${currentGame.icon_url && currentGame.icon_url.startsWith('http') ? \`&url=\${encodeURIComponent(currentGame.icon_url)}\` : ''}\``;
  if (modal.includes(modalTarget2CRLF)) {
    modal = modal.replace(modalTarget2CRLF, modalRepl2CRLF);
  }
}

fs.writeFileSync(modalPath, modal, 'utf8');
console.log('✓ Updated GameDetailModal.tsx');
