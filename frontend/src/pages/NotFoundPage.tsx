import { useNavigate } from 'react-router-dom';
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-8xl font-bold text-primary-200">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">ไม่พบหน้านี้</h1>
        <p className="text-gray-500 mt-2">หน้าที่คุณค้นหาไม่มีอยู่ในระบบ</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary mt-6">กลับหน้าหลัก</button>
      </div>
    </div>
  );
}
