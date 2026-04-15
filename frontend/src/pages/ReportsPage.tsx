import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../services/api';
import { Download, BarChart3, AlertTriangle, Users } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [tab, setTab] = useState<'applications' | 'sla' | 'approver'>('applications');

  const { data: appReport = [], isLoading: appLoading, refetch: refetchApp } = useQuery({
    queryKey: ['report-apps', from, to],
    queryFn: () => reportsApi.getApplicationReport(from, to).then((r) => r.data),
    enabled: false,
  });

  const { data: slaReport = [], isLoading: slaLoading, refetch: refetchSla } = useQuery({
    queryKey: ['report-sla', from, to],
    queryFn: () => reportsApi.getSlaReport(from, to).then((r) => r.data),
    enabled: false,
  });

  const runReport = () => {
    if (tab === 'applications') refetchApp();
    if (tab === 'sla') refetchSla();
  };

  const handleExcelExport = async () => {
    try {
      const res = await reportsApi.exportExcel(from, to);
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LOS-Report-${from}-${to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ดาวน์โหลด Excel สำเร็จ');
    } catch {
      toast.error('ดาวน์โหลดไม่สำเร็จ');
    }
  };

  const tabs = [
    { id: 'applications', label: 'รายงานคำขอสินเชื่อ', icon: BarChart3 },
    { id: 'sla',          label: 'SLA Compliance',      icon: AlertTriangle },
    { id: 'approver',     label: 'ประสิทธิภาพผู้อนุมัติ', icon: Users },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายงาน</h1>
          <p className="text-sm text-gray-500 mt-1">ดูและส่งออกรายงานการดำเนินงาน</p>
        </div>
        <button onClick={handleExcelExport} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Export Excel
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">ตั้งแต่วันที่</label>
          <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">ถึงวันที่</label>
          <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={runReport} className="btn-primary">ดูรายงาน</button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Application Report */}
      {tab === 'applications' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['เลขที่คำขอ', 'ผลิตภัณฑ์', 'วงเงิน', 'สถานะ', 'Level', 'SLA เกิน', 'วันที่อนุมัติ'].map((h) => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">กำลังโหลด...</td></tr>
              ) : appReport.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">กด "ดูรายงาน" เพื่อโหลดข้อมูล</td></tr>
              ) : appReport.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs">{r.applicationNumber}</td>
                  <td className="table-cell text-xs">{r.product?.nameTh}</td>
                  <td className="table-cell">{parseFloat(r.requestedAmount || 0).toLocaleString()}</td>
                  <td className="table-cell"><span className="badge-pending text-xs">{r.status}</span></td>
                  <td className="table-cell">{r.currentLevel ? `L${r.currentLevel}` : '-'}</td>
                  <td className="table-cell">{r.slaBreached ? <span className="text-red-500 font-bold">ใช่</span> : 'ไม่'}</td>
                  <td className="table-cell text-xs text-gray-500">{r.approvedAt ? dayjs(r.approvedAt).format('DD/MM/YY') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {appReport.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500">
              ทั้งหมด {appReport.length.toLocaleString()} รายการ
            </div>
          )}
        </div>
      )}

      {/* SLA Report */}
      {tab === 'sla' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['เลขที่คำขอ', 'Level', 'SLA Deadline', 'SLA เกิน', 'สถานะ'].map((h) => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slaLoading ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">กำลังโหลด...</td></tr>
              ) : slaReport.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">กด "ดูรายงาน" เพื่อโหลดข้อมูล</td></tr>
              ) : slaReport.map((r: any) => (
                <tr key={r.applicationNumber} className={r.slaBreached ? 'bg-red-50' : ''}>
                  <td className="table-cell font-mono text-xs">{r.applicationNumber}</td>
                  <td className="table-cell">L{r.currentLevel}</td>
                  <td className="table-cell text-xs">{r.slaDeadline ? dayjs(r.slaDeadline).format('DD/MM/YY HH:mm') : '-'}</td>
                  <td className="table-cell">{r.slaBreached ? <span className="badge-rejected">เกิน SLA</span> : <span className="badge-approved">ในเวลา</span>}</td>
                  <td className="table-cell"><span className="badge-pending text-xs">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'approver' && (
        <div className="card flex items-center justify-center h-40 text-gray-400">
          <div className="text-center">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>เลือกช่วงวันที่แล้วกด "ดูรายงาน"</p>
          </div>
        </div>
      )}
    </div>
  );
}
