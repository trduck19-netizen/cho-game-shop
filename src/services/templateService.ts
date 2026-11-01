/**
 * Universal Template Service
 * Implements runtime template inheritance for Giveaway, Catalog, Utilities, and Store Products.
 * Guarantees zero bulk database writes on template updates, snapshot backups, and rollback capabilities.
 */

import type {
  UniversalTemplatesConfig,
  TemplateSnapshot,
  TemplateAuditLog,
} from '../types/template';
import type { GiveawayCampaign, UtilityProduct, StoreProduct, GameItem } from '../types/game';

export const DEFAULT_UNIVERSAL_TEMPLATES: UniversalTemplatesConfig = {
  version: 1,
  updated_at: '2026-10-27T00:00:00.000Z',
  updated_by: 'System',

  // 1. Mẫu đợt Giveaway
  giveaway: {
    // Nhóm 1: Chính sách & hiển thị chung
    min_account_age_days: 0,
    max_per_user: 1,
    max_per_ip: 2,
    cooldown_hours: 1,
    cooldown_minutes: 60,

    custom_banner_enabled: true,
    custom_banner_text: 'Tham gia nhóm zalo của web tại đây',
    custom_banner_link: 'https://zalo.me/g/qdtlmj2tebfa0baraedg',

    custom_success_msg: 'Chúc mừng đạo hữu nhận thành công mã {code}! Chúc đạo hữu chơi game {game_name} vui vẻ.',
    custom_cooldown_msg: 'Đợt phát trước đạo hữu {last_user} đã nhanh tay đi trước, đạo hữu vui lòng đợi {time_left} rồi thử sức lại.',
    custom_out_of_stock_msg: 'Kho mã của sự kiện này hiện đã hết. Đạo hữu vui lòng chờ đợt restock tiếp theo nhé!',

    enable_waiting_room: true,
    waiting_users_min: 0,
    waiting_users_max: 0,

    show_claimed_count: true,
    global_cooldown_seconds: 0, // Phát code giãn cách toàn sàn (mặc định: tắt/0)

    // Nhóm 2: Nội dung mẫu chung có chỗ trống
    title_pattern: 'Code riêng {game_name}',
    rewards: 'Code ngẫu nhiên',
    description: 'Code dùng cho 1 tài khoản, 1 loại dùng 1 lần.',
  },

  // 2. Mẫu Tra Cứu Code (Game Catalog & Giftcodes)
  catalog: {
    instruction_template: 'Đăng nhập vào game {game_name} -> Bấm vào Avatar nhân vật -> Chọn Cài Đặt -> Chọn Đổi Giftcode -> Nhập mã và xác nhận để nhận quà qua Thư.',
    copy_button_label: 'Sao Chép',
    active_status_label: 'Còn Hoạt Động',
    expired_status_label: 'Hết Hạn',
    default_badge: 'Chính Thức',
  },

  // 3. Mẫu Tiện Ích (Utilities)
  utility: {
    title_pattern: '{title}',
    description_template: 'Sản phẩm số giao tức thì 100%. Bảo hành 1 đổi 1 trong suốt thời gian sử dụng gói. Hỗ trợ kích hoạt 24/7 qua Zalo/Telegram.',
    action_button_label: 'Nhận Tiện Ích',
    default_badge: 'Chính Hãng',
  },

  // 4. Mẫu Cửa Hàng Code (Store Products)
  store: {
    title_pattern: '{title}',
    description_template: 'Mã quà tặng bản quyền phát trực tiếp từ kho Cloudflare D1. Nhận mã tức thì ngay sau khi xác nhận thanh toán.',
    action_button_label: 'Mua Code Ngay',
    in_stock_label: 'Còn Hàng',
    out_of_stock_label: 'Tạm Hết Hàng',
    default_badge: 'Bản Quyền',
  },
};

const TEMPLATES_KEY = 'wcg_universal_templates_v1';
const SNAPSHOTS_KEY = 'wcg_template_snapshots_v1';
const AUDIT_LOGS_KEY = 'wcg_template_audit_logs_v1';

class TemplateService {
  private templates: UniversalTemplatesConfig | null = null;
  private listeners: Array<(cfg: UniversalTemplatesConfig) => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.templates = {
          ...DEFAULT_UNIVERSAL_TEMPLATES,
          ...parsed,
          giveaway: { ...DEFAULT_UNIVERSAL_TEMPLATES.giveaway, ...(parsed?.giveaway || {}) },
          catalog: { ...DEFAULT_UNIVERSAL_TEMPLATES.catalog, ...(parsed?.catalog || {}) },
          utility: { ...DEFAULT_UNIVERSAL_TEMPLATES.utility, ...(parsed?.utility || {}) },
          store: { ...DEFAULT_UNIVERSAL_TEMPLATES.store, ...(parsed?.store || {}) },
        };
      } else {
        this.templates = { ...DEFAULT_UNIVERSAL_TEMPLATES };
      }
    } catch {
      this.templates = { ...DEFAULT_UNIVERSAL_TEMPLATES };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === TEMPLATES_KEY && e.newValue) {
        try {
          this.templates = JSON.parse(e.newValue);
          this.notify();
        } catch {}
      }
    });

    window.addEventListener('wcg_universal_templates_updated', () => {
      this.reloadLocal();
    });
  }

  public reloadLocal() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY);
      if (raw) {
        this.templates = JSON.parse(raw);
        this.notify();
      }
    } catch {}
  }

  public getTemplates(): UniversalTemplatesConfig {
    if (!this.templates) {
      this.init();
    }
    return this.templates || DEFAULT_UNIVERSAL_TEMPLATES;
  }

  public subscribe(cb: (cfg: UniversalTemplatesConfig) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const current = this.getTemplates();
    this.listeners.forEach((cb) => {
      try {
        cb(current);
      } catch {}
    });
  }

  /**
   * Set templates directly from server/KV state and notify listeners
   */
  public setTemplates(remote: UniversalTemplatesConfig): void {
    if (!remote || typeof remote !== 'object') return;
    this.templates = {
      ...DEFAULT_UNIVERSAL_TEMPLATES,
      ...remote,
      giveaway: { ...DEFAULT_UNIVERSAL_TEMPLATES.giveaway, ...(remote.giveaway || {}) },
      catalog: { ...DEFAULT_UNIVERSAL_TEMPLATES.catalog, ...(remote.catalog || {}) },
      utility: { ...DEFAULT_UNIVERSAL_TEMPLATES.utility, ...(remote.utility || {}) },
      store: { ...DEFAULT_UNIVERSAL_TEMPLATES.store, ...(remote.store || {}) },
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(this.templates));
        window.dispatchEvent(new CustomEvent('wcg_universal_templates_updated', { detail: this.templates }));
      } catch {}
    }
    this.notify();
  }

  /**
   * Save updated templates. Only 1 record is persisted to D1/KV.
   */
  public saveTemplates(newTemplates: UniversalTemplatesConfig, author = 'Admin'): void {
    const updated: UniversalTemplatesConfig = {
      ...newTemplates,
      version: (newTemplates.version || 1) + 1,
      updated_at: new Date().toISOString(),
      updated_by: author,
    };
    this.templates = updated;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('wcg_universal_templates_updated', { detail: updated }));
      } catch {}

      // Push to Cloudflare KV / D1 as a single setting record
      try {
        const payload = { key: TEMPLATES_KEY, data: updated };
        const syncKey =
          localStorage.getItem('wcg_admin_sync_key') ||
          sessionStorage.getItem('wcg_admin_sync_key') ||
          'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
        const token =
          localStorage.getItem('wcg_auth_token') ||
          sessionStorage.getItem('wcg_auth_token') || '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Sync-Key': syncKey,
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch('/api/sync', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch {}
    }

    this.logAction({
      action: 'UPDATE_TEMPLATE',
      scope: 'all',
      actor: author,
      details: 'Cập nhật Mẫu Chung cho hệ thống (Giveaway, Tra cứu, Tiện ích, Cửa hàng)',
    });

    this.notify();
  }

  /**
   * Directly await saving templates to Cloudflare D1 with multi-endpoint fallback
   */
  public async saveTemplatesToServer(newTemplates: UniversalTemplatesConfig, author = 'Admin'): Promise<boolean> {
    this.saveTemplates(newTemplates, author);
    if (typeof window === 'undefined') return true;

    const payload = { key: TEMPLATES_KEY, data: this.templates };
    const syncKey =
      localStorage.getItem('wcg_admin_sync_key') ||
      sessionStorage.getItem('wcg_admin_sync_key') ||
      'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
    const token =
      localStorage.getItem('wcg_auth_token') ||
      sessionStorage.getItem('wcg_auth_token') || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Sync-Key': syncKey,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const endpoints = [
      '/api/sync',
      'https://admin-code-game-shop.pages.dev/api/sync',
      'https://codegame.shop/api/sync',
      'https://web-code-game.pages.dev/api/sync',
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) return true;
      } catch {}
    }
    return false;
  }

  /**
   * Sync templates from Cloudflare KV/D1
   */
  public async syncTemplates(): Promise<UniversalTemplatesConfig> {
    const endpoints = [
      `/api/sync?key=${TEMPLATES_KEY}`,
      `https://admin-code-game-shop.pages.dev/api/sync?key=${TEMPLATES_KEY}`,
      `https://codegame.shop/api/sync?key=${TEMPLATES_KEY}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data) {
            this.setTemplates(json.data as UniversalTemplatesConfig);
            return this.templates;
          }
        }
      } catch {}
    }
    return this.getTemplates();
  }

  // --- RUNTIME INHERITANCE RESOLVERS ---

  /**
   * Resolves a Giveaway campaign dynamically by applying template rules.
   * Preserves per-campaign overrides and unique assets.
   */
  public resolveGiveaway(campaign: GiveawayCampaign, customTemplates?: UniversalTemplatesConfig): GiveawayCampaign {
    if (!campaign) return campaign;
    const tpl = (customTemplates || this.getTemplates()).giveaway;

    // Explicitly customized campaigns skip template inheritance
    const useTemplate = campaign.use_template !== false;
    if (!useTemplate) {
      return {
        ...campaign,
        global_cooldown_seconds: campaign.global_cooldown_seconds !== undefined
          ? Number(campaign.global_cooldown_seconds)
          : (tpl.global_cooldown_seconds || 0),
      };
    }

    const gameName = campaign.game_name || campaign.title || 'Game';

    // 1. Resolve Title: Admin configuration is the Single Source of Truth (Chân lý duy nhất).
    // Only apply template pattern if campaign title is completely empty.
    let effectiveTitle = campaign.title ? campaign.title.trim() : '';
    if (!effectiveTitle && tpl.title_pattern) {
      effectiveTitle = tpl.title_pattern
        .replace(/\{game_name\}|\{tên game\}|\{game\}|\{name\}/gi, gameName)
        .replace(/\{title\}/gi, gameName);
    }

    // 2. Resolve Rewards: Admin rewards is SSOT.
    let effectiveRewards = campaign.rewards ? campaign.rewards.trim() : '';
    if (!effectiveRewards && tpl.rewards) {
      effectiveRewards = tpl.rewards;
    }

    // 3. Resolve Description: Admin description is SSOT.
    let effectiveDescription = campaign.description ? campaign.description.trim() : '';
    if (!effectiveDescription && tpl.description) {
      effectiveDescription = tpl.description;
    }

    // Admin configuration is the Single Source of Truth (Chân lý duy nhất).
    // Template values only serve as defaults/fallbacks when not configured on campaign.
    return {
      ...campaign,
      title: effectiveTitle,
      rewards: effectiveRewards,
      description: effectiveDescription,

      // Nhóm 1: Chính sách & giới hạn (Admin SSOT > Template Fallback)
      min_account_age_days: campaign.min_account_age_days !== undefined && campaign.min_account_age_days !== null
        ? Number(campaign.min_account_age_days)
        : (tpl.min_account_age_days || 0),
      max_per_user: campaign.max_per_user !== undefined && campaign.max_per_user !== null
        ? Number(campaign.max_per_user)
        : (tpl.max_per_user !== undefined ? tpl.max_per_user : 1),
      max_per_ip: campaign.max_per_ip !== undefined && campaign.max_per_ip !== null
        ? Number(campaign.max_per_ip)
        : (tpl.max_per_ip !== undefined ? tpl.max_per_ip : 1),
      cooldown_hours: campaign.cooldown_hours !== undefined && campaign.cooldown_hours !== null
        ? Number(campaign.cooldown_hours)
        : (campaign.cooldown_minutes !== undefined ? Number(campaign.cooldown_minutes) / 60 : (tpl.cooldown_hours !== undefined ? tpl.cooldown_hours : 0)),
      cooldown_minutes: campaign.cooldown_minutes !== undefined && campaign.cooldown_minutes !== null
        ? Number(campaign.cooldown_minutes)
        : (campaign.cooldown_hours !== undefined ? Number(campaign.cooldown_hours) * 60 : (tpl.cooldown_minutes ?? (tpl.cooldown_hours || 0) * 60)),
      global_cooldown_seconds: campaign.global_cooldown_seconds !== undefined && campaign.global_cooldown_seconds !== null
        ? Number(campaign.global_cooldown_seconds)
        : (tpl.global_cooldown_seconds || 0),

      custom_banner_enabled: campaign.custom_banner_enabled === false
        ? false
        : (campaign.custom_banner_enabled ? true : (tpl.custom_banner_enabled !== false)),
      custom_banner_text: campaign.custom_banner_text || tpl.custom_banner_text || 'Tham gia nhóm zalo của web tại đây',
      custom_banner_link: campaign.custom_banner_link || tpl.custom_banner_link || 'https://zalo.me/g/qdtlmj2tebfa0baraedg',

      custom_success_msg: campaign.custom_success_msg || tpl.custom_success_msg || '',
      custom_cooldown_msg: campaign.custom_cooldown_msg || tpl.custom_cooldown_msg || '',
      custom_out_of_stock_msg: campaign.custom_out_of_stock_msg || tpl.custom_out_of_stock_msg || '',

      enable_waiting_room: campaign.enable_waiting_room !== undefined
        ? Boolean(campaign.enable_waiting_room)
        : Boolean(tpl.enable_waiting_room !== false),
      waiting_users_min: campaign.waiting_users_min !== undefined
        ? Number(campaign.waiting_users_min)
        : (tpl.waiting_users_min || 0),
      waiting_users_max: campaign.waiting_users_max !== undefined
        ? Number(campaign.waiting_users_max)
        : (tpl.waiting_users_max || 0),

      show_claimed_count: campaign.show_claimed_count !== undefined
        ? Boolean(campaign.show_claimed_count)
        : Boolean(tpl.show_claimed_count !== false),
    };
  }

  /**
   * Resolves a Utility item dynamically using the Utility template.
   */
  public resolveUtility(item: UtilityProduct, customTemplates?: UniversalTemplatesConfig): UtilityProduct & { effective_action_label: string; effective_badge: string } {
    if (!item) return item as any;
    const tpl = (customTemplates || this.getTemplates()).utility;
    const useTemplate = (item as any).use_template !== false;

    if (!useTemplate) {
      return {
        ...item,
        effective_action_label: (item as any).custom_action_label || tpl.action_button_label || 'Nhận Tiện Ích',
        effective_badge: (item as any).category_label || item.category || tpl.default_badge || 'Chính Hãng',
      };
    }

    let effectiveTitle = item.title;
    if (tpl.title_pattern && tpl.title_pattern !== '{title}') {
      effectiveTitle = tpl.title_pattern.replace(/\{title\}/gi, item.title);
    }

    let effectiveDesc = item.description;
    const isStandardDesc = !effectiveDesc || effectiveDesc.includes('bảo hành 1 đổi 1') || effectiveDesc.trim() === '';
    if (isStandardDesc && tpl.description_template) {
      effectiveDesc = tpl.description_template;
    }

    return {
      ...item,
      title: effectiveTitle,
      description: effectiveDesc,
      effective_action_label: tpl.action_button_label || 'Nhận Tiện Ích',
      effective_badge: (item as any).category_label || item.category || tpl.default_badge || 'Chính Hãng',
    };
  }

  /**
   * Resolves a Store Product dynamically using the Store template.
   */
  public resolveStoreProduct(product: StoreProduct, customTemplates?: UniversalTemplatesConfig): StoreProduct & { effective_action_label: string; effective_stock_label: string; effective_badge: string } {
    if (!product) return product as any;
    const tpl = (customTemplates || this.getTemplates()).store;
    const useTemplate = (product as any).use_template !== false;

    if (!useTemplate) {
      return {
        ...product,
        effective_action_label: (product as any).custom_action_label || tpl.action_button_label || 'Mua Code Ngay',
        effective_stock_label: (product.stock_quantity || 0) > 0 ? (tpl.in_stock_label || 'Còn Hàng') : (tpl.out_of_stock_label || 'Tạm Hết Hàng'),
        effective_badge: (product as any).badge || tpl.default_badge || 'Bản Quyền',
      };
    }

    let effectiveTitle = product.title;
    if (tpl.title_pattern && tpl.title_pattern !== '{title}') {
      effectiveTitle = tpl.title_pattern.replace(/\{title\}/gi, product.title);
    }

    let effectiveDesc = product.description;
    const isStandardDesc = !effectiveDesc || effectiveDesc.includes('Mã quà tặng bản quyền') || effectiveDesc.trim() === '';
    if (isStandardDesc && tpl.description_template) {
      effectiveDesc = tpl.description_template;
    }

    return {
      ...product,
      title: effectiveTitle,
      description: effectiveDesc,
      effective_action_label: tpl.action_button_label || 'Mua Code Ngay',
      effective_stock_label: (product.stock_quantity || 0) > 0 ? (tpl.in_stock_label || 'Còn Hàng') : (tpl.out_of_stock_label || 'Tạm Hết Hàng'),
      effective_badge: (product as any).badge || tpl.default_badge || 'Bản Quyền',
    };
  }

  /**
   * Resolves Game Catalog details with standard instruction and badge template.
   */
  public resolveCatalog(game: GameItem, customTemplates?: UniversalTemplatesConfig): {
    instruction: string;
    copyButtonLabel: string;
    activeStatusLabel: string;
    expiredStatusLabel: string;
    defaultBadge: string;
  } {
    const tpl = (customTemplates || this.getTemplates()).catalog;
    const gameName = game?.name || 'game';

    let instruction = (game as any)?.guide_text || (game as any)?.instructions;
    if (!instruction || instruction.trim() === '') {
      instruction = tpl.instruction_template.replace(/\{game_name\}|\{tên game\}|\{game\}|\{name\}/gi, gameName);
    }

    return {
      instruction,
      copyButtonLabel: tpl.copy_button_label || 'Sao Chép',
      activeStatusLabel: tpl.active_status_label || 'Còn Hoạt Động',
      expiredStatusLabel: tpl.expired_status_label || 'Hết Hạn',
      defaultBadge: tpl.default_badge || 'Chính Thức',
    };
  }

  // --- SNAPSHOT & ROLLBACK CAPABILITIES ---

  public getSnapshots(): TemplateSnapshot[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public createSnapshot(
    scope: TemplateSnapshot['scope'],
    note: string,
    author: string,
    affectedCount: number,
    data: TemplateSnapshot['data']
  ): TemplateSnapshot {
    const snapshot: TemplateSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      created_by: author,
      scope,
      note,
      affected_count: affectedCount,
      data,
    };

    if (typeof window !== 'undefined') {
      try {
        const current = this.getSnapshots();
        // Keep max 15 recent snapshots
        const updated = [snapshot, ...current].slice(0, 15);
        localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
      } catch {}
    }

    return snapshot;
  }

  public restoreSnapshot(snapshotId: string, author = 'Admin'): boolean {
    const snapshots = this.getSnapshots();
    const target = snapshots.find((s) => s.id === snapshotId);
    if (!target) return false;

    try {
      // 1. Restore templates
      if (target.data.templates) {
        this.saveTemplates(target.data.templates, `${author} (Khôi phục từ ${target.id})`);
      }

      // 2. Restore giveaways if captured
      if (Array.isArray(target.data.giveaways) && target.data.giveaways.length > 0) {
        localStorage.setItem('wcg_admin_giveaways_v4', JSON.stringify(target.data.giveaways));
        localStorage.setItem('wcg_giveaways', JSON.stringify(target.data.giveaways));
        window.dispatchEvent(new CustomEvent('wcg_giveaways_updated'));
      }

      // 3. Restore utilities if captured
      if (Array.isArray(target.data.utilities) && target.data.utilities.length > 0) {
        localStorage.setItem('wcg_admin_utilities_v4', JSON.stringify(target.data.utilities));
        localStorage.setItem('wcg_utilities', JSON.stringify(target.data.utilities));
        window.dispatchEvent(new CustomEvent('wcg_utilities_updated'));
      }

      // 4. Restore store products if captured
      if (Array.isArray(target.data.store_products) && target.data.store_products.length > 0) {
        localStorage.setItem('wcg_admin_store_products_v4', JSON.stringify(target.data.store_products));
        localStorage.setItem('wcg_store_products', JSON.stringify(target.data.store_products));
        window.dispatchEvent(new CustomEvent('wcg_store_products_updated'));
      }

      this.logAction({
        action: 'RESTORE_SNAPSHOT',
        scope: target.scope,
        actor: author,
        details: `Khôi phục thành công bản sao lưu snapshot ${target.id} (${target.note})`,
      });

      return true;
    } catch {
      return false;
    }
  }

  // --- FORCE APPLY ALL & PREVIEW LOGIC ---

  /**
   * Generates a preview diff before force applying templates to all items in a scope
   */
  public generatePreviewDiff(
    scope: 'giveaway' | 'catalog' | 'utility' | 'store' | 'all',
    items: {
      giveaways?: GiveawayCampaign[];
      utilities?: UtilityProduct[];
      storeProducts?: StoreProduct[];
      games?: any[];
    },
    targetTemplates?: UniversalTemplatesConfig
  ): Array<{
    id: string;
    title: string;
    scope: string;
    changes: Array<{ field: string; before: string; after: string }>;
  }> {
    const tpl = targetTemplates || this.getTemplates();
    const diffList: Array<{
      id: string;
      title: string;
      scope: string;
      changes: Array<{ field: string; before: string; after: string }>;
    }> = [];

    if (scope === 'giveaway' || scope === 'all') {
      const gws = items.giveaways || [];
      gws.forEach((gw) => {
        const resolved = this.resolveGiveaway(gw, tpl);
        const changes: Array<{ field: string; before: string; after: string }> = [];

        if (gw.title !== resolved.title) {
          changes.push({ field: 'Tiêu đề đợt', before: gw.title || '(Trống)', after: resolved.title });
        }
        if (gw.rewards !== resolved.rewards) {
          changes.push({ field: 'Phần thưởng', before: gw.rewards || '(Trống)', after: resolved.rewards });
        }
        if (gw.description !== resolved.description) {
          changes.push({ field: 'Mô tả', before: gw.description || '(Trống)', after: resolved.description });
        }
        if (Number(gw.min_account_age_days || 0) !== resolved.min_account_age_days) {
          changes.push({ field: 'Tuổi nick tối thiểu', before: `${gw.min_account_age_days || 0} ngày`, after: `${resolved.min_account_age_days} ngày` });
        }
        if (Number(gw.max_per_user || 1) !== resolved.max_per_user) {
          changes.push({ field: 'Tối đa code / User', before: `${gw.max_per_user || 1}`, after: `${resolved.max_per_user}` });
        }
        if (Number(gw.max_per_ip || 1) !== resolved.max_per_ip) {
          changes.push({ field: 'Tối đa code / IP', before: `${gw.max_per_ip || 1}`, after: `${resolved.max_per_ip}` });
        }
        if (Number(gw.cooldown_hours || 0) !== resolved.cooldown_hours) {
          changes.push({ field: 'Hồi chiêu', before: `${gw.cooldown_hours || 0} giờ`, after: `${resolved.cooldown_hours} giờ` });
        }
        if (Boolean(gw.custom_banner_enabled) !== resolved.custom_banner_enabled) {
          changes.push({ field: 'Link Zalo / Cộng đồng', before: gw.custom_banner_enabled ? 'Bật' : 'Tắt', after: resolved.custom_banner_enabled ? 'Bật' : 'Tắt' });
        }

        if (changes.length > 0 || gw.use_template === false) {
          diffList.push({
            id: gw.id,
            title: gw.title || gw.game_name || 'Giveaway',
            scope: 'giveaway',
            changes: changes.length > 0 ? changes : [{ field: 'Chế độ mẫu', before: 'Tùy chỉnh riêng', after: 'Kế thừa Mẫu chung' }],
          });
        }
      });
    }

    if (scope === 'utility' || scope === 'all') {
      const utils = items.utilities || [];
      utils.forEach((u) => {
        const resolved = this.resolveUtility(u, tpl);
        const changes: Array<{ field: string; before: string; after: string }> = [];
        if (u.description !== resolved.description) {
          changes.push({ field: 'Mô tả', before: u.description || '(Trống)', after: resolved.description });
        }
        if (changes.length > 0 || (u as any).use_template === false) {
          diffList.push({
            id: u.id,
            title: u.title,
            scope: 'utility',
            changes: changes.length > 0 ? changes : [{ field: 'Chế độ mẫu', before: 'Tùy chỉnh riêng', after: 'Kế thừa Mẫu chung' }],
          });
        }
      });
    }

    if (scope === 'store' || scope === 'all') {
      const stores = items.storeProducts || [];
      stores.forEach((p) => {
        const resolved = this.resolveStoreProduct(p, tpl);
        const changes: Array<{ field: string; before: string; after: string }> = [];
        if (p.description !== resolved.description) {
          changes.push({ field: 'Mô tả', before: p.description || '(Trống)', after: resolved.description });
        }
        if (changes.length > 0 || (p as any).use_template === false) {
          diffList.push({
            id: p.id,
            title: p.title,
            scope: 'store',
            changes: changes.length > 0 ? changes : [{ field: 'Chế độ mẫu', before: 'Tùy chỉnh riêng', after: 'Kế thừa Mẫu chung' }],
          });
        }
      });
    }

    return diffList;
  }

  /**
   * Executes Force Apply All across the specified scope.
   * Creates a snapshot FIRST, sets use_template = true, and records audit trail.
   */
  public executeForceApplyAll(
    scope: 'giveaway' | 'catalog' | 'utility' | 'store' | 'all',
    items: {
      giveaways?: GiveawayCampaign[];
      utilities?: UtilityProduct[];
      storeProducts?: StoreProduct[];
    },
    author = 'Admin'
  ): { snapshotId: string; affectedCount: number } {
    const diffs = this.generatePreviewDiff(scope, items);
    const affectedCount = diffs.length;

    // 1. Mandatory snapshot creation BEFORE applying
    const snapshot = this.createSnapshot(
      scope,
      `Tự động sao lưu trước khi Áp Đặt Toàn Bộ Mẫu Chung (${scope})`,
      author,
      affectedCount,
      {
        templates: this.getTemplates(),
        giveaways: items.giveaways ? JSON.parse(JSON.stringify(items.giveaways)) : undefined,
        utilities: items.utilities ? JSON.parse(JSON.stringify(items.utilities)) : undefined,
        store_products: items.storeProducts ? JSON.parse(JSON.stringify(items.storeProducts)) : undefined,
      }
    );

    // 2. Mark items as using template
    if (scope === 'giveaway' || scope === 'all') {
      if (items.giveaways && Array.isArray(items.giveaways)) {
        items.giveaways.forEach((gw) => {
          gw.use_template = true;
        });
        localStorage.setItem('wcg_admin_giveaways_v4', JSON.stringify(items.giveaways));
        localStorage.setItem('wcg_giveaways', JSON.stringify(items.giveaways));
        window.dispatchEvent(new CustomEvent('wcg_giveaways_updated'));
      }
    }

    if (scope === 'utility' || scope === 'all') {
      if (items.utilities && Array.isArray(items.utilities)) {
        items.utilities.forEach((u) => {
          (u as any).use_template = true;
        });
        localStorage.setItem('wcg_admin_utilities_v4', JSON.stringify(items.utilities));
        localStorage.setItem('wcg_utilities', JSON.stringify(items.utilities));
        window.dispatchEvent(new CustomEvent('wcg_utilities_updated'));
      }
    }

    if (scope === 'store' || scope === 'all') {
      if (items.storeProducts && Array.isArray(items.storeProducts)) {
        items.storeProducts.forEach((p) => {
          (p as any).use_template = true;
        });
        localStorage.setItem('wcg_admin_store_products_v4', JSON.stringify(items.storeProducts));
        localStorage.setItem('wcg_store_products', JSON.stringify(items.storeProducts));
        window.dispatchEvent(new CustomEvent('wcg_store_products_updated'));
      }
    }

    // 3. Log audit action
    this.logAction({
      action: 'FORCE_APPLY_ALL',
      scope,
      actor: author,
      affected_count: affectedCount,
      details: `Đã áp đặt Mẫu Chung thành công cho ${affectedCount} mục thuộc phạm vi ${scope}. Bản snapshot an toàn: ${snapshot.id}`,
    });

    this.notify();

    return { snapshotId: snapshot.id, affectedCount };
  }

  // --- AUDIT LOGS ---

  public getAuditLogs(): TemplateAuditLog[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(AUDIT_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public logAction(entry: Omit<TemplateAuditLog, 'id' | 'timestamp'>): void {
    const log: TemplateAuditLog = {
      id: `tpl_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    if (typeof window !== 'undefined') {
      try {
        const current = this.getAuditLogs();
        const updated = [log, ...current].slice(0, 50); // Keep max 50 recent audit logs
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updated));
      } catch {}
    }
  }
}

export const templateService = new TemplateService();
