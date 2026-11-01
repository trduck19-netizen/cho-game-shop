/**
 * Tiện ích tính toán Thứ Tự Hiển Thị (Display Order) và Số Người Canh (Subscribers)
 * Hỗ trợ sinh số ngẫu nhiên theo khoảng dao động cài đặt và tăng trưởng theo thời gian thực tế.
 */

export interface GrowthGameItem {
  displayOrder?: number;
  orderGrowthEnabled?: boolean;
  orderGrowthRate?: number; // Thay đổi thứ tự hiển thị mỗi ngày (+1, +2...)
  orderMinRange?: number;
  orderMaxRange?: number;

  subscribersCount?: number;
  subscribersGrowthEnabled?: boolean;
  subscribersGrowthRatePerHour?: number; // Số người canh tăng thêm mỗi giờ (+5, +10...)
  subscribersMinRange?: number;
  subscribersMaxRange?: number;

  growthAnchorTime?: string;
  createdAt?: string;
}

/**
 * Sinh số ngẫu nhiên trong khoảng [min, max] với bước nhảy step
 * Hỗ trợ cả số nguyên và số lẻ thập phân linh hoạt.
 */
export function generateRandomInRange(min: number, max: number, step: number = 1): number {
  const validMin = Math.min(Number(min) || 0, Number(max) || 0);
  const validMax = Math.max(Number(min) || 0, Number(max) || 0);
  if (validMin === validMax) return validMin;

  // Nếu step < 1 (ví dụ 0.1, 0.5): hỗ trợ sinh số lẻ thập phân
  if (step > 0 && step < 1) {
    const stepsCount = Math.floor((validMax - validMin) / step);
    const randomSteps = Math.floor(Math.random() * (stepsCount + 1));
    return Number((validMin + randomSteps * step).toFixed(2));
  }

  // Nếu min hoặc max có phần lẻ thập phân mà step = 1: sinh số lẻ thập phân ngẫu nhiên 1 chữ số
  if (validMin % 1 !== 0 || validMax % 1 !== 0) {
    const randFloat = Math.random() * (validMax - validMin) + validMin;
    return Number(randFloat.toFixed(1));
  }

  const raw = Math.floor(Math.random() * (validMax - validMin + 1)) + validMin;
  if (step > 1) {
    return Math.max(validMin, Math.min(validMax, Math.round(raw / step) * step));
  }
  return raw;
}

/**
 * Tính toán Thứ Tự Hiển Thị (Display Order) hiệu dụng theo thời gian thực
 * Hỗ trợ số lẻ thập phân (ví dụ 1.5, 2.5...) không bị làm tròn thành số nguyên.
 */
export function calculateEffectiveOrder(game: GrowthGameItem, nowMs: number = Date.now()): number {
  const base = typeof game.displayOrder === 'number' ? game.displayOrder : 999;
  if (!game.orderGrowthEnabled || !game.orderGrowthRate) {
    return base;
  }
  const anchorStr = game.growthAnchorTime || game.createdAt;
  if (!anchorStr) return base;
  const anchorMs = new Date(anchorStr).getTime();
  if (isNaN(anchorMs) || nowMs <= anchorMs) return base;

  const elapsedDays = (nowMs - anchorMs) / (1000 * 60 * 60 * 24);
  const delta = elapsedDays * game.orderGrowthRate;
  return Math.max(0.1, Number((base + delta).toFixed(2)));
}

/**
 * Tính toán Số Người Canh / Quan Tâm (Subscribers Count) hiệu dụng theo thời gian thực
 */
export function calculateEffectiveSubscribers(game: GrowthGameItem, nowMs: number = Date.now()): number {
  const base = typeof game.subscribersCount === 'number' ? game.subscribersCount : 1200;
  if (!game.subscribersGrowthEnabled || !game.subscribersGrowthRatePerHour) {
    return base;
  }
  const anchorStr = game.growthAnchorTime || game.createdAt;
  if (!anchorStr) return base;
  const anchorMs = new Date(anchorStr).getTime();
  if (isNaN(anchorMs) || nowMs <= anchorMs) return base;

  const elapsedMinutes = (nowMs - anchorMs) / 60000;
  const ratePerMinute = game.subscribersGrowthRatePerHour / 60;
  const delta = Math.floor(elapsedMinutes * ratePerMinute);
  return Math.max(0, base + delta);
}
