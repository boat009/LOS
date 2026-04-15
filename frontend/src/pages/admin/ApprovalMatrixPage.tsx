import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterApi } from '../../services/api';
import { Shield, Edit, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const LEVEL_ROLES = [
  'Credit Officer', 'Senior Credit Officer', 'Credit Supervisor',
  'Credit Manager', 'Credit Director', 'VP Credit', 'Credit Committee',
];

export default function ApprovalMatrixPage() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const { data: matrix = [], isLoading } = useQuery({
    queryKey: ['approval-matrix'],
    queryFn: () => masterApi.listApprovalMatrix().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => masterApi.updateApprovalMatrix(id, data),
    onSuccess: () => {
      toast.success('อัปเดต Approval Matrix สำเร็จ');
      qc.invalidateQueries({ queryKey: ['approval-matrix'] });
      setEditId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const startEdit = (row: any) => {
    setEditId(row.id);
    setEditData({ minAmount: row.minAmount, maxAmount: row.maxAmount, slaHours: row.slaHours, quorumRequired: row.quorumRequired });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Shield size={22} /> Approval Matrix</h1>
        <p className="text-sm text-gray-500 mt-1">กำหนดวงเงินและ SLA ของแต่ละ Level การอนุมัติ</p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700 flex items-start gap-2">
        <Shield size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>หมายเหตุ:</strong> การเปลี่ยนแปลง Approval Matrix จะถูกบันทึกใน Audit Log ทุกครั้ง
          และจะมีผลกับคำขอสินเชื่อใหม่ที่สร้างหลังจากบันทึก
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['Level', 'Role', 'วงเงินขั้นต่ำ (บาท)', 'วงเงินสูงสุด (บาท)', 'SLA (ชั่วโมง)', 'Quorum (L7)', 'สถานะ', ''].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">กำลังโหลด...</td></tr>
            ) : matrix.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">ยังไม่มีข้อมูล — กรุณา Seed ข้อมูลก่อน</td></tr>
            ) : matrix.map((row: any) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold">
                    L{row.level}
                  </span>
                </td>
                <td className="table-cell font-medium">{LEVEL_ROLES[row.level - 1] || `Level ${row.level}`}</td>
                <td className="table-cell">
                  {editId === row.id ? (
                    <input type="number" className="input-field w-32 text-sm"
                      value={editData.minAmount} onChange={(e) => setEditData({ ...editData, minAmount: e.target.value })} />
                  ) : parseFloat(row.minAmount || 0).toLocaleString('th-TH')}
                </td>
                <td className="table-cell">
                  {editId === row.id ? (
                    <input type="number" className="input-field w-36 text-sm"
                      value={editData.maxAmount} onChange={(e) => setEditData({ ...editData, maxAmount: e.target.value })} />
                  ) : parseFloat(row.maxAmount || 0).toLocaleString('th-TH')}
                </td>
                <td className="table-cell">
                  {editId === row.id ? (
                    <input type="number" className="input-field w-20 text-sm"
                      value={editData.slaHours} onChange={(e) => setEditData({ ...editData, slaHours: e.target.value })} />
                  ) : `${row.slaHours} ชม.`}
                </td>
                <td className="table-cell">
                  {row.level === 7 && editId === row.id ? (
                    <input type="number" className="input-field w-20 text-sm"
                      value={editData.quorumRequired || ''} onChange={(e) => setEditData({ ...editData, quorumRequired: e.target.value })} />
                  ) : row.quorumRequired ? `${row.quorumRequired} เสียง` : '-'}
                </td>
                <td className="table-cell">
                  {row.isActive ? <span className="badge-approved">Active</span> : <span className="badge-draft">Inactive</span>}
                </td>
                <td className="table-cell">
                  {editId === row.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => updateMutation.mutate({ id: row.id, data: editData })}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded" disabled={updateMutation.isPending}>
                        <Save size={14} />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(row)} className="p-1.5 text-primary-500 hover:bg-primary-50 rounded">
                      <Edit size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
