export type MissionTaskType = 'POST_SHARE_GROUP_PAGE' | 'FOLLOW_FANPAGE' | 'JOIN_GROUP' | 'INVITE_FRIENDS';

export type MissionRewardType = 'CODE' | 'WALLET_BALANCE';

export type MissionReviewMode = 'MANUAL' | 'AI_AUTO' | 'AI_ASSISTED';

export type MissionStatus = 'ACTIVE' | 'PAUSED' | 'ENDED' | 'DRAFT';

export type MissionRecurrenceType = 'ONCE' | 'DAILY' | 'WEEKLY';

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AiRecommendation = 'APPROVE' | 'REJECT' | 'NEEDS_HUMAN';

export interface Mission {
  id: string;
  title: string;
  description: string;
  task_type: MissionTaskType;
  target_channel_name: string;
  target_channel_url: string;
  guide_steps: string[]; // JSON array of step descriptions
  content_requirements?: string; // hashtag, suggested copy, sample images
  reward_type: MissionRewardType;
  reward_value: number; // Cash balance if WALLET_BALANCE, or 0 if CODE
  reward_pool_id?: string;
  quota: number; // Maximum total approved rewards
  completed_count: number; // Count of successful claims
  min_account_age_days: number; // Minimum member age in days (0 = no limit)
  max_resubmissions: number; // Maximum retry submissions when rejected (default: 2)
  review_mode: MissionReviewMode;
  ai_prompt_guidelines?: string; // Guidelines for Pine AI / External AI reviewer
  allowed_domains: string; // Comma separated domains, default 'facebook.com,fb.com,fb.watch'
  recurrence_type: MissionRecurrenceType; // Default 'ONCE'
  start_time?: string;
  end_time?: string;
  status: MissionStatus;
  sort_order: number;
  views?: number;
  participants_count?: number;
  resubmission_cooldown_seconds?: number;
  available_codes_count?: number; // Real-time available codes in reward pool
  created_at: string;
  updated_at: string;
  stats?: {
    views?: number;
    participants_count?: number;
    submissions_count?: number;
    total_submissions?: number;
    pending_submissions?: number;
    approved_count?: number;
    approved_submissions?: number;
    rejected_count?: number;
    rejected_submissions?: number;
    rewards_claimed?: number;
    quota_remaining?: number;
    total_codes?: number;
    available_codes?: number;
    claimed_codes?: number;
  };
  // User contextual state (populated when user is logged in)
  user_submission?: MissionSubmission | null;
}

export interface MissionSubmission {
  id: string;
  mission_id: string;
  mission_title?: string;
  user_id: string;
  user_name: string;
  user_email: string;
  proof_link: string;
  proof_note?: string;
  status: SubmissionStatus;
  rejection_reason?: string;
  resubmission_count: number;
  reward_delivered?: string; // Delivered code string or amount added to wallet
  reviewed_by?: string;
  reviewed_at?: string;
  ai_recommendation?: AiRecommendation;
  ai_reason?: string;
  ai_reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MissionRewardCode {
  id: string;
  mission_id: string;
  code_content: string;
  status: 'AVAILABLE' | 'CLAIMED';
  claimed_by_user_id?: string;
  claimed_at?: string;
  submission_id?: string;
  created_at: string;
}

export interface MissionAiApiKey {
  id: string;
  key_name: string;
  key_prefix: string;
  scope?: 'FULL' | 'REVIEW_ONLY';
  is_active: number; // 1 or 0
  last_used_at?: string;
  created_at: string;
  raw_key?: string; // Only returned once upon creation
}

export interface MissionAuditLog {
  id: string;
  mission_id: string;
  mission_title?: string;
  submission_id: string;
  user_id: string;
  user_name?: string;
  action: 'SUBMIT' | 'AI_RECOMMEND' | 'APPROVE' | 'REJECT' | 'REWARD_DELIVERED';
  actor: string; // Admin username or AI key name
  details?: string;
  created_at: string;
}

export interface SubmitMissionPayload {
  mission_id: string;
  proof_link: string;
  proof_note?: string;
}

export interface ReviewSubmissionPayload {
  submission_id: string;
  action: 'APPROVE' | 'REJECT';
  rejection_reason?: string;
}

export interface AiReviewPayload {
  submission_id: string;
  recommendation: AiRecommendation;
  reason: string;
}
