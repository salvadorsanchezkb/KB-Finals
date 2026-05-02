import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'main' | 'history';
  setActiveTab: (tab: 'main' | 'history') => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f7ff] font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-12">
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200/50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4c5df0] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-slate-800 leading-none">CoachTalk</h1>
              <span className="text-[11px] text-slate-400 mt-1 font-medium">AI 기반 초개인화 소통 코치</span>
            </div>
          </div>
          <nav className="flex items-center gap-2 bg-[#f4f7ff] p-1 rounded-lg border border-slate-200/60">
            <button
              onClick={() => setActiveTab('main')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === 'main' ? 'bg-white text-[#4c5df0] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              코칭 받기
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === 'history' ? 'bg-white text-[#4c5df0] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              내역 조회
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 relative">
        {children}
      </main>
    </div>
  );
}
