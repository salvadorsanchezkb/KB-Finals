import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CoachingLog } from '../types';
import { Download, Loader2 } from 'lucide-react';
import Papa from 'papaparse';

export default function DashboardTable() {
  const [logs, setLogs] = useState<CoachingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('coaching_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLogs(data as CoachingLog[]);
      setFetchError(null);
    } catch (err: any) {
      console.error("Failed to fetch logs:", err);
      setFetchError(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const csvData = logs.map(log => ({
      날짜: new Date(log.created_at).toLocaleString(),
      상황: log.situation,
      분석: log.result.analysis,
      행동지침: log.result.guidelines.join(' / '),
      추천메시지: log.result.recommendations.join(' / ')
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Korean
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `coachtalk_history_${new Date().getTime()}.csv`;
    link.click();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-semibold text-slate-800">과거 코칭 내역</h2>
        <button 
          onClick={downloadCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50 shadow-sm"
        >
          <Download className="w-4 h-4" /> CSV 다운로드
        </button>
      </div>
      
      {!supabase && (
        <div className="p-8 text-center text-rose-500 bg-rose-50/50 text-sm">
          환경변수 VITE_SUPABASE_URL이 설정되지 않아 데이터베이스에 접근할 수 없습니다.
        </div>
      )}

      {fetchError && (
        <div className="p-8 text-center text-rose-500 bg-rose-50/50 text-sm">
          오류 발생: {fetchError}
        </div>
      )}

      {supabase && !fetchError && logs.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          저장된 코칭 내역이 없습니다. 아직 AI 코칭을 한 번도 받지 않으셨나요?
        </div>
      ) : !fetchError && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">날짜</th>
                <th className="px-6 py-4">상황</th>
                <th className="px-6 py-4">AI 분석</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-slate-800 max-w-xs truncate font-medium">
                    {log.situation}
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-md truncate">
                    {log.result.analysis}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
