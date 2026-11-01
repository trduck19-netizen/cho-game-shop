import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Menu,
} from 'lucide-react';
import { AdminSidebar, AdminModuleTab } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { AdminUser } from '../types/adminTypes';

interface AdminLayoutProps {
  currentTab: AdminModuleTab;
  onSelectTab: (tab: AdminModuleTab) => void;
  currentUser: AdminUser | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout?: () => void;
  onGoToClientSite?: () => void;
  pendingGiftcodesCount?: number;
  pendingOrdersCount?: number;
  onQuickAction?: (action: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  isDarkMode,
  onToggleTheme,
  onLogout,
  onGoToClientSite,
  pendingGiftcodesCount = 0,
  pendingOrdersCount = 0,
  onQuickAction,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 ${isDarkMode ? 'dark' : ''}`}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            onSelectTab(tab);
          }}
          pendingGiftcodesCount={pendingGiftcodesCount}
          pendingOrdersCount={pendingOrdersCount}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          currentUser={currentUser}
          onGoToClientSite={onGoToClientSite}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 sm:w-80 shadow-2xl animate-in slide-in-from-left duration-200">
            <AdminSidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                onSelectTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              pendingGiftcodesCount={pendingGiftcodesCount}
              pendingOrdersCount={pendingOrdersCount}
              collapsed={false}
              onToggleCollapse={() => {}}
              currentUser={currentUser}
              onGoToClientSite={onGoToClientSite}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex flex-col transition-all duration-300 ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Topbar */}
        <AdminTopbar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isDarkMode={isDarkMode}
          onToggleTheme={onToggleTheme}
          currentUser={currentUser}
          onLogout={onLogout}
          onGoToClientSite={onGoToClientSite}
          onQuickAction={onQuickAction}
          pendingCount={pendingGiftcodesCount}
        />

        {/* Module Content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb-friendly & Easy Navigation) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-slate-200/90 bg-white/95 px-1 backdrop-blur-lg dark:border-slate-800/90 dark:bg-slate-900/95 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.35)]">
        {/* 1. Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            currentTab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className={`h-5 w-5 transition-transform ${currentTab === 'dashboard' ? 'scale-110' : ''}`} />
          </div>
          <span className="text-[10px] mt-0.5">Tổng quan</span>
        </button>

        {/* 2. Kho Code */}
        <button
          onClick={() => onSelectTab('code-inventory')}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            currentTab === 'code-inventory'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium'
          }`}
        >
          <div className="relative">
            <Package className={`h-5 w-5 transition-transform ${currentTab === 'code-inventory' ? 'scale-110' : ''}`} />
          </div>
          <span className="text-[10px] mt-0.5">Kho code</span>
        </button>

        {/* 3. Đơn Hàng (with pending badge) */}
        <button
          onClick={() => onSelectTab('orders')}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            currentTab === 'orders'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingCart className={`h-5 w-5 transition-transform ${currentTab === 'orders' ? 'scale-110' : ''}`} />
            {pendingOrdersCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white">
                {pendingOrdersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Đơn hàng</span>
        </button>

        {/* 4. Ví & Sổ Cái */}
        <button
          onClick={() => onSelectTab('wallet')}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            currentTab === 'wallet'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium'
          }`}
        >
          <div className="relative">
            <Wallet className={`h-5 w-5 transition-transform ${currentTab === 'wallet' ? 'scale-110' : ''}`} />
          </div>
          <span className="text-[10px] mt-0.5">Sổ cái ví</span>
        </button>

        {/* 5. Menu Khác (opens full drawer) */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            isMobileSidebarOpen
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium'
          }`}
        >
          <div className="relative">
            <Menu className="h-5 w-5" />
            {pendingGiftcodesCount > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Menu khác</span>
        </button>
      </nav>
    </div>
  );
};
