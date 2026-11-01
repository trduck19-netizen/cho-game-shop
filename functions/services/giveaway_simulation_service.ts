import { D1Database } from '@cloudflare/workers-types';
import { getSettingD1, setSettingD1, invalidateSettingMemoryCache } from './d1_service';
import { getRealEventsHub, saveRealEventsHub } from './realEventsHub';

/**
 * Kho 90 tên tài khoản mô phỏng FOMO chuẩn mực (tuyệt đối không dùng tên tài khoản người dùng thật)
 */
export const PRESET_SIMULATED_NAMES: string[] = [
  // 1. Vietnamese Full Names (30 names)
  'Nguyễn Minh Tuấn', 'Trần Hoàng Long', 'Lê Hải Đăng', 'Phạm Quỳnh Nga', 'Hoàng Bảo Trâm',
  'Đỗ Gia Huy', 'Vũ Quốc Anh', 'Bùi Đức Thắng', 'Đặng Thảo Vy', 'Ngô Quang Khải',
  'Dương Anh Khoa', 'Lý Tấn Phát', 'Phan Thanh Tùng', 'Võ Hoài Nam', 'Mai Anh Tuấn',
  'Trịnh Khánh Linh', 'Lưu Hồng Sơn', 'Đoàn Nhật Minh', 'Hà Minh Trí', 'Tạ Thanh Hằng',
  'Nguyễn Hữu Đạt', 'Trần Văn Kiên', 'Lê Đình Trọng', 'Phạm Ngọc Ánh', 'Hoàng Thùy Dung',
  'Đinh Văn Mạnh', 'Lâm Quốc Bảo', 'Vương Đình Nam', 'Tạ Quốc Cường', 'Châu Thanh Tuyền',

  // 2. Masked Vietnamese Phone Numbers (15 numbers)
  '0984562189', '0912389472', '0978912345', '0905671234', '0934129876',
  '0868123987', '0898765432', '0967894561', '0943216789', '0923456781',
  '0778912340', '0701234568', '0834567890', '0856789123', '0812345679',

  // 3. Gamer Usernames (15 names)
  'shadow_hunter', 'pro_sniper_99', 'nobita_gaming', 'phong_ba_game', 'than_kiem_9x',
  'trum_solo_ff', 'yasuo_gank_tem', 'naruto_vietnam', 'dragon_slayer', 'kien_lua_vip',
  'sat_thu_vo_danh', 'ninja_rua_99', 'phuong_hoang_lua', 'bach_ho_kiem', 'thien_ha_de_nhat',

  // 4. Custom Gamer & Food Usernames (30 names)
  'shadowwalker', 'mem_chua_chin', 'phantom_echo', 'khoai_tay_lac', 'pixeldrift',
  'banh_bao_chay', 'frostbyte', 'meo_luoi_tam', 'voidrunner', 'ca_rot_biet_bay',
  'neonpulse', 'cu_lac_rang', 'nightraven', 'to_ong_vo_ve', 'silentstorm',
  'kem_dua_chua', 'emberflare', 'tra_sua_khong_duong', 'lunarhaze', 'vit_troi_boi_ngua',
  'ironclaw', 'gau_khong_ngu', 'quantumfall', 'chuoi_chin_cay', 'abysswhisper',
  'com_nguoi_chien', 'astralbound', 'banh_mi_pate', 'cyberphantom', 'ca_phe_den_da'
];

export interface SimulationResultItem {
  giveawayId: string;
  giveawayTitle: string;
  simulatedName: string;
  cooldownSeconds: number;
  nextReleaseAt: string;
  idleMinutes: number;
  thresholdMinutes: number;
  virtualOffsetBefore: number;
  virtualOffsetAfter: number;
  realStock: number;
  virtualAdditionConfig: number;
  virtualCurrentBefore: number;
  virtualCurrentAfter: number;
  displayRemainingBefore: number;
  displayRemainingAfter: number;
}

export interface SimulationRunReport {
  success: boolean;
  timestamp: string;
  scannedCount: number;
  simulatedCount: number;
  skippedCount: number;
  simulations: SimulationResultItem[];
  reasons: Array<{ id: string; reason: string }>;
}

/**
 * Tính toán ngưỡng chờ mặc định ban đầu: bằng 3 lần thời gian giãn cách, tối thiểu 60 phút
 */
export function calculateDefaultIdleThresholdMinutes(globalCooldownSeconds: number): number {
  const cdSec = Math.max(0, Number(globalCooldownSeconds) || 0);
  const tripleMinutes = Math.ceil((cdSec * 3) / 60);
  return Math.max(60, tripleMinutes);
}

/**
 * Job cốt lõi: Quét và tự động mô phỏng lượt giật cho các giveaway có giãn cách toàn sàn
 */
export async function runGiveawaySimulation(
  db: D1Database,
  options: {
    forceEventId?: string;
    bypassCooldown?: boolean;
    bypassIdleThreshold?: boolean;
  } = {}
): Promise<SimulationRunReport> {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const report: SimulationRunReport = {
    success: true,
    timestamp: nowIso,
    scannedCount: 0,
    simulatedCount: 0,
    skippedCount: 0,
    simulations: [],
    reasons: [],
  };

  try {
    const rawGiveaways = await getSettingD1<any[]>(db, 'wcg_admin_giveaways_v4', [], true);
    if (!Array.isArray(rawGiveaways) || rawGiveaways.length === 0) {
      return report;
    }

    // Chỉ lọc các event có giãn cách toàn sàn (global_cooldown_seconds > 0)
    const candidates = rawGiveaways.filter((gw: any) => {
      if (!gw || !gw.id) return false;
      if (options.forceEventId && gw.id !== options.forceEventId) return false;
      return Number(gw.global_cooldown_seconds || 0) > 0;
    });

    report.scannedCount = candidates.length;

    let updatedAny = false;

    for (const gw of rawGiveaways) {
      if (!gw || !gw.id) continue;
      if (options.forceEventId && gw.id !== options.forceEventId) continue;

      const cdSec = Number(gw.global_cooldown_seconds || 0);
      if (cdSec <= 0) continue;

      // 1. Kiểm tra trạng thái: đang mở
      const isActive = gw.is_active !== false && gw.status !== 'ENDED' && gw.status !== 'PAUSED';
      if (!isActive) {
        report.skippedCount++;
        report.reasons.push({ id: gw.id, reason: 'Event đã đóng hoặc tạm dừng' });
        continue;
      }

      // 2. Kiểm tra kho: còn mã
      const realStock = Array.isArray(gw.codes_pool)
        ? gw.codes_pool.length
        : Math.max(0, Number(gw.remaining_codes || 0));
      if (realStock <= 0) {
        report.skippedCount++;
        report.reasons.push({ id: gw.id, reason: 'Event đã hết mã trong kho' });
        continue;
      }

      // 3. Kiểm tra công tắc riêng của từng event: mặc định BẬT
      const isSimulationEnabled = gw.enable_auto_simulation !== false;
      if (!isSimulationEnabled) {
        report.skippedCount++;
        report.reasons.push({ id: gw.id, reason: 'Tính năng mô phỏng đã tắt trong quản trị' });
        continue;
      }

      // 4. Kiểm tra Cooldown đang chạy (Chống trùng: trong một CD đang chạy thì không tạo thêm lượt mô phỏng nào nữa)
      if (!options.bypassCooldown && gw.last_global_claim_at) {
        const lastGlobalMs = new Date(gw.last_global_claim_at).getTime();
        if (!isNaN(lastGlobalMs)) {
          const remainingCooldownMs = (lastGlobalMs + cdSec * 1000) - nowMs;
          if (remainingCooldownMs > 0) {
            report.skippedCount++;
            report.reasons.push({
              id: gw.id,
              reason: `Đang trong thời gian cooldown (${Math.ceil(remainingCooldownMs / 1000)}s còn lại)`,
            });
            continue;
          }
        }
      }

      // 5. Kiểm tra thời gian kể từ lượt giật THẬT gần nhất đã vượt ngưỡng chờ
      const configuredThreshold = Number(gw.simulation_idle_threshold_minutes);
      const thresholdMinutes = configuredThreshold > 0
        ? configuredThreshold
        : calculateDefaultIdleThresholdMinutes(cdSec);

      // Mốc giật THẬT gần nhất: ưu tiên last_real_claim_at, fallback tới claim_history (lượt không mô phỏng) hoặc created_at
      let lastRealMs = 0;
      if (gw.last_real_claim_at) {
        lastRealMs = new Date(gw.last_real_claim_at).getTime();
      } else if (Array.isArray(gw.claim_history)) {
        const lastRealItem = gw.claim_history.find((c: any) => !c.is_simulated);
        if (lastRealItem && lastRealItem.claimedAt) {
          lastRealMs = new Date(lastRealItem.claimedAt).getTime();
        }
      }
      if (!lastRealMs || isNaN(lastRealMs)) {
        lastRealMs = gw.created_at ? new Date(gw.created_at).getTime() : 0;
      }

      const idleMs = nowMs - lastRealMs;
      const thresholdMs = thresholdMinutes * 60 * 1000;

      if (!options.bypassIdleThreshold && idleMs < thresholdMs) {
        const idleMins = Math.floor(idleMs / 60000);
        report.skippedCount++;
        report.reasons.push({
          id: gw.id,
          reason: `Chưa vượt ngưỡng chờ không người giật thật (${idleMins}/${thresholdMinutes} phút)`,
        });
        continue;
      }

      // 6. THỎA MÃN TẤT CẢ ĐIỀU KIỆN: TIẾN HÀNH MÔ PHỎNG
      // 6.1 Chọn ngẫu nhiên 1 tên từ 90 tên FOMO, tránh trùng tên đang hiển thị
      const currentClaimerName = String(gw.last_claimer_name || '').trim();
      const eligibleNames = PRESET_SIMULATED_NAMES.filter(
        (name) => name.toLowerCase() !== currentClaimerName.toLowerCase()
      );
      const chosenPool = eligibleNames.length > 0 ? eligibleNames : PRESET_SIMULATED_NAMES;
      const simulatedName = chosenPool[Math.floor(Math.random() * chosenPool.length)];

      const offsetBefore = Number(gw.virtual_claimed_offset) || 0;
      const offsetAfter = offsetBefore + 1;

      // 6.2 Tính toán số cộng thêm vào số hiển thị (FOMO Stock Addition)
      // Cấu hình số cộng thêm (mặc định 20)
      const additionConfig = gw.virtual_remaining_addition !== undefined && gw.virtual_remaining_addition !== null
        ? Math.max(0, Number(gw.virtual_remaining_addition))
        : 20;

      let currentAdditionBefore = gw.virtual_remaining_current !== undefined && gw.virtual_remaining_current !== null
        ? Number(gw.virtual_remaining_current)
        : additionConfig;

      // Mỗi lượt mô phỏng: trừ số hiển thị đi 1 (tức là trừ phần cộng thêm đi 1)
      let currentAdditionAfter = currentAdditionBefore - 1;

      // Mỗi khi số hiển thị chạm đúng số mã thật còn lại trong kho (tức phần cộng thêm đã bị trừ hết <= 0)
      // thì hệ thống ngay lập tức cộng lại đúng số đã cài (additionConfig)
      if (currentAdditionAfter <= 0) {
        currentAdditionAfter = additionConfig;
      }

      const displayRemainingBefore = realStock + currentAdditionBefore;
      const displayRemainingAfter = realStock + currentAdditionAfter;

      // 6.3 Cập nhật trạng thái sự kiện
      gw.last_claimer_name = simulatedName;
      gw.last_global_claim_at = nowIso;
      gw.last_simulated_claim_at = nowIso;
      gw.is_last_claim_simulated = true;
      gw.virtual_claimed_offset = offsetAfter;
      gw.virtual_remaining_addition = additionConfig;
      gw.virtual_remaining_current = currentAdditionAfter;
      gw.updated_at = nowIso;

      // 6.4 Ghi 1 bản ghi vào claim_history mang cờ is_simulated: true
      const simClaimRecord = {
        id: `sim_cl_${gw.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user: simulatedName,
        email: '',
        code: '•••••••• (Mô phỏng)',
        claimedAt: nowIso,
        is_simulated: true,
      };

      const existingHistory = Array.isArray(gw.claim_history) ? gw.claim_history : [];
      gw.claim_history = [simClaimRecord, ...existingHistory].slice(0, 100);

      // 6.5 Đồng bộ trực tiếp vào bảng D1 giveaways
      await db.prepare(`
        UPDATE giveaways
        SET last_global_claim_at = ?,
            last_claimer_name = ?,
            virtual_claimed_offset = virtual_claimed_offset + 1,
            virtual_remaining_addition = ?,
            virtual_remaining_current = ?,
            last_simulated_claim_at = ?,
            is_last_claim_simulated = 1,
            updated_at = ?
        WHERE id = ?
      `).bind(nowIso, simulatedName, additionConfig, currentAdditionAfter, nowIso, nowIso, gw.id).run().catch((e) => {
        console.warn(`[Simulation D1 Update Error: ${gw.id}]`, e?.message);
      });

      // 6.5 Bắn sự kiện vào RealEventsHub để toast thông báo chạy mượt mà
      try {
        const hub = await getRealEventsHub({ DB: db } as any);
        if (hub) {
          hub.peakGiveawayClaimedCounts = hub.peakGiveawayClaimedCounts || {};
          const currentPeak = Number(hub.peakGiveawayClaimedCounts[gw.id] || 0);
          hub.peakGiveawayClaimedCounts[gw.id] = Math.max(currentPeak, (Number(gw.claimed_codes) || 0) + offsetAfter);

          const simEvt = {
            id: `evt_sim_gw_${gw.id}_${Date.now()}`,
            type: 'CLAIM_GIVEAWAY',
            title: 'Nhận quà tặng thành công',
            giveawayId: gw.id,
            giveawayTitle: gw.title,
            userName: simulatedName,
            message: `${simulatedName} vừa nhận thành công giftcode ${gw.title}`,
            timeAgo: 'vừa xong',
            timestamp: nowMs,
            scheduledFireTime: nowMs,
            isRealUser: false,
            isSimulated: true,
          };
          hub.events = [simEvt, ...(hub.events || [])].slice(0, 20);
          await saveRealEventsHub({ DB: db } as any, hub);
        }
      } catch (err: any) {
        console.warn('[Simulation Hub Update Warning]', err?.message);
      }

      report.simulatedCount++;
      report.simulations.push({
        giveawayId: gw.id,
        giveawayTitle: gw.title,
        simulatedName,
        cooldownSeconds: cdSec,
        nextReleaseAt: new Date(nowMs + cdSec * 1000).toISOString(),
        idleMinutes: Math.floor(idleMs / 60000),
        thresholdMinutes,
        virtualOffsetBefore: offsetBefore,
        virtualOffsetAfter: offsetAfter,
        realStock,
        virtualAdditionConfig: additionConfig,
        virtualCurrentBefore: currentAdditionBefore,
        virtualCurrentAfter: currentAdditionAfter,
        displayRemainingBefore,
        displayRemainingAfter,
      });

      updatedAny = true;
    }

    if (updatedAny) {
      await setSettingD1(db, 'wcg_admin_giveaways_v4', rawGiveaways).catch(() => {});
      invalidateSettingMemoryCache('wcg_admin_giveaways_v4');
      invalidateSettingMemoryCache('wcg_master_state_v4');
      await setSettingD1(db, 'wcg_last_giveaway_simulation_run', nowIso).catch(() => {});
    }

    return report;
  } catch (err: any) {
    report.success = false;
    (report as any).error = String(err?.message || err);
    return report;
  }
}
