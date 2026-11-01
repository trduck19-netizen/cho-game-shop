import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Gift,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Search,
  ShieldCheck,
  RefreshCw,
  Award,
} from 'lucide-react';
import type { Mission, MissionSubmission } from '../types/mission';
import type { UserProfile } from '../types/game';
import { missionService } from '../services/missionService';
import { MissionDetailModal } from './MissionDetailModal';

interface MissionsViewProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  initialMissionId?: string | null;
}

export const MissionsView: React.FC<MissionsViewProps> = ({
  currentUser,
  onOpenAuth,
  onOpenWallet,
  initialMissionId,
}) => {
  const [missions, setMissions] = useState<Mission[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('wcg_cached_missions_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const cached = localStorage.getItem('wcg_cached_missions_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'almost_full' | 'my'>('all');
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  const fetchMissions = async (forceSpinner = false) => {
    if (forceSpinner || (missions.length === 0 && !localStorage.getItem('wcg_cached_missions_v1'))) {
      setIsLoading(true);
    }
    try {
      const res = await missionService.getMissions(false);
      if (res.success) {
        setMissions(res.missions || []);
        try {
          localStorage.setItem('wcg_cached_missions_v1', JSON.stringify(res.missions || []));
        } catch {}
        if (initialMissionId) {
          const match = (res.missions || []).find((m) => m.id === initialMissionId);
          if (match) setSelectedMission(match);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions(false);
  }, [currentUser]);

  // Select mission & track views
  const handleSelectMission = async (mission: Mission) => {
    setSelectedMission(mission);
    try {
      const res = await missionService.getMission(mission.id);
      if (res.success && res.mission) {
        setSelectedMission(res.mission);
        setMissions((prev) =>
          prev.map((m) =>
            m.id === mission.id
              ? {
                  ...m,
                  views: res.mission?.views ?? (m.views || 0) + 1,
                  participants_count: res.mission?.participants_count ?? m.participants_count,
                  completed_count: res.mission?.completed_count ?? m.completed_count,
                }
              : m
          )
        );
      }
    } catch {}
  };

  // Update selected mission if mission list updates
  const handleSubmissionSuccess = (updatedSub: MissionSubmission) => {
    setMissions((prev) => {
      const updated = prev.map((m) => {
        if (m.id === updatedSub.mission_id) {
          return {
            ...m,
            user_submission: updatedSub,
          };
        }
        return m;
      });
      try {
        localStorage.setItem('wcg_cached_missions_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedMission && selectedMission.id === updatedSub.mission_id) {
      setSelectedMission((prev) => (prev ? { ...prev, user_submission: updatedSub } : null));
    }

    // Refresh immediately in background without blocking UI
    fetchMissions(false);
  };

  // Filtered Missions
  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchDesc = (m.description || '').toLowerCase().includes(q);
        const matchChannel = (m.target_channel_name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchChannel) return false;
      }

      // Filter tabs
      if (activeFilter === 'active') {
        return m.status === 'ACTIVE' && (m.completed_count || 0) < (m.quota || 1);
      }
      if (activeFilter === 'almost_full') {
        const remaining = (m.quota || 1) - (m.completed_count || 0);
        return m.status === 'ACTIVE' && remaining > 0 && remaining <= 5;
      }
      if (activeFilter === 'my') {
        return Boolean(m.user_submission);
      }

      return true;
    });
  }, [missions, searchQuery, activeFilter]);

  // Calculate statistics
  const totalActiveMissions = missions.filter(
    (m) => m.status === 'ACTIVE' && (m.completed_count || 0) < (m.quota || 1)
  ).length;

  const totalRewardsDelivered = missions.reduce((acc, m) => acc + (m.completed_count || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* 1. Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background border-b border-border/60 py-10 sm:py-14 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary-light text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Hệ Thống Nhiệm Vụ & Nhận Quà Tự Động
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground">
            Làm Nhiệm Vụ — Nhận <span className="text-gradient">Mã Code & Tiền Ví</span> Miễn Phí
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Chia sẻ bài viết, lan tỏa cộng đồng game thủ để nhận ngay những mã Giftcode độc quyền và số dư ví mua sắm không giới hạn trên sàn.
          </p>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-card/60 backdrop-blur border border-border/80 shadow-sm text-xs sm:text-sm">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Nhiệm vụ đang mở:</span>
              <strong className="text-foreground font-mono">{totalActiveMissions}</strong>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-card/60 backdrop-blur border border-border/80 shadow-sm text-xs sm:text-sm">
              <Gift className="w-4 h-4 text-accent" />
              <span className="text-muted-foreground">Lượt quà đã phát:</span>
              <strong className="text-foreground font-mono">{totalRewardsDelivered}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Tất cả ({missions.length})
            </button>

            <button
              onClick={() => setActiveFilter('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'active'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Đang mở ({totalActiveMissions})
            </button>

            <button
              onClick={() => setActiveFilter('almost_full')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'almost_full'
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Sắp hết lượt
            </button>

            {currentUser && (
              <button
                onClick={() => setActiveFilter('my')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'my'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Của tôi
              </button>
            )}
          </div>

          {/* Search Input & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên nhiệm vụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            <button
              onClick={() => fetchMissions(true)}
              disabled={isLoading}
              className="p-2 rounded-xl bg-card border border-border/80 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3. Missions Grid */}
        {isLoading && missions.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3.5">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground animate-pulse">
              Đang tải dữ liệu nhiệm vụ từ máy chủ...
            </p>
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-card border border-border/60 max-w-md mx-auto my-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Không tìm thấy nhiệm vụ nào</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hiện tại không có nhiệm vụ nào phù hợp với bộ lọc. Hãy thử đổi từ khóa tìm kiếm hoặc quay lại sau nhé!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredMissions.map((mission) => {
              const sub = mission.user_submission;
              const isFull = (mission.completed_count || 0) >= (mission.quota || 1);
              const remaining = Math.max(0, (mission.quota || 1) - (mission.completed_count || 0));
              const nowMs = Date.now();
              const isUpcoming = Boolean(mission.start_time && nowMs < new Date(mission.start_time).getTime());
              const isExpired = Boolean(mission.end_time && nowMs > new Date(mission.end_time).getTime());

              return (
                <div
                  key={mission.id}
                  onClick={() => handleSelectMission(mission)}
                  className="group relative p-5 rounded-2xl sm:rounded-3xl bg-card border border-border/80 hover:border-primary/50 hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Top Row: Type & Reward Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary-light border border-primary/20">
                          {mission.task_type === 'POST_SHARE_GROUP_PAGE'
                            ? 'Đăng Bài MXH'
                            : 'Nhiệm Vụ'}
                        </span>
                        {isUpcoming && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Sắp diễn ra
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Đã đóng
                          </span>
                        )}
                      </div>

                      {mission.reward_type === 'CODE' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          Code Quà Tặng
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                          <Wallet className="w-3 h-3" />
                          +{(Number(mission.reward_value) || 0).toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-display font-bold text-foreground group-hover:text-primary-light transition-colors line-clamp-2">
                      {mission.title}
                    </h3>

                    {/* Target Channel */}
                    {mission.target_channel_name && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        Đích đến: <strong className="text-foreground">{mission.target_channel_name}</strong>
                      </p>
                    )}

                    {/* Quota Progress */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Còn lại:</span>
                        <span className="font-mono font-bold text-foreground">
                          {isFull ? (
                            <span className="text-rose-400">Hết lượt</span>
                          ) : (
                            `${remaining} / ${mission.quota} suất`
                          )}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((mission.completed_count || 0) / (mission.quota || 1)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Views & Participants metric bar */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                      <span>{mission.views || 0} lượt xem</span>
                      <span>•</span>
                      <span>{mission.participants_count || 0} người tham gia</span>
                    </div>
                  </div>

                  {/* Bottom User Status Row */}
                  <div className="pt-3 border-t border-border/50 mt-3 flex items-center justify-between gap-2">
                    {sub ? (
                      sub.status === 'APPROVED' ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã Nhận Thưởng
                        </span>
                      ) : sub.status === 'PENDING' ? (
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Đang Chờ Duyệt
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Bị Từ Chối
                        </span>
                      )
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        Chưa tham gia
                      </span>
                    )}

                    <span className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Chi tiết <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Detail & Submit Modal */}
      {selectedMission && (
        <MissionDetailModal
          mission={selectedMission}
          currentUser={currentUser}
          onClose={() => setSelectedMission(null)}
          onOpenAuth={onOpenAuth}
          onOpenWallet={onOpenWallet}
          onSuccessSubmit={handleSubmissionSuccess}
        />
      )}
    </div>
  );
};
