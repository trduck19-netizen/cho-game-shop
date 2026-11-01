import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { AdminUser } from '../types/adminTypes';
import { adminDataService } from '../services/adminDataService';
import { authService } from '../../services/authService';

interface AdminLoginGuardProps {
  onLoginSuccess: (user: AdminUser) => void;
  onGoToClientSite: () => void;
}

export const AdminLoginGuard: React.FC<AdminLoginGuardProps> = ({
  onLoginSuccess,
  onGoToClientSite,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberSession, setRememberSession] = useState(true);

  React.useEffect(() => {
    // Check if session token exists
    const token =
      localStorage.getItem('wcg_auth_token') ||
      sessionStorage.getItem('wcg_auth_token');
    const isAuth =
      localStorage.getItem('wcg_admin_authenticated') === 'true' ||
      sessionStorage.getItem('wcg_admin_authenticated') === 'true';
    if (isAuth && !token) {
      localStorage.removeItem('wcg_admin_authenticated');
      sessionStorage.removeItem('wcg_admin_authenticated');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập tên đăng nhập quản trị.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu quản trị viên.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate via AuthService (Cloudflare Edge / Local Verification)
      const res = await authService.login({
        identifier: identifier.trim(),
        password,
        rememberMe: rememberSession,
      });

      if (res.success && res.user) {
        const roleUpper = String(res.user.role || '').toUpperCase();
        if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
          const adminUser: AdminUser = {
            id: res.user.id || 'usr_admin',
            displayName: res.user.displayName || res.user.username || identifier.trim() || 'Admin',
            email: res.user.email || 'admin@codegame.shop',
            role: 'SUPER_ADMIN',
            avatar: res.user.avatar_url || '/logo.png',
            permissions: [
              'ALL_PERMISSIONS',
              'GAMES_MANAGE',
              'FINANCE_LEDGER',
              'SEPAY_WEBHOOK',
              'SECURITY_AUDIT',
            ],
            createdAt: '2026-08-01T00:00:00Z',
          };

          localStorage.setItem('wcg_admin_authenticated', 'true');
          sessionStorage.setItem('wcg_admin_authenticated', 'true');

          if (res.token) {
            localStorage.setItem('wcg_auth_token', res.token);
            sessionStorage.setItem('wcg_auth_token', res.token);
          }

          if (res.syncKey) {
            localStorage.setItem('wcg_admin_sync_key', res.syncKey);
            sessionStorage.setItem('wcg_admin_sync_key', res.syncKey);
          }

          adminDataService.updateCurrentAdminUser(adminUser);
          onLoginSuccess(adminUser);
          return;
        } else {
          setErrorMessage('Tài khoản này không có quyền truy cập bảng Quản Trị.');
        }
      } else {
        setErrorMessage(res.message || 'Tên đăng nhập hoặc mật khẩu quản trị không chính xác.');
      }
    } catch (err: any) {
      setErrorMessage('Đã xảy ra lỗi khi xác thực tài khoản. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-xl shadow-cyan-500/20 mb-4 border border-cyan-400/30">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            ADMIN CONSOLE <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">v4.0 SECURE</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Hệ thống Quản trị & Điều hành Dữ liệu CodeGame.Shop
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-3 py-2 rounded-xl mb-6">
            <KeyRound className="w-4 h-4 flex-shrink-0" />
            <span>Khu vực bảo mật cao — Vui lòng xác thực tài khoản để tiếp tục</span>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs leading-relaxed animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tài khoản Quản trị / Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Tên đăng nhập hoặc email quản trị"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu bảo mật
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu quản trị viên"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white rounded-xl pl-10 pr-10 py-2.5 text-xs outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0 bg-slate-950"
                />
                <span>Ghi nhớ phiên đăng nhập này</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition active:scale-[0.99] cursor-pointer mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Xác thực & Mở Bảng Điều Khiển</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Return to Client Link */}
        <div className="text-center mt-6">
          <button
            onClick={onGoToClientSite}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Quay về trang web khách (CodeGame.Shop)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
