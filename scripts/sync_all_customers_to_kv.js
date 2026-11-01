import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

async function computeHash(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + (salt || '') + 'wcg_edge_sec_salt_2026');
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  console.log('=== SYNCING ALL CUSTOMER & MEMBER DATA TO CLOUDFLARE KV ===');

  const adminSalt = 'wcg_admin_salt_seed_2026';
  const adminHash = await computeHash('Meomeo2902', adminSalt);
  const playerSalt = 'wcg_player_salt_seed_2026';
  const playerHash = await computeHash('Player@2026!', playerSalt);

  const members = [
    {
      id: 'usr_admin',
      displayName: 'admin290200',
      email: 'admin@codegame.store',
      phone: '0901234567',
      role: 'SUPER_ADMIN',
      balance: 9999000,
      totalSpent: 12500000,
      status: 'ACTIVE',
      salt: adminSalt,
      passwordHash: adminHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin290200&backgroundColor=0b0d19,16192e,241a45',
      createdAt: '2026-08-01T00:00:00Z',
      lastLogin: '2026-09-30T17:00:00Z',
    },
    {
      id: 'usr_1790662046071_kcii',
      displayName: 'usr1790662046071kcii',
      email: 'usr1790662046071kcii@webcodegame.vn',
      phone: '0901234567',
      role: 'MEMBER',
      balance: 10000,
      totalSpent: 0,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=usr1790662046071kcii&backgroundColor=0b0d19,16192e,241a45',
      createdAt: '2026-09-30T09:00:00Z',
      lastLogin: '2026-09-30T17:05:00Z',
    },
    {
      id: 'usr1790662046071kcii',
      displayName: 'usr1790662046071kcii',
      email: 'usr1790662046071kcii@webcodegame.vn',
      phone: '0901234567',
      role: 'MEMBER',
      balance: 10000,
      totalSpent: 0,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=usr1790662046071kcii&backgroundColor=0b0d19,16192e,241a45',
      createdAt: '2026-09-30T09:00:00Z',
      lastLogin: '2026-09-30T17:05:00Z',
    },
    {
      id: 'usr-2',
      displayName: 'Nguyễn Văn An',
      email: 'an.nguyen@gmail.com',
      phone: '0912345678',
      role: 'VIP',
      balance: 1450000,
      totalSpent: 3800000,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AnNguyen',
      createdAt: '2026-08-15T10:20:00Z',
      lastLogin: '2026-09-29T14:10:00Z',
    },
    {
      id: 'usr-3',
      displayName: 'Trần Minh Đức',
      email: 'duc.tran@gmail.com',
      phone: '0988776655',
      role: 'MEMBER',
      balance: 85000,
      totalSpent: 520000,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DucTran',
      createdAt: '2026-09-02T14:30:00Z',
      lastLogin: '2026-09-28T09:40:00Z',
    },
    {
      id: 'usr_player1',
      displayName: 'Player One',
      email: 'player1@gmail.com',
      phone: '0977112233',
      role: 'VIP',
      balance: 1500000,
      totalSpent: 4200000,
      status: 'ACTIVE',
      salt: playerSalt,
      passwordHash: playerHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PlayerOne',
      createdAt: '2026-08-20T08:00:00Z',
      lastLogin: '2026-09-30T10:00:00Z',
    },
    {
      id: 'usr-4',
      displayName: 'Cheater Spammer',
      email: 'cheater@cheat.net',
      phone: '0933333333',
      role: 'MEMBER',
      balance: 0,
      totalSpent: 0,
      status: 'BANNED',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cheater',
      createdAt: '2026-09-10T08:00:00Z',
      lastLogin: '2026-09-15T09:00:00Z',
    },
  ];

  const orders = [
    {
      id: 'ord_1',
      orderCode: 'ORD-WCG-20260928-01',
      buyerName: 'Trần Minh Đức',
      buyerEmail: 'duc.tran@gmail.com',
      buyerPhone: '0988776655',
      productTitle: 'Thẻ Steam Wallet 50.000đ',
      amount: 50000,
      paymentMethod: 'WALLET',
      deliveredCodes: ['STEAM-XYZW-9988-7766'],
      status: 'COMPLETED',
      createdAt: '2026-09-28T09:40:00Z',
    },
    {
      id: 'ord_2',
      orderCode: 'ORD-WCG-20260928-02',
      buyerName: 'Nguyễn Văn An',
      buyerEmail: 'an.nguyen@gmail.com',
      buyerPhone: '0912345678',
      productTitle: 'Gói 800 Robux Roblox',
      amount: 220000,
      paymentMethod: 'WALLET',
      deliveredCodes: ['ROBUX-8899-7766-5544'],
      status: 'COMPLETED',
      createdAt: '2026-09-28T11:20:00Z',
    },
    {
      id: 'ord_3',
      orderCode: 'ORD-WCG-20260930-03',
      buyerName: 'Player One',
      buyerEmail: 'player1@gmail.com',
      buyerPhone: '0977112233',
      productTitle: 'Gói Nạp Honkai Star Rail 6480 Mộng Ước',
      amount: 1980000,
      paymentMethod: 'WALLET',
      deliveredCodes: ['HSR-6480-VIP-2026-X99'],
      status: 'COMPLETED',
      createdAt: '2026-09-30T10:15:00Z',
    },
  ];

  const transactions = [
    {
      id: 'tx_sep_85806459',
      referenceId: '85806459',
      memberId: 'usr_1790662046071_kcii',
      memberEmail: 'usr1790662046071kcii@webcodegame.vn',
      type: 'DEPOSIT',
      amount: 10000,
      balanceBefore: 0,
      balanceAfter: 10000,
      status: 'COMPLETED',
      note: 'Nạp tự động SePay: +10.000 Core (10.000đ) - WCG usr1790662046071kcii',
      createdAt: '2026-09-30T09:40:00Z',
    },
    {
      id: 'tx_1',
      referenceId: 'SEPAY-MBB-998811',
      memberId: 'usr-2',
      memberEmail: 'an.nguyen@gmail.com',
      type: 'DEPOSIT',
      amount: 500000,
      balanceBefore: 950000,
      balanceAfter: 1450000,
      status: 'COMPLETED',
      note: 'Nạp tiền tự động qua Webhook SePay MBBank',
      createdAt: '2026-09-28T08:15:00Z',
    },
    {
      id: 'tx_2',
      referenceId: 'ORD-WCG-20260928-01',
      memberId: 'usr-3',
      memberEmail: 'duc.tran@gmail.com',
      type: 'ORDER_PAYMENT',
      amount: -87000,
      balanceBefore: 172000,
      balanceAfter: 85000,
      status: 'COMPLETED',
      note: 'Thanh toán mua Thẻ Steam Wallet 50.000đ',
      createdAt: '2026-09-28T09:40:00Z',
    },
  ];

  const now = new Date().toISOString();
  const tmpMembers = './temp_members.json';
  const tmpOrders = './temp_orders.json';
  const tmpTxs = './temp_txs.json';

  fs.writeFileSync(tmpMembers, JSON.stringify(members));
  fs.writeFileSync(tmpOrders, JSON.stringify(orders));
  fs.writeFileSync(tmpTxs, JSON.stringify(transactions));

  const nsList = ['09226ab144a34523bb2d43f182d576b8', '1dd83435b5b141b09f3521a807896926'];

  for (const ns of nsList) {
    console.log(`Writing to Remote Cloud KV Namespace: ${ns}`);
    try {
      execFileSync('npx.cmd', ['wrangler', 'kv', 'key', 'put', `--namespace-id=${ns}`, '--remote', 'wcg_admin_members_v4', '--path=./temp_members.json'], { shell: true, stdio: 'inherit' });
      execFileSync('npx.cmd', ['wrangler', 'kv', 'key', 'put', `--namespace-id=${ns}`, '--remote', 'wcg_admin_orders_v4', '--path=./temp_orders.json'], { shell: true, stdio: 'inherit' });
      execFileSync('npx.cmd', ['wrangler', 'kv', 'key', 'put', `--namespace-id=${ns}`, '--remote', 'wcg_admin_transactions_v4', '--path=./temp_txs.json'], { shell: true, stdio: 'inherit' });
      execFileSync('npx.cmd', ['wrangler', 'kv', 'key', 'put', `--namespace-id=${ns}`, '--remote', 'wcg_last_sync_timestamp', now], { shell: true, stdio: 'inherit' });
      console.log(`[KV Sync] Remote push completed for namespace ${ns}`);
    } catch (err) {
      console.error(`Error syncing to ${ns}:`, err.message);
    }
  }

  // Cleanup temp files
  try {
    fs.unlinkSync(tmpMembers);
    fs.unlinkSync(tmpOrders);
    fs.unlinkSync(tmpTxs);
  } catch {}

  console.log('=== SYNC COMPLETED SUCCESSFULLY ===');
}

main();
