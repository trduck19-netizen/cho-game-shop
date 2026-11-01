import type {
  Mission,
  MissionSubmission,
  MissionAiApiKey,
  MissionAuditLog,
  MissionRewardCode,
} from '../types/mission';
import { authService } from './authService';

class MissionService {
  private getAuthHeaders(includeAdminSecret: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (includeAdminSecret && typeof localStorage !== 'undefined') {
      const syncKey = localStorage.getItem('wcg_admin_sync_key') || sessionStorage.getItem('wcg_admin_sync_key');
      if (syncKey) {
        headers['X-Sync-Key'] = syncKey;
      }
    }

    return headers;
  }

  // --- Public & Client APIs ---

  async getMissions(isAdmin: boolean = false): Promise<{ success: boolean; missions: Mission[]; message?: string }> {
    try {
      const url = isAdmin ? '/api/missions?admin=true' : '/api/missions';
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(isAdmin),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, missions: data.missions || [] };
      }
      const errData = await res.json().catch(() => ({}));
      return { success: false, missions: [], message: errData.message || 'Không thể tải danh sách nhiệm vụ.' };
    } catch (e: any) {
      return { success: false, missions: [], message: e?.message || 'Lỗi mạng khi tải nhiệm vụ.' };
    }
  }

  async getMission(id: string): Promise<{ success: boolean; mission?: Mission; message?: string }> {
    try {
      const res = await fetch(`/api/missions/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, mission: data.mission };
      }
      const errData = await res.json().catch(() => ({}));
      return { success: false, message: errData.message || 'Không thể tải chi tiết nhiệm vụ.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối máy chủ.' };
    }
  }

  async submitProof(payload: {
    mission_id: string;
    proof_link: string;
    proof_note?: string;
  }): Promise<{ success: boolean; message?: string; submission_id?: string }> {
    try {
      const res = await fetch('/api/missions/submit', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message, submission_id: data.submission_id };
      }
      return { success: false, message: data.message || 'Không thể gửi bằng chứng bài nộp.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi gửi bài.' };
    }
  }

  async getMySubmissions(): Promise<{ success: boolean; submissions: MissionSubmission[]; message?: string }> {
    try {
      const res = await fetch('/api/missions/my-submissions', {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, submissions: data.submissions || [] };
      }
      const errData = await res.json().catch(() => ({}));
      return { success: false, submissions: [], message: errData.message || 'Không thể tải danh sách bài đã nộp.' };
    } catch (e: any) {
      return { success: false, submissions: [], message: e?.message || 'Lỗi kết nối.' };
    }
  }

  // --- Admin APIs ---

  async createMission(payload: Partial<Mission>): Promise<{ success: boolean; message?: string; missionId?: string }> {
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message, missionId: data.missionId };
      }
      return { success: false, message: data.message || 'Không thể tạo nhiệm vụ.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng khi tạo nhiệm vụ.' };
    }
  }

  async updateMission(id: string, payload: Partial<Mission>): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/missions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Không thể cập nhật nhiệm vụ.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng khi cập nhật.' };
    }
  }

  async deleteMission(id: string, force: boolean = false): Promise<{ success: boolean; message?: string }> {
    try {
      const url = force
        ? `/api/missions/${encodeURIComponent(id)}?force=true`
        : `/api/missions/${encodeURIComponent(id)}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders(true),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Không thể xóa nhiệm vụ.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng khi xóa nhiệm vụ.' };
    }
  }

  async batchUpdateStatus(
    ids: string[],
    status: 'ACTIVE' | 'CLOSED' | 'PAUSED'
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'batch_update_status',
          ids,
          status,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Không thể cập nhật trạng thái hàng loạt.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng khi cập nhật trạng thái hàng loạt.' };
    }
  }

  async batchDelete(
    ids: string[],
    force: boolean = false
  ): Promise<{ success: boolean; message?: string; deletedCount?: number; skippedCount?: number }> {
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'batch_delete',
          ids,
          force,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
          deletedCount: data.deletedCount,
          skippedCount: data.skippedCount,
        };
      }
      return { success: false, message: data.message || 'Không thể xóa hàng loạt.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng khi xóa hàng loạt.' };
    }
  }

  async getAdminSubmissions(
    missionId?: string,
    status?: string
  ): Promise<{ success: boolean; submissions: MissionSubmission[]; message?: string }> {
    try {
      const params = new URLSearchParams();
      if (missionId && missionId !== 'all') params.set('mission_id', missionId);
      if (status && status !== 'all') params.set('status', status);

      const res = await fetch(`/api/missions/submissions?${params.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders(true),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, submissions: data.submissions || [] };
      }
      const errData = await res.json().catch(() => ({}));
      return { success: false, submissions: [], message: errData.message || 'Không thể tải hàng chờ duyệt.' };
    } catch (e: any) {
      return { success: false, submissions: [], message: e?.message || 'Lỗi mạng.' };
    }
  }

  async reviewSubmission(
    submissionId: string,
    action: 'APPROVE' | 'REJECT',
    rejectionReason?: string
  ): Promise<{ success: boolean; message?: string; rewardDelivered?: string }> {
    try {
      const res = await fetch('/api/missions/submissions', {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({
          action,
          submission_id: submissionId,
          rejection_reason: rejectionReason,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
          rewardDelivered: data.rewardDelivered,
        };
      }
      return { success: false, message: data.message || 'Không thể thực thi xét duyệt.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng khi duyệt hồ sơ.' };
    }
  }

  async batchApprove(
    submissionIds?: string[],
    missionId?: string
  ): Promise<{ success: boolean; message?: string; successCount?: number }> {
    try {
      const res = await fetch('/api/missions/submissions', {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'BATCH_APPROVE',
          submission_ids: submissionIds,
          mission_id: missionId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
          successCount: data.successCount,
        };
      }
      return { success: false, message: data.message || 'Không thể duyệt hàng loạt hồ sơ.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng.' };
    }
  }

  async batchApproveAi(
    missionId?: string
  ): Promise<{ success: boolean; message?: string; successCount?: number }> {
    return this.batchApprove(undefined, missionId);
  }

  async getRewardPool(
    missionId: string
  ): Promise<{ success: boolean; codes: MissionRewardCode[]; stats?: any; message?: string }> {
    try {
      const res = await fetch(`/api/missions/pools?mission_id=${encodeURIComponent(missionId)}`, {
        method: 'GET',
        headers: this.getAuthHeaders(true),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, codes: data.codes || [], stats: data.stats };
      }
      const errData = await res.json().catch(() => ({}));
      return { success: false, codes: [], message: errData.message || 'Không thể tải kho mã.' };
    } catch (e: any) {
      return { success: false, codes: [], message: e?.message || 'Lỗi mạng.' };
    }
  }

  async importRewardCodes(
    missionId: string,
    rawCodes: string
  ): Promise<{ success: boolean; message?: string; count?: number }> {
    try {
      const res = await fetch('/api/missions/pools', {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({
          mission_id: missionId,
          raw_codes: rawCodes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message, count: data.count };
      }
      return { success: false, message: data.message || 'Không thể nhập mã vào kho.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng khi nhập mã.' };
    }
  }

  async deleteRewardCode(codeId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/missions/pools?id=${encodeURIComponent(codeId)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(true),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Không thể xóa mã.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng.' };
    }
  }

  async clearAvailableRewardCodes(missionId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(
        `/api/missions/pools?mission_id=${encodeURIComponent(missionId)}&clear_available=true`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(true),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Không thể xóa kho mã.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng.' };
    }
  }

  async getAiKeys(): Promise<{ success: boolean; keys: MissionAiApiKey[]; message?: string }> {
    try {
      const res = await fetch('/api/missions/ai-keys', {
        method: 'GET',
        headers: this.getAuthHeaders(true),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, keys: data.keys || [] };
      }
      const errData = await res.json().catch(() => ({}));
      return { success: false, keys: [], message: errData.message || 'Không thể tải khóa API.' };
    } catch (e: any) {
      return { success: false, keys: [], message: e?.message || 'Lỗi mạng.' };
    }
  }

  async batchApproveSubmissions(
    submissionIds: string[]
  ): Promise<{ success: boolean; message?: string; successCount?: number; total?: number }> {
    try {
      const res = await fetch('/api/missions/submissions', {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'BATCH_APPROVE',
          submission_ids: submissionIds,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
          successCount: data.successCount,
          total: data.total,
        };
      }
      return { success: false, message: data.message || 'Không thể duyệt hàng loạt hồ sơ.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng.' };
    }
  }

  async batchRejectSubmissions(
    submissionIds: string[],
    rejectionReason?: string
  ): Promise<{ success: boolean; message?: string; successCount?: number; total?: number }> {
    try {
      const res = await fetch('/api/missions/submissions', {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'BATCH_REJECT',
          submission_ids: submissionIds,
          rejection_reason: rejectionReason,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
          successCount: data.successCount,
          total: data.total,
        };
      }
      return { success: false, message: data.message || 'Không thể từ chối hàng loạt hồ sơ.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng.' };
    }
  }

  async createAiKey(
    keyName: string,
    scope: 'FULL' | 'REVIEW_ONLY' = 'FULL'
  ): Promise<{ success: boolean; message?: string; rawKey?: string; key?: MissionAiApiKey }> {
    try {
      const res = await fetch('/api/missions/ai-keys', {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({ key_name: keyName, scope }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
          rawKey: data.rawKey,
          key: data.key,
        };
      }
      return { success: false, message: data.message || 'Không thể tạo khóa API.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng.' };
    }
  }

  async toggleAiKey(id: string, isActive: boolean): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch('/api/missions/ai-keys', {
        method: 'PUT',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({ id, is_active: isActive }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Không thể cập nhật khóa API.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng.' };
    }
  }

  async deleteAiKey(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/missions/ai-keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(true),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Không thể xóa khóa API.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng.' };
    }
  }

  async getAuditLogs(
    missionId?: string
  ): Promise<{ success: boolean; logs: MissionAuditLog[]; message?: string }> {
    try {
      const url = missionId && missionId !== 'all'
        ? `/api/missions/audit-logs?mission_id=${encodeURIComponent(missionId)}`
        : '/api/missions/audit-logs';

      const res = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(true),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, logs: data.logs || [] };
      }
      const errData = await res.json().catch(() => ({}));
      return { success: false, logs: [], message: errData.message || 'Không thể tải nhật ký kiểm toán.' };
    } catch (e: any) {
      return { success: false, logs: [], message: e?.message || 'Lỗi mạng.' };
    }
  }
}

export const missionService = new MissionService();
