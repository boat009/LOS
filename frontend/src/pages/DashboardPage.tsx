import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  TrendingUp, Users, RefreshCw,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
dayjs.locale('th');

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af', SUBMITTED: '#60a5fa', PENDING_L1: '#fbbf24', PENDING_L2: '#f97316',
  PENDING_L3: '#ef4444', PENDING_L4: '#dc2626', PENDING_L5: '#b91c1c',
  PENDING_L6: '#991b1b', PENDING_L7: '#7f1d1d',
  APPROVED: '#22c55e', REJECTED: '#ef4444', RETURNED: '#f59e0b',
  EXPIRED: '#9ca3af', AUTO_REJECTED: '#dc2626',
};

const LEVEL_COLORS = ['#60a5fa', '#fbbf24', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d'];

function StatCard({
  label, value, icon: Icon, color, sub,
}: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.getDashboard().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const statusSummary: { status: string; count: string }[] = data?.statusSummary || [];
  const levelQueues: { level: number; count: string; totalAmount: string }[] = data?.levelQueues || [];

  const totalPending = statusSummary
    .filter((s) => s.status.startsWith('PENDING_L'))
    .reduce((sum, s) => sum + parseInt(s.count), 0);

  const totalApproved = parseInt(statusSummary.find((s) => s.status === 'APPROVED')?.count || '0');
  const totalRejected = parseInt(statusSummary.find((s) => s.status === 'REJECTED')?.count || '0');

  const pieData = statusSummary
    .filter((s) => parseInt(s.count) > 0)
    .map((s) => ({ name: s.status, value: parseInt(s.count), fill: STATUS_COLORS[s.status] || '#9ca3af' }));

  const barData = levelQueues.map((l) => ({
    name: `Level ${l.level}`,
    count: parseInt(l.count),
    amount: Math.round(parseFloat(l.totalAmount || '0') / 1_000_000),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            ข้อมูล ณ {dayjs().format('DD MMMM BBBB HH:mm น.')}
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> รีเฟรช
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="รอการอนุมัติ" value={totalPending} icon={Clock} color="bg-yellow-500"
          sub={data?.slaBreachedCount ? `SLA เกิน: ${data.slaBreachedCount} รายการ` : undefined} />
        <StatCard label="อนุมัติแล้ว (ทั้งหมด)" value={totalApproved.toLocaleString()} icon={CheckCircle} color="bg-green-500"
          sub={`วันนี้: ${data?.today?.approved || 0} รายการ`} />
        <StatCard label="ปฏิเสธแล้ว (ทั้งหมด)" value={totalRejected.toLocaleString()} icon={XCircle} color="bg-red-500"
          sub={`วันนี้: ${data?.today?.rejected || 0} รายการ`} />
        <StatCard label="SLA เกินกำหนด" value={data?.slaBreachedCount || 0} icon={AlertTriangle}
          color={data?.slaBreachedCount > 0 ? 'bg-red-600' : 'bg-gray-400'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval Queue by Level */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={16} /> คิวอนุมัติแยกตาม Level
          </h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [v, 'จำนวน']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => <Cell key={i} fill={LEVEL_COLORS[i % LEVEL_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">ไม่มีคิวที่รอดำเนินการ</div>
          )}
        </div>

        {/* Status Pie */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> สัดส่วนสถานะคำขอสินเชื่อ
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [v, name]} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">ยังไม่มีข้อมูล</div>
          )}
        </div>
      </div>

      {/* Level Queue Table */}
      {levelQueues.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">รายละเอียดคิวอนุมัติ</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Level', 'Role', 'จำนวน (รายการ)', 'วงเงินรวม (บาท)'].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {levelQueues.map((l) => (
                  <tr key={l.level} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">Level {l.level}</td>
                    <td className="table-cell">
                      {['Credit Officer', 'Senior Credit Officer', 'Credit Supervisor',
                        'Credit Manager', 'Credit Director', 'VP Credit', 'Credit Committee'][l.level - 1]}
                    </td>
                    <td className="table-cell font-semibold text-yellow-700">{parseInt(l.count).toLocaleString()}</td>
                    <td className="table-cell">{parseFloat(l.totalAmount || '0').toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
