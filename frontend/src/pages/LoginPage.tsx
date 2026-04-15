import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { jwtDecode } from '../utils/jwt';

const loginSchema = z.object({
  username: z.string().min(1, 'กรุณาระบุ Username'),
  password: z.string().min(8, 'Password ต้องมีอย่างน้อย 8 ตัวอักษร'),
});

const mfaSchema = z.object({
  otp: z.string().length(6, 'OTP ต้องมี 6 หลัก'),
});

type LoginForm = z.infer<typeof loginSchema>;
type MfaForm = z.infer<typeof mfaSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [partialToken, setPartialToken] = useState('');

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const mfaForm = useForm<MfaForm>({ resolver: zodResolver(mfaSchema) });

  const onLogin = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authApi.login(data.username, data.password);
      const result = res.data;

      if (result.mfaRequired) {
        setPartialToken(result.partialToken);
        setMfaRequired(true);
        toast.success('กรุณายืนยัน OTP');
      } else {
        completeLogin(result.accessToken, result.refreshToken);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onMfaVerify = async (data: MfaForm) => {
    setLoading(true);
    try {
      const res = await authApi.verifyMfa(data.otp, partialToken);
      completeLogin(res.data.accessToken, res.data.refreshToken);
    } catch (err: any) {
      toast.error('OTP ไม่ถูกต้องหรือหมดอายุ');
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (accessToken: string, refreshToken: string) => {
    const decoded = jwtDecode(accessToken);
    setAuth(
      { id: decoded.sub, username: decoded.username, nameTh: decoded.nameTh || decoded.username, primaryRole: decoded.primaryRole, approvalLevel: decoded.approvalLevel },
      accessToken,
      refreshToken,
    );
    toast.success('เข้าสู่ระบบสำเร็จ');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">LOS System</h1>
          <p className="text-blue-200 mt-1">ระบบ Loan Origination System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!mfaRequired ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">เข้าสู่ระบบ</h2>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                <div>
                  <label className="label">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      {...loginForm.register('username')}
                      className="input-field pl-9"
                      placeholder="username"
                      autoComplete="username"
                    />
                  </div>
                  {loginForm.formState.errors.username && (
                    <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      {...loginForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pl-9 pr-10"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <ShieldCheck className="text-primary-500" size={24} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">ยืนยัน OTP</h2>
                <p className="text-sm text-gray-500 mt-1">กรุณากรอก OTP จาก Authenticator App หรือ SMS</p>
              </div>

              <form onSubmit={mfaForm.handleSubmit(onMfaVerify)} className="space-y-5">
                <div>
                  <label className="label">รหัส OTP (6 หลัก)</label>
                  <input
                    {...mfaForm.register('otp')}
                    className="input-field text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                  {mfaForm.formState.errors.otp && (
                    <p className="text-red-500 text-xs mt-1">{mfaForm.formState.errors.otp.message}</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน OTP'}
                </button>
                <button type="button" onClick={() => setMfaRequired(false)} className="btn-secondary w-full">
                  ย้อนกลับ
                </button>
              </form>
            </>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            ระบบนี้ใช้งานภายในองค์กรเท่านั้น | OWASP ASVS Level 2
          </p>
        </div>
      </div>
    </div>
  );
}
