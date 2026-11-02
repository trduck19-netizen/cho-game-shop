import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { maskCode } from './filterProducts';

// Hộp mã đã giao cho người mua.
// Học từ cách làm chung của các sàn mã số: mã dùng một lần phải được giữ
// kín cho tới khi người mua chủ động xem, vì mã lộ ra là coi như mất.
// Vì vậy mặc định mã bị che, bấm "Hiện mã" mới thấy; nút sao chép từng mã
// và sao chép tất cả chỉ hoạt động trên mã thật, không tự sinh mã nào.
export const DeliveredCodesBox: React.FC<{ codes: string[] }> = ({ codes }) => {
  const [revealed, setRevealed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (codes.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Chưa có mã nào được giao cho đơn này. Nếu bạn vừa mua, vui lòng tải lại trang đơn hàng.
      </p>
    );
  }

  const copyText = async (text: string, index: number | null) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Trình duyệt chặn clipboard: người mua vẫn thấy mã để tự sao chép tay.
    }
    if (index === null) {
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 2000);
    } else {
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-amber-900">
          Mã đã giao ({codes.length} mã) — chỉ bạn mới thấy mã này
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900"
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            {revealed ? 'Ẩn mã' : 'Hiện mã'}
          </button>
          <button
            type="button"
            onClick={() => copyText(codes.join('\n'), null)}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            {copiedAll ? <Check size={16} /> : <Copy size={16} />}
            {copiedAll ? 'Đã sao chép' : 'Sao chép tất cả'}
          </button>
        </div>
      </div>
      {!revealed && (
        <p className="mt-2 text-sm text-amber-800">
          Mã đang được che để tránh lộ khi chụp màn hình. Hãy nhập mã ngay sau khi hiện, vì mã
          dùng một lần và mã đã lộ thì không thu hồi được.
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {codes.map((code, index) => (
          <li
            key={`${code}-${index}`}
            className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 font-mono text-sm"
          >
            <span>{revealed ? code : maskCode(code)}</span>
            <button
              type="button"
              onClick={() => copyText(code, index)}
              className="inline-flex shrink-0 items-center gap-1 text-amber-700"
            >
              {copiedIndex === index ? <Check size={16} /> : <Copy size={16} />}
              {copiedIndex === index ? 'Đã sao chép' : 'Sao chép'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
