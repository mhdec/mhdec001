import React from 'react';

export const SiteInfo: React.FC = () => {
  const targetUrl = "https://siteinfo.hdec.co.kr/m_SiteInfo.aspx";

  return (
    <div className="w-full h-[calc(100vh-48px)] bg-[#faf9f5]">
      {/* Clean full height embedded view without top bar */}
      <iframe
        src={targetUrl}
        title="현장 정보 안내"
        className="w-full h-full border-0 block"
        loading="lazy"
      />
    </div>
  );
};
