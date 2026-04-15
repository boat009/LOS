import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { workflowApi } from '../services/api';
import { Plus, Search, Eye, Filter } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT:        { label: 'Draft',           cls: 'badge-draft' },
  SUBMITTED:    { label: 'รอตรวจสอบ',      cls: 'badge-pending' },
  PENDING_L1:   { label: 'รออนุมัติ L1',   cls: 'badge-pending' },
  PENDING_L2:   { label: 'รออนุมัติ L2',   cls: 'badge-pending' },
  PENDING_L3:   { label: 'รออนุมัติ L3',   cls: 'badge-pending' },
  PENDING_L4:   { label: 'รออนุมัติ L4',   cls: 'badge-pending' },
  PENDING_L5:   { label: 'รออนุมัติ L5',   cls: 'badge-pending' },
  PENDING_L6:   { label: 'รออนุมัติ L6',   cls: 'badge-pending' },
  PENDING_L7:   { label: 'รออนุมัติ L7',   cls: 'badge-pending' },
  RETURNED:     { label: 'ส่งคืน',          cls: 'badge-returned' },
  RESUBMITTED:  { label: 'ส่งใหม่',        cls: 'badge-pending' },
  APPROVED:     { label: 'อนุมัติแล้ว',    cls: 'badge-approved' },
  REJECTED:     { label: 'ปฏิเสธ',         cls: 'badge-rejected' },
  EXPIRED:      { label: 'หมดอายุ',        cls: 'badge-draft' },
  AUTO_REJECTED:{ label: 'Auto ปฏิเสธ',   cls: 'badge-rejected' },
};

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // For approvers — show their queue; for sale — show their own apps
  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['approval-queue'],
    queryFn: () => workflowApi.getQueue().then((r) => r.data),
  });

  const filtered = queue.filter((app: any) =>
    !search ||
    app.applicationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    app.customer?.nameTh?.includes(search),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">คำขอสินเชื่อ</h1>
          <p className="text-sm text-gray-500 mt-1">รายการคำขอสินเชื่อทั้งหมด</p>
        </div>
        <button onClick={() => navigate('/applications/new')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> สร้างคำขอใหม่
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="ค้นหาเลขที่คำขอ, ชื่อลูกค้า..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter size={14} /> กรอง
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['เลขที่คำขอ', 'ลูกค้า', 'ผลิตภัณฑ์', 'วงเงิน (บาท)', 'Level', 'สถานะ', 'SLA', 'วันที่สร้าง', ''].map((h) => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">กำลังโหลด...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">ไม่พบข้อมูล</td></tr>
              ) : (
                filtered.map((app: any) => {
                  const statusInfo = STATUS_LABEL[app.status] || { label: app.status, cls: 'badge-draft' };
                  const slaBreached = app.slaDeadline && dayjs().isAfter(dayjs(app.slaDeadline));
                  return (
                    <tr key={app.id} className="hover:bg-blue-50 transition-colors">
                      <td className="table-cell font-mono text-primary-600 font-medium">
                        {app.applicationNumber}
                      </td>
                      <td className="table-cell">{app.customer?.nameTh || '-'}</td>
                      <td className="table-cell">{app.product?.nameTh || '-'}</td>
                      <td className="table-cell font-medium">
                        {parseFloat(app.requestedAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell">
                        {app.currentLevel ? <span className="font-semibold">L{app.currentLevel}</span> : '-'}
                      </td>
                      <td className="table-cell">
                        <span className={statusInfo.cls}>{statusInfo.label}</span>
                      </td>
                      <td className="table-cell">
                        {app.slaDeadline ? (
                          <span className={clsx('text-xs', slaBreached ? 'text-red-600 font-semibold' : 'text-gray-500')}>
                            {slaBreached ? '⚠️ เกิน SLA' : dayjs(app.slaDeadline).format('DD/MM HH:mm')}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="table-cell text-gray-500">
                        {dayjs(app.createdAt).format('DD/MM/YYYY HH:mm')}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => navigate(`/applications/${app.id}`)}
                          className="p-1.5 text-primary-500 hover:bg-primary-50 rounded"
                          title="ดูรายละเอียด"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
