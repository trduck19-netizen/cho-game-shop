const fs = require('fs');
const path = require('path');

const userCsv = `STT,Tên Tựa Game,Nhà Phát Hành (NPH),Số Lượng Giftcode,Facebook Fanpage Chính Thức
1,Pirate Legends: Huyền Thoại Hải Tặc,NPH GOSU,38+,https://www.facebook.com/haitacdaichiengosu
2,Dị Giới Sinh Tồn OEG,NPH MKO,18+,https://www.facebook.com/digioisinhtonoeg
3,Yến Vân Thập Lục Thanh (Where Winds Meet),NPH Funtap Games,148+,https://www.facebook.com/yenvanthaplucthanh.funtapgames/
4,3Q Đào Đào Đào,NPH JoyGames,11+,https://www.facebook.com/3qdaodaodao/
5,Long Tướng Tam Quốc,NPH VGP,21+,https://www.facebook.com/LongTuongVGP/
6,Ta Là Hắc Ngộ Không,NPH VIAD,5+,https://www.facebook.com/talahacngokhong/
7,Thương Lam Cảnh Giới,NPH Việt Long Game Play,12+,https://www.facebook.com/thuonglam.canhgioi.vlg/
8,Soul Strike,NPH Funtap Games,5+,https://www.facebook.com/SoulStrikeVN/
9,Skyblock: Bá Chủ Lục Địa,NPH Nexfun,5+,Đang cập nhật (Chưa mở Fanpage)
10,Tiên Nghịch: Tân Tình Kiếm,NPH Alo Games,6+,https://www.facebook.com/tiennghichtantinhkiem/
11,Gun X Mobile,NPH SohaGame,10+,https://www.facebook.com/gunxmobile.vn/
12,Câu Cá Vạn Cân,NPH Thế Giới Mini,1+,https://www.facebook.com/caucavancan.1/
13,Tam Quốc Tứ Thời Ca,NPH SohaGame,60+,https://www.facebook.com/TamQuocTuThoiCa.shg/
14,Apex Girls,NPH 9Play,8+,Đang cập nhật (Chưa mở Fanpage)
15,Nam Quốc Sơn Hà,Nhà Phát Hành Quốc Tế,2+,https://www.facebook.com/namquocsonha.imba/
16,Loạn Chiến 3Q,NPH Thiên Hà,12+,https://www.facebook.com/loanchien3q
17,Kiếm Khách Truyền Kỳ,NPH Việt Long Game Play,7+,https://www.facebook.com/kiemkhach.truyenky.vlgplay/
18,Pixel Defenders: Merge TD,Nhà Phát Hành Quốc Tế,1+,https://www.facebook.com/pixel.defenders.rpg
19,Loạn Xì Ngầu 3Q – OEG,NPH Alo Games,22+,https://www.facebook.com/loanxingau3q/
20,Tam Quốc: Tranh Bá Thiên Hạ,NPH Mộc,40+,https://www.facebook.com/3QTranhBaThienHa.Vi/
21,Titan Rush: Chiến Thần Thức Tỉnh,NPH Funtap Games,5+,https://www.facebook.com/playfun.vn
22,Girls' Frontline 2: Lưu Đày,NPH THS Game,2+,https://www.facebook.com/gfl2.vn/
23,Quan Nhị Ca,NPH ZIE,13+,https://www.facebook.com/quannhica.zalogames/
24,Đội Tướng Nhí Nhố,NPH KAN,21+,https://www.facebook.com/doituongnhinho/
25,Hắc Tây Du: Chương Cấm,NPH Funtap Games,3+,https://www.facebook.com/hactaydufuntap/
26,Huyền Thoại Hương Cảng,NPH Velalive,9+,https://www.facebook.com/hthcvn/
27,Giang Hồ Trong Tay,Nhà Phát Hành Quốc Tế,15+,Đang cập nhật (Game Quốc Tế)
28,Diệt Quỷ Origin,NPH HNXSoft,2+,https://www.facebook.com/dietquyhnx/
29,Cờ Lau Loạn Thế,NPH Lotasoft,5+,Đang cập nhật (Chưa mở Fanpage)
30,Loạn Thế 3Q: Thần Ma Lệnh - OEG,NPH Alo Games,26+,https://www.facebook.com/loanthe3qoeg/
31,ShenZhou M – Thần Châu,NPH VTC Dịch Vụ Di Động,3+,https://www.facebook.com/61594329329126/
32,Phi Kiếm Trừ Thiên Ma,NPH AT,14+,https://www.facebook.com/people/Phi-Ki%E1%BA%BFm-Tr%E1%BB%AB-Thi%E1%BA%A7n-Ma/61590605638051/
33,AFK Three Kingdoms Idle RPG,Nhà Phát Hành Quốc Tế,1+,Đang cập nhật (Game Quốc Tế)
34,Khế Ước Rồng,NPH VGP,15+,https://www.facebook.com/KheUocRong/
35,Tuyệt Đỉnh Chiến Giới,Nhà Phát Hành Quốc Tế / Vplay,10+,https://www.facebook.com/tuyetdinhchiengioi.vplay.vn/
36,Đạo Hữu Xin Dừng Bước,NPH JoyGames,15+,https://www.facebook.com/daohuuxindungbuoc.vn/
37,Anime Fighting Simulator Endless,Nhà Phát Hành Quốc Tế,11+,Đang cập nhật (Game Quốc Tế)
38,Anime Vanguards,Nhà Phát Hành Quốc Tế,3+,Đang cập nhật (Game Quốc Tế)
39,3Q Gọi Tướng Đi,NPH 568E,36+,https://www.facebook.com/3qgoituongdi/
40,Blade Ball,Nhà Phát Hành Quốc Tế,13+,Đang cập nhật (Game Quốc Tế)
41,Tam Quốc Chí Vương Chiến,NPH VTC Dịch Vụ Di Động,10+,https://www.facebook.com/61594329329126/
42,Nhật Luân Kiếm,NPH Skymobi,7+,https://www.facebook.com/nhatluankiem/
43,Ark Re:Code,Nhà Phát Hành Quốc Tế,2+,Đang cập nhật (Game Quốc Tế)
44,Aniimo,Nhà Phát Hành Quốc Tế,10+,Đang cập nhật (Game Quốc Tế)
45,Tiểu Tiên Ta Vô Địch,NPH Alo Games,17+,https://www.facebook.com/tieutientavodichoeg
46,Giác Ngộ Thuật Chú,Nhà Phát Hành Quốc Tế,7+,Đang cập nhật (Game Quốc Tế)
47,Fairy Tamer,Nhà Phát Hành Quốc Tế,8+,Đang cập nhật (Game Quốc Tế)
48,Hơi Thở Hải Tặc,NPH GOSU,24+,https://www.facebook.com/hoithohaitac/
49,Capybara Go!,NPH Bliss,10+,Đang cập nhật (Game Quốc Tế)
50,King Legacy,Nhà Phát Hành Quốc Tế,8+,Đang cập nhật (Game Quốc Tế)
51,Chaos Zero Nightmare,Nhà Phát Hành Quốc Tế,2+,Đang cập nhật (Game Quốc Tế)
52,CookieRun: Kingdom,Nhà Phát Hành Quốc Tế,11+,Đang cập nhật (Game Quốc Tế)
53,Gangstar Mirage City: Online,Nhà Phát Hành Quốc Tế,4+,Đang cập nhật (Game Quốc Tế)
54,EZ PZ: Byte Heroes,Nhà Phát Hành Quốc Tế,3+,Đang cập nhật (Game Quốc Tế)
55,Lost Sword,Nhà Phát Hành Quốc Tế,3+,Đang cập nhật (Game Quốc Tế)
56,Genesis War,Nhà Phát Hành Quốc Tế,1+,Đang cập nhật (Game Quốc Tế)
57,Neo Artifacts,NPH VTC Dịch Vụ Di Động,1+,Đang cập nhật (Game Quốc Tế)
58,MONGIL: STAR DIVE,Nhà Phát Hành Quốc Tế,6+,Đang cập nhật (Game Quốc Tế)
59,Kiếm Vũ Sơn Hà,NPH Broga,8+,https://www.facebook.com/kiemvusonha3d/
60,Greedy Cave: Rebirth,NPH Bliss,8+,Đang cập nhật (Game Quốc Tế)
61,Tế Công Truyền Kỳ,NPH Funtap Games,12+,Facebook Fanpage: Tế Công Truyền Kỳ
62,Chiến Giới 4D,NPH Vplay,25+,Facebook Fanpage: Chiến Giới 4D
63,Thần Thú Cổ Đại,NPH GOSU,18+,Facebook Fanpage: Thần Thú Cổ Đại
64,Garena Liên Quân Mobile,NPH Garena,50+,Facebook Fanpage: Garena Liên Quân Mobile
65,LMHT: Tốc Chiến,NPH VNGGames,30+,Facebook Fanpage: LMHT: Tốc Chiến
66,Genshin Impact,NPH HoYoverse,45+,Facebook Fanpage: Genshin Impact
67,Honkai: Star Rail,NPH HoYoverse,35+,Facebook Fanpage: Honkai: Star Rail
68,Zenless Zone Zero,NPH HoYoverse,20+,Facebook Fanpage: Zenless Zone Zero
69,Võ Lâm Truyền Kỳ MAX,NPH VNGGames,40+,Facebook Fanpage: Võ Lâm Truyền Kỳ MAX
70,Kiếm Thế Origin,NPH VNGGames,55+,Facebook Fanpage: Kiếm Thế Origin
71,Thần Vương Chi Mộng,NPH Funtap Games,16+,Facebook Fanpage: Thần Vương Chi Mộng
72,Nhất Mộng Giang Hồ,NPH VNGGames,22+,Facebook Fanpage: Nhất Mộng Giang Hồ
73,Tam Quốc Chess,NPH SohaGame,19+,Facebook Fanpage: Tam Quốc Chess
74,Hải Tặc Đại Chiến,NPH GOSU,42+,Facebook Fanpage: Hải Tặc Đại Chiến
75,Tân Minh Chủ,NPH SohaGame,30+,Facebook Fanpage: Tân Minh Chủ
76,Tru Tiên 3D,NPH Gamota,28+,Facebook Fanpage: Tru Tiên 3D
77,Phong Vương Triều,NPH VTC Mobile,14+,Facebook Fanpage: Phong Vương Triều
78,Đại Hiệp Luyện Kiếm,NPH VGP,15+,Facebook Fanpage: Đại Hiệp Luyện Kiếm
79,Linh Thú Đại Chiến,NPH JoyGames,12+,Facebook Fanpage: Linh Thú Đại Chiến
80,Tây Du VNG,NPH VNGGames,38+,Facebook Fanpage: Tây Du VNG
81,Thần Chi Nhẫn,NPH SohaGame,14+,Facebook Fanpage: Thần Chi Nhẫn
82,Thiên Long Bát Bộ 2 VNG,NPH VNGGames,32+,Facebook Fanpage: Thiên Long Bát Bộ 2 VNG
83,Mộng Giới 3D,NPH ACE Games,11+,Facebook Fanpage: Mộng Giới 3D
84,Đấu La Đại Lục,NPH Funtap Games,60+,Facebook Fanpage: Đấu La Đại Lục
85,Thánh Quang Chi Thuyết,NPH Vplay,17+,Facebook Fanpage: Thánh Quang Chi Thuyết
86,Thiên Hạ Anh Hùng 3Q,NPH SohaGame,18+,Facebook Fanpage: Thiên Hạ Anh Hùng 3Q
87,Cửu Dương Truyền Kỳ 2,NPH GOSU,20+,Facebook Fanpage: Cửu Dương Truyền Kỳ 2
88,Ragnarok Origin VN,NPH Gravity Game Tech,25+,Facebook Fanpage: Ragnarok Origin VN
89,Manga Clash,NPH PopPace,15+,Facebook Fanpage: Manga Clash
90,Hero Arena,Nhà Phát Hành Quốc Tế,10+,Đang cập nhật (Chưa mở Fanpage)
91,Dragon Ball Idle,Cộng đồng Game,30+,Đang cập nhật (Chưa mở Fanpage)
92,Ninja Legend,Cộng đồng Game,25+,Đang cập nhật (Chưa mở Fanpage)
93,Pirate King,Cộng đồng Game,40+,Đang cập nhật (Chưa mở Fanpage)
94,Tower of Fantasy,NPH Level Infinite,30+,Facebook Fanpage: Tower of Fantasy
95,Epic Seven,NPH Smilegate Megaport,50+,Facebook Fanpage: Epic Seven
96,Summoners War,NPH Com2uS,80+,Facebook Fanpage: Summoners War
97,AFK Arena,NPH Lilith Games,60+,Facebook Fanpage: AFK Arena
98,Lords Mobile,NPH IGG,45+,Facebook Fanpage: Lords Mobile
99,Rise of Kingdoms,NPH Lilith Games,50+,Facebook Fanpage: Rise of Kingdoms
100,ROX VN,NPH Gravity,35+,Facebook Fanpage: ROX VN`;

const currentSources = require('../../src/data/crawler_sources.json');
const games = require('../../src/data/games188.json');

const normalizeUrl = (u) => {
  if (!u) return '';
  return u
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\/(www\.)?/, 'https://')
    .replace(/\/+$/, '');
};

const existingUrls = new Map();
currentSources.forEach((s) => {
  existingUrls.set(normalizeUrl(s.url), s);
});

const lines = userCsv.split('\n').filter((l) => l.trim() && /^\d+,/.test(l.trim()));
console.log(`Đã phân tích ${lines.length} dòng dữ liệu từ người dùng.`);

const results = [];
const duplicateList = [];
const newUrlList = [];
const textNamedList = [];
const pendingNoPageList = [];

lines.forEach((line) => {
  const parts = line.split(',');
  const stt = parseInt(parts[0].trim(), 10);
  const name = parts[1].trim();
  const pub = parts[2].trim();
  const codes = parts[3].trim();
  const rawFb = parts.slice(4).join(',').trim();

  // Tìm game trong games188
  const matchedGame = games.find((g) => {
    const cleanGName = g.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanUName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanGName === cleanUName || cleanGName.includes(cleanUName) || cleanUName.includes(cleanGName);
  });

  if (rawFb.startsWith('http')) {
    const norm = normalizeUrl(rawFb);
    const existing = existingUrls.get(norm);
    if (existing) {
      duplicateList.push({
        stt,
        name,
        pub,
        url: rawFb,
        matchedSourceId: existing.id,
        matchedSourceName: existing.name,
      });
    } else {
      newUrlList.push({
        stt,
        name,
        pub,
        url: rawFb,
        matchedGameSlug: matchedGame ? matchedGame.slug : null,
        matchedGameName: matchedGame ? matchedGame.name : name,
      });
    }
  } else if (rawFb.startsWith('Facebook Fanpage:')) {
    textNamedList.push({
      stt,
      name,
      pub,
      fanpageTitle: rawFb.replace('Facebook Fanpage:', '').trim(),
      matchedGameSlug: matchedGame ? matchedGame.slug : null,
      matchedGameName: matchedGame ? matchedGame.name : name,
    });
  } else {
    pendingNoPageList.push({
      stt,
      name,
      pub,
      note: rawFb,
    });
  }
});

console.log('='.repeat(70));
console.log(`📊 TỔNG KẾT PHÂN LOẠI 100 TỰA GAME:`);
console.log(` - Đã có link Facebook cụ thể: ${duplicateList.length + newUrlList.length}`);
console.log(`   + TRÙNG ĐÃ CÓ TRONG FILE: ${duplicateList.length} link`);
console.log(`   + MỚI CHƯA CÓ TRONG FILE: ${newUrlList.length} link`);
console.log(` - Khai báo dạng tên Fanpage (cần gắn link chuẩn): ${textNamedList.length} game`);
console.log(` - Đang cập nhật / Game Quốc Tế (chưa có fanpage): ${pendingNoPageList.length} game`);
console.log('='.repeat(70));

console.log(`\n1. DANH SÁCH ${duplicateList.length} LINK TRÙNG LẶP:`);
duplicateList.forEach((d) => {
  console.log(` [STT ${d.stt}] ${d.name} -> ${d.url} (Trùng với nguồn: ${d.matchedSourceId} - ${d.matchedSourceName})`);
});

console.log(`\n2. DANH SÁCH ${newUrlList.length} LINK MỚI CẦN CẬP NHẬT VÀO NGUỒN CÀO:`);
newUrlList.forEach((n) => {
  console.log(` [STT ${n.stt}] ${n.name} (Slug: ${n.matchedGameSlug}) -> ${n.url}`);
});
