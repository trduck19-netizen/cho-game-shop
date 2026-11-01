import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Gamepad2, Sparkles, Flame, Tag } from 'lucide-react';
import { GameAdminRecord } from '../../types/adminTypes';
import { calculateGameSearchScore, splitMatchHighlight } from '../../../utils/textUtils';

export interface SearchableGameSelectProps {
  games: GameAdminRecord[];
  selectedGameSlug: string;
  onSelectGame: (game: GameAdminRecord | any) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
  dropdownAlign?: 'left' | 'right';
}

export const SearchableGameSelect: React.FC<SearchableGameSelectProps> = ({
  games,
  selectedGameSlug,
  onSelectGame,
  label = 'Chọn Tựa Game',
  required = false,
  disabled = false,
  className = '',
  placeholder = 'Chọn tựa game...',
  allowClear = false,
  clearLabel = 'Tự động nhận diện (Fuzzy match)',
  dropdownAlign = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Find currently selected game by slug or id
  const selectedGame = useMemo(() => {
    if (!selectedGameSlug) return null;
    return games.find((g) => g.slug === selectedGameSlug || g.id === selectedGameSlug) || null;
  }, [games, selectedGameSlug]);

  // Score & sort games with intelligent relevance engine
  const scoredGames = useMemo(() => {
    if (!searchQuery.trim()) {
      return games.map((g) => ({
        game: g,
        scoreRes: { score: 0, matchType: 'none' as const, matchDetail: '' },
      }));
    }

    return games
      .map((g) => ({
        game: g,
        scoreRes: calculateGameSearchScore(g, searchQuery),
      }))
      .filter((item) => item.scoreRes.score > 0)
      .sort((a, b) => {
        // 1. Highest relevance score first (direct name > prefix > acronym > publisher > category)
        if (b.scoreRes.score !== a.scoreRes.score) {
          return b.scoreRes.score - a.scoreRes.score;
        }
        // 2. Games with available giftcodes first
        const codesA = a.game.codes_count || 0;
        const codesB = b.game.codes_count || 0;
        if (codesB !== codesA) return codesB - codesA;
        // 3. Alphabetical tie-breaker
        return (a.game.name || '').localeCompare(b.game.name || '');
      });
  }, [games, searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Autofocus input when opened & reset highlighted item
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, scoredGames.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (scoredGames[highlightedIndex]) {
        onSelectGame(scoredGames[highlightedIndex].game);
        setIsOpen(false);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main trigger button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full rounded-xl border p-2 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-lg'
            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:text-slate-200'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedGame ? (
            <>
              <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                <img
                  src={selectedGame.icon_url || `/game_icons/${selectedGame.slug}.webp`}
                  alt={selectedGame.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/vite.svg';
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 truncate">
                <span className="font-bold text-slate-900 dark:text-white truncate block">
                  {selectedGame.name}
                </span>
                {selectedGame.publisher && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                    {selectedGame.publisher}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <Gamepad2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="truncate">{placeholder}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selectedGame && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectGame(null);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Bỏ chọn / Đặt về tất cả game"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-500' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 rounded-2xl border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col ${
            dropdownAlign === 'right'
              ? 'right-0 sm:left-auto sm:right-0 sm:w-[440px] min-w-full'
              : 'left-0 sm:right-auto sm:left-0 sm:w-[440px] min-w-full'
          }`}
        >
          {/* Search box input header */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/95 dark:border-slate-800 dark:bg-slate-950/95 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700/80 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 shadow-xs">
              <Search className="w-4 h-4 text-indigo-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Gõ tên game tiếng Việt (VD: Tiên Giới, Hắc Ngộ Không, vltk, ff, roblox...)..."
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 font-bold shrink-0 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-500/30">
                {scoredGames.length}
              </span>
            </div>

            {/* Quick Keyword Suggestions if empty */}
            {!searchQuery.trim() && (
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Gợi ý nhanh:</span>
                {['Liên Quân', 'Tiên Giới', 'Hắc Ngộ Không', 'Roblox', 'Genshin', 'Free Fire', 'Võ Lâm', 'Honkai'].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setSearchQuery(kw)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer text-[10px] font-medium"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List of games */}
          <div
            ref={listContainerRef}
            className="overflow-y-auto p-1.5 space-y-0.5 max-h-[380px] divide-y divide-slate-100 dark:divide-slate-800/40 custom-scrollbar"
          >
            {/* Clear / Auto-detect option at top */}
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onSelectGame(null);
                  setIsOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl text-left text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer mb-1 border border-dashed ${
                  !selectedGame
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold dark:bg-indigo-950/60 dark:border-indigo-500/50 dark:text-indigo-200'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-slate-800 dark:hover:bg-slate-800/60 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold block truncate text-slate-800 dark:text-slate-200">
                      {clearLabel}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      Hiển thị dữ liệu của toàn bộ danh mục game
                    </span>
                  </div>
                </div>
                {!selectedGame && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </button>
            )}

            {scoredGames.length === 0 ? (
              <div className="py-8 px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                <Gamepad2 className="w-7 h-7 mx-auto text-slate-400 dark:text-slate-600 mb-1" />
                <p>Không tìm thấy game nào khớp với</p>
                <p className="font-bold text-amber-600 dark:text-amber-300 font-mono text-sm">
                  "{searchQuery}"
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  💡 Hỗ trợ gõ tiếng Việt có dấu, không dấu, tên NPH hoặc viết tắt (VD: vltk, lq, ff, roblox, dldl...)
                </p>
              </div>
            ) : (
              scoredGames.map(({ game, scoreRes }, index) => {
                const isSelected = game.slug === selectedGameSlug || game.id === selectedGameSlug;
                const isHighlighted = index === highlightedIndex;
                const nameParts = splitMatchHighlight(game.name || '', searchQuery);

                return (
                  <button
                    key={game.id || game.slug}
                    type="button"
                    onClick={() => {
                      onSelectGame(game);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-500/50'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                        : 'hover:bg-slate-50 text-slate-700 dark:hover:bg-slate-800/60 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                        <img
                          src={game.icon_url || `/game_icons/${game.slug}.webp`}
                          alt={game.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/vite.svg';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Game name with highlighted search match */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white block truncate text-[13px]">
                            {nameParts.map((part, pIdx) =>
                              part.isMatch ? (
                                <mark
                                  key={pIdx}
                                  className="bg-amber-300/60 text-amber-950 dark:bg-amber-400/30 dark:text-amber-300 font-black px-0.5 rounded not-italic"
                                >
                                  {part.text}
                                </mark>
                              ) : (
                                <React.Fragment key={pIdx}>{part.text}</React.Fragment>
                              )
                            )}
                          </span>
                          {game.is_hot && (
                            <span className="shrink-0 flex items-center text-[10px] text-rose-500 font-semibold" title="Game HOT">
                              <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
                            </span>
                          )}
                        </div>

                        {/* Publisher / Match Detail */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {scoreRes.matchDetail ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-500/30 font-semibold truncate max-w-full">
                              <Tag className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{scoreRes.matchDetail}</span>
                            </span>
                          ) : (
                            game.publisher && (
                              <span className="truncate">{game.publisher}</span>
                            )
                          )}
                          {game.category && !scoreRes.matchDetail?.includes(game.category) && (
                            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline truncate">
                              • {game.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(game.codes_count || 0) > 0 && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded dark:bg-amber-500/15 dark:border-amber-500/30 border">
                          {game.codes_count} code
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

