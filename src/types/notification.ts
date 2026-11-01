export interface EmailSubscription {
  id?: string;
  email: string;
  userId?: string | null;
  notifyFollowedCodes: boolean;
  notifyGiveaways: boolean;
  notifySales: boolean;
  subscribedGames: string[]; // Danh sách game slugs đang theo dõi
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailProviderConfig {
  provider: 'resend' | 'brevo';
  apiKey: string;
  senderEmail: string;
  senderName: string;
  isEnabled: boolean;
}

export interface EmailNotificationLog {
  id: string;
  type: 'CODE_DROP' | 'GIVEAWAY' | 'FLASH_SALE' | 'BROADCAST' | 'TEST';
  title: string;
  subject: string;
  recipientCount: number;
  successCount: number;
  status: 'SENT' | 'FAILED';
  sentBy: string;
  errorMessage?: string;
  createdAt: string;
}
