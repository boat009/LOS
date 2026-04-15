import { useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '../services/api';
import toast from 'react-hot-toast';
import { User, Shield, Key } from 'lucide-react';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const changeMutation = useMutation({
    mutationFn: () => usersApi.changePassword(user!.id, currentPass, newPass),
    onSuccess: () => { toast.success('เปลี่ยนรหัสผ่านสำเร็จ'); setCurrentPass(''); setNewPass(''); setConfirmPass(''); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) { toast.error('รหัสผ่านใหม่ไม่ตรงกัน'); return; }
    if (newPass.length < 8) { toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return; }
    changeMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">โปรไฟล์ผู้ใช้</h1>

      <div className="card">
        <div className="flex items-center gap-4 mb-5 pb-4 border-b">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl font-bold text-primary-700">
            {user?.nameTh?.[0] || user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.nameTh || user?.username}</h2>
            <p className="text-sm text-gray-500">@{user?.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                {user?.primaryRole}
              </span>
              {user?.approvalLevel && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                  Level {user.approvalLevel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500 flex items-center gap-1"><User size={13} /> User ID</span><p className="font-mono text-xs mt-1 text-gray-600">{user?.id}</p></div>
          <div><span className="text-gray-500 flex items-center gap-1"><Shield size={13} /> Role</span><p className="font-medium mt-1">{user?.primaryRole}</p></div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4 pb-2 border-b"><Key size={16} /> เปลี่ยนรหัสผ่าน</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">รหัสผ่านปัจจุบัน</label>
            <input type="password" className="input-field" value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
          </div>
          <div>
            <label className="label">รหัสผ่านใหม่</label>
            <input type="password" className="input-field" value={newPass} onChange={e => setNewPass(e.target.value)}
              placeholder="อย่างน้อย 8 ตัว + A-Z + a-z + 0-9 + อักขระพิเศษ" />
          </div>
          <div>
            <label className="label">ยืนยันรหัสผ่านใหม่</label>
            <input type="password" className="input-field" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <p className="font-medium">Policy รหัสผ่าน:</p>
            <p>• ความยาวอย่างน้อย 8 ตัวอักษร</p>
            <p>• มีตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว</p>
            <p>• มีตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว</p>
            <p>• มีตัวเลข (0-9) อย่างน้อย 1 ตัว</p>
            <p>• มีอักขระพิเศษ (!@#$%) อย่างน้อย 1 ตัว</p>
            <p>• ไม่ซ้ำกับรหัสผ่าน 5 ครั้งล่าสุด | หมดอายุทุก 90 วัน</p>
          </div>
          <button type="submit" disabled={changeMutation.isPending} className="btn-primary w-full">
            {changeMutation.isPending ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>
      </div>
    </div>
  );
}
