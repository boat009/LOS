import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { masterApi, integrationApi } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, UserCheck, AlertTriangle } from 'lucide-react';

const schema = z.object({
  nationalId: z.string().length(13, 'เลขบัตรประชาชนต้องมี 13 หลัก').regex(/^\d+$/, 'ต้องเป็นตัวเลขเท่านั้น'),
  nameTh: z.string().min(2, 'กรุณาระบุชื่อ-นามสกุล'),
  nameEn: z.string().optional(),
  phone: z.string().min(9, 'หมายเลขโทรศัพท์ไม่ถูกต้อง').optional().or(z.literal('')),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  idExpiryDate: z.string().min(1, 'กรุณาระบุวันหมดอายุบัตรประชาชน'),
  address: z.string().optional(),
  employmentType: z.string().optional(),
  employerName: z.string().optional(),
  monthlyIncome: z.number().positive().optional(),
  productId: z.string().uuid('กรุณาเลือกผลิตภัณฑ์'),
  requestedAmount: z.number().positive('วงเงินต้องมากกว่า 0'),
  pdpaConsent: z.boolean().refine((v) => v, 'กรุณายินยอมการเก็บข้อมูล'),
});

type FormData = z.infer<typeof schema>;

export default function NewApplicationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => masterApi.listProducts().then((r) => r.data),
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pdpaConsent: false },
  });

  const selectedProductId = watch('productId');
  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await integrationApi.createApplication({
        ...data,
        monthlyIncome: data.monthlyIncome ? Number(data.monthlyIncome) : undefined,
        requestedAmount: Number(data.requestedAmount),
      });
      setResult(res.data);
      if (res.data.status === 'CREATED') {
        toast.success(`สร้างคำขอสำเร็จ: ${res.data.applicationNumber}`);
      } else if (res.data.status === 'DUPLICATE') {
        toast('พบคำขอที่มีอยู่แล้ว', { icon: '⚠️' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="card text-center">
          {result.status === 'CREATED' ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="text-green-600" size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">สร้างคำขอสำเร็จ</h2>
              <p className="text-gray-500 mt-2">เลขที่คำขอ</p>
              <p className="text-2xl font-mono font-bold text-primary-600 mt-1">{result.applicationNumber}</p>
              {result.blacklistMatched && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2 text-left">
                  <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">พบข้อมูลในบัญชีดำ — ผู้อนุมัติจะได้รับแจ้งเตือน</p>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => navigate(`/applications/${result.applicationId}/questionnaire`)}
                  className="btn-primary flex-1"
                >
                  กรอกแบบสอบถาม
                </button>
                <button onClick={() => navigate('/applications')} className="btn-secondary flex-1">
                  ดูรายการทั้งหมด
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-yellow-600" size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">พบคำขอที่มีอยู่แล้ว</h2>
              <p className="text-gray-500 mt-2">เลขที่คำขอเดิม: <span className="font-mono font-bold">{result.applicationNumber}</span></p>
              <div className="mt-6">
                <button onClick={() => navigate(`/applications/${result.applicationId}`)} className="btn-primary w-full">
                  ดูคำขอที่มีอยู่
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สร้างคำขอสินเชื่อใหม่</h1>
          <p className="text-sm text-gray-500 mt-0.5">กรอกข้อมูลลูกค้าจากระบบ Sale</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Customer Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 text-base border-b border-gray-100 pb-2">ข้อมูลลูกค้า</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">เลขบัตรประชาชน <span className="text-red-500">*</span></label>
              <input {...register('nationalId')} className="input-field font-mono" placeholder="1234567890121" maxLength={13} />
              {errors.nationalId && <p className="text-red-500 text-xs mt-1">{errors.nationalId.message}</p>}
            </div>

            <div>
              <label className="label">ชื่อ-นามสกุล (ไทย) <span className="text-red-500">*</span></label>
              <input {...register('nameTh')} className="input-field" placeholder="นายสมชาย ใจดี" />
              {errors.nameTh && <p className="text-red-500 text-xs mt-1">{errors.nameTh.message}</p>}
            </div>

            <div>
              <label className="label">ชื่อ-นามสกุล (อังกฤษ)</label>
              <input {...register('nameEn')} className="input-field" placeholder="Mr. Somchai Jaidee" />
            </div>

            <div>
              <label className="label">วันหมดอายุบัตรประชาชน <span className="text-red-500">*</span></label>
              <input {...register('idExpiryDate')} type="date" className="input-field" />
              {errors.idExpiryDate && <p className="text-red-500 text-xs mt-1">{errors.idExpiryDate.message}</p>}
            </div>

            <div>
              <label className="label">วันเดือนปีเกิด</label>
              <input {...register('dateOfBirth')} type="date" className="input-field" />
            </div>

            <div>
              <label className="label">เบอร์โทรศัพท์</label>
              <input {...register('phone')} className="input-field" placeholder="0812345678" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="label">อีเมล</label>
              <input {...register('email')} type="email" className="input-field" placeholder="email@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="label">ที่อยู่</label>
              <textarea {...register('address')} className="input-field" rows={2} placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด" />
            </div>
          </div>
        </div>

        {/* Employment Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 text-base border-b border-gray-100 pb-2">ข้อมูลการทำงาน</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">ประเภทการจ้างงาน</label>
              <select {...register('employmentType')} className="input-field">
                <option value="">-- เลือก --</option>
                <option value="EMPLOYEE">พนักงานประจำ</option>
                <option value="SELF_EMPLOYED">ประกอบอาชีพอิสระ</option>
                <option value="GOVERNMENT">ข้าราชการ/รัฐวิสาหกิจ</option>
                <option value="BUSINESS_OWNER">เจ้าของกิจการ</option>
              </select>
            </div>

            <div>
              <label className="label">ชื่อบริษัท/นายจ้าง</label>
              <input {...register('employerName')} className="input-field" placeholder="บริษัท ABC จำกัด" />
            </div>

            <div>
              <label className="label">รายได้ต่อเดือน (บาท)</label>
              <input {...register('monthlyIncome', { valueAsNumber: true })} type="number" className="input-field" placeholder="30000" />
            </div>
          </div>
        </div>

        {/* Loan Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 text-base border-b border-gray-100 pb-2">ข้อมูลสินเชื่อ</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">ผลิตภัณฑ์สินเชื่อ <span className="text-red-500">*</span></label>
              <select {...register('productId')} className="input-field">
                <option value="">-- เลือกผลิตภัณฑ์ --</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.nameTh} ({p.productCode})</option>
                ))}
              </select>
              {errors.productId && <p className="text-red-500 text-xs mt-1">{errors.productId.message}</p>}
            </div>

            {selectedProduct && (
              <div className="col-span-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                วงเงิน: {parseFloat(selectedProduct.minAmount).toLocaleString()} – {parseFloat(selectedProduct.maxAmount).toLocaleString()} บาท
              </div>
            )}

            <div className="col-span-2">
              <label className="label">วงเงินที่ขอ (บาท) <span className="text-red-500">*</span></label>
              <input {...register('requestedAmount', { valueAsNumber: true })} type="number" className="input-field" placeholder="100000" />
              {errors.requestedAmount && <p className="text-red-500 text-xs mt-1">{errors.requestedAmount.message}</p>}
            </div>
          </div>
        </div>

        {/* PDPA Consent */}
        <div className="card">
          <label className="flex items-start gap-3 cursor-pointer">
            <input {...register('pdpaConsent')} type="checkbox" className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500" />
            <span className="text-sm text-gray-700">
              ข้าพเจ้ายินยอมให้บริษัทเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล เพื่อวัตถุประสงค์ในการพิจารณาสินเชื่อ
              ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
            </span>
          </label>
          {errors.pdpaConsent && <p className="text-red-500 text-xs mt-2">{errors.pdpaConsent.message}</p>}
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary px-6">ยกเลิก</button>
          <button type="submit" disabled={loading} className="btn-primary px-8">
            {loading ? 'กำลังบันทึก...' : 'สร้างคำขอสินเชื่อ'}
          </button>
        </div>
      </form>
    </div>
  );
}
