import React, { useState } from 'react';
import { Toilet, User, UserRole } from '../types';
import { Lock, Unlock, Zap, PlayCircle, Copy, Check, Loader2 } from 'lucide-react';
import { LevelIcon } from './LevelIcon';

import { dbSupabase as db } from '../services/db_supabase';

interface Props {
  toilet: Toilet;
  user: User;
  onUnlock: (method: 'credit' | 'ad') => void;
  isUnlocked: boolean;
}

import { useTranslation } from 'react-i18next';

const PasswordPanel: React.FC<Props> = ({ toilet, user, onUnlock, isUnlocked }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unlockCost, setUnlockCost] = useState(1);

  React.useEffect(() => {
    db.getCreditPolicy().then(p => setUnlockCost(p.unlockCost || 1));
  }, []);

  // Determine if user has bypass privileges
  const isVipOrAdmin = user.role === UserRole.VIP || user.role === UserRole.ADMIN;

  // Logic: If public or no password, it's effectively unlocked visually
  // Also unlock for Creator
  const isCreator = user.id === toilet.createdBy;
  const showPasswordImmediately = !toilet.hasPassword || isUnlocked || isVipOrAdmin || isCreator;

  const handleUnifiedUnlock = () => {
    console.log('🔓 handleUnifiedUnlock called!', { credits: user.credits });
    // Case 1: Has Credits -> Deduct
    if (user.credits >= unlockCost) {
      console.log('💳 User has credits, unlocking immediately');
      setLoading(true);
      // OPTIMIZATION: Removed artificial delay. Immediate feedback.
      onUnlock('credit');
      // Note: We might want to keep setLoading(true) until onUnlock prop updates the isUnlocked state
      // but onUnlock calls App's handleUnlock which updates state instantly now.
      setLoading(false);
    }
    // Case 2: No Credits -> Watch Ad
    else {
      console.log('📺 No credits, unlocking with ad');
      setLoading(true);
      // Keep small delay for Ad to prevent accidental double clicks or UI glitch
      setTimeout(() => {
        setLoading(false);
        onUnlock('ad');
      }, 100);
    }
  };

  const copyToClipboard = () => {
    if (toilet.password) {
      navigator.clipboard.writeText(toilet.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`
      relative overflow-hidden rounded-xl border transition-all duration-300 shadow-sm
      ${showPasswordImmediately ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}
    `}>
      {/* Header / Status */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white/50 dark:bg-black/20">
        <div className="flex items-center gap-2">
          {showPasswordImmediately ? (
            <Unlock className="w-4 h-4 text-green-600" />
          ) : (
            <Lock className="w-4 h-4 text-gray-500" />
          )}
          <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
            {showPasswordImmediately ? t('password_unlocked', '비밀번호 확인됨') : t('password_locked', '비밀번호 잠김')}
          </span>
        </div>

        {/* Registrar Info (Right Side) */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">


          {(!toilet.source || toilet.source === 'user') ? (
            <div className="flex items-center gap-1">
              <LevelIcon level={toilet.creatorLevel || 0} size="sm" />
              <span className="font-medium">
                {toilet.creatorName || (toilet.creatorEmail ? (() => {
                  // Logic: Max 6 chars displayed. Last 2 chars are '**'.
                  // 1. Get raw string (Nickname or ID part of email)
                  let raw = toilet.creatorName || toilet.creatorEmail.split('@')[0];

                  // 2. Truncate to max 6 chars if longer
                  if (raw.length > 6) {
                    raw = raw.slice(0, 6);
                  }

                  // 3. Mask last 2 chars
                  // If string is very short (<=2), just show '**' or similar? 
                  // "마지막 두개는 **" implies replacing the last 2 characters.
                  if (raw.length <= 2) {
                    return raw.substring(0, 1) + '*'; // Or just '**'? Let's keep at least 1 char if possible, or '**' if len=2.
                    // User said "last two are **".
                    // If len=2 ('ab') -> '**'.
                    // If len=1 ('a') -> '*' (Can't mask 2).
                    return '**';
                  }

                  return raw.slice(0, raw.length - 2) + '**';
                })() : t('anonymous', '익명'))}
              </span>
              <span className="text-[10px] text-gray-400 opacity-80 decoration-none font-normal">(Lv.{toilet.creatorLevel || 0})</span>
            </div>
          ) : (
            <span className="font-medium text-blue-500">{t('public_data', '공공데이터')}</span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col items-center justify-center min-h-[120px]">
        {showPasswordImmediately ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 w-full">
            <div className="text-sm text-gray-500 mb-1">{t('toilet_password', '화장실 비밀번호')}</div>
            <div className="text-4xl font-black text-gray-900 dark:text-white tracking-wider mb-4">
              {toilet.password || t('none', "없음")}
            </div>

          </div>
        ) : (
          <div className="w-full">
            <button
              onClick={handleUnifiedUnlock}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl shadow-md transition-all active:scale-95
                  ${user.credits >= unlockCost ? 'bg-primary text-white hover:bg-amber-600' : 'bg-gray-900 text-white hover:bg-gray-800'}
                `}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                user.credits >= unlockCost ? <Zap className="w-5 h-5 fill-current" /> : <PlayCircle className="w-5 h-5" />
              )}

              <div className="flex flex-col items-start leading-none">
                <span className="font-bold text-base">
                  {user.credits >= unlockCost ? t('check_password', '비밀번호 확인') : t('unlock_with_ad', '광고보고 비번확인')}
                </span>
                {user.credits >= unlockCost && (
                  <span className="text-[10px] opacity-80 mt-1 font-medium">
                    {t('credit_deduction', '{{cost}} 크래딧 차감 (보유: {{balance}})', { cost: unlockCost, balance: user.credits })}
                  </span>
                )}
              </div>
            </button>


          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordPanel;