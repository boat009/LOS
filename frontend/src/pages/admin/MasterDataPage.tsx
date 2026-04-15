import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { masterApi } from '../../services/api';
import { ClipboardList, Package, HelpCircle, Search, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';

const tabs = [
  { id: 'products',    label: 'ผลิตภัณฑ์',    icon: Package },
  { id: 'questions',   label: 'คำถาม',         icon: HelpCircle },
  { id: 'blacklist',   label: 'บัญชีดำ',       icon: AlertCircle },
] as const;

type Tab = typeof tabs[number]['id'];

export default function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('products');

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => masterApi.listProducts().then(r => r.data), enabled: tab === 'products' });
  const { data: questions = [] } = useQuery({ queryKey: ['questions'], queryFn: () => masterApi.listQuestions().then(r => r.data), enabled: tab === 'questions' });
  const { data: blacklist = [] } = useQuery({ queryKey: ['blacklist'], queryFn: () => masterApi.listBlacklist().then(r => r.data), enabled: tab === 'blacklist' });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ClipboardList size={22} /> Master Data</h1>
        <p className="text-sm text-gray-500 mt-1">จัดการข้อมูลหลักของระบบ</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Products */}
      {tab === 'products' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              {['รหัส', 'ชื่อผลิตภัณฑ์', 'ประเภท', 'วงเงิน (บาท)', 'ดอกเบี้ย (%)', 'สถานะ'].map(h => <th key={h} className="table-header">{h}</th>)}
            </tr></thead>
            <tbody>
              {products.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">ยังไม่มีข้อมูล</td></tr>
              : products.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs">{p.productCode}</td>
                  <td className="table-cell font-medium">{p.nameTh}</td>
                  <td className="table-cell text-gray-500">{p.productType}</td>
                  <td className="table-cell">{parseFloat(p.minAmount||0).toLocaleString()} – {parseFloat(p.maxAmount||0).toLocaleString()}</td>
                  <td className="table-cell">{p.minInterestRate} – {p.maxInterestRate}</td>
                  <td className="table-cell">{p.status === 'ACTIVE' ? <span className="badge-approved">Active</span> : <span className="badge-draft">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Questions */}
      {tab === 'questions' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              {['รหัส', 'คำถาม (ไทย)', 'ประเภท', 'หมวดหมู่', 'บังคับ', 'Version', 'สถานะ'].map(h => <th key={h} className="table-header">{h}</th>)}
            </tr></thead>
            <tbody>
              {questions.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">ยังไม่มีข้อมูล</td></tr>
              : questions.map((q: any) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs">{q.questionCode}</td>
                  <td className="table-cell">{q.textTh}</td>
                  <td className="table-cell text-xs bg-blue-50 text-blue-700 px-2 rounded">{q.type}</td>
                  <td className="table-cell text-gray-500 text-xs">{q.category?.nameTh || '-'}</td>
                  <td className="table-cell">{q.isRequired ? '✅' : '—'}</td>
                  <td className="table-cell text-xs">v{q.version}</td>
                  <td className="table-cell">{q.isActive ? <span className="badge-approved">Active</span> : <span className="badge-draft">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Blacklist */}
      {tab === 'blacklist' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              {['ประเภท', 'ค่า (Masked)', 'เหตุผล', 'แหล่งข้อมูล', 'วันที่มีผล', 'สถานะ'].map(h => <th key={h} className="table-header">{h}</th>)}
            </tr></thead>
            <tbody>
              {blacklist.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">ไม่มีข้อมูลในบัญชีดำ</td></tr>
              : blacklist.map((b: any) => (
                <tr key={b.id} className="hover:bg-red-50">
                  <td className="table-cell"><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{b.type}</span></td>
                  <td className="table-cell font-mono text-xs">{b.valueMasked}</td>
                  <td className="table-cell">{b.reason}</td>
                  <td className="table-cell text-gray-500 text-xs">{b.source || '-'}</td>
                  <td className="table-cell text-xs">{dayjs(b.effectiveFrom).format('DD/MM/YYYY')}</td>
                  <td className="table-cell">{b.isActive ? <span className="badge-rejected">Active</span> : <span className="badge-draft">Removed</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
