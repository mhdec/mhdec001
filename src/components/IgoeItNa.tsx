import React from 'react';
import { Smartphone, Globe, ExternalLink, Gift } from 'lucide-react';

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
    {
      id: 'otp',
      name: 'OTP',
      url: 'https://otp.hdec.co.kr',
      description: '현대건설 모바일 OTP 인증 서비스',
      tag: 'OTP 인증',
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
    {
      id: 'safewallet',
      name: '안전지갑',
      url: 'https://hsw.hdec.co.kr/m/manage/login',
      description: '현대건설 모바일 안전지갑 서비스',
      tag: '모바일 웹',
    },
    {
      id: 'bss',
      name: 'BSS',
      url: 'https://mbss.hdec.co.kr',
      description: '현대건설 모바일 BSS 서비스',
      tag: '모바일 웹',
    },
  ];

  const welfareItems: AppItem[] = [
    {
      id: 'kyobo-ebook',
      name: '교보 e-Book',
      url: 'https://hdec.dkyobobook.co.kr',
      description: '현대건설 전자도서관 (교보문고)',
      tag: '전자도서관',
    },
    {
      id: 'employee-mall',
      name: '임직원 쇼핑몰',
      url: 'https://mgift.e-hyundai.com/hb2efront_new/frcmLoginF.do?shopevent_sts=102&shopevent_no=1135115712&pentr_no=2100002443',
      description: '현대백화점 임직원 전용 쇼핑몰 (Hmall)',
      tag: '임직원몰',
    },
    {
      id: 'benecafe',
      name: '복지 포인트몰',
      url: 'https://cert.benecafe.co.kr/member/login?&cmpyNo=O04',
      description: '베네카페(Benecafe) 복지 포인트몰',
      tag: '포인트몰',
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 space-y-6">

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
      {/* 3. 복지                                                                   */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#e6dfd8] pb-2 px-1">
          <Gift className="w-4 h-4 text-[#7c3aed]" />
          <h2 className="text-[15px] font-bold text-[#141413]">복지</h2>
          <span className="text-[11px] text-[#6c6a64] bg-[#efe9de] px-2 py-0.5 rounded-full font-medium">
            {welfareItems.length}개
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {welfareItems.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-xl p-4 border border-[#e6dfd8] hover:border-[#7c3aed] shadow-xs hover:shadow-md transition-all flex items-center justify-between cursor-pointer active:scale-98"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[16px] text-[#141413] group-hover:text-[#7c3aed] transition-colors">
                    {item.name}
                  </span>
                  {item.tag && (
                    <span className="text-[10px] font-semibold bg-[#efe9de] text-[#6c6a64] px-2 py-0.5 rounded-md border border-[#e6dfd8]">
                      {item.tag}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6c6a64] line-clamp-1">
                  {item.description}
                </p>
              </div>

              <div className="p-2 rounded-lg bg-[#faf9f5] group-hover:bg-[#efe9de] border border-[#e6dfd8] transition-colors shrink-0">
                <ExternalLink className="w-4 h-4 text-[#7c3aed]" />
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default IgoeItNa;
