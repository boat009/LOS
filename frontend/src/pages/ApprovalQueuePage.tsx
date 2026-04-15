import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, RotateCcw, ArrowUpCircle, Eye, Clock, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useAuthStore } from '../stores/auth.store';

type Action = 'APPROVE' | 'REJECT' | 'RETURN' | 'ESCALATE';

interface ActionModal {
  applicationId: string;
  applicationNumber: string;
  action: Action;
}

export default function ApprovalQueuePage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [modal, setModal] = useState<ActionModal | null>(null);
  const [reason, setReason] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['approval-queue'],
    queryFn: () => workflowApi.getQueue().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: detail } = useQuery({
    queryKey: ['app-detail', detailId],
    queryFn: () => workflowApi.getApplicationDetail(detailId!).then((r) => r.data),
    enabled: !!detailId,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      workflowApi.approveAction(id, payload),
    onSuccess: (_, vars) => {
      const labels: Record<Action, string> = {
        APPROVE: 'อนุมัติแล้ว ✅', REJECT: 'ปฏิเสธแล้ว ❌',
        RETURN: 'ส่งคืนแล้ว ↩️', ESCALATE: 'ส่งขึ้นระดับสูงแล้ว ⬆️',
      };
      toast.success(labels[vars.payload.action] || 'ดำเนินการสำเร็จ');
      qc.invalidateQueries({ queryKey: ['approval-queue'] });
      setModal(null);
      setReason('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const openModal = (app: any, action: Action) => {
    setModal({ applicationId: app.id, applicationNumber: app.applicationNumber, action });
    setReason('');
    setApprovedAmount(app.requestedAmount?.toString() || '');
  };

  const confirmAction = () => {
    if (!modal) return;
    if (['REJECT', 'RETURN'].includes(modal.action) && !reason.trim()) {
      toast.error('กรุณาระบุเหตุผล');
      return;
    }
    actionMutation.mutate({
      id: modal.applicationId,
      payload: {
        action: modal.action,
        reason: reason.trim() || undefined,
        approvedAmount: modal.action === 'APPROVE' && approvedAmount ? parseFloat(approvedAmount) : undefined,
      },
    });
  };

  const ACTION_CONFIG: Record<Action, { label: string; icon: any; color: string; requireReason: boolean }> = {
    APPROVE:  { label: 'อนุมัติ',          icon: CheckCircle,   color: 'bg-green-600 hover:bg-green-700', requireReason: false },
    REJECT:   { label: 'ปฏิเสธ',          icon: XCircle,       color: 'bg-red-600 hover:bg-red-700',   requireReason: true },
    RETURN:   { label: 'ส่งคืน Sale',     icon: RotateCcw,     color: 'bg-yellow-600 hover:bg-yellow-700', requireReason: true },
    ESCALATE: { label: 'ส่งขึ้น Level สูง', icon: ArrowUpCircle, color: 'bg-blue-600 hover:bg-blue-700', requireReason: false },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">คิวอนุมัติสินเชื่อ</h1>
          <p className="text-sm text-gray-500 mt-1">
            Level {user?.approvalLevel} · {queue.length} รายการรอดำเนินการ
          </p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['เลขที่คำขอ', 'ลูกค้า', 'ผลิตภัณฑ์', 'วงเงิน (บาท)', 'SLA', 'วันที่ส่ง', 'การดำเนินการ'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">กำลังโหลด...</td></tr>
            ) : queue.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <CheckCircle className="mx-auto text-green-400 mb-2" size={32} />
                  <p className="text-gray-400">ไม่มีคำขอที่รอดำเนินการ 🎉</p>
                </td>
              </tr>
            ) : (
              queue.map((app: any) => {
                const slaBreached = app.slaDeadline && dayjs().isAfter(dayjs(app.slaDeadline));
                const slaUrgent = !slaBreached && app.slaDeadline && dayjs(app.slaDeadline).diff(dayjs(), 'hour') < 2;
                return (
                  <tr key={app.id} className={clsx('hover:bg-gray-50', slaBreached && 'bg-red-50')}>
                    <td className="table-cell font-mono text-primary-600 text-xs font-medium">{app.applicationNumber}</td>
                    <td className="table-cell">{app.customer?.nameTh || '-'}</td>
                    <td className="table-cell text-xs">{app.product?.nameTh || '-'}</td>
                    <td className="table-cell font-semibold">
                      {parseFloat(app.requestedAmount || 0).toLocaleString('th-TH')}
                    </td>
                    <td className="table-cell">
                      <div className={clsx('flex items-center gap-1 text-xs',
                        slaBreached ? 'text-red-600 font-bold' : slaUrgent ? 'text-yellow-600 font-semibold' : 'text-gray-500',
                      )}>
                        {slaBreached && <AlertTriangle size={12} />}
                        {!slaBreached && <Clock size={12} />}
                        {app.slaDeadline ? dayjs(app.slaDeadline).format('DD/MM HH:mm') : '-'}
                      </div>
                      {slaBreached && <span className="text-xs text-red-500">เกิน SLA!</span>}
                    </td>
                    <td className="table-cell text-xs text-gray-500">
                      {dayjs(app.createdAt).format('DD/MM/YYYY')}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetailId(app.id)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded" title="ดูรายละเอียด">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => openModal(app, 'APPROVE')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="อนุมัติ">
                          <CheckCircle size={15} />
                        </button>
                        <button onClick={() => openModal(app, 'RETURN')} className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded" title="ส่งคืน">
                          <RotateCcw size={15} />
                        </button>
                        <button onClick={() => openModal(app, 'REJECT')} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="ปฏิเสธ">
                          <XCircle size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {detailId && detail && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-semibold text-gray-800">รายละเอียดคำขอ: {detail.applicationNumber}</h2>
            <button onClick={() => setDetailId(null)} className="text-gray-400 hover:text-gray-600 text-sm">ปิด ✕</button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">ลูกค้า:</span><br /><strong>{detail.customer?.nameTh}</strong></div>
            <div><span className="text-gray-500">ผลิตภัณฑ์:</span><br /><strong>{detail.product?.nameTh}</strong></div>
            <div><span className="text-gray-500">วงเงินขอ:</span><br /><strong>{parseFloat(detail.requestedAmount || 0).toLocaleString('th-TH')} บาท</strong></div>
            <div><span className="text-gray-500">สถานะ:</span><br /><span className="badge-pending">{detail.status}</span></div>
            <div><span className="text-gray-500">Level ปัจจุบัน:</span><br /><strong>L{detail.currentLevel}</strong></div>
            <div><span className="text-gray-500">SLA:</span><br /><strong>{detail.slaDeadline ? dayjs(detail.slaDeadline).format('DD/MM/YYYY HH:mm') : '-'}</strong></div>
          </div>

          {detail.workflows?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">ประวัติการดำเนินการ</h3>
              <div className="space-y-2">
                {detail.workflows.slice(0, 5).map((w: any) => (
                  <div key={w.id} className="flex items-start gap-3 text-xs bg-gray-50 rounded p-2">
                    <span className="text-gray-400 w-32 flex-shrink-0">{dayjs(w.createdAt).format('DD/MM/YY HH:mm')}</span>
                    <span className={clsx('font-medium',
                      w.action === 'APPROVE' ? 'text-green-600' :
                      w.action === 'REJECT' ? 'text-red-600' : 'text-yellow-600',
                    )}>{w.action}</span>
                    <span className="text-gray-600">{w.comment || w.reason || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t">
            {(['APPROVE', 'RETURN', 'REJECT'] as Action[]).map((action) => {
              const cfg = ACTION_CONFIG[action];
              return (
                <button key={action} onClick={() => openModal(detail, action)}
                  className={`flex items-center gap-2 px-4 py-2 text-white text-sm rounded-md font-medium ${cfg.color}`}>
                  <cfg.icon size={14} /> {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              {(() => {
                const cfg = ACTION_CONFIG[modal.action];
                return <cfg.icon size={20} className={
                  modal.action === 'APPROVE' ? 'text-green-600' :
                  modal.action === 'REJECT' ? 'text-red-600' : 'text-yellow-600'
                } />;
              })()}
              <h3 className="text-lg font-semibold text-gray-900">
                {ACTION_CONFIG[modal.action].label}: {modal.applicationNumber}
              </h3>
            </div>

            {modal.action === 'APPROVE' && (
              <div>
                <label className="label">วงเงินที่อนุมัติ (บาท)</label>
                <input type="number" className="input-field" value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)} />
              </div>
            )}

            {ACTION_CONFIG[modal.action].requireReason && (
              <div>
                <label className="label">เหตุผล <span className="text-red-500">*</span></label>
                <textarea className="input-field" rows={3} placeholder="ระบุเหตุผล..."
                  value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}

            {!ACTION_CONFIG[modal.action].requireReason && (
              <div>
                <label className="label">หมายเหตุ (ไม่บังคับ)</label>
                <textarea className="input-field" rows={2} placeholder="หมายเหตุเพิ่มเติม..."
                  value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">ยกเลิก</button>
              <button
                onClick={confirmAction}
                disabled={actionMutation.isPending}
                className={`flex-1 text-white font-medium py-2 px-4 rounded-md ${ACTION_CONFIG[modal.action].color}`}
              >
                {actionMutation.isPending ? 'กำลังดำเนินการ...' : `ยืนยัน${ACTION_CONFIG[modal.action].label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
