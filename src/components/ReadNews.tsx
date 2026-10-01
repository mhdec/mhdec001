import React from 'react';

export const ReadNews: React.FC = () => {
  const targetUrl = "https://autowayif.hdec.co.kr/NewsPaper/NewsPaperViewNew.aspx?Seq=";

  return (
    <div className="w-full h-[calc(100vh-48px)] bg-[#faf9f5]">
      {/* Clean full height embedded view without top bar */}
      <iframe
        src={targetUrl}
        title="HDEC 뉴스페이퍼"
        className="w-full h-full border-0 block"
        loading="lazy"
      />
    </div>
  );
};
