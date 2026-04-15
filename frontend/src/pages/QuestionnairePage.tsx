import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { questionnaireApi, workflowApi } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Send, ChevronRight, ChevronLeft } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';

interface Answer { questionId: string; value: any; fileUrls?: string[] }

export default function QuestionnairePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const QUESTIONS_PER_PAGE = 5;

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: () => questionnaireApi.getForm(id!).then((r) => r.data),
    enabled: !!id,
  });

  // Pre-fill draft answers
  useEffect(() => {
    if (!form) return;
    const pre: Record<string, any> = {};
    form.questions?.forEach((q: any) => {
      if (q.draftAnswer !== undefined && q.draftAnswer !== null) pre[q.id] = q.draftAnswer;
    });
    setAnswers(pre);
  }, [form]);

  const questions: any[] = form?.questions || [];

  // Evaluate conditional logic
  const visibleQuestions = questions.filter((q) => {
    if (!q.conditionalLogic) return true;
    const { showIf } = q.conditionalLogic;
    if (!showIf) return true;
    const { questionId, value } = showIf;
    return answers[questionId] === value;
  });

  const pages = [];
  for (let i = 0; i < visibleQuestions.length; i += QUESTIONS_PER_PAGE) {
    pages.push(visibleQuestions.slice(i, i + QUESTIONS_PER_PAGE));
  }
  const currentQuestions = pages[currentPage] || [];
  const totalPages = pages.length || 1;
  const progress = ((currentPage + 1) / totalPages) * 100;

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const answersList: Answer[] = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
      await questionnaireApi.saveDraft(id!, answersList);
      toast.success('บันทึก Draft แล้ว');
    } catch {
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required questions
    const missing = visibleQuestions.filter((q) => q.isRequired && !answers[q.id] && answers[q.id] !== 0);
    if (missing.length > 0) {
      toast.error(`กรุณากรอกข้อมูลให้ครบ (${missing.length} คำถามที่ยังไม่กรอก)`);
      return;
    }

    setSubmitting(true);
    try {
      const answersList: Answer[] = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
      await questionnaireApi.saveAnswers(id!, answersList);
      await workflowApi.submitApplication(id!);
      toast.success('ส่งคำขอสินเชื่อสำเร็จ!');
      navigate(`/applications/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">แบบสอบถามประเมินสินเชื่อ</h1>
          <p className="text-sm text-gray-500">{form?.applicationNumber} · {form?.formName}</p>
        </div>
      </div>

      {/* Customer info bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm flex justify-between">
        <span className="text-blue-800 font-medium">{form?.customer?.nameTh}</span>
        <span className="text-blue-600">บัตรประชาชน: {form?.customer?.nationalIdMasked}</span>
        {form?.draftExpiresAt && (
          <span className="text-orange-600">Draft หมดอายุ: {dayjs(form.draftExpiresAt).format('DD/MM HH:mm')}</span>
        )}
      </div>

      {/* Progress */}
      <div className="card p-4">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>หน้า {currentPage + 1} จาก {totalPages}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-primary-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Questions */}
      <div className="card space-y-6">
        {currentQuestions.map((q: any, idx: number) => (
          <div key={q.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">
              <span className="text-gray-400 mr-2">{currentPage * QUESTIONS_PER_PAGE + idx + 1}.</span>
              {q.textTh}
              {q.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {q.helpText && <p className="text-xs text-gray-500">{q.helpText}</p>}

            {q.type === 'SINGLE_CHOICE' && (
              <div className="space-y-2">
                {q.options?.map((opt: any) => (
                  <label key={opt.id} className={clsx(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    answers[q.id] === opt.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300',
                  )}>
                    <input type="radio" name={q.id} value={opt.value}
                      checked={answers[q.id] === opt.value}
                      onChange={() => handleAnswer(q.id, opt.value)}
                      className="text-primary-500" />
                    <span className="text-sm">{opt.textTh}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {q.options?.map((opt: any) => {
                  const selected: string[] = answers[q.id] || [];
                  const isChecked = selected.includes(opt.value);
                  return (
                    <label key={opt.id} className={clsx(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer',
                      isChecked ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300',
                    )}>
                      <input type="checkbox" value={opt.value} checked={isChecked}
                        onChange={(e) => {
                          const cur: string[] = answers[q.id] || [];
                          handleAnswer(q.id, e.target.checked ? [...cur, opt.value] : cur.filter((v) => v !== opt.value));
                        }}
                        className="text-primary-500" />
                      <span className="text-sm">{opt.textTh}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'TEXT' && (
              <input
                type="text"
                className="input-field"
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                placeholder={q.validationRules?.placeholder || ''}
              />
            )}

            {q.type === 'NUMBER' && (
              <input
                type="number"
                className="input-field"
                value={answers[q.id] ?? ''}
                onChange={(e) => handleAnswer(q.id, parseFloat(e.target.value))}
                min={q.validationRules?.min}
                max={q.validationRules?.max}
                placeholder="0"
              />
            )}

            {q.type === 'DATE' && (
              <input
                type="date"
                className="input-field"
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
              />
            )}

            {q.type === 'FILE_UPLOAD' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500 hover:border-primary-400 cursor-pointer">
                <p>คลิกหรือลากไฟล์มาวาง (PDF, JPG, PNG · ไม่เกิน 10 MB)</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleAnswer(q.id, e.target.files[0].name);
                  }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="btn-secondary flex items-center gap-2"
        >
          <ChevronLeft size={16} /> ก่อนหน้า
        </button>

        <button onClick={handleSaveDraft} disabled={saving} className="btn-secondary flex items-center gap-2">
          <Save size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึก Draft'}
        </button>

        {currentPage < totalPages - 1 ? (
          <button onClick={() => setCurrentPage((p) => p + 1)} className="btn-primary flex items-center gap-2">
            ถัดไป <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <Send size={14} /> {submitting ? 'กำลังส่ง...' : 'ส่งคำขอสินเชื่อ'}
          </button>
        )}
      </div>
    </div>
  );
}
