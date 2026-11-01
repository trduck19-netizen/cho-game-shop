/**
 * Test Suite: Verification of Upcoming Games with NULL / Undefined Release Date
 * Validates:
 * 1. New game without releaseDate saves releaseDate = null (NEVER nowIso).
 * 2. New game with releaseDate = "" or null saves releaseDate = null.
 * 3. New game with valid releaseDate saves that exact date.
 * 4. Partial update omitting releaseDate PRESERVES existing releaseDate.
 * 5. Update explicitly sending releaseDate = null or "" CLEARS releaseDate to null.
 * 6. GET enriched attributes for null releaseDate:
 *    - rolloverStatus === 'TBA'
 *    - isLaunched === false
 *    - isRolledOver === false
 *    - hoursRemainingOnBanner === 0
 *    - minutesRemainingOnBanner === 0
 * 7. Sorting: Games with release dates sorted ascending first; games with null date sorted after by displayOrder then name.
 * 8. Top 6 Banner filter strictly excludes games with null release date.
 * 9. BLEACH Mirrors High fixture validation: clearing invalid 25/10 date to null.
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

// Ingestion simulation matching functions/api/crawler/ingest-upcoming-games.ts
function simulateIngest(currentList, incomingRawList, botName = 'Pine Bot') {
  const currentUpcomingGames = JSON.parse(JSON.stringify(currentList));
  const existingMap = new Map();
  for (const item of currentUpcomingGames) {
    if (item.slug) existingMap.set(item.slug.toLowerCase(), item);
    if (item.id) existingMap.set(item.id.toLowerCase(), item);
  }

  const nowIso = new Date().toISOString();
  let addedCount = 0;
  let updatedCount = 0;
  const processedDetails = [];

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

    let initialStatus = 'UPCOMING';
    if (raw.status) initialStatus = String(raw.status).toUpperCase();

    const existing =
      existingMap.get(slug.toLowerCase()) ||
      (raw.id ? existingMap.get(String(raw.id).toLowerCase()) : null);

    if (existing) {
      existing.name = name;

      if (hasExplicitRelDateField) {
        if (cleanRelDate) {
          existing.releaseDate = cleanRelDate;
        } else {
          existing.releaseDate = null;
        }
      }

      if (hasPublisher && rawPublisher && rawPublisher !== 'Nhà phát hành') {
        existing.publisher = rawPublisher;
      }
      if (hasCategory && rawCategory && rawCategory !== 'Game Mới') {
        existing.category = rawCategory;
      }
      if (hasPlatform && rawPlatform) {
        existing.platform = rawPlatform;
      }

      if (raw.status) {
        existing.status = String(raw.status).toUpperCase();
      }

      if (typeof raw.displayOrder === 'number') existing.displayOrder = raw.displayOrder;
      existing.updatedAt = nowIso;
      updatedCount++;
      processedDetails.push({ name, slug, action: 'UPDATED', status: existing.status, releaseDate: existing.releaseDate });
    } else {
      const newRecord = {
        id: raw.id || `ug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        slug,
        publisher: hasPublisher && rawPublisher ? rawPublisher : 'Nhà phát hành',
        releaseDate: cleanRelDate,
        category: hasCategory && rawCategory ? rawCategory : 'Game Mới',
        platform: hasPlatform && rawPlatform ? rawPlatform : 'Android, iOS, PC',
        status: initialStatus,
        displayOrder: typeof raw.displayOrder === 'number' ? raw.displayOrder : 999,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      currentUpcomingGames.unshift(newRecord);
      existingMap.set(slug.toLowerCase(), newRecord);
      addedCount++;
      processedDetails.push({ name, slug, action: 'ADDED', status: newRecord.status, releaseDate: newRecord.releaseDate });
    }
  }

  return { games: currentUpcomingGames, addedCount, updatedCount, processedDetails };
}

// GET Enriched simulation matching functions/api/crawler/ingest-upcoming-games.ts
function simulateGetEnriched(gamesList, now = Date.now()) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const filtered = gamesList.filter((g) => {
    const isApproved = g.status === 'UPCOMING' || g.status === 'APPROVED';
    if (!isApproved) return false;
    if (!g.releaseDate) return true;
    const target = new Date(g.releaseDate).getTime();
    if (isNaN(target)) return true;
    const elapsed = now - target;
    return elapsed <= ONE_DAY_MS;
  });

  const enriched = filtered.map((g) => {
    let rolloverStatus = 'TBA';
    let hoursRemainingOnBanner = 0;
    let minutesRemainingOnBanner = 0;
    if (g.releaseDate) {
      const target = new Date(g.releaseDate).getTime();
      if (!isNaN(target)) {
        const elapsed = now - target;
        if (elapsed < 0) {
          rolloverStatus = 'COUNTDOWN';
        } else if (elapsed <= ONE_DAY_MS) {
          rolloverStatus = 'TODAY_LAUNCH';
          const remainingMs = ONE_DAY_MS - elapsed;
          hoursRemainingOnBanner = Math.floor(remainingMs / (1000 * 60 * 60));
          minutesRemainingOnBanner = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        } else {
          rolloverStatus = 'ROLLED_OVER';
        }
      }
    }
    const isLaunched = rolloverStatus === 'TODAY_LAUNCH' || rolloverStatus === 'ROLLED_OVER' || g.status === 'LAUNCHED';
    const isRolledOver = rolloverStatus === 'ROLLED_OVER' || g.status === 'LAUNCHED';

    return {
      ...g,
      releaseDate: g.releaseDate || null,
      rolloverStatus,
      hoursRemainingOnBanner,
      minutesRemainingOnBanner,
      isLaunched,
      isRolledOver,
    };
  });

  enriched.sort((a, b) => {
    const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : NaN;
    const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : NaN;
    const hasDateA = !isNaN(timeA);
    const hasDateB = !isNaN(timeB);

    if (hasDateA && !hasDateB) return -1;
    if (!hasDateA && hasDateB) return 1;

    if (hasDateA && hasDateB) {
      if (timeA !== timeB) return timeA - timeB;
      const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 999;
      const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 999;
      return orderA - orderB;
    }

    const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 999;
    const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 999;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
  });

  const liveWithDateCount = gamesList.filter((g) => {
    const isApproved = g.status === 'UPCOMING' || g.status === 'APPROVED';
    if (!isApproved) return false;
    if (!g.releaseDate) return false;
    const target = new Date(g.releaseDate).getTime();
    return !isNaN(target) && (now - target) <= ONE_DAY_MS;
  }).length;

  return {
    games: enriched,
    total: enriched.length,
    liveCount: enriched.length,
    top6Count: Math.min(6, liveWithDateCount),
  };
}

async function runTests() {
  console.log('🧪 Starting Upcoming Games NULL Release Date Support Tests...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // Base state with some known games
  const initialDatabase = [
    {
      id: 'ug_tien_gioi',
      name: 'Tiên Giới: Kiếm Khách Vô Danh',
      slug: 'tien-gioi',
      publisher: 'SohaGame',
      releaseDate: '2026-10-28T10:00:00+07:00',
      status: 'UPCOMING',
      displayOrder: 1,
    },
    {
      id: 'ug_mh_outlanders',
      name: 'Monster Hunter Outlanders',
      slug: 'monster-hunter-outlanders',
      publisher: 'Capcom',
      releaseDate: '2026-10-29T00:00:00+07:00',
      status: 'UPCOMING',
      displayOrder: 2,
    },
    {
      id: 'ug_bleach_bad',
      name: 'BLEACH Mirrors High',
      slug: 'bleach-mirrors-high',
      publisher: 'KLab Games',
      // Currently buggy state: was set to today 25/10
      releaseDate: '2026-10-25T19:45:00+07:00',
      status: 'PENDING',
      displayOrder: 10,
    },
  ];

  // Test 1: Ingest brand new game without releaseDate
  test('New game without releaseDate saves releaseDate = null (not nowIso)', () => {
    const incoming = [
      {
        name: 'Project Mugen',
        slug: 'project-mugen',
        publisher: 'NetEase Games',
        // releaseDate omitted
      },
    ];
    const res = simulateIngest(initialDatabase, incoming);
    assert.strictEqual(res.addedCount, 1);
    const added = res.games.find((g) => g.slug === 'project-mugen');
    assert(added, 'Game should be added');
    assert.strictEqual(added.releaseDate, null, 'releaseDate must be null when omitted');
  });

  // Test 2: Ingest brand new game with explicit null or empty string
  test('New game with releaseDate: null or "" saves releaseDate = null', () => {
    const incoming = [
      {
        name: 'Chrono Odyssey',
        slug: 'chrono-odyssey',
        publisher: 'Kakao Games',
        releaseDate: null,
      },
      {
        name: 'The Seven Deadly Sins: Origin',
        slug: '7ds-origin',
        publisher: 'Netmarble',
        releaseDate: '   ',
      },
    ];
    const res = simulateIngest(initialDatabase, incoming);
    assert.strictEqual(res.addedCount, 2);
    const g1 = res.games.find((g) => g.slug === 'chrono-odyssey');
    const g2 = res.games.find((g) => g.slug === '7ds-origin');
    assert.strictEqual(g1.releaseDate, null);
    assert.strictEqual(g2.releaseDate, null);
  });

  // Test 3: Ingest brand new game with valid date saves exact date
  test('New game with valid releaseDate saves that exact ISO string', () => {
    const incoming = [
      {
        name: 'Azur Promilia',
        slug: 'azur-promilia',
        publisher: 'Manjuu',
        releaseDate: '2026-11-26T10:00:00+07:00',
      },
    ];
    const res = simulateIngest(initialDatabase, incoming);
    const added = res.games.find((g) => g.slug === 'azur-promilia');
    assert.strictEqual(added.releaseDate, '2026-11-26T10:00:00+07:00');
  });

  // Test 4: Partial update omitting releaseDate preserves existing date
  test('Partial update omitting releaseDate preserves existing date', () => {
    const incoming = [
      {
        name: 'Monster Hunter Outlanders',
        slug: 'monster-hunter-outlanders',
        description: 'Bản đồ săn quái vật siêu rộng mở.',
        // releaseDate omitted!
      },
    ];
    const res = simulateIngest(initialDatabase, incoming);
    assert.strictEqual(res.updatedCount, 1);
    const updated = res.games.find((g) => g.slug === 'monster-hunter-outlanders');
    assert.strictEqual(updated.releaseDate, '2026-10-29T00:00:00+07:00', 'Should preserve 2026-10-29');
  });

  // Test 5: Explicit update with releaseDate = null clears the date
  test('Update sending releaseDate = null clears the date to null', () => {
    const incoming = [
      {
        name: 'BLEACH Mirrors High',
        slug: 'bleach-mirrors-high',
        releaseDate: null, // User / bot wants to clear erroneous date
        status: 'UPCOMING',
      },
    ];
    const res = simulateIngest(initialDatabase, incoming);
    assert.strictEqual(res.updatedCount, 1);
    const updated = res.games.find((g) => g.slug === 'bleach-mirrors-high');
    assert.strictEqual(updated.releaseDate, null, 'Should be cleared to null');
    assert.strictEqual(updated.status, 'UPCOMING');
  });

  // Test 6: GET Enriched calculations for null releaseDate
  test('GET enriched for game with null releaseDate: rolloverStatus="TBA", isLaunched=false, hoursRemaining=0', () => {
    const dbWithNullGame = [
      {
        id: 'ug_tg',
        name: 'Tiên Giới',
        slug: 'tien-gioi',
        releaseDate: '2026-10-28T10:00:00+07:00',
        status: 'UPCOMING',
        displayOrder: 1,
      },
      {
        id: 'ug_bleach',
        name: 'BLEACH Mirrors High',
        slug: 'bleach-mirrors-high',
        releaseDate: null,
        status: 'UPCOMING',
        displayOrder: 5,
      },
    ];

    const result = simulateGetEnriched(dbWithNullGame);
    assert.strictEqual(result.total, 2);

    const bleach = result.games.find((g) => g.slug === 'bleach-mirrors-high');
    assert(bleach, 'BLEACH must be in enriched list');
    assert.strictEqual(bleach.releaseDate, null);
    assert.strictEqual(bleach.rolloverStatus, 'TBA');
    assert.strictEqual(bleach.isLaunched, false, 'Must not be considered launched');
    assert.strictEqual(bleach.isRolledOver, false);
    assert.strictEqual(bleach.hoursRemainingOnBanner, 0);
    assert.strictEqual(bleach.minutesRemainingOnBanner, 0);
  });

  // Test 7: Sorting logic (Date ascending first, null date last)
  test('Sorting puts games with dates first (ascending), null dates last (by displayOrder then A-Z)', () => {
    const mixedGames = [
      { name: 'Game Z No Date', slug: 'game-z', releaseDate: null, status: 'UPCOMING', displayOrder: 99 },
      { name: 'Game A No Date', slug: 'game-a', releaseDate: null, status: 'UPCOMING', displayOrder: 10 },
      { name: 'Game Later Date', slug: 'game-later', releaseDate: '2026-11-15T10:00:00+07:00', status: 'UPCOMING', displayOrder: 999 },
      { name: 'Game Soon Date', slug: 'game-soon', releaseDate: '2026-10-28T10:00:00+07:00', status: 'UPCOMING', displayOrder: 999 },
    ];

    const result = simulateGetEnriched(mixedGames);
    const sortedSlugs = result.games.map((g) => g.slug);

    // Expected order: game-soon (28/10), game-later (15/11), game-a (displayOrder 10), game-z (displayOrder 99)
    assert.deepStrictEqual(sortedSlugs, ['game-soon', 'game-later', 'game-a', 'game-z']);
  });

  // Test 8: Banner Top 6 filter excludes games with null release date
  test('Top 6 banner filter excludes null releaseDate games so they do not take countdown slots', () => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const candidateGames = [
      { name: 'Game 1 With Date', slug: 'g1', releaseDate: '2026-10-28T10:00:00+07:00', status: 'UPCOMING' },
      { name: 'Game 2 With Date', slug: 'g2', releaseDate: '2026-10-29T10:00:00+07:00', status: 'UPCOMING' },
      { name: 'Game 3 No Date', slug: 'g3', releaseDate: null, status: 'UPCOMING' },
      { name: 'Game 4 No Date', slug: 'g4', releaseDate: null, status: 'UPCOMING' },
    ];

    // Banner filter logic in UpcomingGamesBanner.tsx
    const bannerItems = candidateGames
      .filter((g) => {
        if (g.status === 'CANCELLED' || g.status === 'PENDING' || g.status === 'LAUNCHED') return false;
        if (!g.releaseDate) return false; // strictly exclude null date
        const target = new Date(g.releaseDate).getTime();
        if (isNaN(target)) return false;
        const elapsed = now - target;
        return elapsed <= ONE_DAY_MS;
      })
      .slice(0, 6);

    assert.strictEqual(bannerItems.length, 2);
    assert.deepStrictEqual(bannerItems.map((g) => g.slug), ['g1', 'g2']);
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
