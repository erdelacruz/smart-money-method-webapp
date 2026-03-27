// AdBanner.jsx — Google AdSense display ad component
//
// SPA consideration: AdSense <ins> tags must be re-pushed each time they
// mount. In a React SPA routes unmount/remount components, so pushing in
// useEffect (on mount) is the correct pattern. Each AdBanner instance
// manages its own ad slot independently.

import { useEffect, useRef } from 'react';

/**
 * @param {string}  adSlot   - Your AdSense ad slot ID (data-ad-slot)
 * @param {string}  adFormat - 'auto' | 'rectangle' | 'vertical' | 'horizontal'
 * @param {object}  style    - Optional wrapper style overrides
 */
export default function AdBanner({ adSlot, adFormat = 'auto', style = {} }) {
  const adRef = useRef(null);

  useEffect(() => {
    try {
      if (adRef.current && adRef.current.getAttribute('data-adsbygoogle-status') == null) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      // AdSense not loaded (e.g. blocked by ad blocker) — fail silently
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', overflow: 'hidden', minHeight: 0, ...style }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 0 }}
        data-ad-client="ca-pub-6438914517960882"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}
