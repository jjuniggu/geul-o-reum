import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { 
  BookOpen, 
  Brain, 
  Trophy, 
  Menu, 
  X, 
  ChevronRight, 
  CheckCircle2,
  MapPin,
  Calendar,
  CircleDollarSign,
  Quote,
  Mail
} from 'lucide-react';

// Firebase 라이브러리
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp,
  query
} from 'firebase/firestore';

/**
 * --- [설정 완료] Firebase 발급 키 적용됨 ---
 */
const firebaseConfig = {
  apiKey: "AIzaSyAdA7T6p03rVkUhii02DKfbCJyHJtKXfUM",
  authDomain: "geul-o-reum.firebaseapp.com",
  projectId: "geul-o-reum",
  storageBucket: "geul-o-reum.firebasestorage.app",
  messagingSenderId: "88396146705",
  appId: "1:88396146705:web:4b244b5d9ca3fe038ca9b0",
  measurementId: "G-N81D5NV7RY"
};

// 서비스 초기화
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'geul-o-reum';

// --- 전역 타입 정의 ---
interface ApplicationData {
  id?: string;
  studentName: string;
  parentPhone: string;
  grade: string;
  parentName?: string;
  applyDate?: any;
  status?: string;
}

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

// --- 커스텀 소셜 아이콘 ---
const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

// --- 애니메이션 컴포넌트 ---
const Reveal = ({ children, delay = 0, className = "" }: RevealProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- 메인 앱 컴포넌트 ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  
  // 입력 폼 상태
  const [parentName, setParentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [grade, setGrade] = useState('');
  
  // 조회 폼 상태
  const [checkPhone, setCheckPhone] = useState('');
  const [checkResult, setCheckResult] = useState<ApplicationData | null | 'not_found'>(null);
  
  // 처리 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 1. 익명 인증 (데이터 쓰기 권한 획득)
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
        setAuthError(null);
      } catch (error: any) {
        console.error("인증 실패:", error);
        if (error.code === 'auth/configuration-not-found') {
          setAuthError("Firebase 콘솔의 Authentication 메뉴에서 '익명 로그인'을 활성화해주세요.");
        } else {
          setAuthError("데이터베이스 서버 연결에 실패했습니다.");
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. 신청서 제출 로직
  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert(authError || "서버와 연결 중입니다. 잠시만 기다려주세요.");
      return;
    }
    setIsSubmitting(true);

    try {
      const applyRef = collection(db, 'artifacts', appId, 'users', user.uid, 'applications');
      await addDoc(applyRef, {
        parentName,
        studentName,
        parentPhone,
        grade,
        status: '신청대기',
        applyDate: serverTimestamp(),
      });

      setSubmitSuccess(true);
      setParentName('');
      setStudentName('');
      setParentPhone('');
      setGrade('');
    } catch (error: any) {
      console.error("저장 실패 상세:", error);
      alert("신청 정보를 저장할 수 없습니다.\n원인: " + (error.message || "보안 규칙 또는 데이터베이스 미생성"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. 신청 내역 조회 로직
  const handleCheck = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsChecking(true);
    setCheckResult(null);

    try {
      const applyRef = collection(db, 'artifacts', appId, 'users', user.uid, 'applications');
      const querySnapshot = await getDocs(query(applyRef));
      
      let found: ApplicationData | null = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data() as ApplicationData;
        if (data.parentPhone === checkPhone) {
          found = { ...data, id: doc.id };
        }
      });

      setCheckResult(found || 'not_found');
    } catch (error) {
      console.error("조회 실패:", error);
      alert("조회 중 오류가 발생했습니다.");
    } finally {
      setIsChecking(false);
    }
  };

  const openCheckModal = () => {
    setIsMenuOpen(false);
    setIsCheckModalOpen(true);
    setCheckResult(null);
    setCheckPhone('');
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans text-[#1c1917]">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-stone-200 transition-all duration-300 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="bg-[#1e293b] p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-[#fef3c7]" />
              </div>
              <span className="font-extrabold text-2xl tracking-tighter text-[#1e293b]">글오름</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-10">
              <a href="#about" className="text-stone-600 hover:text-[#1e293b] font-bold text-sm transition no-underline">프로그램</a>
              <a href="#profile" className="text-stone-600 hover:text-[#1e293b] font-bold text-sm transition no-underline">멘토 소개</a>
              <a href="#reviews" className="text-stone-600 hover:text-[#1e293b] font-bold text-sm transition no-underline">학부모 후기</a>
              <button onClick={openCheckModal} className="text-stone-600 hover:text-[#1e293b] font-bold text-sm transition bg-transparent border-none cursor-pointer">내역 확인</button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#b45309] text-white px-7 py-3 rounded-full font-extrabold text-sm hover:bg-[#92400e] transition shadow-md hover:shadow-lg border-none cursor-pointer"
              >
                무료 특강 신청
              </button>
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-[#1e293b] p-2 bg-transparent border-none cursor-pointer">
                {isMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-stone-100 px-4 pt-4 pb-8 space-y-3 shadow-xl absolute w-full rounded-b-3xl">
            <a href="#about" onClick={() => setIsMenuOpen(false)} className="block px-4 py-4 text-base font-bold text-stone-700 hover:bg-stone-50 rounded-xl no-underline">프로그램</a>
            <a href="#profile" onClick={() => setIsMenuOpen(false)} className="block px-4 py-4 text-base font-bold text-stone-700 hover:bg-stone-50 rounded-xl no-underline">멘토 소개</a>
            <a href="#reviews" onClick={() => setIsMenuOpen(false)} className="block px-4 py-4 text-base font-bold text-stone-700 hover:bg-stone-50 rounded-xl no-underline">학부모 후기</a>
            <button onClick={openCheckModal} className="block w-full text-left px-4 py-4 text-base font-bold text-stone-700 hover:bg-stone-50 rounded-xl bg-transparent border-none">신청 내역 확인</button>
            <button onClick={() => { setIsMenuOpen(false); setIsModalOpen(true); }} className="w-full mt-4 bg-[#b45309] text-white px-6 py-4 rounded-2xl font-extrabold border-none cursor-pointer">무료 특강 신청하기</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 lg:pt-56 lg:pb-40 overflow-hidden bg-white text-center">
        <div className="absolute inset-0 z-0 bg-[#fefce8]/40"></div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <span className="inline-flex items-center px-5 py-2 rounded-full bg-[#fef3c7] text-[#92400e] font-extrabold text-xs tracking-widest uppercase mb-8 border border-[#fde68a]">
              <Calendar className="w-4 h-4 mr-2" /> 6월 말 강남 오프라인 선착순 특강
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-[#1e293b] mb-8 leading-[1.1] text-center">
              우리아이 성적의 결정타,<br className="hidden sm:block" />
              <span className="relative inline-block">
                <span className="relative z-10 text-[#b45309]">문해력</span>
                <span className="absolute bottom-2 left-0 w-full h-4 bg-[#fef3c7] -z-10 text-center"></span>
              </span>에 답이 있습니다.
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-4 text-lg md:text-2xl text-stone-600 max-w-3xl mx-auto font-medium mb-12 leading-relaxed text-balance text-center">
              단순한 다독을 넘어 텍스트의 본질을 꿰뚫는 힘.<br className="hidden md:block" />
              스스로 생각하는 아이로 키우는 <strong>Claire의 독서 멘토링</strong>입니다.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center text-center">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#1e293b] text-[#fef3c7] px-10 py-5 rounded-2xl font-black text-xl hover:bg-[#0f172a] transition-all flex items-center justify-center gap-3 shadow-2xl border-none cursor-pointer"
              >
                무료 특강 신청하기 <ChevronRight className="h-6 w-6" />
              </button>
              <a href="#about" className="text-stone-500 hover:text-[#1e293b] px-6 py-3 font-bold text-lg underline underline-offset-8 transition-all no-underline">커리큘럼 미리보기</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="about" className="py-32 bg-[#f5f5f4] text-center">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-20 text-center">
              <h2 className="text-4xl md:text-5xl font-black text-[#1e293b] mb-6 text-center">왜 독서 교육인가요?</h2>
              <p className="text-xl text-stone-500 font-medium italic text-center">"모든 공부의 뿌리는 읽기에서 시작됩니다."</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-10 text-left">
            {[
              { icon: <Brain className="text-[#b45309]" />, title: "지문 장악력 향상", desc: "국영수 전 과목의 기초인 텍스트 분석 능력을 비약적으로 발전시킵니다." },
              { icon: <BookOpen className="text-[#1e293b]" />, title: "서술형의 자신감", desc: "자신의 생각을 논리적으로 구조화하여 글로 구현하는 '출력'의 힘을 기릅니다." },
              { icon: <Trophy className="text-[#065f46]" />, title: "평생 공부 습관", desc: "억지로 읽는 책이 아닌, 호기심을 지식으로 바꾸는 자기주도적 성장을 돕습니다." }
            ].map((benefit, idx) => (
              <Reveal key={idx} delay={idx * 150}>
                <div className="bg-white p-10 rounded-[2.5rem] border border-stone-200 shadow-sm hover:shadow-2xl transition-all duration-500 h-full group text-left">
                  <div className="w-16 h-16 bg-[#fafaf9] rounded-2xl flex items-center justify-center mb-8 border border-stone-100 group-hover:scale-110 transition-transform">
                    {benefit.icon}
                  </div>
                  <h3 className="text-2xl font-black mb-4 text-[#1e293b] text-left">{benefit.title}</h3>
                  <p className="text-stone-600 leading-relaxed font-medium text-lg text-left">{benefit.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Profile Section */}
      <section id="profile" className="py-32 bg-white relative overflow-hidden text-left">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <Reveal className="w-full lg:w-1/2">
              <div className="relative group text-left">
                <div className="absolute -inset-4 bg-[#fef3c7] rounded-[3rem] rotate-3 -z-10 opacity-50 group-hover:rotate-0 transition-transform duration-700"></div>
                <div className="aspect-[4/5] bg-stone-100 rounded-[2.5rem] overflow-hidden relative shadow-2xl border-4 border-white text-left">
                  <img 
                    src="claire.jpg" 
                    alt="Claire Mentor" 
                    className="w-full h-full object-cover relative z-10 transition-transform duration-1000 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b]/60 to-transparent z-20"></div>
                  <div className="absolute bottom-8 left-8 z-30 text-left">
                    <p className="text-[#fef3c7] font-black text-3xl">Claire</p>
                    <p className="text-white font-bold opacity-90">글오름 대표 멘토</p>
                  </div>
                </div>
              </div>
            </Reveal>
            
            <div className="w-full lg:w-1/2 text-left">
              <Reveal delay={200}>
                <div className="inline-block py-2 px-4 rounded-lg bg-[#fffbeb] text-[#b45309] font-black text-sm mb-6 border border-[#fef3c7] text-left">
                  MENTOR INTRO
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-[#1e293b] mb-8 leading-tight text-left">
                  "아이들의 세상을<br/>책으로 넓혀주고 싶습니다"
                </h2>
                <div className="space-y-6 text-xl text-stone-600 font-medium leading-relaxed mb-10 text-left">
                  <p>안녕하세요, 독서 멘토 <strong className="text-[#b45309] font-black">Claire</strong>입니다.</p>
                  <p className="text-balance text-left text-left">지식의 전달보다 중요한 것은 아이가 책을 '대하는 마음'입니다. 스스로 질문을 던지고 답을 찾는 즐거움을 깨닫는 순간, 성적은 자연스럽게 따라옵니다.</p>
                </div>
                
                <ul className="space-y-5 p-0 list-none">
                  {[
                    "다수의 초중등 독서 코칭 경력",
                    "개별 성향 맞춤형 도서 큐레이션",
                    "사고력을 확장하는 정교한 발제 수업"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-left">
                      <div className="bg-[#1e293b] rounded-full p-1 text-left">
                        <CheckCircle2 className="h-5 w-5 text-[#fef3c7]" />
                      </div>
                      <span className="text-[#1e293b] font-bold text-lg text-left">{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-32 bg-[#1e293b] text-white text-left">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-6 text-left">
              <div className="text-left">
                <h2 className="text-4xl md:text-5xl font-black mb-4 text-left">함께한 학부모님의 진심</h2>
                <p className="text-xl text-[#fef3c7]/70 font-medium text-left">변화는 이미 시작되었습니다.</p>
              </div>
              <Quote className="h-20 w-20 text-[#fef3c7] opacity-20 hidden md:block" />
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              { text: "스마트폰만 보던 아이가 주말에 먼저 도서관에 가자고 해서 정말 놀랐습니다. 국어 성적도 눈에 띄게 올랐어요.", writer: "이*진 어머니" },
              { text: "수학 서술형 문제를 항상 틀리던 아이였는데, 독서 수업 이후로 문제를 이해하는 속도와 정확도가 확연히 달라졌습니다.", writer: "김*영 어머니" },
              { text: "글쓰기 숙제만 있으면 울던 아이가 이제는 자신의 생각을 글로 논리정연하게 씁니다. 선생님의 진심 어린 코칭 덕분이에요.", writer: "박*현 어머니" }
            ].map((review, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="bg-[#2d3748] p-10 rounded-[2rem] border border-white/10 hover:border-[#fef3c7]/30 transition-all group h-full flex flex-col justify-between text-left">
                  <div className="text-left">
                    <div className="flex text-[#fef3c7] mb-6 text-left">{"★".repeat(5)}</div>
                    <p className="text-white/80 leading-relaxed font-medium mb-8 text-lg italic text-left text-balance">"{review.text}"</p>
                  </div>
                  <div className="flex items-center gap-4 border-t border-white/5 pt-6 text-left">
                    <div className="w-10 h-10 bg-[#fef3c7] rounded-full flex items-center justify-center text-[#1e293b] font-black text-left">{review.writer[0]}</div>
                    <span className="font-bold text-left">{review.writer}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#b45309] relative overflow-hidden text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-8 text-center leading-tight">아이의 미래를 바꾸는 '읽기'의 기적</h2>
            <p className="text-[#fef3c7] text-xl mb-12 font-bold text-center">지금 바로 6월 선착순 무료 특강에 참여하세요.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-[#b45309] px-12 py-5 rounded-2xl font-black text-2xl hover:bg-[#fef3c7] transition-all shadow-2xl transform hover:scale-105 border-none cursor-pointer"
            >
              신청서 작성하기
            </button>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-[#94a3b8] py-24 text-left">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 border-b border-white/5 pb-20 mb-12 text-left">
            <div className="col-span-1 lg:col-span-2 text-left">
              <div className="flex items-center gap-3 mb-8 text-left">
                <div className="bg-[#fef3c7] p-1.5 rounded-lg text-left">
                  <BookOpen className="h-7 w-7 text-[#1e293b]" />
                </div>
                <span className="font-black text-3xl tracking-tighter text-white text-left">글오름</span>
              </div>
              <p className="text-lg leading-relaxed text-[#64748b] font-medium max-w-md text-left text-balance">
                우리아이 성적을 바꾸는 독서의 힘. <strong className="text-[#fef3c7] font-black underline decoration-2 underline-offset-4">Claire</strong> 멘토와 함께하는 바른 읽기가 아이의 미래를 바꿉니다.
              </p>
              <div className="flex gap-6 mt-10 text-left">
                <div className="w-12 h-12 bg-[#1e293b] rounded-xl flex items-center justify-center hover:text-[#fef3c7] transition-all cursor-pointer border border-white/5 text-left"><InstagramIcon /></div>
                <div className="w-12 h-12 bg-[#1e293b] rounded-xl flex items-center justify-center hover:text-[#fef3c7] transition-all cursor-pointer border border-white/5 text-left"><FacebookIcon /></div>
              </div>
            </div>
            <div className="text-left">
              <h3 className="text-white font-black text-lg mb-8 tracking-widest uppercase text-left">Quick Links</h3>
              <ul className="space-y-4 font-bold p-0 list-none text-left">
                <li className="text-left"><a href="#about" className="hover:text-white transition no-underline">커리큘럼</a></li>
                <li className="text-left"><a href="#profile" className="hover:text-white transition no-underline">멘토 소개</a></li>
                <li className="text-left"><a href="#reviews" className="hover:text-white transition no-underline">학부모 후기</a></li>
                <li className="text-left"><button onClick={openCheckModal} className="hover:text-white transition text-left bg-transparent border-none cursor-pointer">신청 내역</button></li>
              </ul>
            </div>
            <div className="text-left">
              <h3 className="text-white font-black text-lg mb-8 tracking-widest uppercase text-left">Contact</h3>
              <p className="text-sm font-medium mb-6 text-left">프로그램 및 제휴 문의</p>
              <div className="flex items-center gap-2 text-white font-bold text-left">
                <Mail className="w-5 h-5 text-[#fef3c7]" />
                <span className="text-left">claire@geul-o-reum.com</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center text-xs font-black tracking-widest uppercase text-center">
            <p>© 2024 GEUL-O-REUM ACADEMY. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </footer>

      {/* Application Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f172a]/90 backdrop-blur-sm animate-fade-in px-6">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row border border-stone-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-stone-400 hover:text-[#1e293b] z-10 transition-colors bg-transparent border-none cursor-pointer"><X className="h-8 w-8" /></button>
            <div className="md:w-2/5 bg-[#1e293b] text-white p-12 hidden md:flex flex-col justify-between text-left">
              <div>
                <h3 className="text-3xl font-black mb-6 leading-tight text-[#fef3c7] text-left">무료 특강<br/>신청 안내</h3>
                <div className="space-y-6 text-lg font-bold mt-10 text-left">
                  <div className="flex items-center gap-4 opacity-80 text-left"><MapPin className="w-6 h-6 text-[#fef3c7]" /><span>서울 강남구 일대</span></div>
                  <div className="flex items-center gap-4 opacity-80 text-left"><Calendar className="w-6 h-6 text-[#fef3c7]" /><span>6월 말 주말 예정</span></div>
                  <div className="flex items-center gap-4 opacity-80 text-left"><CircleDollarSign className="w-6 h-6 text-[#fef3c7]" /><span>수강료 전액 지원</span></div>
                </div>
              </div>
              <p className="text-xs text-[#64748b] font-bold leading-relaxed border-t border-white/5 pt-10 text-left">
                입력하신 개인정보는 강연 안내 목적으로만 소중히 관리됩니다.
              </p>
            </div>
            <div className="md:w-3/5 p-12 max-h-[90vh] overflow-y-auto bg-white text-left">
              {authError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold animate-fade-in text-left">
                  ⚠️ {authError}
                </div>
              )}
              {!submitSuccess ? (
                <form onSubmit={handleApply} className="space-y-6 text-left">
                  <h3 className="text-3xl font-black mb-8 text-[#1e293b] text-left">신청 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="col-span-2 sm:col-span-1 text-left">
                      <label className="block text-xs font-black text-stone-400 mb-2 uppercase tracking-widest text-left">학부모 성함</label>
                      <input type="text" required value={parentName} onChange={(e) => setParentName(e.target.value)} className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-stone-50 outline-none focus:border-[#b45309] font-bold transition-all text-left" placeholder="성함 입력" />
                    </div>
                    <div className="col-span-2 sm:col-span-1 text-left">
                      <label className="block text-xs font-black text-stone-400 mb-2 uppercase tracking-widest text-left">학생 이름</label>
                      <input type="text" required value={studentName} onChange={(e) => setStudentName(e.target.value)} className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-stone-50 outline-none focus:border-[#b45309] font-bold transition-all text-left" placeholder="이름 입력" />
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="block text-xs font-black text-stone-400 mb-2 uppercase tracking-widest text-left">학부모 연락처</label>
                    <input type="tel" required value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-stone-50 outline-none focus:border-[#b45309] font-bold transition-all text-left" placeholder="010-0000-0000" />
                  </div>
                  <div className="text-left">
                    <label className="block text-xs font-black text-stone-400 mb-2 uppercase tracking-widest text-left">학생 학년</label>
                    <select required value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-stone-50 outline-none focus:border-[#b45309] font-bold transition-all appearance-none cursor-pointer text-left">
                      <option value="" disabled>학년을 선택하세요</option>
                      <option value="초등 저학년">초등 1~3학년</option>
                      <option value="초등 고학년">초등 4~6학년</option>
                      <option value="중등">중학교 1~3학년</option>
                    </select>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-5 rounded-2xl font-black text-xl bg-[#1e293b] text-[#fef3c7] mt-6 shadow-xl hover:shadow-none transition-all disabled:bg-stone-300 border-none cursor-pointer text-center">
                    {isSubmitting ? "처리 중..." : "신청서 제출"}
                  </button>
                </form>
              ) : (
                <div className="text-center py-20 animate-fade-in text-center">
                  <div className="bg-[#f0fdf4] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-10 border border-[#bcf0da] text-center">
                    <CheckCircle2 className="h-12 w-12 text-[#16a34a]" />
                  </div>
                  <h3 className="text-3xl font-black mb-6 text-[#1e293b] text-center">신청 접수 완료</h3>
                  <p className="text-lg text-stone-500 font-bold leading-relaxed mb-12 text-center text-balance">입력하신 연락처로 <br/>상세 강연 장소를 안내해 드립니다.</p>
                  <button onClick={() => { setIsModalOpen(false); setSubmitSuccess(false); }} className="px-12 py-4 bg-stone-100 text-stone-800 rounded-2xl font-black hover:bg-stone-200 transition-colors border-none cursor-pointer mx-auto">닫기</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Check Modal */}
      {isCheckModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f172a]/90 backdrop-blur-sm px-6 text-left">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 relative border border-stone-200 shadow-2xl text-left">
            <button onClick={() => setIsCheckModalOpen(false)} className="absolute top-6 right-6 p-2 text-stone-400 hover:text-[#1e293b] transition-colors bg-transparent border-none cursor-pointer"><X className="h-7 w-7" /></button>
            <h3 className="text-2xl font-black mb-8 text-[#1e293b] text-left">신청 내역 조회</h3>
            <form onSubmit={handleCheck} className="space-y-6 text-left">
              <input type="tel" required value={checkPhone} onChange={(e) => setCheckPhone(e.target.value)} placeholder="010-0000-0000" className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-stone-50 outline-none focus:border-[#b45309] font-bold text-left" />
              <button type="submit" disabled={isChecking} className="w-full py-4 rounded-xl font-black bg-[#1e293b] text-[#fef3c7] transition-all disabled:bg-stone-300 border-none cursor-pointer text-center">
                {isChecking ? "조회 중..." : "내역 조회"}
              </button>
            </form>
            {checkResult && (
              <div className="mt-8 p-6 rounded-2xl border-2 border-dashed border-[#b45309]/20 bg-[#fffbeb] animate-fade-in text-left">
                {checkResult === 'not_found' ? <div className="text-center font-bold text-stone-400 py-4 text-center">조회된 신청 내역이 없습니다.</div> : (
                  <div className="font-bold text-left">
                    <div className="flex justify-between items-end mb-4 border-b border-[#b45309]/10 pb-4 text-left">
                      <span className="text-2xl font-black text-[#1e293b] text-left">{checkResult.studentName} 학생</span>
                      <span className="text-[#16a34a] text-sm uppercase tracking-widest font-black text-left">Success</span>
                    </div>
                    <div className="space-y-2 text-stone-600 text-left">
                      <p className="flex justify-between text-left"><span>학년</span> <span className="text-[#1e293b] text-left">{checkResult.grade}</span></p>
                      <p className="flex justify-between text-left"><span>상태</span> <span className="text-[#1e293b] text-left">{checkResult.status || '특강 대기 중'}</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .text-balance { text-wrap: balance; }
      `}} />
    </div>
  );
}