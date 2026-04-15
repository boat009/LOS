import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workflowApi } from '../services/api';
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Draft',           color: 'badge-draft' },
  SUBMITTED: { label: 'รอตรวจสอบ',      color: 'badge-pending' },
  APPROVED:  { label: 'อนุมัติแล้ว ✅',  color: 'badge-approved' },
  REJECTED:  { label: 'ปฏิเสธ ❌',      color: 'badge-rejected' },
  RETURNED:  { label: 'ส่งคืน ↩️',      color: 'badge-returned' },
  EXPIRED:   { label: 'หมดอายุ',        color: 'badge-draft' },
  AUTO_REJECTED: { label: 'Auto ปฏิเสธ', color: 'badge-rejected' },
};

const ACTION_ICON: Record<string, any> = {
  APPROVE: <CheckCircle size={14} className="text-green-500" />,
  REJECT:  <XCircle size={14} className="text-red-500" />,
  RETURN:  <RotateCcw size={14} className="text-yellow-500" />,
  AUTO_REJECT: <XCircle size={14} className="text-red-400" />,
};

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: app, isLoading } = useQuery({
    queryKey: ['app-detail', id],
    queryFn: () => workflowApi.getApplicationDetail(id!).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  if (!app) return <div className="text-center py-12 text-gray-400">ไม่พบข้อมูล</div>;

  const statusInfo = STATUS_LABEL[app.status] || { label: app.status, color: 'badge-draft' };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{app.applicationNumber}</h1>
            <span className={statusInfo.color}>{statusInfo.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">สร้างเมื่อ {dayjs(app.createdAt).format('DD MMMM YYYY HH:mm น.')}</p>
        </div>
        {app.status === 'DRAFT' && (
          <button onClick={() => navigate(`/applications/${id}/questionnaire`)} className="btn-primary flex items-center gap-2">
            <FileText size={14} /> กรอกแบบสอบถาม
          </button>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Customer */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">ข้อมูลลูกค้า</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">ชื่อ-นามสกุล</dt><dd className="font-medium">{app.customer?.nameTh || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">บัตรประชาชน</dt><dd className="font-mono">X-XXXX-XXXXX-XX-X</dd></div>
          </dl>
        </div>

        {/* Loan Info */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">ข้อมูลสินเชื่อ</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">ผลิตภัณฑ์</dt><dd className="font-medium">{app.product?.nameTh || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">วงเงินขอ</dt><dd className="font-bold text-primary-600">{parseFloat(app.requestedAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</dd></div>
            {app.approvedAmount && <div className="flex justify-between"><dt className="text-gray-500">วงเงินอนุมัติ</dt><dd className="font-bold text-green-600">{parseFloat(app.approvedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</dd></div>}
            <div className="flex justify-between"><dt className="text-gray-500">Level ปัจจุบัน</dt><dd>{app.currentLevel ? `Level ${app.currentLevel}` : '-'}</dd></div>
          </dl>
        </div>
      </div>

      {/* SLA / Timeline */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</h2>
        <div className="grid grid-cols-4 gap-3 text-sm text-center">
          {[
            { label: 'สร้าง', date: app.createdAt, icon: <FileText size={16} /> },
            { label: 'ส่งคำขอ', date: app.submittedAt, icon: <Clock size={16} /> },
            { label: 'อนุมัติ', date: app.approvedAt, icon: <CheckCircle size={16} className="text-green-500" /> },
            { label: 'ปฏิเสธ', date: app.rejectedAt, icon: <XCircle size={16} className="text-red-500" /> },
          ].map((item) => (
            <div key={item.label} className={clsx('p-3 rounded-lg', item.date ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200')}>
              <div className="flex justify-center mb-1 text-gray-400">{item.icon}</div>
              <div className="font-medium text-xs text-gray-700">{item.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.date ? dayjs(item.date).format('DD/MM/YY HH:mm') : '-'}</div>
            </div>
          ))}
        </div>

        {app.rejectionReason && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">
            <strong>เหตุผลปฏิเสธ:</strong> {app.rejectionReason}
          </div>
        )}
        {app.returnReason && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
            <strong>เหตุผลส่งคืน:</strong> {app.returnReason}
          </div>
        )}
      </div>

      {/* Workflow History */}
      {app.workflows?.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">ประวัติการดำเนินการ</h2>
          <div className="space-y-3">
            {app.workflows.map((w: any, idx: number) => (
              <div key={w.id} className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 mt-0.5">{ACTION_ICON[w.action] || <Clock size={14} className="text-gray-400" />}</div>
                <div className="flex-1 border-b border-gray-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      {w.action} · Level {w.level}
                      {w.isDelegated && <span className="text-xs text-blue-500 ml-1">(ผู้รับมอบหมาย)</span>}
                    </span>
                    <span className="text-xs text-gray-400">{dayjs(w.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    <span className="font-mono">{w.fromStatus}</span> → <span className="font-mono">{w.toStatus}</span>
                  </div>
                  {(w.comment || w.reason) && (
                    <p className="text-xs text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded">{w.comment || w.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answers */}
      {app.answers?.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">คำตอบแบบสอบถาม ({app.answers.length} ข้อ)</h2>
          <div className="space-y-2">
            {app.answers.map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-600 w-2/3">{a.question?.textTh || `คำถาม ${a.questionId.slice(0, 8)}`}</span>
                <span className="font-medium text-gray-800 text-right">{JSON.stringify(a.answerValue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
