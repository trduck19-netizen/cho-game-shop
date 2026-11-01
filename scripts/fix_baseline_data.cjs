/**
 * scripts/fix_baseline_data.cjs
 * Sửa triệt để dữ liệu gốc trong src/data/crawled_codes_188.json và public/data/codes_database.json:
 * 1. Đồng bộ 100% Where Winds Meet & Yên Vân Thập Lục Thanh (status, rewards, không còn mâu thuẫn "(Đã hết hạn)")
 * 2. Sửa hồi tố case chữ hoa/thường cho Type Soul (Cristi2026, palacecountdown, etc.)
 * 3. Loại bỏ 22 mã rác kích thước ảnh WordPress (IN-TYPE-SOUL-*, IN-ANIME-VANGUARDS-*, IN-DA-HOOD-*)
 * 4. Đồng bộ case chuẩn cho HoYoverse (Sunbringer, HourOfRuin, ExpertMitya, PhotoTime)
 */

const fs = require('fs');

const TYPE_SOUL_CASE_MAP = {
  'CRISTI2026': 'Cristi2026',
  'PALACECOUNTDOWN': 'palacecountdown',
  'ALMIGHTYCRISTISHOWCASEV2': 'almightycristishowcasev2',
  'ARMASTORCODE': 'armastorcode',
  'ARMASTORCODE2': 'armastorcode2',
  'BALANCESTAGE': 'BalanceStage',
  'BARAGGANINTORISINGSWALLOW': 'baragganintorisingswallow',
  'CODEFORLASTWEEKEND': 'codeforlastweekend',
  'CRISTIBDAY': 'cristibday',
  'D1ATHLETE3XMROLYMPIAWINNERDCDECIIMO': 'd1athlete3xmrolympiawinnerdcdeciimo',
  'EIDMUBARAK': 'eidmubarak',
  'ERIKKIMONTH': 'ErikkiMonth',
  'GREENGIANT': 'greengiant',
  'GREENGIANTV': 'greengiantv',
  'HEYITSMEVEGADODGEFRAME': 'heyitsmevegadodgeframe',
  'HIDDENSBLESSING': 'HiddensBLESSING',
  'HOTFIXESTHXFORPLAYINGTYPESOUL': 'HotfixesThxForPlayingTypeSoul',
  'ICHIGO101010': 'ichigo101010',
  'IGUESSTHETYPESOULWASINUSALLALONG': 'iguessthetypesoulwasinusallalong',
  'ITNEARLYCAMEHOME': 'ItNearlyCameHome',
  'ITSALMOSTTHATKINDOFSUMMER': 'itsalmostthatkindofsummer',
  'JOSHISBACKANDADDINGSLOPTOTHEGAMETEEHEE': 'joshisbackandaddingsloptothegameteehee',
  'KURTISATUNG': 'Kurtisatung',
  'KYOKANERFSWEREDESERVEDLOL': 'kyokanerfsweredeservedlol',
  'LETSFIXTYPE': 'letsfixtype',
  'MINIERIKKIKT': 'minierikkikt',
  'MORPHQUESTFIX': 'morphquestfix',
  'NERDLANTERN': 'nerdlantern',
  'NGLIMMATAKEANAPLMK': 'NglImmaTakeANapLmk',
  'NOOBSOUL': 'noobsoul',
  'PALACEUPDATE2060': 'PALACEUPDATE2060',
  'RULESAREMADETOBEBROKE': 'rulesaremadetobebroke',
  'RULESAREMADETOBROKEN': 'rulesaremadetobroken',
  'SILLYHOLLOW': 'sillyhollow',
  'SMALLINCONVENIENCE': 'smallinconvenience',
  'SMALLPATCHYAY': 'SmallPatchYay',
  'SORRY4DELAY': 'sorry4delay',
  'SORRYDELAY1': 'sorrydelay1',
  'SORRYDELAY2': 'sorrydelay2',
  'SPAINWORLDCUPWINNERS26': 'SpainWorldCupWinners26',
  'TEMISBURGER': 'temisburger',
  'TEXBDAY': 'texbday',
  'THEPRODIGY': 'theprodigy',
  'THESECRETISINUPDATELOGS': 'TheSecretIsInUpdateLogs',
  'THISISWHYWECLASH1M': 'thisiswhyweclash1m',
  'TMRFRTHISTIMEONSHREDSYLIFE': 'tmrfrthistimeonshredsylife',
  'TRIPLETBIRTHDAY': 'tripletbirthday',
  'TRUEWORLDBEARER': 'TrueWorldbearer',
  'TRULYBEENATYPESOUL': 'TrulyBeenATypeSoul',
  'TYPEBUGISMYFAVOURITEGAME': 'TypeBugIsMYFavouriteGame',
  'TYPESOULBURDEN': 'TypeSoulBurden',
  'VDEKUGLOBALBAN': 'vdekuglobalban',
  'VILHALLOWEENCODE': 'vilhalloweencode',
  'VOIDZLATEBDAY': 'voidzlatebday',
  'WAITTYPESOULISTILLNEEDYOU': 'waittypesoulistillneedyou',
  'WEWANTSPIRAL': 'wewantspiral',
  'YAYFIRSTWEEKLY': 'yayfirstweekly',
  'BESTBDAY': 'BestBday',
  'GROUNDHAKUDAMOGSAIRHAKUDA': 'groundhakudamogsairhakuda',
  'GUYS': 'guys',
  'LEAFYHORIZONCORE': 'leafyhorizoncore',
  'THANKSGIVINGBREAKWOOHOO': 'thanksgivingbreakwoohoo',
  'TYPEBUGILOVETYPEBUG': 'typebugilovetypebug',
  'TYPEMEMORYLOSS': 'typememoryloss',
  'TYPESOUL2026VVVKHOATICFENG': 'typesoul2026vvvkhoaticfeng',
  'TYPESOULWORLDCUP2030': 'TypeSoulWorldCup2030',
  'SOULREAPER': 'SoulReaper',
  'TYPESOUL2026': 'TypeSoul2026',
};

const WWM_TARGET_ACTIVE = new Set([
  'CH8AJWFRRR', 'CYMWMFCJDH', 'DQJXNYQNJ4', 'FHHXEYRJAN', 'FSA7JNANTP',
  'GOHOME123', 'GOOSENEWS', 'HEXI0306', 'HXY33FXEFM', 'HYXJRTA37F',
  'JJXDTKCD8Y', 'KC6T677DRY', 'KPC346C44A', 'NK4AJFPDWC', 'PJCXEP4MFT',
  'QMQW7RQJT6', 'QTNJP7P4PC', 'SWCQQQHWAE', 'SY3KQQE8KR', 'TPCF3FEN6Y',
  'WM8E7JJF47', 'WWM251115', 'WWMDEVTALK', 'WWMGLTIKTOK', 'WWMGLYOUTUBE',
  'WWMQC1', 'QINCHUAN0430', 'QINCHUANGOGO', 'MEETINHEXI', 'PALACE0528',
  'HAPPY515', 'LIANGZHOUGO', 'XWCXEETKKE'
]);

function processDatabaseFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`Bỏ qua vì không tồn tại: ${filePath}`);
    return;
  }
  console.log(`\nĐang xử lý ${filePath}...`);
  const raw = fs.readFileSync(filePath, 'utf8');
  let codes = JSON.parse(raw);
  const initialCount = codes.length;

  // 1. Lọc bỏ 22 mã rác kích thước ảnh WordPress (IN-...-1024X576, etc.)
  codes = codes.filter(c => {
    const codeVal = String(c.code || c.codeValue || c.gift_code || '');
    if (/^IN-.*-\d+X\d+$/i.test(codeVal)) {
      return false;
    }
    return true;
  });
  console.log(`- Đã lọc bỏ ${initialCount - codes.length} mã rác kích thước ảnh.`);

  // 2. Thu thập và đồng nhất dữ liệu Where Winds Meet & Yên Vân Thập Lục Thanh
  const wwmCanonical = new Map();
  // Quét trước để tìm phần thưởng phong phú nhất
  for (const c of codes) {
    const slug = c.gameSlug || c.game_slug || '';
    if (slug === 'where-winds-meet-mobile' || slug === 'yen-van-thap-luc-thanh') {
      const codeVal = String(c.code || c.codeValue || c.gift_code || '').trim().toUpperCase();
      let currentBest = wwmCanonical.get(codeVal);
      const rawReward = String(c.rewards || c.description || '').trim();
      const isExpiredText = /hết hạn/i.test(rawReward);
      const isDetailed = rawReward.length > 15 && !isExpiredText;

      let status = String(c.status || '').toLowerCase();
      if (WWM_TARGET_ACTIVE.has(codeVal) || status === 'active' || status === 'verified') {
        status = 'ACTIVE';
      }

      let reward = rawReward;
      if (isExpiredText || !reward) {
        reward = 'Quà tặng tân thủ';
      }

      if (!currentBest) {
        wwmCanonical.set(codeVal, {
          code: c.code || codeVal,
          status,
          rewards: reward,
          description: reward,
          expires_at: status === 'ACTIVE' ? null : c.expires_at,
          expiresAt: status === 'ACTIVE' ? null : c.expiresAt,
          expiry: status === 'ACTIVE' ? null : c.expiry,
          source: c.source || 'Where Winds Meet Official',
          isDetailed
        });
      } else {
        if (status === 'ACTIVE') currentBest.status = 'ACTIVE';
        if (isDetailed && !currentBest.isDetailed) {
          currentBest.rewards = reward;
          currentBest.description = reward;
          currentBest.isDetailed = true;
        }
      }
    }
  }

  // Áp dụng canonical vào tất cả mã WWM & Yên Vân
  for (const c of codes) {
    const slug = c.gameSlug || c.game_slug || '';
    if (slug === 'where-winds-meet-mobile' || slug === 'yen-van-thap-luc-thanh') {
      const codeVal = String(c.code || c.codeValue || c.gift_code || '').trim().toUpperCase();
      const canon = wwmCanonical.get(codeVal);
      if (canon) {
        c.code = canon.code;
        c.codeValue = canon.code;
        c.status = canon.status;
        c.is_active = canon.status === 'ACTIVE';
        c.rewards = canon.rewards;
        c.description = canon.description;
        if (canon.status === 'ACTIVE') {
          c.expires_at = null;
          c.expiresAt = null;
          c.expiry = null;
        }
      }
    }

    // 3. Sửa case hồi tố cho Type Soul
    if (slug === 'type-soul') {
      const upper = String(c.code || c.codeValue || '').trim().toUpperCase();
      if (TYPE_SOUL_CASE_MAP[upper]) {
        const correctCase = TYPE_SOUL_CASE_MAP[upper];
        c.code = correctCase;
        c.codeValue = correctCase;
        if (c.gift_code) c.gift_code = correctCase;
      }
    }

    // 4. Sửa case hồi tố cho Genshin Impact
    if (slug === 'genshin-impact') {
      const upper = String(c.code || c.codeValue || '').trim().toUpperCase();
      if (upper === 'HOUROFRUIN') { c.code = 'HourOfRuin'; c.codeValue = 'HourOfRuin'; c.status = 'EXPIRED'; }
      if (upper === 'EXPERTMITYA') { c.code = 'ExpertMitya'; c.codeValue = 'ExpertMitya'; c.status = 'EXPIRED'; }
      if (upper === 'PHOTOTIME') { c.code = 'PhotoTime'; c.codeValue = 'PhotoTime'; c.status = 'EXPIRED'; }
    }

    // 5. Zenless Zone Zero
    if (slug === 'zenless-zone-zero') {
      const upper = String(c.code || c.codeValue || '').trim().toUpperCase();
      if (upper === 'SUNBRINGER') {
        c.code = 'Sunbringer';
        c.codeValue = 'Sunbringer';
        c.status = 'ACTIVE';
        c.rewards = '30 Polychrome';
        c.expiry = '2026-10-29 23:59:59 UTC+8';
        c.expires_at = '2026-10-29 23:59:59 UTC+8';
      }
    }
  }

  // Đảm bảo Sunbringer có mặt trong ZZZ nếu chưa có
  const hasSunbringer = codes.some(c => (c.gameSlug || c.game_slug) === 'zenless-zone-zero' && (c.code === 'Sunbringer' || c.codeValue === 'Sunbringer'));
  if (!hasSunbringer) {
    codes.unshift({
      id: 'zzz_sunbringer_official',
      gameId: 'zenless-zone-zero',
      gameSlug: 'zenless-zone-zero',
      slug: 'zenless-zone-zero',
      code: 'Sunbringer',
      codeValue: 'Sunbringer',
      rewards: '30 Polychrome',
      description: '30 Polychrome',
      status: 'ACTIVE',
      is_active: true,
      expires_at: '2026-10-29 23:59:59 UTC+8',
      expiry: '2026-10-29 23:59:59 UTC+8',
      source: 'Kênh YouTube chính thức HoYoverse',
      added_at: new Date().toISOString()
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(codes, null, 2), 'utf8');
  console.log(`✅ Đã cập nhật thành công ${filePath} (${codes.length} mã).`);
}

processDatabaseFile('src/data/crawled_codes_188.json');
processDatabaseFile('public/data/codes_database.json');
