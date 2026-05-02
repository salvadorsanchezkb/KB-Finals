import type { CoachingResult } from '../types';
import { Lightbulb, AlertTriangle, MessageSquare, CheckCircle2, Copy } from 'lucide-react';
import { useState } from 'react';

export default function CoachingCard({ result }: { result: CoachingResult }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 px-6 py-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-300" />
          AI 코칭 결과
        </h2>
      </div>
      
      <div className="p-6 md:p-8 space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-indigo-600 flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="w-4 h-4" /> 상황 분석
          </h3>
          <p className="text-slate-700 bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl leading-relaxed text-sm">
            {result.analysis}
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          <section>
            <h3 className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 mb-4">
              <CheckCircle2 className="w-4 h-4" /> 행동 지침
            </h3>
            <ul className="space-y-3">
              {result.guidelines.map((g, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="bg-emerald-100 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i+1}</span>
                  <span className="leading-relaxed">{g}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-rose-500 flex items-center gap-1.5 mb-4">
              <AlertTriangle className="w-4 h-4" /> 주의사항
            </h3>
            <ul className="space-y-3">
              {result.cautions.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="bg-rose-100 text-rose-600 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i+1}</span>
                  <span className="leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="border-t border-slate-100 pt-8">
          <h3 className="text-sm font-semibold text-blue-600 flex items-center gap-1.5 mb-4">
            <MessageSquare className="w-4 h-4" /> 추천 응답 메시지
          </h3>
          <div className="flex flex-col gap-3">
            {result.recommendations.map((msg, i) => (
              <div key={i} className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl relative group hover:bg-blue-50 transition-colors">
                <p className="text-slate-800 text-sm whitespace-pre-wrap pr-10 leading-relaxed">{msg}</p>
                <button 
                  onClick={() => handleCopy(msg, i)}
                  className="absolute right-3 top-3 p-2 text-blue-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="복사하기"
                >
                  {copiedIndex === i ? (
                    <span className="text-xs font-medium text-blue-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> 복사됨</span>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
