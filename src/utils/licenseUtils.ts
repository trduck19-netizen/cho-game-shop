/**
 * Utility functions for game license verification & badges.
 * Rules:
 * - Only games with genuine Vietnamese G1 licenses (ABEI - G1, QĐ-BTTTT, QĐ-PTTH&TTĐT, QĐ-BVHTTDL) are verified ('✓ Đã xác minh').
 * - All other games (international, global, G234, or unverified) are categorized as International ('Quốc Tế').
 */

export interface GameLicenseLike {
  so_giay_phep?: string | null;
  license_number?: string | null;
  trang_thai_gp?: string | null;
}

/**
 * Checks if a game has an official Vietnamese G1 license.
 * Returns true ONLY for G1 licensed games; false for international and non-G1 games.
 */
export function isG1Licensed(game?: GameLicenseLike | null): boolean {
  if (!game) return false;

  const status = (game.trang_thai_gp || '').trim();
  const license = (game.so_giay_phep || game.license_number || '').trim();

  // If explicitly flagged as international or global, it is NOT a VN G1 license
  if (/quốc tế|toàn cầu|global|ch play/i.test(license)) {
    return false;
  }

  // If status explicitly confirms G1 license and is not negated
  if (/G1\b/i.test(status) && !/không|chưa/i.test(status)) {
    return true;
  }

  // G234 (GXN) is NOT G1
  if (/G234/i.test(status) || /GXN/i.test(license)) {
    return false;
  }

  // Check official G1 decision format: QĐ-BTTTT, QĐ-PTTH&TTĐT, QĐ-BVHTTDL, QD-BTTTT
  if (/(QĐ|QD)-(BTTTT|PTTH&TTĐT|BVHTTDL)/i.test(license)) {
    return true;
  }

  return false;
}
