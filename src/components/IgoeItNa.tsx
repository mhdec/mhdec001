import React from 'react';
import { Smartphone, Globe, ExternalLink, Clock, AppWindow, ShieldCheck } from 'lucide-react';

interface AppItem {
  id: string;
  name: string;
  url: string;
  description: string;
  tag?: string;
}

export const IgoeItNa: React.FC = () => {
  const mobileApps: AppItem[] = [
    {
      id: 'hpass',
      name: 'H-PASS',
      url: 'https://hpass.hdec.co.kr/down/index.html',
      description: '현대건설 스마트 출입/보안 통과 모바일 앱',
      tag: '앱 다운로드',
    },
    {
      id: 'autoway',
      name: 'Mobile Autoway',
      url: 'https://autowayapps.hyundai.net/appstore/app/appList.sm?companyId=null',
      description: '그룹 통합 모바일 앱스토어 및 서비스',
      tag: '앱스토어',
    },
    {
      id: 'hrm',
      name: 'HRM',
      url: 'https://mhr.hdec.co.kr/install_page.jsp',
      description: '모바일 인사/근무 관리 설치 페이지',
      tag: '설치 페이지',
    },
    {
      id: 'bizphone',
      name: 'BizPhone',
      url: 'https://gais2.hdec.co.kr/hdecgais.webui/comu/fmc/fmc_login.aspx',
      description: '모바일 행정/FMC 스마트 비즈폰 서비스',
      tag: '로그인',
    },
  ];

  const mobilePages: AppItem[] = [
    {
      id: 'hpms',
      name: '모바일 HPMS',
      url: 'https://hpms.hdec.co.kr/HDeSP/pSiteSafe/HQInspection/SafetyHQInspectionListM.aspx',
      description: '현장 안전/품질 점검 모바일 웹 서비스',
      tag: '모바일 웹',
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 space-y-6">
      {/* Page Header */}
      <div className="bg-[#efe9de] border border-[#e6dfd8] p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-xl bg-[#cc785c] text-white">
            <AppWindow className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-extrabold text-[#141413] tracking-tight">
              이거있나?
            </h1>
            <p className="text-[12px] text-[#6c6a64]">
              사내 주요 모바일 어플리케이션 및 모바일 웹 링크 바로가기
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. 모바일 어플                                                            */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#e6dfd8] pb-2 px-1">
          <Smartphone className="w-4 h-4 text-[#cc785c]" />
          <h2 className="text-[15px] font-bold text-[#141413]">모바일 어플</h2>
          <span className="text-[11px] text-[#6c6a64] bg-[#efe9de] px-2 py-0.5 rounded-full font-medium">
            {mobileApps.length}개
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {mobileApps.map((app) => (
            <a
              key={app.id}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-xl p-4 border border-[#e6dfd8] hover:border-[#cc785c] shadow-xs hover:shadow-md transition-all flex items-center justify-between cursor-pointer active:scale-98"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[16px] text-[#141413] group-hover:text-[#cc785c] transition-colors">
                    {app.name}
                  </span>
                  {app.tag && (
                    <span className="text-[10px] font-semibold bg-[#efe9de] text-[#6c6a64] px-2 py-0.5 rounded-md border border-[#e6dfd8]">
                      {app.tag}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6c6a64] line-clamp-1">
                  {app.description}
                </p>
              </div>

              <div className="p-2 rounded-lg bg-[#faf9f5] group-hover:bg-[#efe9de] border border-[#e6dfd8] transition-colors shrink-0">
                <ExternalLink className="w-4 h-4 text-[#cc785c]" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 모바일 페이지                                                          */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#e6dfd8] pb-2 px-1">
          <Globe className="w-4 h-4 text-[#5db8a6]" />
          <h2 className="text-[15px] font-bold text-[#141413]">모바일 페이지</h2>
          <span className="text-[11px] text-[#6c6a64] bg-[#efe9de] px-2 py-0.5 rounded-full font-medium">
            {mobilePages.length}개
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {mobilePages.map((page) => (
            <a
              key={page.id}
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-xl p-4 border border-[#e6dfd8] hover:border-[#5db8a6] shadow-xs hover:shadow-md transition-all flex items-center justify-between cursor-pointer active:scale-98"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[16px] text-[#141413] group-hover:text-[#5db8a6] transition-colors">
                    {page.name}
                  </span>
                  {page.tag && (
                    <span className="text-[10px] font-semibold bg-[#efe9de] text-[#6c6a64] px-2 py-0.5 rounded-md border border-[#e6dfd8]">
                      {page.tag}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6c6a64] line-clamp-1">
                  {page.description}
                </p>
              </div>

              <div className="p-2 rounded-lg bg-[#faf9f5] group-hover:bg-[#efe9de] border border-[#e6dfd8] transition-colors shrink-0">
                <ExternalLink className="w-4 h-4 text-[#5db8a6]" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. 준비중                                                                 */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#e6dfd8] pb-2 px-1">
          <Clock className="w-4 h-4 text-[#8e8b82]" />
          <h2 className="text-[15px] font-bold text-[#141413]">준비중</h2>
        </div>

        <div className="bg-[#efe9de]/50 border border-dashed border-[#e6dfd8] p-6 rounded-2xl text-center space-y-1">
          <div className="inline-flex p-3 rounded-full bg-[#faf9f5] text-[#8e8b82] mb-1">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-[14px] font-bold text-[#6c6a64]">
            추가 서비스 준비중
          </h3>
          <p className="text-[12px] text-[#8e8b82]">
            새로운 모바일 서비스 및 편의 링크가 지속적으로 추가될 예정입니다.
          </p>
        </div>
      </section>
    </div>
  );
};

export default IgoeItNa;
