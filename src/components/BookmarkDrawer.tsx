import React from 'react';
import { createPortal } from 'react-dom';
import { X, Bookmark, Trash2, ChevronRight, Gift } from 'lucide-react';
import type { GameItem } from '../types/game';

interface BookmarkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarkedGames: GameItem[];
  onRemoveBookmark: (gameId: string) => void;
  onSelectGame: (game: GameItem) => void;
  onClearAll: () => void;
}

export const BookmarkDrawer: React.FC<BookmarkDrawerProps> = ({
  isOpen,
  onClose,
  bookmarkedGames,
  onRemoveBookmark,
  onSelectGame,
  onClearAll,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md h-full bg-card border-l border-border flex flex-col shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
              <Bookmark className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
                Tủ Game Đã Lưu ({bookmarkedGames.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Danh sách các game bạn đang theo dõi giftcode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 shadow-md cursor-pointer transition-all active:scale-90 flex items-center justify-center shrink-0"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* List of saved games */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bookmarkedGames.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-foreground">Tủ game đang trống</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Bấm vào biểu tượng bookmark trên các thẻ game để lưu lại và theo dõi mã code nhanh chóng.
              </p>
            </div>
          ) : (
            bookmarkedGames.map((game) => (
              <div
                key={game.id}
                className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/80 flex items-center justify-between gap-3 group transition-colors"
              >
                <div
                  onClick={() => {
                    onSelectGame(game);
                    onClose();
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 select-none">
                    <span className="font-bold text-white text-xs select-none pointer-events-none">
                      {game.name ? game.name.slice(0, 2).toUpperCase() : 'G'}
                    </span>
                    <img
                      src={game.icon_url || `/game_icons/${game.slug}.webp`}
                      alt={game.name}
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.endsWith('.jpg')) {
                          target.src = `/game_icons/${game.slug}.jpg`;
                        } else {
                          target.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-heading font-bold text-sm text-foreground truncate group-hover:text-primary-light transition-colors">
                      {game.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground truncate">
                        {game.publisher || 'NPH'}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                        <Gift className="w-3 h-3" /> {game.codes_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onRemoveBookmark(game.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                    title="Xóa khỏi tủ game"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onSelectGame(game);
                      onClose();
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {bookmarkedGames.length > 0 && (
          <div className="p-4 border-t border-border/60 flex items-center justify-between">
            <button
              onClick={onClearAll}
              className="text-xs text-muted-foreground hover:text-accent font-semibold transition-colors cursor-pointer"
            >
              Xóa tất cả
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
