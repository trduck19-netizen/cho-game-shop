import React from 'react';
import { Flame, Sparkles, Gift, Bookmark, Layers, ArrowUpDown, Filter, ChevronDown } from 'lucide-react';
import type { FilterState } from '../types/game';
import { useLanguage } from '../context/LanguageContext';

interface CategoryFilterProps {
  filter: FilterState;
  onFilterChange: (newFilter: Partial<FilterState>) => void;
  categories: string[];
  totalResults: number;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  filter,
  onFilterChange,
  categories,
  totalResults,
}) => {
  const { t } = useLanguage();

  const cleanCategories = React.useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const cat of categories) {
      if (!cat) continue;
      let trimmed = cat.trim();
      if (trimmed.includes('\uFFFD') || /th[p|ậ|a-z]*\s*c[ẩ|a-z]*m/i.test(trimmed)) {
        trimmed = 'Thể Thao & Tốc Độ';
      }
      if (trimmed === 'Nhập Vai (MMORPG)') trimmed = 'Nhập Vai';
      if (trimmed === 'Chiến Thuật Tam Quốc') trimmed = 'Tam Quốc / Chiến Thuật';
      if (trimmed === 'Roblox / Thủ Thành Chiến Lược') trimmed = 'Roblox / Thủ Thành Chiến Thuật';
      if (trimmed === 'Thể Thao Điện Tử') trimmed = 'Thể Thao & Tốc Độ';
      if (trimmed === 'Kiếm Hiệp 3D' || trimmed === 'Kiếm Hiệp Nhập Vai') trimmed = 'Kiếm Hiệp / Tiên Hiệp';
      if (trimmed === 'Tất cả' || trimmed === 'all') continue;
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        list.push(trimmed);
      }
    }
    return list.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [categories]);

  const activeCategory = React.useMemo(() => {
    if (!filter.category || filter.category === 'all') return 'all';
    let c = filter.category;
    if (c === 'Nhập Vai (MMORPG)') return 'Nhập Vai';
    if (c === 'Chiến Thuật Tam Quốc') return 'Tam Quốc / Chiến Thuật';
    if (c === 'Roblox / Thủ Thành Chiến Lược') return 'Roblox / Thủ Thành Chiến Thuật';
    if (c === 'Thể Thao Điện Tử') return 'Thể Thao & Tốc Độ';
    if (c === 'Kiếm Hiệp 3D' || c === 'Kiếm Hiệp Nhập Vai') return 'Kiếm Hiệp / Tiên Hiệp';
    return c;
  }, [filter.category]);

  const mainTags: { id: FilterState['tag']; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t.filter.all, icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'hot', label: t.filter.hot, icon: <Flame className="w-3.5 h-3.5 text-accent" /> },
    { id: 'new', label: t.filter.new, icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'has_codes', label: t.filter.hasCodes, icon: <Gift className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'bookmarked', label: t.filter.bookmarked, icon: <Bookmark className="w-3.5 h-3.5 text-primary-light" /> },
  ];

  const getSortLabel = (sortBy: FilterState['sortBy'], sortOrder: FilterState['sortOrder']) => {
    const key = `${sortBy}-${sortOrder}`;
    switch (key) {
      case 'updated-desc': return t.filter.sortUpdated;
      case 'popular-desc': return t.filter.sortPopular;
      case 'codes_count-desc': return t.filter.sortCodes;
      case 'release_date-desc': return t.filter.sortRelease;
      case 'name-asc': return t.filter.sortName;
      case 'rating-desc': return t.filter.sortRating;
      case 'license_date-desc': return t.filter.sortLicense;
      default: return 'Sắp xếp';
    }
  };

  return (
    <div className="mb-3 sm:mb-6 w-full max-w-full">
      {/* 1. MOBILE VIEW (< 640px): 1 HÀNG TRƯỢT NGANG DUY NHẤT (HORIZONTAL CHIPS BAR) */}
      <div className="relative w-full max-w-full overflow-hidden sm:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full max-w-full flex-nowrap">
          {/* Main Tag Chips */}
          {mainTags.map((tag) => {
            const isActive = filter.tag === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onFilterChange({ tag: tag.id })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-primary text-white shadow-glow-primary'
                    : 'bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-white'
                }`}
              >
                {tag.icon}
                <span>{tag.label}</span>
                {tag.id === 'all' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/25 text-white/90">
                    {totalResults}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="h-4 w-px bg-border/80 shrink-0 my-auto mx-0.5" />

          {/* Category Dropdown Chip (Native Picker Overlay) */}
          <div className="relative shrink-0">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeCategory !== 'all'
                  ? 'bg-secondary/20 text-secondary border border-secondary/40 shadow-sm'
                  : 'bg-card hover:bg-card-hover border border-border text-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-secondary shrink-0" />
              <span className="truncate max-w-[105px]">
                {activeCategory === 'all' ? t.filter.allCategories : activeCategory}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
            <select
              value={activeCategory}
              onChange={(e) => onFilterChange({ category: e.target.value })}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              aria-label={t.filter.allCategories}
            >
              <option value="all" className="bg-card text-foreground">
                {t.filter.allCategories}
              </option>
              {cleanCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-card text-foreground">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown Chip (Native Picker Overlay) */}
          <div className="relative shrink-0">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filter.sortBy !== 'updated' || filter.sortOrder !== 'desc'
                  ? 'bg-primary/20 text-primary-light border border-primary/40 shadow-sm'
                  : 'bg-card hover:bg-card-hover border border-border text-slate-300'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-primary-light shrink-0" />
              <span className="truncate max-w-[105px]">
                {getSortLabel(filter.sortBy, filter.sortOrder)}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
            <select
              value={`${filter.sortBy}-${filter.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [
                  FilterState['sortBy'],
                  FilterState['sortOrder']
                ];
                onFilterChange({ sortBy, sortOrder });
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              aria-label="Sắp xếp danh sách game"
            >
              <option value="updated-desc" className="bg-card text-foreground">
                {t.filter.sortUpdated}
              </option>
              <option value="popular-desc" className="bg-card text-foreground">
                {t.filter.sortPopular}
              </option>
              <option value="codes_count-desc" className="bg-card text-foreground">
                {t.filter.sortCodes}
              </option>
              <option value="release_date-desc" className="bg-card text-foreground">
                {t.filter.sortRelease}
              </option>
              <option value="name-asc" className="bg-card text-foreground">
                {t.filter.sortName}
              </option>
              <option value="rating-desc" className="bg-card text-foreground">
                {t.filter.sortRating}
              </option>
              <option value="license_date-desc" className="bg-card text-foreground">
                {t.filter.sortLicense}
              </option>
            </select>
          </div>
        </div>
        {/* Subtle Fade on mobile right edge */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
      </div>

      {/* 2. DESKTOP VIEW (>= 640px): 2 PHẦN TRÊN 1 HÀNG TIÊU CHUẨN */}
      <div className="hidden sm:flex items-center justify-between gap-2">
        {/* Main Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {mainTags.map((tag) => {
            const isActive = filter.tag === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => onFilterChange({ tag: tag.id })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-primary text-white shadow-glow-primary'
                    : 'bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-white'
                }`}
              >
                {tag.icon}
                <span>{tag.label}</span>
              </button>
            );
          })}
        </div>

        {/* Controls Section: Category Dropdown + Sort + Count */}
        <div className="flex items-center justify-end gap-2 text-xs shrink-0">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-secondary shrink-0" />
            <select
              value={activeCategory}
              onChange={(e) => onFilterChange({ category: e.target.value })}
              className="bg-transparent text-xs text-foreground font-semibold focus:outline-none cursor-pointer"
              aria-label={t.filter.allCategories}
            >
              <option value="all" className="bg-card text-foreground">
                {t.filter.allCategories}
              </option>
              {cleanCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-card text-foreground">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1.5 shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5 text-primary-light shrink-0" />
            <select
              value={`${filter.sortBy}-${filter.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [
                  FilterState['sortBy'],
                  FilterState['sortOrder']
                ];
                onFilterChange({ sortBy, sortOrder });
              }}
              className="bg-transparent text-xs text-foreground font-semibold focus:outline-none cursor-pointer"
              aria-label="Sắp xếp danh sách game"
            >
              <option value="updated-desc" className="bg-card text-foreground">
                {t.filter.sortUpdated}
              </option>
              <option value="popular-desc" className="bg-card text-foreground">
                {t.filter.sortPopular}
              </option>
              <option value="codes_count-desc" className="bg-card text-foreground">
                {t.filter.sortCodes}
              </option>
              <option value="release_date-desc" className="bg-card text-foreground">
                {t.filter.sortRelease}
              </option>
              <option value="name-asc" className="bg-card text-foreground">
                {t.filter.sortName}
              </option>
              <option value="rating-desc" className="bg-card text-foreground">
                {t.filter.sortRating}
              </option>
              <option value="license_date-desc" className="bg-card text-foreground">
                {t.filter.sortLicense}
              </option>
            </select>
          </div>

          {/* Total Count Badge */}
          <span className="text-xs text-slate-300 font-mono bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/60 shrink-0 whitespace-nowrap">
            <strong className="text-foreground">{totalResults}</strong> {t.filter.gamesFound}
          </span>
        </div>
      </div>
    </div>
  );
};
