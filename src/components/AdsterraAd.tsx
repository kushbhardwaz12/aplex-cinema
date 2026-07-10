import React, { useEffect, useRef, useState } from 'react';

interface AdsterraAdProps {
  type: 'banner320' | 'banner468' | 'banner728' | 'banner300x250' | 'popunder' | 'native';
  isMobile: boolean;
}

export function AdsterraAd({ type, isMobile }: AdsterraAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (type === 'popunder') {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '//pl30254578.effectivecpmnetwork.com/36/2f/19/362f19d7e45340004eef28e597400864.js';
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [type]);

  let width = 0;
  let height = 0;
  let adHtml = '';

  if (type === 'banner320') {
    width = 320;
    height = 50;
    adHtml = `
      <html><head><style>body { margin: 0; padding: 0; background: transparent; display: flex; justify-content: center; align-items: center; }</style></head>
      <body>
        <script type="text/javascript">
          atOptions = { 'key' : 'YOUR_320_KEY', 'format' : 'iframe', 'height' : 50, 'width' : 320, 'params' : {} };
        </script>
        <script type="text/javascript" src="//www.highperformanceformat.com/YOUR_320_KEY/invoke.js"></script>
      </body></html>
    `;
  } else if (type === 'banner468') {
    width = 468;
    height = 60;
    adHtml = `
      <html><head><style>body { margin: 0; padding: 0; background: transparent; display: flex; justify-content: center; align-items: center; }</style></head>
      <body>
        <script type="text/javascript">
          atOptions = { 'key' : 'YOUR_468_KEY', 'format' : 'iframe', 'height' : 60, 'width' : 468, 'params' : {} };
        </script>
        <script type="text/javascript" src="//www.highperformanceformat.com/YOUR_468_KEY/invoke.js"></script>
      </body></html>
    `;
  } else if (type === 'banner728') {
    width = 728;
    height = 90;
    adHtml = `
      <html><head><style>body { margin: 0; padding: 0; background: transparent; display: flex; justify-content: center; align-items: center; }</style></head>
      <body>
        <script type="text/javascript">
          atOptions = { 'key' : 'YOUR_728_KEY', 'format' : 'iframe', 'height' : 90, 'width' : 728, 'params' : {} };
        </script>
        <script type="text/javascript" src="//www.highperformanceformat.com/YOUR_728_KEY/invoke.js"></script>
      </body></html>
    `;
  } else if (type === 'banner300x250') {
    width = 300;
    height = 250;
    adHtml = `
      <html><head><style>body { margin: 0; padding: 0; background: transparent; display: flex; justify-content: center; align-items: center; }</style></head>
      <body>
        <script type="text/javascript">
          atOptions = { 'key' : '2bfd8d59b2de402f94e63c0620bfbb9a', 'format' : 'iframe', 'height' : 250, 'width' : 300, 'params' : {} };
        </script>
        <script type="text/javascript" src="https://www.highperformanceformat.com/2bfd8d59b2de402f94e63c0620bfbb9a/invoke.js"></script>
      </body></html>
    `;
  }

  useEffect(() => {
    if (width === 0) return;
    const updateScale = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.parentElement?.offsetWidth || containerRef.current.offsetWidth;
        if (parentWidth > 0 && parentWidth < width) {
          setScale(parentWidth / width);
        } else if (parentWidth > 0) {
          // Fill the div size horizontally!
          setScale(parentWidth / width);
        } else {
          setScale(1);
        }
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [width, type]);

  if (type === 'popunder') return null;
  if (type === 'banner728' && isMobile) return null;

  return (
    <div ref={containerRef} className="flex justify-center items-center my-2 w-full overflow-hidden shrink-0" style={{ height: height * scale }}>
      <div 
        className="flex justify-center items-center origin-center" 
        style={{ 
          width: width,
          height: height,
          transform: `scale(${scale})`
        }}
      >
        <iframe
          srcDoc={adHtml}
          width={width}
          height={height}
          frameBorder="0"
          scrolling="no"
          style={{ 
            border: 'none', 
            overflow: 'hidden',
          }}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        />
      </div>
    </div>
  );
}
