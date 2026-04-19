import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { workflowApi } from '../services/api';
import { Plus, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT:         { label: 'Draft',           cls: 'badge-draft' },
  SUBMITTED:     { label: 'รอตรวจสอบ',      cls: 'badge-pending' },
  PENDING_L1:    { label: 'รออนุมัติ L1',   cls: 'badge-pending' },
  PENDING_L2:    { label: 'รออนุมัติ L2',   cls: 'badge-pending' },
  PENDING_L3:    { label: 'รออนุมัติ L3',   cls: 'badge-pending' },
  PENDING_L4:    { label: 'รออนุมัติ L4',   cls: 'badge-pending' },
  PENDING_L5:    { label: 'รออนุมัติ L5',   cls: 'badge-pending' },
  PENDING_L6:    { label: 'รออนุมัติ L6',   cls: 'badge-pending' },
  PENDING_L7:    { label: 'รออนุมัติ L7',   cls: 'badge-pending' },
  RETURNED:      { label: 'ส่งคืน',          cls: 'badge-returned' },
  RESUBMITTED:   { label: 'ส่งใหม่',        cls: 'badge-pending' },
  APPROVED:      { label: 'อนุมัติแล้ว',    cls: 'badge-approved' },
  REJECTED:      { label: 'ปฏิเสธ',         cls: 'badge-rejected' },
  EXPIRED:       { label: 'หมดอายุ',        cls: 'badge-draft' },
  AUTO_REJECTED: { label: 'Auto ปฏิเสธ',   cls: 'badge-rejected' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_L1', label: 'รออนุมัติ L1' },
  { value: 'PENDING_L2', label: 'รออนุมัติ L2' },
  { value: 'PENDING_L3', label: 'รออนุมัติ L3' },
  { value: 'PENDING_L4', label: 'รออนุมัติ L4' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'REJECTED', label: 'ปฏิเสธ' },
  { value: 'RETURNED', label: 'ส่งคืน' },
];

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery<{ items: any[]; total: number; page: number; limit: number }>({
    queryKey: ['applications', page, search, statusFilter],
    queryFn: () =>
      workflowApi.listApplications({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
      }).then((r) => r.data),
  } as any);

  const items: any[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">คำขอสินเชื่อ</h1>
          <p className="text-sm text-gray-500 mt-1">
            รายการคำขอสินเชื่อทั้งหมด
            {total > 0 && <span className="ml-2 font-medium text-gray-700">({total.toLocaleString()} รายการ)</span>}
          </p>
        </div>
        <button onClick={() => navigate('/applications/new')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> สร้างคำขอใหม่
        </button>
      </div>

      {/* Search & Filter */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="ค้นหาเลขที่คำขอ, ชื่อลูกค้า..."
              className="input-field pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            className="input-field w-44"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="btn-primary px-4" onClick={handleSearch}>ค้นหา</button>
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
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">ไม่พบข้อมูล</td></tr>
              ) : (
                items.map((app: any) => {
                  const statusInfo = STATUS_LABEL[app.status] || { label: app.status, cls: 'badge-draft' };
                  const slaBreached = app.slaDeadline && dayjs().isAfter(dayjs(app.slaDeadline));
                  return (
                    <tr key={app.id} className="hover:bg-blue-50 transition-colors">
                      <td className="table-cell font-mono text-primary-600 font-medium">
                        {app.applicationNumber}
                      </td>
                      <td className="table-cell">{app.customer?.nameTh || '-'}</td>
                      <td className="table-cell">
                        <span className="text-sm">{app.product?.nameTh || '-'}</span>
                        {app.product?.productCode && (
                          <span className="ml-1 text-xs text-gray-400">({app.product.productCode})</span>
                        )}
                      </td>
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
                      <td className="table-cell text-gray-500 text-sm">
                        {dayjs(app.createdAt).format('DD/MM/YY HH:mm')}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              แสดง {(page - 1) * limit + 1}–{Math.min(page * limit, total)} จาก {total.toLocaleString()} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-gray-700">หน้า {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
