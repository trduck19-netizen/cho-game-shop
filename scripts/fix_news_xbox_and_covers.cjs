const fs = require('fs');

async function fixNewsD1() {
  const secret = 'wcg_tok_usr_admin_master';
  const syncUrl = 'https://admin-code-game-shop.pages.dev/api/sync';

  console.log('1. Fetching all news articles from D1...');
  const res = await fetch(`${syncUrl}?key=wcg_news_articles_v1&fresh=1&_t=${Date.now()}`, {
    headers: { 'Authorization': `Bearer ${secret}` }
  });
  const data = await res.json();
  const articles = data.data || [];
  console.log(`Fetched ${articles.length} articles from D1`);

  let modifiedCount = 0;
  articles.forEach(a => {
    // Fix Xbox article
    if (a.title.includes('Xbox') || a.title.includes('Microsoft')) {
      if (a.cover_url !== '/news_covers/xbox-games-collection.webp') {
        a.cover_url = '/news_covers/xbox-games-collection.webp';
        a.game_slug = 'xbox-games';
        a.game_name = 'Bộ Sưu Tầm Xbox';
        modifiedCount++;
      }
    }
    // Fix any other missing or external covers
    if (a.title.includes('Board Game') || a.title.includes('board game') || a.title.includes('du lịch')) {
      if (a.cover_url !== '/news_covers/board-game-van-hoa-viet.webp') {
        a.cover_url = '/news_covers/board-game-van-hoa-viet.webp';
        modifiedCount++;
      }
    }
    if (a.title.includes('nhân lực') || a.title.includes('5.000 nhân lực')) {
      if (a.cover_url !== '/news_covers/nhan-luc-nganh-game.webp') {
        a.cover_url = '/news_covers/nhan-luc-nganh-game.webp';
        modifiedCount++;
      }
    }
    if (a.title.includes('Quà Tặng VIP') || a.title.includes('quà tặng vip')) {
      if (a.cover_url !== '/news_covers/qua-tang-giftcode-vip.webp') {
        a.cover_url = '/news_covers/qua-tang-giftcode-vip.webp';
        modifiedCount++;
      }
    }
    if (a.title.includes('thị trường') || a.title.includes('Thị Trường Game')) {
      if (a.cover_url !== '/news_covers/thi-truong-game-viet-nam.webp') {
        a.cover_url = '/news_covers/thi-truong-game-viet-nam.webp';
        modifiedCount++;
      }
    }
    // Ensure author & source is CodeGame.Shop
    a.author = 'CodeGame.Shop';
    a.source_name = 'CodeGame.Shop';
    a.source_url = 'https://codegame.shop';
  });

  console.log(`Updated ${modifiedCount} articles. Saving to D1...`);
  const postRes = await fetch(syncUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secret}`
    },
    body: JSON.stringify({
      key: 'wcg_news_articles_v1',
      data: articles,
      newsArticles: articles
    })
  });

  const postData = await postRes.json();
  console.log('D1 Save Result:', postData);
}

fixNewsD1();
