import React, { useState } from 'react';
import { useFirebase } from '../FirebaseProvider';
import { motion } from 'motion/react';
import { User, Lock, Loader2, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, signup } = useFirebase();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname || !password) {
      setError('닉네임과 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to login first
      try {
        await login(nickname, password);
      } catch (loginErr: any) {
        // If user doesn't exist, try to sign up
        if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
          try {
            await signup(nickname, password);
          } catch (signupErr: any) {
            if (signupErr.code === 'auth/email-already-in-use') {
              setError('이미 사용 중인 닉네임입니다. 비밀번호를 확인해주세요.');
            } else if (signupErr.code === 'auth/operation-not-allowed') {
              setError('Firebase 콘솔에서 Email/Password 인증을 활성화해야 합니다.');
            } else {
              throw signupErr;
            }
          }
        } else if (loginErr.code === 'auth/wrong-password') {
          setError('비밀번호가 틀렸습니다.');
        } else if (loginErr.code === 'auth/operation-not-allowed') {
          setError('Firebase 콘솔에서 Email/Password 인증을 활성화해야 합니다.');
        } else {
          throw loginErr;
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 shadow-2xl border border-neutral-100"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-neutral-900 uppercase tracking-tighter mb-2">
            VisionBingo
          </h1>
          <p className="text-neutral-500 text-sm font-medium">
            닉네임과 비밀번호를 입력하고 시작하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">
              Nickname / ID
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:ring-0 transition-all outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:ring-0 transition-all outline-none text-sm"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-xs font-medium border border-red-100"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-neutral-900 text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              'Start Bingo'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
          <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
            처음 오셨다면 입력하신 정보로 계정이 생성됩니다.<br/>
            이미 계정이 있다면 로그인됩니다.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
