import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Gift,
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Send,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import type { Mission, MissionSubmission } from '../types/mission';
import type { UserProfile } from '../types/game';
import { missionService } from '../services/missionService';
import { dataService } from '../services/dataService';
import { marketingService } from '../services/marketingService';

interface MissionDetailModalProps {
  mission: Mission;
  currentUser: UserProfile | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  onSuccessSubmit: (updatedSubmission: MissionSubmission) => void;
}

export const MissionDetailModal: React.FC<MissionDetailModalProps> = ({
  mission,
  currentUser,
  onClose,
  onOpenAuth,
  onOpenWallet,
  onSuccessSubmit,
}) => {
  const [proofLink, setProofLink] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [isResubmittingForm, setIsResubmittingForm] = useState(false);

  const submission = mission.user_submission;
  const isPending = submission?.status === 'PENDING';
  const isApproved = submission?.status === 'APPROVED';
  const isRejected = submission?.status === 'REJECTED';
  const resubmissionsLeft = Math.max(0, (mission.max_resubmissions || 2) - (submission?.resubmission_count || 0));

  useEffect(() => {
    if (submission?.status === 'APPROVED') {
      dataService.addMissionReward({
        ...submission,
        mission_title: mission.title,
        reward_type: mission.reward_type,
        reward_value: mission.reward_value,
      });
    }
  }, [submission?.status, submission?.reward_delivered]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      marketingService.recordRealCopy(mission.title || 'Mã thưởng Nhiệm Vụ', '', 1);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!proofLink.trim()) {
      setErrorMessage('Vui lòng dán đường link bài đăng bằng chứng của bạn.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await missionService.submitProof({
        mission_id: mission.id,
        proof_link: proofLink.trim(),
        proof_note: proofNote.trim(),
      });

      if (res.success) {
        setSuccessMessage(res.message || 'Nộp bằng chứng thành công!');
        setIsResubmittingForm(false);
        // Refresh submission state locally
        const newSub: MissionSubmission = {
          id: res.submission_id || `sub_${Date.now()}`,
          mission_id: mission.id,
          user_id: currentUser?.id || '',
          user_name: currentUser?.displayName || 'Thành viên',
          user_email: currentUser?.email || '',
          proof_link: proofLink.trim(),
          proof_note: proofNote.trim(),
          status: 'PENDING',
          resubmission_count: submission?.resubmission_count || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        onSuccessSubmit(newSub);
      } else {
        setErrorMessage(res.message || 'Không thể gửi bài nộp. Vui lòng kiểm tra lại link.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nowMs = Date.now();
  const isUpcoming = Boolean(mission.start_time && nowMs < new Date(mission.start_time).getTime());
  const isExpired = Boolean(mission.end_time && nowMs > new Date(mission.end_time).getTime());
  const isQuotaExhausted = (mission.completed_count || 0) >= (mission.quota || 1);
  const isFormBlocked = isQuotaExhausted || isUpcoming || isExpired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-border/60 bg-muted/30 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary-light border border-primary/30">
                {mission.task_type === 'POST_SHARE_GROUP_PAGE'
                  ? 'Đăng Bài Nhóm / Fanpage'
                  : 'Nhiệm Vụ Thành Viên'}
              </span>
              {mission.reward_type === 'CODE' ? (
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  Mã Code Quà Tặng
                </span>
              ) : (
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  +{(Number(mission.reward_value) || 0).toLocaleString('vi-VN')}đ Vào Ví
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-xl font-display font-bold text-foreground line-clamp-2">
              {mission.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Quota Progress & Schedule Notice */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Tiến độ trả thưởng:</span>
              <span className="font-bold text-foreground">
                {mission.completed_count} / {mission.quota} lượt
              </span>
              {isQuotaExhausted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Đã hết lượt
                </span>
              )}
              {isUpcoming && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Sắp diễn ra
                </span>
              )}
              {isExpired && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/80">
                  Đã kết thúc
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground font-mono">
                {mission.views || 0} xem • {mission.participants_count || 0} người tham gia
              </span>
              <div className="w-24 sm:w-28 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round(((mission.completed_count || 0) / (mission.quota || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Schedule Warnings if Upcoming or Expired */}
          {isUpcoming && (
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
              <div>
                <strong className="block text-cyan-400">Nhiệm vụ chưa bắt đầu</strong>
                <span>Thời gian mở: {new Date(mission.start_time!).toLocaleString('vi-VN')}. Hệ thống chưa nhận hồ sơ bài nộp.</span>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong className="block text-amber-400">Nhiệm vụ đã kết thúc thời gian nhận bài</strong>
                <span>Hạn chót: {new Date(mission.end_time!).toLocaleString('vi-VN')}. Những hồ sơ đã gửi trước đó vẫn được xử lý xét duyệt và trả thưởng bình thường.</span>
              </div>
            </div>
          )}

          {/* Description */}
          {mission.description && (
            <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {mission.description}
            </p>
          )}

          {/* Target Channel Button */}
          {mission.target_channel_url && (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] text-primary-light block font-medium">Nhóm / Trang đích cần đăng:</span>
                <span className="text-xs sm:text-sm font-bold text-foreground truncate block">
                  {mission.target_channel_name || mission.target_channel_url}
                </span>
              </div>
              <a
                href={mission.target_channel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="cg-btn cg-btn--small shrink-0 bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5"
              >
                <span>Mở Nhóm</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Guide Steps */}
          {mission.guide_steps && mission.guide_steps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                Các bước thực hiện
              </h4>
              <div className="space-y-2">
                {mission.guide_steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-start gap-3 text-xs sm:text-sm"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-foreground leading-relaxed pt-0.5">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Requirements */}
          {mission.content_requirements && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm space-y-1">
              <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Yêu cầu nội dung bài đăng:
              </h4>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {mission.content_requirements}
              </p>
            </div>
          )}

          {/* Allowed Domains */}
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Miền link bài đăng hợp lệ:{' '}
              <span className="font-mono text-foreground font-semibold">
                {mission.allowed_domains || 'facebook.com,fb.com,fb.watch'}
              </span>
            </span>
          </div>

          <hr className="border-border/60" />

          {/* Submission State Area */}
          {!currentUser ? (
            <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 text-center space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Vui lòng đăng nhập tài khoản để nhận hướng dẫn chi tiết và nộp bằng chứng bài đăng nhận thưởng.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="cg-btn cg-btn--primary mx-auto"
              >
                Đăng Nhập / Đăng Ký Ngay
              </button>
            </div>
          ) : isApproved ? (
            /* APPROVED STATE */
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-emerald-400">
                  Chúc mừng! Bạn đã hoàn thành nhiệm vụ
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Hồ sơ bài đăng của bạn đã được kiểm duyệt và chấp thuận.
                </p>
              </div>

              {mission.reward_type === 'CODE' && submission?.reward_delivered && (
                <div className="space-y-2 max-w-md mx-auto">
                  <div className="p-3.5 rounded-xl bg-card border border-emerald-500/40 flex items-center justify-between gap-2">
                    <div className="text-left min-w-0">
                      <span className="text-[10px] text-muted-foreground block">Mã Giftcode Của Bạn:</span>
                      <span className="font-mono text-sm sm:text-base font-bold text-primary-light select-all truncate block">
                        {submission.reward_delivered}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyCode(submission.reward_delivered!)}
                      className="cg-btn cg-btn--small shrink-0 flex items-center gap-1.5"
                    >
                      {isCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedCode ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-400/90 font-medium flex items-center justify-center gap-1.5 text-center">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mã này đã được tự động lưu vào <strong>Kho mã của tôi</strong></span>
                  </p>
                </div>
              )}

              {mission.reward_type === 'WALLET_BALANCE' && (
                <div className="mt-3 p-3.5 rounded-xl bg-card border border-emerald-500/40 text-center max-w-md mx-auto space-y-2">
                  <span className="text-xs text-muted-foreground block">Số dư đã được cộng vào tài khoản:</span>
                  <span className="text-lg sm:text-xl font-mono font-bold text-emerald-400 block">
                    +{submission?.reward_delivered || `${mission.reward_value}đ`}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenWallet}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Xem lịch sử ví & số dư $\to$
                  </button>
                </div>
              )}
            </div>
          ) : isPending ? (
            /* PENDING STATE */
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                <Clock className="w-5 h-5 animate-spin" />
                <span>Hồ sơ đang chờ xét duyệt</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bài đăng của bạn đã được tiếp nhận và đang trong hàng chờ duyệt của Quản trị viên / AI. Kết quả sẽ được cập nhật sớm nhất!
              </p>
              <div className="p-3 rounded-xl bg-card border border-border/60 text-xs space-y-1">
                <span className="text-muted-foreground block text-[11px]">Đường link bạn đã nộp:</span>
                <a
                  href={submission?.proof_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono break-all flex items-center gap-1"
                >
                  <span className="truncate">{submission?.proof_link}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                {submission?.proof_note && (
                  <p className="text-slate-400 text-[11px] pt-1">
                    Ghi chú: <span className="text-foreground">{submission.proof_note}</span>
                  </p>
                )}
              </div>
            </div>
          ) : isRejected && !isResubmittingForm ? (
            /* REJECTED STATE */
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm sm:text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Hồ sơ bài nộp bị từ chối</span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-rose-500/40 text-xs space-y-1">
                <span className="text-rose-400 font-bold text-[11px] block">Lý do từ chối:</span>
                <p className="text-foreground leading-relaxed">
                  {submission?.rejection_reason || 'Link bài đăng không đạt yêu cầu theo quy định của nhiệm vụ.'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground">
                  Số lần nộp lại còn lại: <strong className="text-foreground">{resubmissionsLeft}</strong>
                </span>

                {resubmissionsLeft > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProofLink(submission?.proof_link || '');
                      setProofNote(submission?.proof_note || '');
                      setIsResubmittingForm(true);
                    }}
                    className="cg-btn cg-btn--small bg-primary hover:bg-primary-hover text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Nộp lại bằng chứng</span>
                  </button>
                ) : (
                  <span className="text-rose-400 font-semibold text-[11px]">Đã hết lượt nộp lại</span>
                )}
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM (NEW OR RESUBMIT) */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-primary" />
                  {isResubmittingForm ? 'Nộp Lại Bằng Chứng Bài Đăng' : 'Nộp Bằng Chứng Nhận Thưởng'}
                </h4>
                {isResubmittingForm && (
                  <button
                    type="button"
                    onClick={() => setIsResubmittingForm(false)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Hủy nộp lại
                  </button>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Đường link bài đăng công khai <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://facebook.com/groups/..."
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  disabled={isSubmitting || isFormBlocked}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/80 text-foreground text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                />
                <div className="mt-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-300">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Lưu ý về chế độ Đăng bài:</span>
                  </div>
                  <p>
                    • <strong>Đăng ẩn danh:</strong> Hoàn toàn được chấp nhận nếu đăng dưới dạng Người tham gia ẩn danh (Anonymous Member) trong nhóm Facebook.
                  </p>
                  <p>
                    • <strong>Yêu cầu bắt buộc:</strong> Nhóm hoặc bài viết phải ở chế độ <strong>Công khai (Public)</strong> để Quản trị viên / AI có thể mở link và kiểm duyệt nội dung.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Ghi chú tùy chọn (Tên tài khoản Facebook / MXH dùng đăng bài)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A (FB)"
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  disabled={isSubmitting || isFormBlocked}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/80 text-foreground text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isFormBlocked}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold text-xs sm:text-sm shadow-glow-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Đang gửi hồ sơ...</span>
                  </>
                ) : isUpcoming ? (
                  <span>Nhiệm Vụ Chưa Mở (Sắp Diễn Ra)</span>
                ) : isExpired ? (
                  <span>Nhiệm Vụ Đã Kết Thúc Nhận Bài</span>
                ) : isQuotaExhausted ? (
                  <span>Nhiệm Vụ Đã Hết Lượt (Hết Quota)</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isResubmittingForm ? 'Gửi Lại Bằng Chứng' : 'Gửi Bằng Chứng Chờ Duyệt'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
