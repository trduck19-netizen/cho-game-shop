import React from 'react';
import { ExternalLink } from 'lucide-react';

interface RichTextRendererProps {
  content: string;
  className?: string;
  linkClassName?: string;
}

/**
 * Parses markdown links [text](url) and HTML <a> tags into safe, clickable links.
 * Supports external links (with target="_blank") and internal links.
 */
export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className = '',
  linkClassName = '',
}) => {
  if (!content) return null;

  // Unified Regex to capture both:
  // 1. Markdown link: [Link text](https://url)
  // 2. HTML anchor tag: <a href="https://url">Link text</a>
  const combinedRegex =
    /\[([^\]]+)\]\(((?:https?:\/\/|\/|#|mailto:)[^\s)]+)\)|<a\s+(?:[^>]*?\s+)?href=["']((?:https?:\/\/|\/|#|mailto:)[^"']+)["'][^>]*>(.*?)<\/a>/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  combinedRegex.lastIndex = 0;

  while ((match = combinedRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(textBefore);
    }

    let linkText = '';
    let linkUrl = '';

    if (match[1] !== undefined && match[2] !== undefined) {
      // Markdown match: match[1] = text, match[2] = url
      linkText = match[1];
      linkUrl = match[2].trim();
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // HTML <a> match: match[3] = url, match[4] = text
      linkUrl = match[3].trim();
      linkText = match[4].replace(/<[^>]+>/g, ''); // strip any nested tags
    }

    // Safety check for URL scheme
    const isSafe = /^(https?:\/\/|\/|#|mailto:)/i.test(linkUrl);
    if (isSafe && linkText) {
      const isExternal = /^https?:\/\//i.test(linkUrl);
      parts.push(
        <a
          key={`rich-link-${match.index}`}
          href={linkUrl}
          target={isExternal ? '_blank' : '_self'}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={
            linkClassName ||
            'text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/60 hover:decoration-cyan-300 font-semibold inline-flex items-center gap-0.5 transition-colors cursor-pointer active:scale-95'
          }
          title={linkUrl}
        >
          <span>{linkText}</span>
          {isExternal && <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-80 ml-0.5" />}
        </a>
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = combinedRegex.lastIndex;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    parts.push(remainingText);
  }

  return <span className={className}>{parts}</span>;
};
