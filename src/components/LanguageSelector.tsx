import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../i18n/translations';

interface LanguageSelectorProps {
  variant?: 'header' | 'footer' | 'compact' | 'pill';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { language, setLanguage, availableLanguages, currentLanguageMeta, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside (supports mouse and touch)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'footer' || variant === 'pill') {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/80 ${className}`}>
        {availableLanguages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
              title={lang.nativeName}
            >
              <span className="text-sm leading-none">{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 sm:px-2.5 sm:py-2 min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-foreground transition-all cursor-pointer active:scale-95 shadow-sm"
        title={t.header.language}
        aria-label={t.header.language}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none sm:text-sm">{currentLanguageMeta.flag}</span>
        <span className="text-xs font-bold font-mono uppercase hidden md:inline-block">
          {currentLanguageMeta.code}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 hidden sm:block ${
            isOpen ? 'rotate-180 text-foreground' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 sm:w-52 rounded-2xl bg-card border border-border shadow-2xl p-1.5 z-50 animate-scale-in text-xs space-y-1 focus:outline-none backdrop-blur-xl"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>{t.header.language}</span>
          </div>

          <div className="py-1">
            {availableLanguages.map((item) => {
              const isSelected = language === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary/15 text-primary-light font-bold border border-primary/20'
                      : 'hover:bg-muted/80 text-foreground'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{item.flag}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold leading-tight">{item.nativeName}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{item.label}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
