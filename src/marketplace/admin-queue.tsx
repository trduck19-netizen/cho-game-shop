/**
 * AdminMarketplaceQueue — Giao diện quản trị hàng chờ duyệt của sàn mã số (KHỐI 2).
 *
 * ĐÂY LÀ FILE MỚI, CHƯA ĐƯỢC NỐI VÀO App.tsx hay AdminApp (khối 2 không được
 * sửa các file đó). Điều phối viên gắn component này vào một mục quản trị
 * (ví dụ tab mới trong AdminApp) rồi truyền token phiên quản trị nếu cần.
 *
 * Component tự lấy token theo đúng quy ước sẵn có của AdminApp:
 * localStorage/sessionStorage khóa 'wcg_auth_token'; prop `token` (nếu truyền)
 * sẽ được ưu tiên hơn token đã lưu.
 *
 * Component chỉ GỌI các API đã có, không tự chế endpoint duyệt mới:
 * - GET  /api/marketplace/ops/queue            (hàng chờ + số đếm + điểm/hạng)
 * - POST /api/marketplace/sellers/approve     { seller_id, status }
 * - POST /api/marketplace/products/approve    { product_id, status }
 * - POST /api/marketplace/payouts/approve     { payout_id, status, admin_note }
 * Các trạng thái duyệt hợp lệ lấy đúng theo API đợt 1+2:
 * gian hàng: APPROVED / REJECTED / SUSPENDED; sản phẩm: APPROVED / REJECTED;
 * rút tiền: PAID / REJECTED.
 *
 * LƯU Ý HIỂN THỊ TRUNG THỰC:
 * - API duyệt gian hàng/sản phẩm hiện tại KHÔNG nhận ghi chú của quản trị,
 *   nên ô ghi chú chỉ hiện và chỉ gửi được ở tab rút tiền. Ở các tab còn lại,
 *   quyết định duyệt/từ chối được ghi nhận nhưng lý do chưa lưu được — xem
 *   tồn đọng trong BLOCK2_README.md (khối khác có thể bổ sung cột admin_note).
 * - Không hiển thị nội dung mã ở bất kỳ đâu: API hàng chờ chỉ trả số lượng mã.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

interface AdminMarketplaceQueueProps {
  /** Đường gốc API, mặc định '' (cùng domain). */
  apiBase?: string;
  /** Token phiên quản trị; bỏ trống để đọc từ localStorage/sessionStorage. */
  token?: string;
}

type TabKey = 'sellers' | 'products' | 'payouts' | 'disputes';

interface QueueData {
  counts: {
    pending_sellers: number;
    pending_products: number;
    pending_payouts: number;
    open_disputes: number;
  };
  pending_sellers: any[];
  pending_products: any[];
  pending_payouts: any[];
  open_disputes: any[];
  seller_quality: Record<string, any>;
}

function readStoredToken(): string {
  try {
    return (
      localStorage.getItem('wcg_auth_token') ||
      sessionStorage.getItem('wcg_auth_token') ||
      ''
    );
  } catch {
    return '';
  }
}

function formatCore(value: any): string {
  const n = Number(value) || 0;
  return n.toLocaleString('vi-VN');
}

function formatDate(value: any): string {
  if (!value) return '—';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('vi-VN');
}

function tierLabel(tier: string): string {
  return tier === 'STANDARD' ? 'Chuẩn' : 'Thử';
}

export default function AdminMarketplaceQueue({ apiBase = '', token }: AdminMarketplaceQueueProps) {
  const [tab, setTab] = useState<TabKey>('sellers');
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [payoutNote, setPayoutNote] = useState<Record<string, string>>({});

  const authToken = useMemo(() => token || readStoredToken(), [token]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/marketplace/ops/queue?limit=50`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(body.message || `Không tải được hàng chờ (HTTP ${res.status}).`);
      }
      setData(body as QueueData);
    } catch (err: any) {
      setError(err?.message || 'Không tải được hàng chờ.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, authToken]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const approve = useCallback(
    async (endpoint: string, payload: Record<string, string>, id: string, okLabel: string) => {
      setActingId(id);
      setError('');
      setNotice('');
      try {
        const res = await fetch(`${apiBase}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) {
          throw new Error(body.message || `Duyệt thất bại (HTTP ${res.status}).`);
        }
        setNotice(okLabel);
        await loadQueue();
      } catch (err: any) {
        setError(err?.message || 'Duyệt thất bại.');
      } finally {
        setActingId(null);
      }
    },
    [apiBase, authToken, loadQueue],
  );

  const qualityOf = (sellerId: string) => data?.seller_quality?.[sellerId];

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'sellers', label: 'Gian hàng chờ duyệt', count: data?.counts.pending_sellers ?? 0 },
    { key: 'products', label: 'Sản phẩm chờ duyệt', count: data?.counts.pending_products ?? 0 },
    { key: 'payouts', label: 'Rút tiền chờ duyệt', count: data?.counts.pending_payouts ?? 0 },
    { key: 'disputes', label: 'Khiếu nại đang mở', count: data?.counts.open_disputes ?? 0 },
  ];

  return (
    <section aria-label="Hàng chờ duyệt sàn">
      <h2>Hàng chờ duyệt sàn</h2>
      <p>
        Duyệt gian hàng và sản phẩm trước khi mở bán. Gian hàng mới bắt đầu ở hạng thử:
        tối đa 5 sản phẩm, mỗi sản phẩm tối đa 20 mã; đủ 20 đơn thành công và tỉ lệ
        khiếu nại dưới 5% thì lên hạng chuẩn. Giới hạn này là mặc định đã duyệt,
        quản trị điều chỉnh được (xem ghi chú trong seller-quality.ts).
      </p>

      <div role="tablist" aria-label="Loại hàng chờ">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            disabled={loading}
          >
            {t.label} ({t.count})
          </button>
        ))}
        <button onClick={() => void loadQueue()} disabled={loading}>
          {loading ? 'Đang tải…' : 'Tải lại'}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: '#b3261e' }}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading && !data && <p>Đang tải hàng chờ…</p>}

      {data && tab === 'sellers' && (
        <div>
          {data.pending_sellers.length === 0 && <p>Không còn gian hàng chờ duyệt.</p>}
          {data.pending_sellers.map((s: any) => {
            const q = qualityOf(s.id);
            return (
              <article key={s.id}>
                <h3>{s.shop_name}</h3>
                <p>
                  Đường dẫn: {s.shop_slug} · Người đăng ký: {s.display_name || s.username || '—'} ({s.email || '—'})
                </p>
                <p>{s.description || 'Không có mô tả.'}</p>
                <p>Gửi lúc: {formatDate(s.created_at)}</p>
                {q && (
                  <p>
                    Hạng: {tierLabel(q.quality?.tier)} · Điểm: {q.quality?.score ?? 'Chưa đủ dữ liệu'} · Đơn thành
                    công: {q.quality?.completedOrders ?? 0} · Khiếu nại đang mở: {q.quality?.openDisputes ?? 0}
                  </p>
                )}
                <button
                  disabled={actingId === s.id}
                  onClick={() =>
                    void approve('/api/marketplace/sellers/approve', { seller_id: s.id, status: 'APPROVED' }, s.id, 'Đã duyệt gian hàng.')
                  }
                >
                  Duyệt
                </button>{' '}
                <button
                  disabled={actingId === s.id}
                  onClick={() =>
                    void approve('/api/marketplace/sellers/approve', { seller_id: s.id, status: 'REJECTED' }, s.id, 'Đã từ chối gian hàng.')
                  }
                >
                  Từ chối
                </button>{' '}
                <button
                  disabled={actingId === s.id}
                  onClick={() =>
                    void approve('/api/marketplace/sellers/approve', { seller_id: s.id, status: 'SUSPENDED' }, s.id, 'Đã tạm khóa gian hàng.')
                  }
                >
                  Tạm khóa
                </button>
              </article>
            );
          })}
        </div>
      )}

      {data && tab === 'products' && (
        <div>
          {data.pending_products.length === 0 && <p>Không còn sản phẩm chờ duyệt.</p>}
          {data.pending_products.map((p: any) => {
            const q = qualityOf(p.seller_id);
            return (
              <article key={p.id}>
                <h3>{p.title}</h3>
                <p>
                  Gian hàng: {p.shop_name} ({p.shop_slug}) · Game: {p.game_name || p.game_slug || '—'}
                </p>
                <p>
                  Giá: {formatCore(p.current_price)} Core · Mã đã nạp: {p.total_codes} · Mã còn bán được:{' '}
                  {p.available_codes}
                </p>
                <p>Gửi lúc: {formatDate(p.created_at)}</p>
                {q && (
                  <p>
                    Hạng gian hàng: {tierLabel(q.quality?.tier)} · Điểm: {q.quality?.score ?? 'Chưa đủ dữ liệu'} ·
                    Sản phẩm của gian hàng: {q.quality?.productCount ?? 0}/5 (hạng thử)
                  </p>
                )}
                <button
                  disabled={actingId === p.id}
                  onClick={() =>
                    void approve('/api/marketplace/products/approve', { product_id: p.id, status: 'APPROVED' }, p.id, 'Đã duyệt sản phẩm.')
                  }
                >
                  Duyệt
                </button>{' '}
                <button
                  disabled={actingId === p.id}
                  onClick={() =>
                    void approve('/api/marketplace/products/approve', { product_id: p.id, status: 'REJECTED' }, p.id, 'Đã từ chối sản phẩm.')
                  }
                >
                  Từ chối
                </button>
              </article>
            );
          })}
        </div>
      )}

      {data && tab === 'payouts' && (
        <div>
          {data.pending_payouts.length === 0 && <p>Không còn yêu cầu rút tiền chờ duyệt.</p>}
          {data.pending_payouts.map((py: any) => (
            <article key={py.id}>
              <h3>
                Rút {formatCore(py.amount)} Core — {py.shop_name}
              </h3>
              <p>Gửi lúc: {formatDate(py.created_at)}</p>
              <label>
                Ghi chú của quản trị:{' '}
                <input
                  value={payoutNote[py.id] || ''}
                  onChange={(e) => setPayoutNote((prev) => ({ ...prev, [py.id]: e.target.value }))}
                  placeholder="Ví dụ: đã chuyển khoản ngày…"
                />
              </label>{' '}
              <button
                disabled={actingId === py.id}
                onClick={() =>
                  void approve(
                    '/api/marketplace/payouts/approve',
                    { payout_id: py.id, status: 'PAID', admin_note: payoutNote[py.id] || '' },
                    py.id,
                    'Đã duyệt trả tiền rút.',
                  )
                }
              >
                Duyệt trả
              </button>{' '}
              <button
                disabled={actingId === py.id}
                onClick={() =>
                  void approve(
                    '/api/marketplace/payouts/approve',
                    { payout_id: py.id, status: 'REJECTED', admin_note: payoutNote[py.id] || '' },
                    py.id,
                    'Đã từ chối yêu cầu rút.',
                  )
                }
              >
                Từ chối
              </button>
            </article>
          ))}
        </div>
      )}

      {data && tab === 'disputes' && (
        <div>
          <p>
            Khiếu nại không duyệt ở đây: quản trị xử lý bằng API khiếu nại đã có
            (POST /api/marketplace/disputes/resolve) — tab này chỉ để theo dõi số
            khiếu nại đang mở kèm theo hàng chờ.
          </p>
          {data.open_disputes.length === 0 && <p>Không còn khiếu nại đang mở.</p>}
          {data.open_disputes.map((d: any) => (
            <article key={d.id}>
              <h3>Đơn {d.order_id}</h3>
              <p>
                Gian hàng: {d.shop_name} · Lý do: {d.reason}
              </p>
              <p>Mở lúc: {formatDate(d.created_at)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
