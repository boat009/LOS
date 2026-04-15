import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../services/api';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2, Shield, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const ROLES = [
  'SALE', 'CREDIT_OFFICER', 'SENIOR_CREDIT_OFFICER', 'CREDIT_SUPERVISOR',
  'CREDIT_MANAGER', 'CREDIT_DIRECTOR', 'VP_CREDIT', 'CREDIT_COMMITTEE', 'ADMIN', 'AUDIT',
];

export default function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(1, 100).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => { toast.success('สร้างผู้ใช้สำเร็จ'); qc.invalidateQueries({ queryKey: ['users'] }); setShowForm(false); reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { toast.success('ลบผู้ใช้แล้ว'); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate({ ...data, approvalLevel: data.approvalLevel ? parseInt(data.approvalLevel) : undefined });
  };

  const users = data?.items || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UserCheck size={22} /> จัดการผู้ใช้งาน</h1>
          <p className="text-sm text-gray-500 mt-1">ผู้ใช้ทั้งหมด {users.length} คน</p>
        </div>
        <button onClick={() => { setShowForm(true); reset(); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> เพิ่มผู้ใช้
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">เพิ่มผู้ใช้ใหม่</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div><label className="label">Username *</label><input {...register('username', { required: true })} className="input-field" /></div>
            <div><label className="label">Password *</label><input {...register('password', { required: true })} type="password" className="input-field" placeholder="อย่างน้อย 8 ตัว + ตัวพิมพ์ใหญ่ + ตัวเลข + อักขระพิเศษ" /></div>
            <div><label className="label">ชื่อ-นามสกุล (ไทย) *</label><input {...register('nameTh', { required: true })} className="input-field" /></div>
            <div><label className="label">อีเมล *</label><input {...register('email', { required: true })} type="email" className="input-field" /></div>
            <div><label className="label">เบอร์โทร</label><input {...register('phone')} className="input-field" /></div>
            <div><label className="label">รหัสพนักงาน</label><input {...register('employeeId')} className="input-field" /></div>
            <div>
              <label className="label">Role *</label>
              <select {...register('primaryRole', { required: true })} className="input-field">
                <option value="">-- เลือก Role --</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Approval Level (L1-L7)</label>
              <select {...register('approvalLevel')} className="input-field">
                <option value="">-- ไม่มี --</option>
                {[1, 2, 3, 4, 5, 6, 7].map((l) => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
            <div><label className="label">วงเงินอนุมัติสูงสุด (บาท)</label><input {...register('maxApprovalAmount')} type="number" className="input-field" /></div>
            <div className="col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">ยกเลิก</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['Username', 'ชื่อ', 'Role', 'Level', 'อีเมล', 'สถานะ', 'วันที่สร้าง', ''].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">กำลังโหลด...</td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono font-medium">{u.username}</td>
                <td className="table-cell">{u.nameTh}</td>
                <td className="table-cell">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{u.primaryRole}</span>
                </td>
                <td className="table-cell">{u.approvalLevel ? `L${u.approvalLevel}` : '-'}</td>
                <td className="table-cell text-gray-500">{u.emailMasked}</td>
                <td className="table-cell">
                  {u.isActive
                    ? <span className="badge-approved">Active</span>
                    : <span className="badge-rejected">Inactive</span>}
                </td>
                <td className="table-cell text-xs text-gray-400">{dayjs(u.createdAt).format('DD/MM/YYYY')}</td>
                <td className="table-cell">
                  <button onClick={() => window.confirm('ต้องการลบผู้ใช้นี้?') && deleteMutation.mutate(u.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
