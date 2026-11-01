const fs = require('fs');

const SYNC_KEY = 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
const ENDPOINTS = [
  'https://admin-code-game-shop.pages.dev/api/sync',
  'https://web-code-game.pages.dev/api/sync',
  'https://codegame.shop/api/sync'
];

// Danh sách các ID cũ cần xóa khỏi D1
const OLD_IDS_TO_DELETE = [
  'ut_vs_basic_1d', 'ut_vs_basic_7d', 'ut_vs_basic_30d',
  'ut_vs_vip_1d', 'ut_vs_vip_7d', 'ut_vs_vip_30d',
  'ut_vs_kvip_1d', 'ut_vs_kvip_7d', 'ut_vs_kvip_30d',
  'ut_vs_svip_1d', 'ut_vs_svip_7d', 'ut_vs_svip_30d',
  'ut_vs_xvip_1d', 'ut_vs_xvip_7d', 'ut_vs_xvip_30d',
  'ut_vs_mvip_1d', 'ut_vs_mvip_7d', 'ut_vs_mvip_30d'
];

const VS_PHONE_SPECS = [
  {
    tier: 'Basic',
    titlePrefix: 'VS Phone Basic',
    cpu: '6 lõi CPU',
    ram: '4GB RAM',
    rom: '32GB Bộ nhớ',
    highlights: 'Cấu hình tiêu chuẩn tối ưu cho các tựa game nhẹ, ứng dụng mạng xã hội và tác vụ cày cuốc cơ bản.',
    packages: [
      { id: 'ut_vs_01_basic_1d', duration: '1 Day', days: 1, current: 9832, original: 11832, sold: 48 },
      { id: 'ut_vs_02_basic_7d', duration: '7 Days', days: 7, current: 24030, original: 26030, sold: 72 },
      { id: 'ut_vs_03_basic_30d', duration: '30 Days', days: 30, current: 76615, original: 78615, sold: 125 }
    ]
  },
  {
    tier: 'VIP',
    titlePrefix: 'VS Phone VIP',
    cpu: '8 lõi CPU',
    ram: '3.2GB RAM',
    rom: '50GB Bộ nhớ',
    highlights: 'Vi xử lý 8 nhân mạnh mẽ, xử lý mượt mà đa tác vụ, treo game 3D ổn định không văng app.',
    packages: [
      { id: 'ut_vs_04_vip_1d', duration: '1 Day', days: 1, current: 11146, original: 13146, sold: 39 },
      { id: 'ut_vs_05_vip_7d', duration: '7 Days', days: 7, current: 29551, original: 31551, sold: 64 },
      { id: 'ut_vs_06_vip_30d', duration: '30 Days', days: 30, current: 87395, original: 89395, sold: 110 }
    ]
  },
  {
    tier: 'KVIP',
    titlePrefix: 'VS Phone KVIP',
    cpu: '8 lõi CPU',
    ram: '4GB RAM',
    rom: '64GB Bộ nhớ',
    highlights: 'Nâng cấp RAM 4GB và bộ nhớ 64GB giúp mở nhiều ứng dụng chạy song song mượt mà, phản hồi siêu tốc.',
    packages: [
      { id: 'ut_vs_07_kvip_1d', duration: '1 Day', days: 1, current: 17720, original: 19720, sold: 35 },
      { id: 'ut_vs_08_kvip_7d', duration: '7 Days', days: 7, current: 40068, original: 42068, sold: 58 },
      { id: 'ut_vs_09_kvip_30d', duration: '30 Days', days: 30, current: 116317, original: 118317, sold: 92 }
    ]
  },
  {
    tier: 'SVIP',
    titlePrefix: 'VS Phone SVIP',
    cpu: '8 lõi CPU',
    ram: '5.3GB RAM',
    rom: '85GB Bộ nhớ',
    highlights: 'Hiệu năng đỉnh cao với RAM 5.3GB và dung lượng khủng 85GB lưu trữ, chạy mượt mà game 3D đồ họa nặng.',
    packages: [
      { id: 'ut_vs_10_svip_1d', duration: '1 Day', days: 1, current: 21663, original: 23663, sold: 29 },
      { id: 'ut_vs_11_svip_7d', duration: '7 Days', days: 7, current: 66361, original: 68361, sold: 45 },
      { id: 'ut_vs_12_svip_30d', duration: '30 Days', days: 30, current: 181786, original: 183786, sold: 76 }
    ]
  },
  {
    tier: 'XVIP',
    titlePrefix: 'VS Phone XVIP',
    cpu: '8 lõi CPU',
    ram: '8GB RAM',
    rom: '128GB Bộ nhớ',
    highlights: 'Cấu hình siêu khủng: 8GB RAM và 128GB Bộ nhớ trong chuẩn smartphone cao cấp, cày view, live stream và bot đa luồng.',
    packages: [
      { id: 'ut_vs_13_xvip_1d', duration: '1 Day', days: 1, current: 37439, original: 39439, sold: 22 },
      { id: 'ut_vs_14_xvip_7d', duration: '7 Days', days: 7, current: 95020, original: 97020, sold: 38 },
      { id: 'ut_vs_15_xvip_30d', duration: '30 Days', days: 30, current: 260664, original: 262664, sold: 61 }
    ]
  },
  {
    tier: 'MVIP',
    titlePrefix: 'VS Phone MVIP',
    cpu: '8 lõi CPU',
    ram: '16GB RAM',
    rom: '256GB Bộ nhớ',
    highlights: 'Cấu hình quái thú mạnh nhất phân khúc: 16GB RAM không giới hạn đa nhiệm, bộ nhớ 256GB đỉnh cao cho game thủ chuyên nghiệp.',
    packages: [
      { id: 'ut_vs_16_mvip_1d', duration: '1 Day', days: 1, current: 52426, original: 54426, sold: 18 },
      { id: 'ut_vs_17_mvip_7d', duration: '7 Days', days: 7, current: 129201, original: 131201, sold: 31 },
      { id: 'ut_vs_18_mvip_30d', duration: '30 Days', days: 30, current: 494933, original: 496933, sold: 47 }
    ]
  }
];

function generateProducts() {
  const products = [];

  for (const spec of VS_PHONE_SPECS) {
    for (const pkg of spec.packages) {
      const discountPercent = Math.round(((pkg.original - pkg.current) / pkg.original) * 100);
      const hours = pkg.days * 24;

      const description = `Treo game 24/24 online.

⚡ [ĐẠI LÝ CHÍNH THỨC VS PHONE] - Hệ thống phân phối & kích hoạt tự động uy tín!

📱 Dòng máy: ${spec.titlePrefix}
⚙️ Cấu hình phần cứng: ${spec.cpu} | ${spec.ram} | ${spec.rom}
⏱️ Thời hạn sử dụng: Gói ${pkg.duration} (${hours} giờ hoạt động liên tục)
💰 Giá ưu đãi: ${pkg.current.toLocaleString('vi-VN')}đ (Giá gốc niêm yết: ${pkg.original.toLocaleString('vi-VN')}đ - Tiết kiệm ngay 2.000đ so với giá hãng)

🌟 CÔNG DỤNG & LỢI ÍCH VƯỢT TRỘI CỦA VS PHONE:
• Treo game online/offline 24/24 mượt mà, không lo hao pin, không nóng máy, không chai pin thiết bị thật.
• Nuôi dàn tài khoản mạng xã hội (Facebook, TikTok, Zalo, Telegram...) số lượng lớn, hoạt động độc lập và an toàn.
• Vận hành tool, bot tự động hóa, auto click liên tục trên nền tảng Android đám mây tốc độ cao.
• Giữ an toàn tuyệt đối cho thiết bị thật, ẩn danh địa chỉ IP và bảo mật dữ liệu riêng tư.
• Đường truyền đám mây băng thông cao, kết nối ổn định 100% không lo rớt mạng.

🛡️ CAM KẾT TỪ ĐẠI LÝ CHÍNH THỨC:
• Cấp thông tin tài khoản / mã kích hoạt nhanh chóng sau khi thanh toán.
• Hỗ trợ kỹ thuật 24/7, hướng dẫn cài đặt và đăng nhập chi tiết.
• Bảo hành 1 đổi 1 xuyên suốt thời gian thuê.`;

      products.push({
        id: pkg.id,
        sku: `${spec.titlePrefix.toUpperCase().replace(/\s+/g, '-')}-${pkg.duration.toUpperCase().replace(/\s+/g, '')}`,
        title: `${spec.titlePrefix} ${pkg.duration}`,
        category: 'cloud-phone',
        category_label: 'Cloud Phone',
        icon_url: '/vs-phone-logo.png',
        cover_image_url: '/vs-phone-logo.png',
        product_images: ['/vs-phone-logo.png'],
        description,
        original_price: pkg.original,
        discount_percent: discountPercent,
        current_price: pkg.current,
        stock_quantity: 0,
        sold_count: 0,
        virtual_sold_count: pkg.sold,
        show_sold_count: true,
        is_active: true,
        badge: 'Đại Lý Chính Thức',
        instructions: 'Sau khi thanh toán thành công, hệ thống sẽ tự động cấp thông tin truy cập Cloud Phone của bạn. Bạn mở ứng dụng VS Phone trên máy tính hoặc điện thoại để đăng nhập và sử dụng ngay lập tức.',
        warranty_text: 'Bảo hành 1 đổi 1 suốt thời gian thuê',
        show_warranty: true,
        created_at: new Date().toISOString()
      });
    }
  }

  return products;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO VÀ ĐỒNG BỘ SẢN PHẨM VS PHONE ---');

  // 1. Lấy danh sách tiện ích hiện tại từ Cloudflare API
  let existingUtilities = [];
  try {
    const res = await fetch('https://admin-code-game-shop.pages.dev/api/sync');
    if (res.ok) {
      const data = await res.json();
      existingUtilities = data.utilities || [];
      console.log(`Tìm thấy ${existingUtilities.length} sản phẩm tiện ích hiện tại.`);
    }
  } catch (err) {
    console.warn('Không thể lấy danh sách hiện tại từ sync API:', err.message);
  }

  // 2. Tạo 18 sản phẩm VS Phone đã được đánh số thứ tự chuẩn
  const vsPhoneProducts = generateProducts();
  console.log(`Đã tạo thành công ${vsPhoneProducts.length} sản phẩm VS Phone.`);

  // 3. Lọc bỏ các sản phẩm VS Phone cũ
  const nonVsProducts = existingUtilities.filter(u => !u.id.startsWith('ut_vs_'));
  const allUtilities = [...nonVsProducts, ...vsPhoneProducts];

  console.log(`Tổng số sản phẩm tiện ích sau khi kết hợp: ${allUtilities.length}`);

  // 4. Đồng bộ lên các Cloudflare Pages (kèm theo deletedUtilities để xóa các ID cũ)
  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`Đang đồng bộ tới ${endpoint}...`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': SYNC_KEY
        },
        body: JSON.stringify({
          key: 'wcg_admin_utilities_v4',
          data: allUtilities,
          utilities: allUtilities,
          deletedUtilities: OLD_IDS_TO_DELETE
        })
      });

      const resText = await res.text();
      console.log(`[${endpoint}] Trạng thái: ${res.status} - Kết quả: ${resText.slice(0, 100)}`);
    } catch (err) {
      console.error(`[${endpoint}] Lỗi:`, err.message);
    }
  }

  // 5. Lưu bản sao lưu vào scripts/all_utilities_backup.json
  fs.writeFileSync('scripts/all_utilities_backup.json', JSON.stringify(allUtilities, null, 2), 'utf8');
  console.log('Đã lưu file dự phòng scripts/all_utilities_backup.json');

  console.log('--- HOÀN THÀNH ĐỒNG BỘ 18 SẢN PHẨM VS PHONE ---');
}

main();
