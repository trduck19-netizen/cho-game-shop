import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { GuideLinkItem } from '../types/game';

export function formatSafeUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '#';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function resolveGuideLinks(
  showGuide?: boolean,
  guideLinks?: GuideLinkItem[],
  guideUrl?: string,
  guideText?: string
): GuideLinkItem[] {
  if (showGuide === false) return [];

  if (guideLinks && Array.isArray(guideLinks) && guideLinks.length > 0) {
    const valid = guideLinks.filter((item) => item && typeof item.url === 'string' && item.url.trim() !== '');
    if (valid.length > 0) return valid;
  }

  if (guideUrl && guideUrl.trim() !== '') {
    return [
      {
        text: guideText && guideText.trim() ? guideText.trim() : 'Xem hướng dẫn chi tiết tại đây',
        url: guideUrl.trim(),
      },
    ];
  }

  return [];
}

interface GuideLinksBannerProps {
  guideLinks?: GuideLinkItem[];
  guideUrl?: string;
  guideText?: string;
  showGuide?: boolean;
  theme?: 'indigo' | 'teal';
  size?: 'sm' | 'md';
  className?: string;
}

export const GuideLinksBanner: React.FC<GuideLinksBannerProps> = ({
  guideLinks,
  guideUrl,
  guideText,
  showGuide = true,
  theme = 'indigo',
  size = 'md',
  className = '',
}) => {
  const links = resolveGuideLinks(showGuide, guideLinks, guideUrl, guideText);
  if (links.length === 0) return null;

  const isTeal = theme === 'teal';
  const isSm = size === 'sm';

  const containerClasses = isSm
    ? `flex flex-col gap-1.5 text-[11px] ${isTeal ? 'text-teal-400' : 'text-indigo-400'}`
    : `p-3 sm:p-3.5 rounded-2xl border text-xs leading-relaxed ${
        isTeal
          ? 'bg-teal-500/10 border-teal-500/25 text-teal-200'
          : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-200'
      }`;

  const linkClasses = isTeal
    ? 'font-bold text-teal-400 hover:text-teal-300 underline underline-offset-4 decoration-teal-400/50 hover:decoration-teal-300 transition-all cursor-pointer inline-flex items-center gap-1'
    : 'font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/50 hover:decoration-indigo-300 transition-all cursor-pointer inline-flex items-center gap-1';

  const renderSingleLine = (item: GuideLinkItem) => {
    const safeUrl = formatSafeUrl(item.url);
    const text = item.text || 'Xem hướng dẫn chi tiết tại đây';
    const lower = text.toLowerCase();
    const taiDayIdx = lower.indexOf('tại đây');

    if (taiDayIdx !== -1) {
      const prefix = text.slice(0, taiDayIdx);
      const taiDayWord = text.slice(taiDayIdx, taiDayIdx + 7);
      const suffix = text.slice(taiDayIdx + 7);

      return (
        <span>
          <span className="text-foreground/90 font-medium">{prefix}</span>
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
            onClick={(e) => e.stopPropagation()}
          >
            {taiDayWord}
            <ExternalLink className={isSm ? 'w-2.5 h-2.5 inline-block shrink-0' : 'w-3.5 h-3.5 inline-block shrink-0'} />
          </a>
          {suffix && <span className="text-foreground/90 font-medium">{suffix}</span>}
        </span>
      );
    }

    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
        onClick={(e) => e.stopPropagation()}
      >
        <span>{text}</span>
        <ExternalLink className={isSm ? 'w-2.5 h-2.5 inline-block shrink-0' : 'w-3.5 h-3.5 inline-block shrink-0'} />
      </a>
    );
  };

  if (isSm) {
    return (
      <div className={`${containerClasses} ${className}`}>
        {links.map((item, idx) => (
          <div key={item.id || idx} className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 shrink-0" />
            {renderSingleLine(item)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${containerClasses} ${className}`}>
      <div
        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
          isTeal ? 'bg-teal-500/20 text-teal-400' : 'bg-indigo-500/20 text-indigo-400'
        }`}
      >
        <BookOpen className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-1.5 self-center">
        {links.map((item, idx) => (
          <div key={item.id || idx} className="flex items-start gap-1">
            {links.length > 1 && (
              <span className={`text-[11px] font-bold shrink-0 mt-0.5 ${isTeal ? 'text-teal-400' : 'text-indigo-400'}`}>
                •
              </span>
            )}
            <div className="flex-1">{renderSingleLine(item)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
