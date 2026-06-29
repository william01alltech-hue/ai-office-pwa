import React, { useEffect, useRef } from 'react';

interface GoogleAdBannerProps {
  className?: string;
  client?: string;
  slot?: string;
  format?: string;
  responsive?: string;
}

export const GoogleAdBanner: React.FC<GoogleAdBannerProps> = ({
  className = '',
  client = 'ca-pub-XXXXXXXXXXXXXXXX', // Placeholder for actual client ID
  slot = 'XXXXXXXXXX', // Placeholder for actual slot ID
  format = 'auto',
  responsive = 'true',
}) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
            if (window.adsbygoogle && adRef.current && !adRef.current.dataset.adsbygoogleStatus) {
                window.adsbygoogle.push({});
      }
    } catch (e) {
      console.error('Google AdSense error', e);
    }
  }, []);

  return (
    <div className={`flex justify-center items-center overflow-hidden relative ${className}`}>
      {/* 
        This is a placeholder that shows when ads are blocked or haven't loaded yet.
        In a real scenario, this helps visualize the ad spot during development.
      */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-sm font-medium border border-dashed border-slate-300 pointer-events-none">
        Google AdSense Advertisement
      </div>
      
      <ins
        ref={adRef}
        className="adsbygoogle relative z-10 w-full h-full block"
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
};
