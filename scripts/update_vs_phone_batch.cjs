const fs = require('fs');

const SYNC_KEY = 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
const ENDPOINTS = [
  'https://admin-code-game-shop.pages.dev/api/sync',
  'https://web-code-game.pages.dev/api/sync',
  'https://codegame.shop/api/sync'
];

const VS_PHONE_SPECS = [
  {
    tier: 'Basic',
    cpu: '6 lõi CPU',
    ram: '4GB RAM',
    rom: '32GB Bộ nhớ',
    packages: [
      { id: 'ut_vs_01_basic_1d', duration: '1 Day', days: 1, original: 11832, sold: 48 },
      { id: 'ut_vs_02_basic_7d', duration: '7 Days', days: 7, original: 26030, sold: 72 },
      { id: 'ut_vs_03_basic_30d', duration: '30 Days', days: 30, original: 78615, sold: 125 }
    ]
  },
  {
    tier: 'VIP',
    cpu: '8 lõi CPU',
    ram: '3.2GB RAM',
    rom: '50GB Bộ nhớ',
    packages: [
      { id: 'ut_vs_04_vip_1d', duration: '1 Day', days: 1, original: 13146, sold: 39 },
      { id: 'ut_vs_05_vip_7d', duration: '7 Days', days: 7, original: 31551, sold: 67 },
      { id: 'ut_vs_06_vip_30d', duration: '30 Days', days: 30, original: 89395, sold: 110 }
    ]
  },
  {
    tier: 'KVIP',
    cpu: '8 lõi CPU',
    ram: '4GB RAM',
    rom: '64GB Bộ nhớ',
    packages: [
      { id: 'ut_vs_07_kvip_1d', duration: '1 Day', days: 1, original: 19720, sold: 35 },
      { id: 'ut_vs_08_kvip_7d', duration: '7 Days', days: 7, original: 42068, sold: 58 },
      { id: 'ut_vs_09_kvip_30d', duration: '30 Days', days: 30, original: 118317, sold: 92 }
    ]
  },
  {
    tier: 'SVIP',
    cpu: '8 lõi CPU',
    ram: '5.3GB RAM',
    rom: '85GB Bộ nhớ',
    packages: [
      { id: 'ut_vs_10_svip_1d', duration: '1 Day', days: 1, original: 23663, sold: 29 },
      { id: 'ut_vs_11_svip_7d', duration: '7 Days', days: 7, original: 68361, sold: 45 },
      { id: 'ut_vs_12_svip_30d', duration: '30 Days', days: 30, original: 183786, sold: 76 }
    ]
  },
  {
    tier: 'XVIP',
    cpu: '8 lõi CPU',
    ram: '8GB RAM',
    rom: '128GB Bộ nhớ',
    packages: [
      { id: 'ut_vs_13_xvip_1d', duration: '1 Day', days: 1, original: 39439, sold: 22 },
      { id: 'ut_vs_14_xvip_7d', duration: '7 Days', days: 7, original: 97020, sold: 38 },
      { id: 'ut_vs_15_xvip_30d', duration: '30 Days', days: 30, original: 262664, sold: 61 }
    ]
  },
  {
    tier: 'MVIP',
    cpu: '8 lõi CPU',
    ram: '16GB RAM',
    rom: '256GB Bộ nhớ',
    packages: [
      { id: 'ut_vs_16_mvip_1d', duration: '1 Day', days: 1, original: 54426, sold: 18 },
      { id: 'ut_vs_17_mvip_7d', duration: '7 Days', days: 7, original: 131201, sold: 31 },
      { id: 'ut_vs_18_mvip_30d', duration: '30 Days', days: 30, original: 496933, sold: 47 }
    ]
  }
];

function generateUpdatedProducts() {
  const products = [];

  for (const spec of VS_PHONE_SPECS) {
    for (const pkg of spec.packages) {
      const hours = pkg.days * 24;
      // Giảm 5% cho tất cả sản phẩm
      const discountPercent = 5;
      const currentPrice = Math.round(pkg.original * 0.95);
      const title = `${spec.tier} ${pkg.duration} VS Phone`;

      const description = `Treo game 24/24 online.

⚡ [ĐẠI LÝ CHÍNH THỨC VS PHONE] - Hệ thống phân phối & kích hoạt tự động uy tín!

📱 Dòng máy: VS Phone ${spec.tier}
⚙️ Cấu hình phần cứng: ${spec.cpu} | ${spec.ram} | ${spec.rom}
⏱️ Thời hạn sử dụng: Gói ${pkg.duration} (${hours} giờ hoạt động liên tục)
💰 Bảng giá: Giá gốc chính thức ${pkg.original.toLocaleString('vi-VN')}đ | Giá ưu đãi (-5%): ${currentPrice.toLocaleString('vi-VN')}đ
🏡 Bạn vừa tiết kiệm được số tiền đáng kể để mua nhà trong tương lai khi mua sản phẩm tại đây!
💳 Cam kết thanh toán: Không phát sinh thêm chi phí trực tiếp khi thanh toán qua Web.

🌟 ĐẶC QUYỀN & CÔNG DỤNG BÁ ĐẠO CỦA VS PHONE:
• 🍏 iPhone / iOS cũng chơi mượt game Android: Truy cập trực tiếp qua trình duyệt web siêu tốc, không cần máy Android phụ vẫn cày cuốc thoải mái!
• 💬 Luôn online 24/24 chờ tin nhắn của crush bất cứ lúc nào mà không sợ ngắt kết nối hay rớt mạng.
• 🏆 Khi đối thủ phải tắt game vì nóng máy, sạc pin, hết băng thông, cha mẹ gọi cơm, hết tiền mạng, mất wifi, điện thoại bể rớt... thì tài khoản của bạn vẫn online cày game lên exp vèo vèo!
• 🔋 Treo game 24/7/365 không hao một giọt pin, không lo nóng máy, không chai pin thiết bị thật.
• 🤖 Vận hành tool, bot tự động hóa, auto click và nuôi dàn tài khoản mạng xã hội đa luồng mượt mà.
• 🛡️ Bảo vệ an toàn tuyệt đối cho thiết bị thật, IP sạch, cách ly dữ liệu riêng tư 100%.

🛡️ CAM KẾT TỪ ĐẠI LÝ CHÍNH THỨC:
• Không phát sinh thêm chi phí trực tiếp khi thanh toán qua Web.
• Cấp thông tin tài khoản / mã kích hoạt nhanh chóng sau khi thanh toán.
• Hỗ trợ kỹ thuật 24/7, hướng dẫn cài đặt và đăng nhập chi tiết.
• Bảo hành 1 đổi 1 xuyên suốt thời gian thuê.`;

      products.push({
        id: pkg.id,
        sku: `${spec.tier.toUpperCase()}-${pkg.duration.toUpperCase().replace(/\s+/g, '')}-VS-PHONE`,
        title,
        category: 'cloud-phone',
        category_label: 'Cloud Phone',
        icon_url: '/vs-phone-logo.png',
        cover_image_url: '/vs-phone-logo.png',
        product_images: ['/vs-phone-logo.png'],
        description,
        original_price: pkg.original,
        discount_percent: discountPercent,
        current_price: currentPrice,
        stock_quantity: pkg.id === 'ut_vs_05_vip_7d' ? 7 : 0, // Gói 7 ngày có 7 sản phẩm trong kho, các gói khác hết hàng
        sold_count: 0,
        virtual_sold_count: pkg.sold,
        show_sold_count: true,
        is_active: true,
        badge: 'Đại Lý Chính Thức',
        instructions: 'Truy cập đường link, đăng nhập đúng tài khoản và sao chép mã kích hoạt đã nhận vào đây.',
        guide_url: 'https://cloud.vsphone.com/activation-code/index',
        guide_text: 'Truy cập trang kích hoạt mã VS Phone tại đây',
        guide_links: [
          {
            id: 'guide_vsphone',
            text: 'Truy cập trang kích hoạt mã VS Phone tại đây',
            url: 'https://cloud.vsphone.com/activation-code/index'
          }
        ],
        show_guide_link: true,
        warranty_text: 'Bảo hành 1 đổi 1 suốt thời gian thuê',
        show_warranty: true,
        created_at: new Date().toISOString()
      });
    }
  }

  return products;
}

async function main() {
  console.log('--- BẮT ĐẦU CẬP NHẬT HÀNG LOẠT SẢN PHẨM VS PHONE ---');

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

  // 2. Tạo 18 sản phẩm VS Phone cập nhật
  const updatedVsPhone = generateUpdatedProducts();
  console.log(`Đã tạo thành công ${updatedVsPhone.length} sản phẩm VS Phone với tên và mô tả mới.`);

  // 3. Kết hợp với các sản phẩm khác (nếu có)
  const nonVsProducts = existingUtilities.filter(u => !u.id.startsWith('ut_vs_'));
  const allUtilities = [...nonVsProducts, ...updatedVsPhone];

  console.log(`Tổng số sản phẩm tiện ích sau khi kết hợp: ${allUtilities.length}`);

  // 4. Đồng bộ lên tất cả các Cloudflare Pages
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
          utilities: allUtilities
        })
      });

      const resText = await res.text();
      console.log(`[${endpoint}] Trạng thái: ${res.status} - Kết quả: ${resText.slice(0, 100)}`);
    } catch (err) {
      console.error(`[${endpoint}] Lỗi:`, err.message);
    }
  }

  // 5. Lưu bản sao lưu
  fs.writeFileSync('scripts/all_utilities_backup.json', JSON.stringify(allUtilities, null, 2), 'utf8');
  console.log('Đã lưu file dự phòng scripts/all_utilities_backup.json');

  console.log('--- HOÀN THÀNH CẬP NHẬT HÀNG LOẠT SẢN PHẨM VS PHONE ---');
}

main();
