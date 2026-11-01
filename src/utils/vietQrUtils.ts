/**
 * VietQR & SePay Banking Standard Utility
 * Generates 100% compliant EMVCo / NAPAS VietQR images for Vietnamese banking apps.
 */
import QRCode from 'qrcode';

export interface BankInfo {
  code: string; // Standard short code for VietQR (e.g. TPBank, MBBank, Vietcombank)
  bin: string;  // NAPAS BIN Code
  shortName: string;
  name: string;
}

export const VIETNAM_BANKS: Record<string, BankInfo> = {
  TPBank: { code: 'TPBank', bin: '970423', shortName: 'TPBank', name: 'TPBank (Ngân Hàng Tiên Phong)' },
  MBBank: { code: 'MBBank', bin: '970422', shortName: 'MBBank', name: 'MBBank (Ngân Hàng Quân Đội)' },
  Vietcombank: { code: 'Vietcombank', bin: '970436', shortName: 'Vietcombank', name: 'Vietcombank (Ngân Hàng Ngoại Thương)' },
  VietinBank: { code: 'VietinBank', bin: '970415', shortName: 'VietinBank', name: 'VietinBank (Ngân Hàng Công Thương)' },
  Techcombank: { code: 'Techcombank', bin: '970407', shortName: 'Techcombank', name: 'Techcombank (Kỹ Thương Việt Nam)' },
  VPBank: { code: 'VPBank', bin: '970432', shortName: 'VPBank', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  ACB: { code: 'ACB', bin: '970416', shortName: 'ACB', name: 'ACB (Ngân Hàng Á Châu)' },
  BIDV: { code: 'BIDV', bin: '970418', shortName: 'BIDV', name: 'BIDV (Đầu Tư và Phát Triển)' },
  Sacombank: { code: 'Sacombank', bin: '970403', shortName: 'Sacombank', name: 'Sacombank (Sài Gòn Thương Tín)' },
  MSB: { code: 'MSB', bin: '970426', shortName: 'MSB', name: 'MSB (Hàng Hải Việt Nam)' },
  VIB: { code: 'VIB', bin: '970441', shortName: 'VIB', name: 'VIB (Ngân Hàng Quốc Tế)' },
  SHB: { code: 'SHB', bin: '970443', shortName: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)' },
  HDBank: { code: 'HDBank', bin: '970437', shortName: 'HDBank', name: 'HDBank (Phát Triển TP.HCM)' },
  OCB: { code: 'OCB', bin: '970448', shortName: 'OCB', name: 'OCB (Phương Đông)' },
  Agribank: { code: 'Agribank', bin: '970405', shortName: 'Agribank', name: 'Agribank (Nông Nghiệp & PTNT)' },
};

export function normalizeBank(bankInput?: string): BankInfo {
  if (!bankInput) return VIETNAM_BANKS.MBBank;

  const raw = bankInput.trim().toLowerCase();

  if (raw.includes('tpbank') || raw.includes('tpb') || raw.includes('tiên phong') || raw.includes('tien phong')) {
    return VIETNAM_BANKS.TPBank;
  }
  if (raw.includes('mbbank') || raw.includes('mb') || raw.includes('quân đội') || raw.includes('quan doi')) {
    return VIETNAM_BANKS.MBBank;
  }
  if (raw.includes('vietcombank') || raw.includes('vcb') || raw.includes('ngoại thương') || raw.includes('ngoai thuong')) {
    return VIETNAM_BANKS.Vietcombank;
  }
  if (raw.includes('vietinbank') || raw.includes('icb') || raw.includes('ctg') || raw.includes('công thương') || raw.includes('cong thuong')) {
    return VIETNAM_BANKS.VietinBank;
  }
  if (raw.includes('techcombank') || raw.includes('tcb') || raw.includes('kỹ thương') || raw.includes('ky thuong')) {
    return VIETNAM_BANKS.Techcombank;
  }
  if (raw.includes('vpbank') || raw.includes('vpb') || raw.includes('thịnh vượng') || raw.includes('thinh vuong')) {
    return VIETNAM_BANKS.VPBank;
  }
  if (raw.includes('acb') || raw.includes('á châu') || raw.includes('a chau')) {
    return VIETNAM_BANKS.ACB;
  }
  if (raw.includes('bidv') || raw.includes('đầu tư') || raw.includes('dau tu')) {
    return VIETNAM_BANKS.BIDV;
  }
  if (raw.includes('sacombank') || raw.includes('stb') || raw.includes('sài gòn') || raw.includes('sai gon')) {
    return VIETNAM_BANKS.Sacombank;
  }
  if (raw.includes('msb') || raw.includes('hàng hải') || raw.includes('hang hai')) {
    return VIETNAM_BANKS.MSB;
  }
  if (raw.includes('vib')) return VIETNAM_BANKS.VIB;
  if (raw.includes('shb')) return VIETNAM_BANKS.SHB;
  if (raw.includes('hdbank')) return VIETNAM_BANKS.HDBank;
  if (raw.includes('ocb')) return VIETNAM_BANKS.OCB;
  if (raw.includes('agribank')) return VIETNAM_BANKS.Agribank;

  // Fallback: extract alphabetic prefix
  const firstWord = bankInput.trim().split(/[\s\(\-_]+/)[0];
  return {
    code: firstWord || 'TPBank',
    bin: '970423',
    shortName: firstWord || 'TPBank',
    name: bankInput,
  };
}

export function removeVietnameseAccents(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function tlv(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function crc16Ccitt(str: string): string {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate 100% compliant EMVCo / NAPAS 247 payload string for Vietnamese banking apps.
 */
export function generateVietQrEmvCo(params: {
  bin: string;
  accountNumber: string;
  amount: number;
  content: string;
}): string {
  const cleanAcc = (params.accountNumber || '').trim().replace(/\s+/g, '');
  const cleanBin = (params.bin || '970423').trim();
  const cleanContent = removeVietnameseAccents((params.content || '').trim()).slice(0, 50);

  const sub00 = tlv('00', 'A000000727');
  const subBank = tlv('00', cleanBin) + tlv('01', cleanAcc);
  const sub01 = tlv('01', subBank);
  const sub02 = tlv('02', 'QRIBFTTA');
  const tag38 = tlv('38', sub00 + sub01 + sub02);

  const isDynamic = params.amount > 0;
  let raw =
    tlv('00', '01') +
    tlv('01', isDynamic ? '12' : '11') +
    tag38 +
    tlv('53', '704');

  if (isDynamic) {
    raw += tlv('54', String(Math.round(params.amount)));
  }
  raw += tlv('58', 'VN');

  if (cleanContent) {
    const sub08 = tlv('08', cleanContent);
    raw += tlv('62', sub08);
  }

  raw += '6304';
  const checksum = crc16Ccitt(raw);
  return raw + checksum;
}

/**
 * Generate local Base64 Data URL for VietQR without relying on external CDNs or network requests.
 * 100% immune to adblockers, CORS issues, and network timeouts.
 */
export async function generateVietQrDataUrl(params: {
  accountNumber: string;
  bankName: string;
  amount: number;
  content: string;
}): Promise<string> {
  const bankInfo = normalizeBank(params.bankName);
  const emvco = generateVietQrEmvCo({
    bin: bankInfo.bin,
    accountNumber: params.accountNumber,
    amount: params.amount,
    content: params.content,
  });

  return await QRCode.toDataURL(emvco, {
    width: 360,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

export function buildVietQrUrl(params: {
  accountNumber: string;
  bankName: string;
  amount: number;
  content: string;
  accountName?: string;
  template?: string;
}): { primaryUrl: string; fallbackUrl: string; bankInfo: BankInfo; emvco: string } {
  const { accountNumber, bankName, amount, content, accountName, template = 'qr_only' } = params;
  const bankInfo = normalizeBank(bankName);
  const cleanAcc = accountNumber.trim().replace(/\s+/g, '');
  const cleanAmount = Math.max(0, Math.round(amount));
  const encodedContent = encodeURIComponent(content.trim());
  const encodedName = accountName ? encodeURIComponent(accountName.trim()) : '';

  const emvco = generateVietQrEmvCo({
    bin: bankInfo.bin,
    accountNumber: cleanAcc,
    amount: cleanAmount,
    content: content,
  });

  // 1. Primary: SePay official QR template (Fast CDN, high reliability)
  // template='qr_only' returns ONLY the QR code with no SePay header or VietQR/napas/bank footer
  const primaryUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(cleanAcc)}&bank=${encodeURIComponent(bankInfo.code)}&amount=${cleanAmount}&des=${encodedContent}&template=${encodeURIComponent(template)}`;

  // 2. Fallback: National VietQR Standard API
  const vietQrTemplate = template === 'compact' ? 'compact2' : 'qr_only';
  const fallbackUrl = `https://img.vietqr.io/image/${bankInfo.code}-${cleanAcc}-${vietQrTemplate}.png?amount=${cleanAmount}&addInfo=${encodedContent}${encodedName ? `&accountName=${encodedName}` : ''}`;

  return {
    primaryUrl,
    fallbackUrl,
    bankInfo,
    emvco,
  };
}
