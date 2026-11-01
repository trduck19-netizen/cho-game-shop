import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  verifyStep2SecurityCode,
  checkStep2RateLimit,
  recordStep2Attempt,
} from '../../services/step2AuthService';

export interface Step2VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  actionTitle: string;
  actionDetails?: string | React.ReactNode;
  confirmButtonText?: string;
  variant?: 'danger' | 'warning';
}

export const Step2VerificationModal: React.FC<Step2VerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Xác Minh Mật Khẩu Bước 2',
  actionTitle,
  actionDetails,
  confirmButtonText = 'Xác Nhận & Thực Hiện',
  variant = 'danger',
}) => {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShake, setIsShake] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check rate limit status on open
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setShowCode(false);
      setErrorMsg(null);
      setIsShake(false);

      const status = checkStep2RateLimit();
      if (status.isLocked) {
        setLockCountdown(status.remainingSeconds);
      } else {
        setLockCountdown(0);
      }

      // Auto-focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Countdown timer if locked
  useEffect(() => {
    if (lockCountdown <= 0) return;
    const timer = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockCountdown]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (lockCountdown > 0) {
      setErrorMsg(`Hệ thống đang tạm khóa. Vui lòng thử lại sau ${lockCountdown} giây.`);
      return;
    }

    if (!code.trim()) {
      setErrorMsg('Vui lòng nhập mã bí mật xác minh bước 2.');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      return;
    }

    const isValid = verifyStep2SecurityCode(code);
    const attemptResult = recordStep2Attempt(isValid);

    if (isValid) {
      setErrorMsg(null);
      onSuccess();
      onClose();
    } else {
      if (attemptResult.isLocked) {
        setLockCountdown(attemptResult.remainingSeconds);
        setErrorMsg('Bạn đã nhập sai 5 lần! Thao tác bị tạm khóa trong 60 giây.');
      } else {
        setRemainingAttempts(attemptResult.remainingAttempts);
        setErrorMsg(
          `Mã xác minh bước 2 không chính xác! (Còn ${attemptResult.remainingAttempts} lần thử)`
        );
      }
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      inputRef.current?.select();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-all ${
          isShake ? 'animate-bounce' : ''
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with Shield Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              variant === 'danger'
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-900/30'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 ring-4 ring-amber-50 dark:ring-amber-900/30'
            }`}
          >
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cơ chế bảo mật 2FA cho thao tác tài chính trọng yếu
            </p>
          </div>
        </div>

        {/* Action Description Banner */}
        <div
          className={`mb-4 rounded-xl p-3.5 border text-xs ${
            variant === 'danger'
              ? 'bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-200'
              : 'bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{actionTitle}</p>
              {actionDetails && (
                <div className="mt-1 text-[11px] opacity-90 leading-relaxed">
                  {actionDetails}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mã Bí Mật Xác Minh Bước 2 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                ref={inputRef}
                type={showCode ? 'text' : 'password'}
                value={code}
                disabled={lockCountdown > 0}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={
                  lockCountdown > 0
                    ? `Bị khóa trong ${lockCountdown}s...`
                    : 'Nhập mã xác minh bước 2...'
                }
                autoComplete="off"
                className={`w-full rounded-xl border pl-9 pr-10 py-2.5 text-sm font-mono tracking-wider text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white transition-all ${
                  errorMsg
                    ? 'border-rose-500 ring-2 ring-rose-200 dark:ring-rose-900/50'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:focus:ring-indigo-900/40'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              🔒 Mã được bảo vệ bằng băm mật mã học một chiều (SHA-256), không lưu bản rõ trên hệ thống.
            </p>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={lockCountdown > 0}
              className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
                lockCountdown > 0
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : variant === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>{confirmButtonText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
