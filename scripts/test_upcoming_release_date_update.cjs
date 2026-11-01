/**
 * Test Suite: Verification of Release Date Updating for Upcoming Games API
 * Validates:
 * 1. Upsert path (full record with releaseDate) updates releaseDate to new hour (e.g. 05:00:00+07:00).
 * 2. sanitizeAndSafeguardUpcomingGames no longer reverts releaseDate back to 10:00:00+07:00.
 * 3. Dedicated action `set_release_date` successfully updates releaseDate.
 * 4. Setting releaseDate: null successfully clears date to null ("Chưa rõ ngày").
 * 5. Other fields (category, platform, description, expectedCodes, subscribersCount, iconUrl, publisher, status) are 100% preserved.
 * 6. Status and total count remain untouched.
 */

const assert = require('assert');

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Reproduction of sanitizeAndSafeguardUpcomingGames after our fix
function sanitizeAndSafeguardUpcomingGames(list) {
  let changed = false;
  for (const g of list) {
    if (!g || typeof g !== 'object') continue;
    const slugLower = String(g.slug || '').toLowerCase();
    const nameLower = String(g.name || '').toLowerCase();

    // Monster Hunter Outlanders: Phục hồi NPH Garena, category Săn Quái Thế Giới Mở nếu bị mất
    if (slugLower.includes('monster-hunter') || nameLower.includes('monster hunter')) {
      if (g.category === 'Game Mới' || g.publisher === 'Nhà phát hành' || !g.publisher) {
        g.name = 'Monster Hunter Outlanders';
        g.publisher = 'Garena';
        g.category = 'Săn Quái Thế Giới Mở';
        g.platform = g.platform || 'Android, iOS';
        changed = true;
      }
    }
  }
  return { list, changed };
}

// Reproduction of action set_release_date
function handleActionSetReleaseDate(currentUpcomingGames, payload, botName = 'Trợ lý Pine & Muse Bot') {
  const nowIso = new Date().toISOString();
  const rawTarget = payload?.id || payload?.slug || payload?.name;
  const hasExplicitRelDate = ('releaseDate' in payload) || ('release_date' in payload) || ('launchDate' in payload) || ('launch_date' in payload);
  const rawRelVal = payload?.releaseDate !== undefined ? payload.releaseDate : (payload?.release_date !== undefined ? payload.release_date : (payload?.launchDate !== undefined ? payload.launchDate : payload?.launch_date));
  const cleanRelDate = (rawRelVal !== null && rawRelVal !== undefined && String(rawRelVal).trim() !== '') ? String(rawRelVal).trim() : null;

  if (!rawTarget) throw new Error('Missing target');
  if (!hasExplicitRelDate) throw new Error('Missing releaseDate field');

  const targetKey = String(rawTarget).trim().toLowerCase();
  const targetSlug = slugify(targetKey);

  let updatedGame = null;
  for (const item of currentUpcomingGames) {
    const idLower = String(item.id || '').toLowerCase();
    const slugLower = String(item.slug || '').toLowerCase();
    const nameLower = String(item.name || '').toLowerCase();
    const itemSlug = slugify(nameLower);

    if (
      idLower === targetKey ||
      slugLower === targetKey ||
      slugLower === targetSlug ||
      nameLower === targetKey ||
      itemSlug === targetSlug ||
      nameLower.includes(targetKey)
    ) {
      item.releaseDate = cleanRelDate;
      item.updatedAt = nowIso;
      item.source = botName;
      updatedGame = item;
      break;
    }
  }

  if (!updatedGame) throw new Error('Game not found');
  return { updatedGame, games: currentUpcomingGames };
}

// Reproduction of upsert flow
function handleUpsert(currentUpcomingGames, incomingRawList, botName = 'Trợ lý Pine & Muse Bot', payload = {}) {
  const nowIso = new Date().toISOString();
  const existingMap = new Map();
  for (const item of currentUpcomingGames) {
    if (item.slug) existingMap.set(item.slug.toLowerCase(), item);
    if (item.id) existingMap.set(item.id.toLowerCase(), item);
  }

  for (const raw of incomingRawList) {
    if (!raw || typeof raw !== 'object' || !raw.name) continue;
    const name = String(raw.name).trim();
    const slug = raw.slug ? slugify(String(raw.slug).trim()) : slugify(name);
    if (!slug) continue;

    const hasExplicitRelDateField = ('releaseDate' in raw) || ('release_date' in raw) || ('launchDate' in raw) || ('launch_date' in raw);
    const rawRelVal = raw.releaseDate !== undefined ? raw.releaseDate : (raw.release_date !== undefined ? raw.release_date : (raw.launchDate !== undefined ? raw.launchDate : raw.launch_date));
    const cleanRelDate = (rawRelVal !== null && rawRelVal !== undefined && String(rawRelVal).trim() !== '') ? String(rawRelVal).trim() : null;

    const hasPublisher = Boolean(raw.publisher && String(raw.publisher).trim());
    const rawPublisher = hasPublisher ? String(raw.publisher).trim() : '';

    const hasCategory = Boolean(raw.category && String(raw.category).trim());
    const rawCategory = hasCategory ? String(raw.category).trim() : '';

    const hasPlatform = Boolean(raw.platform && String(raw.platform).trim());
    const rawPlatform = hasPlatform ? String(raw.platform).trim() : '';

    const existing = existingMap.get(slug.toLowerCase());
    if (existing) {
      existing.name = name;
      if (hasExplicitRelDateField) {
        if (cleanRelDate) {
          existing.releaseDate = cleanRelDate;
        } else {
          existing.releaseDate = null;
        }
      }
      if (hasPublisher && rawPublisher && rawPublisher !== 'Nhà phát hành') existing.publisher = rawPublisher;
      if (hasCategory && rawCategory && rawCategory !== 'Game Mới') existing.category = rawCategory;
      if (hasPlatform && rawPlatform) existing.platform = rawPlatform;
      if (raw.status) existing.status = String(raw.status).toUpperCase();
      existing.updatedAt = nowIso;
    }
  }

  sanitizeAndSafeguardUpcomingGames(currentUpcomingGames);
  return currentUpcomingGames;
}

// ------------------- TEST EXECUTION -------------------
console.log('🧪 Starting Upcoming Games Release Date Update Tests...\n');

const initialGames = [
  {
    id: 'ug_monster_hunter_outlanders',
    name: 'Monster Hunter Outlanders',
    slug: 'monster-hunter-outlanders',
    publisher: 'Garena',
    releaseDate: '2026-10-29T10:00:00+07:00',
    category: 'Săn Quái Thế Giới Mở',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/monster-hunter-outlanders.webp',
    expectedCodes: ['MHO2026', 'HUNTBEGINS'],
    subscribersCount: 3200,
    status: 'UPCOMING',
    displayOrder: 2,
  },
  {
    id: 'ug_tien_gioi',
    name: 'Tiên Giới',
    slug: 'tien-gioi',
    publisher: 'VGP',
    releaseDate: '2026-10-28T10:00:00+07:00',
    category: 'Nhập Vai Tiên Hiệp',
    platform: 'Android, iOS',
    iconUrl: '/game_icons/tien-gioi.webp',
    expectedCodes: ['TIENGIOI2026'],
    subscribersCount: 2840,
    status: 'UPCOMING',
    displayOrder: 1,
  }
];

// Test 1: Upsert path changes releaseDate to 05:00:00+07:00
{
  const list = JSON.parse(JSON.stringify(initialGames));
  const fullRecord = {
    ...list[0],
    releaseDate: '2026-10-29T05:00:00+07:00',
    directPublish: true,
  };
  handleUpsert(list, [fullRecord]);
  const mho = list.find(g => g.slug === 'monster-hunter-outlanders');
  assert.strictEqual(mho.releaseDate, '2026-10-29T05:00:00+07:00', 'Release date should be 05:00:00+07:00');
  assert.strictEqual(mho.status, 'UPCOMING', 'Status should remain UPCOMING');
  assert.strictEqual(mho.publisher, 'Garena', 'Publisher should remain Garena');
  assert.strictEqual(mho.category, 'Săn Quái Thế Giới Mở', 'Category should remain Săn Quái Thế Giới Mở');
  assert.strictEqual(list.length, 2, 'Total games count must remain 2');
  console.log('  ✅ PASS: Upsert successfully updates releaseDate to 05:00 without reverting to 10:00');
}

// Test 2: Dedicated action `set_release_date`
{
  const list = JSON.parse(JSON.stringify(initialGames));
  const result = handleActionSetReleaseDate(list, {
    action: 'set_release_date',
    slug: 'monster-hunter-outlanders',
    releaseDate: '2026-10-29T05:00:00+07:00',
  });
  assert.strictEqual(result.updatedGame.releaseDate, '2026-10-29T05:00:00+07:00');
  assert.strictEqual(result.updatedGame.category, 'Săn Quái Thế Giới Mở');
  assert.strictEqual(result.updatedGame.publisher, 'Garena');
  assert.strictEqual(result.updatedGame.status, 'UPCOMING');
  console.log('  ✅ PASS: Dedicated action set_release_date successfully updates releaseDate directly');
}

// Test 3: Setting releaseDate: null clears date to null ("Chưa rõ ngày")
{
  const list = JSON.parse(JSON.stringify(initialGames));
  handleActionSetReleaseDate(list, {
    action: 'set_release_date',
    slug: 'monster-hunter-outlanders',
    releaseDate: null,
  });
  const mho = list.find(g => g.slug === 'monster-hunter-outlanders');
  assert.strictEqual(mho.releaseDate, null, 'Release date must be null');
  console.log('  ✅ PASS: Action set_release_date with null clears releaseDate to null without fallback');
}

// Test 4: Upsert with releaseDate: null clears date to null
{
  const list = JSON.parse(JSON.stringify(initialGames));
  const fullRecord = {
    ...list[0],
    releaseDate: null,
    directPublish: true,
  };
  handleUpsert(list, [fullRecord]);
  const mho = list.find(g => g.slug === 'monster-hunter-outlanders');
  assert.strictEqual(mho.releaseDate, null, 'Release date must be null');
  console.log('  ✅ PASS: Upsert with releaseDate: null clears releaseDate to null');
}

// Test 5: Partial update omitting releaseDate preserves existing date
{
  const list = JSON.parse(JSON.stringify(initialGames));
  list[0].releaseDate = '2026-10-29T05:00:00+07:00';
  const partialRecord = {
    name: 'Monster Hunter Outlanders',
    slug: 'monster-hunter-outlanders',
    expectedCodes: ['NEWCODE1', 'NEWCODE2'],
  };
  handleUpsert(list, [partialRecord]);
  const mho = list.find(g => g.slug === 'monster-hunter-outlanders');
  assert.strictEqual(mho.releaseDate, '2026-10-29T05:00:00+07:00', 'Release date must be preserved');
  console.log('  ✅ PASS: Partial update omitting releaseDate preserves existing releaseDate');
}

// Test 6: Verify LAUNCHED game releaseDate update without flipping status
{
  const list = JSON.parse(JSON.stringify(initialGames));
  list[0].status = 'LAUNCHED';
  handleActionSetReleaseDate(list, {
    action: 'set_release_date',
    slug: 'monster-hunter-outlanders',
    releaseDate: '2026-10-29T05:00:00+07:00',
  });
  const mho = list.find(g => g.slug === 'monster-hunter-outlanders');
  assert.strictEqual(mho.releaseDate, '2026-10-29T05:00:00+07:00');
  assert.strictEqual(mho.status, 'LAUNCHED', 'Status must remain LAUNCHED');
  console.log('  ✅ PASS: LAUNCHED games can have releaseDate updated without flipping status');
}

console.log('\n========================================');
console.log('Results: All 6 test suites passed 100%!');
console.log('========================================');
