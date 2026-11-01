/**
 * Cryptographic and Security Utilities for Web Code Game
 * Leverages Web Crypto API for zero-dependency client-side and edge cryptographic operations.
 */

// Generate random cryptographic salt
export function generateSalt(length = 16): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// SHA-256 Hashing with Salt using Web Crypto API
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt + 'wcg_edge_sec_salt_2026');

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for non-crypto environments (e.g. basic Node tests)
  let hash = 0;
  const str = password + salt + 'wcg_edge_sec_salt_2026';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

// Generate Secure Session Token
export function generateSessionToken(userId: string): string {
  const randomPart = generateSalt(24);
  const timestamp = Date.now().toString(36);
  return `wcg_tok_${userId}_${timestamp}_${randomPart}`;
}

// Generate high quality SVG avatar based on username seed
export function generateAvatarUrl(username: string): string {
  const encoded = encodeURIComponent(username.trim().toLowerCase());
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encoded}&backgroundColor=0b0d19,16192e,241a45`;
}

// Password Strength Evaluator
export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Rất yếu' | 'Yếu' | 'Trung bình' | 'Mạnh' | 'Tuyệt đối an toàn';
  color: string; // Tailwind color class or hex
  barWidth: string; // percentage string
  feedback: string[];
}

export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: 'Rất yếu',
      color: 'bg-muted-foreground/30',
      barWidth: '0%',
      feedback: ['Vui lòng nhập mật khẩu tối thiểu 6 ký tự'],
    };
  }

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 6) score += 1;
  else feedback.push('Độ dài tối thiểu 6 ký tự');

  if (password.length >= 10) score += 1;

  if (/[A-Z]/.test(password)) score += 0.75;
  else feedback.push('Nên có ít nhất 1 chữ hoa (A-Z)');

  if (/[a-z]/.test(password)) score += 0.5;

  if (/[0-9]/.test(password)) score += 0.75;
  else feedback.push('Nên có ít nhất 1 chữ số (0-9)');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Nên thêm ký tự đặc biệt (@, #, $, %, !)');

  const roundedScore = Math.min(4, Math.max(1, Math.floor(score)));

  switch (roundedScore) {
    case 1:
      return {
        score: 1,
        label: 'Yếu',
        color: 'bg-rose-500 text-rose-400',
        barWidth: '25%',
        feedback,
      };
    case 2:
      return {
        score: 2,
        label: 'Trung bình',
        color: 'bg-amber-500 text-amber-400',
        barWidth: '50%',
        feedback,
      };
    case 3:
      return {
        score: 3,
        label: 'Mạnh',
        color: 'bg-indigo-500 text-indigo-400',
        barWidth: '75%',
        feedback: feedback.length > 0 ? feedback : ['Mật khẩu an toàn'],
      };
    case 4:
    default:
      return {
        score: 4,
        label: 'Tuyệt đối an toàn',
        color: 'bg-emerald-500 text-emerald-400',
        barWidth: '100%',
        feedback: ['Mật khẩu đạt độ bảo mật tối đa của Cloudflare Edge'],
      };
  }
}

// Input Validators
export function isValidUsername(username: string): { valid: boolean; message?: string } {
  const clean = username.trim();
  if (clean.length < 3) return { valid: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' };
  if (clean.length > 25) return { valid: false, message: 'Tên đăng nhập không được vượt quá 25 ký tự.' };
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { valid: false, message: 'Tên đăng nhập chỉ gồm chữ cái, số, dấu gạch ngang (-) và gạch dưới (_).' };
  }
  return { valid: true };
}

export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user}***@${domain}`;
  return `${user.substring(0, 2)}***${user.slice(-1)}@${domain}`;
}
