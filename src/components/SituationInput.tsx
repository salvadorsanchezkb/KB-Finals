import { useState } from 'react';
import { getCoachingResult, simulateChat } from '../lib/gemini';
import type { Profile, CoachingResult, ChatMessage } from '../types';
import CoachingCard from './CoachingCard';
import { Loader2, ImagePlus, X, Send, UserPlus, Edit2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DEFAULT_PROFILES: Profile[] = [
  { id: '1', name: '박성우', mbti: 'ESTJ', persona: '이성적이고 공사 구분이 철저함.', temperature: 2 },
];

const MBTI_OPTIONS = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ', '모름'
];

const RELATION_OPTIONS = [
  '직장 동료 / 상사', '연인 / 배우자', '썸 / 알아가는 중',
  '고객 / 거래처 (CS)', '친구 / 지인', '가족', '단톡방 / 그룹 대화', '기타'
];

const GOAL_OPTIONS = [
  '정해지지 않음', '갈등 및 오해 해결', '친밀감 형성 / 호감 표현',
  '정중한 거절 / 선 긋기', '진심 어린 사과', '어려운 부탁 / 업무 요청',
  '위로와 공감', '고객 클레임 응대 및 안내', '단톡방 분위기 환기/자연스러운 개입'
];

const DEFAULT_PERSONAS = [
  '단호하고 단단한', '따뜻하고 포용력 있는', '쿨하고 여유로운',
  '예의 바르고 프로페셔널한', '신뢰감을 주고 친절한', '진정성 있고 진지한', '위트 있고 센스 있는'
];

const TEMP_EMOJIS = ['🧊', '😐', '🙂', '😄', '🥰'];
const TEMP_LABELS = ['매우 차가움', '예의바름-차분함', '보통', '친근함', '매우 우호적'];

export default function SituationInput() {
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>(DEFAULT_PROFILES[0].id);
  
  const [activeTab, setActiveTab] = useState<'text' | 'simulator' | 'capture'>('text');
  
  const [relation, setRelation] = useState(RELATION_OPTIONS[0]);
  const [goal, setGoal] = useState(GOAL_OPTIONS[1]);
  const [situation, setSituation] = useState('');
  const [relHistory, setRelHistory] = useState('');
  
  const [images, setImages] = useState<File[]>([]);
  
  // Persona state
  const [customPersonas, setCustomPersonas] = useState<string[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['예의 바르고 프로페셔널한']);
  const [customPersonaInput, setCustomPersonaInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachingResult | null>(null);
  const [error, setError] = useState('');

  // Simulator State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  const handleProfileChange = (key: keyof Profile, value: any) => {
    setProfiles(prev => prev.map(p => p.id === activeProfileId ? { ...p, [key]: value } : p));
  };

  const togglePersona = (p: string) => {
    if (selectedPersonas.includes(p)) {
      setSelectedPersonas(prev => prev.filter(item => item !== p));
    } else {
      if (selectedPersonas.length >= 2) {
        // Remove first and add new if already 2
        setSelectedPersonas(prev => [prev[1], p]);
      } else {
        setSelectedPersonas(prev => [...prev, p]);
      }
    }
  };

  const handleAddCustomPersona = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customPersonaInput.trim()) {
      e.preventDefault();
      const val = customPersonaInput.trim();
      if (!DEFAULT_PERSONAS.includes(val) && !customPersonas.includes(val)) {
        setCustomPersonas(prev => [...prev, val]);
        togglePersona(val);
      }
      setCustomPersonaInput('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles].slice(0, 4)); // Max 4 images
    }
  };

  const fetchPastLogs = async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('coaching_logs')
      .select('*')
      .eq('profile_id', activeProfile.id)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error("Error fetching past logs:", error);
      return [];
    }
    return data || [];
  };

  const handleRequestCoaching = async () => {
    // 시뮬레이터 탭에서는 대화가 있어야 함, 캡처본 탭에서는 이미지가 있어야 함, 텍스트는 텍스트가 있어야 함
    if (activeTab === 'text' && !situation.trim()) {
      setError("상황을 텍스트로 입력해주세요.");
      return;
    }
    if (activeTab === 'capture' && images.length === 0) {
      setError("캡처본 이미지를 최소 1장 첨부해주세요.");
      return;
    }
    if (activeTab === 'simulator' && chatHistory.length === 0) {
      setError("가상 롤플레잉 대화 내역이 없습니다.");
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const context = {
      relation,
      goal,
      situation: activeTab === 'text' ? situation : (activeTab === 'capture' ? '이미지 첨부 참고' : '시뮬레이터 대화 참고'),
      history: relHistory,
      personas: selectedPersonas,
      temperature: activeProfile.temperature
    };

    try {
      const pastLogs = await fetchPastLogs();
      const res = await getCoachingResult(context, chatHistory, images, pastLogs);
      setResult(res);

      if (supabase) {
        await supabase.from('coaching_logs').insert([
          { profile_id: activeProfile.id, situation: `[${relation} / ${goal}] ${context.situation}`, result: res }
        ]);
      }
    } catch (err: any) {
      setError(err.message || "코칭 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const pastLogs = await fetchPastLogs();
      const response = await simulateChat(newHistory, chatInput, activeProfile, pastLogs);
      setChatHistory([...newHistory, { role: 'model', content: response }]);
    } catch (err: any) {
      setError(err.message || "시뮬레이션 중 오류가 발생했습니다.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddProfile = () => {
    const name = window.prompt("새로운 인물의 이름을 입력하세요:");
    if (name && name.trim()) {
      const newProfile: Profile = {
        id: Date.now().toString(),
        name: name.trim(),
        mbti: '',
        persona: '',
        temperature: 3
      };
      setProfiles(prev => [...prev, newProfile]);
      setActiveProfileId(newProfile.id);
    }
  };

  const allPersonas = [...DEFAULT_PERSONAS, ...customPersonas];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-medium border border-rose-100 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Top Profile Box */}
      <div className="bg-[#f4f7ff] rounded-2xl border border-indigo-100/50 p-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <select 
            className="w-full bg-white border border-slate-200 text-slate-800 text-base font-semibold rounded-xl appearance-none px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
            value={activeProfileId}
            onChange={e => setActiveProfileId(e.target.value)}
          >
            {profiles.map(p => <option key={p.id} value={p.id}>1. {p.name}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
        <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
          <Edit2 className="w-5 h-5" />
        </button>
        <button 
          onClick={handleAddProfile}
          className="px-5 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" /> 새 인물 추가
        </button>
      </div>

      {/* Internal Tabs */}
      <div className="flex gap-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 overflow-x-auto no-scrollbar">
        {[
          { id: 'text', label: '📄 텍스트 입력' },
          { id: 'simulator', label: '💬 대화 시뮬레이터' },
          { id: 'capture', label: '🖼️ 캡처본 첨부' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button disabled className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-slate-300 whitespace-nowrap cursor-not-allowed">
          🎙️ 음성 첨부
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8 space-y-10">
        
        {/* Section 1 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">1</span>
            <h3 className="text-base font-semibold text-slate-800">{activeProfile.name}님과의 상황</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <select 
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl appearance-none px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={relation}
                onChange={e => setRelation(e.target.value)}
              >
                {RELATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select 
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl appearance-none px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={goal}
                onChange={e => setGoal(e.target.value)}
              >
                {GOAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">서로의 히스토리 (과거 서사)</label>
              <textarea 
                className="w-full bg-slate-50/30 border border-slate-200/60 rounded-xl p-4 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 min-h-[80px] transition-all resize-none shadow-sm"
                placeholder="평소 어떤 사이인가요? 과거에 있었던 중요한 사건이나 서로의 분위기를 적어주세요."
                value={relHistory}
                onChange={e => setRelHistory(e.target.value)}
              />
            </div>
            {activeTab === 'text' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">구체적인 상황 (소통 목표 포함)</label>
                <textarea 
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-5 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[140px] transition-all resize-none shadow-inner"
                  placeholder="지금 당장 해결해야 할 상황은 무엇인가요?"
                  value={situation}
                  onChange={e => setSituation(e.target.value)}
                />
              </div>
            )}
            {activeTab === 'simulator' && (
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden flex flex-col h-80 shadow-inner">
                <div className="p-3 bg-white border-b border-slate-100 text-xs font-semibold text-slate-500">
                  가상 롤플레잉
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatHistory.length === 0 && (
                    <div className="text-center text-slate-400 text-sm mt-10">
                      인사말을 건네 시뮬레이션을 시작해보세요.
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-[#4c5df0] text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1.5 items-center shadow-sm">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="메시지 입력..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-[#4c5df0] text-white p-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'capture' && (
              <div className="p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-6">
                {images.length === 0 ? (
                  <label className="flex flex-col items-center cursor-pointer group">
                    <div className="p-4 bg-indigo-50 text-indigo-500 rounded-full group-hover:bg-indigo-100 transition-colors mb-3">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">클릭하여 캡처 이미지 업로드 (최대 4장)</span>
                    <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="w-full">
                    <div className="flex gap-4 overflow-x-auto pb-4">
                      {images.map((file, i) => (
                        <div key={i} className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden relative border border-slate-200 shadow-sm group">
                          <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setImages(prev => prev.filter((_, index) => index !== i))}
                            className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {images.length < 4 && (
                        <label className="w-32 h-32 flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-slate-500">
                          <ImagePlus className="w-6 h-6 mb-1" />
                          <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Section 2 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">2</span>
              <h3 className="text-base font-semibold text-slate-800">상세 프로필 설정</h3>
            </div>
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </div>
          
          <div className="grid grid-cols-[120px_1fr] gap-4">
            <div className="relative">
              <select 
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl appearance-none px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={activeProfile.mbti || ''}
                onChange={e => handleProfileChange('mbti', e.target.value)}
              >
                {MBTI_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <input 
              type="text" 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
              value={activeProfile.persona || ''}
              onChange={e => handleProfileChange('persona', e.target.value)}
              placeholder="상세 성향 입력"
            />
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Section 3 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-sm font-bold">3</span>
              <h3 className="text-base font-semibold text-slate-800">나의 페르소나 및 온도</h3>
            </div>
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-medium text-slate-700">
              보여지고 싶은 이미지 (최대 2개)
              <span className="text-xs text-slate-400 font-normal">{selectedPersonas.length}/2</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allPersonas.map(p => {
                const isSelected = selectedPersonas.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePersona(p)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                      isSelected 
                        ? 'bg-[#fff9e6] border-[#fde047] text-slate-800 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <input
                type="text"
                className="px-4 py-2 rounded-full text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 w-32 placeholder:text-slate-400 transition-all"
                placeholder="+ 직접 입력"
                value={customPersonaInput}
                onChange={e => setCustomPersonaInput(e.target.value)}
                onKeyDown={handleAddCustomPersona}
              />
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">메시지 온도 조절</span>
              <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {activeProfile.temperature}단계: {TEMP_LABELS[activeProfile.temperature - 1]} {TEMP_EMOJIS[activeProfile.temperature - 1]}
              </span>
            </div>
            
            <div className="relative pt-4 pb-2">
              <input 
                type="range" min="1" max="5" 
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 relative z-10"
                value={activeProfile.temperature}
                onChange={e => handleProfileChange('temperature', parseInt(e.target.value))}
              />
              <div className="flex justify-between text-xl mt-3 px-1 text-slate-400 select-none">
                {TEMP_EMOJIS.map((emoji, idx) => (
                  <span key={idx} className={activeProfile.temperature === idx + 1 ? 'opacity-100' : 'opacity-40 grayscale transition-all'}>
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <button 
          onClick={handleRequestCoaching}
          disabled={loading}
          className="w-full py-4 bg-[#111827] text-white rounded-xl font-semibold text-base hover:bg-black focus:ring-4 focus:ring-slate-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-200 transition-all mt-4"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> 분석 중...</> : <><SparklesIcon /> ✨ 통합 분석 및 코칭 받기</>}
        </button>
      </div>

      {result && <CoachingCard result={result} />}
    </div>
  );
}

function SparklesIcon() {
  return null; // The text already has ✨ so we can just omit this or add an SVG if preferred.
}
