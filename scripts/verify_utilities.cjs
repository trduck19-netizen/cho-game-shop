async function check() {
  const res = await fetch('https://admin-code-game-shop.pages.dev/api/sync');
  const d = await res.json();
  console.log('Total utilities count:', (d.utilities || []).length);
  (d.utilities || []).forEach((u, i) => {
    console.log(`${i + 1}. [${u.id}] "${u.title}" | Giá KM: ${Number(u.current_price).toLocaleString('vi-VN')}đ (Gốc: ${Number(u.original_price).toLocaleString('vi-VN')}đ, -${u.discount_percent}%) | Kho: ${u.stock_quantity}`);
  });

  const sample = (d.utilities || []).find(u => u.id === 'ut_vs_06_vip_30d');
  if (sample) {
    console.log('\n--- SAMPLE DESCRIPTION (VIP 30 Days VS Phone) ---');
    console.log(sample.description);
  }
}
check();
