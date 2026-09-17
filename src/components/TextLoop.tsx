import React, { useEffect, useRef } from 'react';

interface TextLoopProps {
  text?: string;
  shape?: 'wave' | 'circle' | 'infinity' | 'arch' | 'line';
  speed?: number;
  direction?: 'forward' | 'reverse';
  separator?: string;
  curviness?: number;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
  color?: string;
  ribbon?: boolean;
  ribbonColor?: string;
  ribbonWidth?: number;
  pauseOnHover?: boolean;
  height?: string | number;
}

export const TextLoop: React.FC<TextLoopProps> = ({
  text = 'React ✦ Bits',
  shape = 'wave',
  speed = 90,
  direction = 'forward',
  separator = '✦',
  curviness = 90,
  fontSize = 46,
  fontWeight = 800,
  letterSpacing = 2,
  uppercase = true,
  color = '#ffffff',
  ribbon = true,
  ribbonColor = '#5227FF',
  ribbonWidth = 86,
  pauseOnHover = true,
  height,
}) => {
  const textPathRef = useRef<SVGTextPathElement>(null);
  const offsetRef = useRef(0);
  const isHovered = useRef(false);

  // Generate continuous repeating text to ensure no gaps along the full path length
  const rawText = uppercase ? text.toUpperCase() : text;
  const rawSeparator = separator ? ` ${separator} ` : ' ';
  const phrase = `${rawText}${rawSeparator}`;
  const repeatedText = Array(20).fill(phrase).join('');

  // Generate SVG path based on shape type
  const getPathData = () => {
    switch (shape) {
      case 'line':
        return 'M -400 200 L 2800 200';
      case 'arch':
        return `M -400 350 Q 1200 ${350 - curviness * 2} 2800 350`;
      case 'wave':
      default:
        // A perfect continuous wave spanning from left to right offscreen
        return `M -400 200 Q 200 ${200 - curviness} 800 200 T 2000 200 T 3200 200`;
    }
  };

  const pathId = `text-path-${React.useId().replace(/:/g, '')}`;
  const pathData = getPathData();

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (!isHovered.current) {
        // Increment offset depending on speed and direction
        const step = (speed / 60) * (direction === 'forward' ? -1 : 1);
        offsetRef.current += step;

        // Reset offset periodically to maintain infinite flow smoothly
        if (Math.abs(offsetRef.current) > 5000) {
          offsetRef.current = 0;
        }

        if (textPathRef.current) {
          textPathRef.current.setAttribute('startOffset', `${offsetRef.current}px`);
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [speed, direction]);

  const containerHeight = height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : `${(ribbonWidth || 86) + 40}px`;

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: containerHeight }}
      onMouseEnter={() => {
        if (pauseOnHover) isHovered.current = true;
      }}
      onMouseLeave={() => {
        isHovered.current = false;
      }}
    >
      <svg
        viewBox="0 0 2400 400"
        className="absolute top-1/2 left-1/2 w-[160%] h-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <path id={pathId} d={pathData} />
        </defs>

        {/* Ribbon Background Path */}
        {ribbon && (
          <path
            d={pathData}
            fill="none"
            stroke={ribbonColor}
            strokeWidth={ribbonWidth}
            strokeLinecap="round"
            className="opacity-95 shadow-lg"
          />
        )}

        {/* Scrolling Text along the Path */}
        <text
          fill={color}
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            letterSpacing: `${letterSpacing}px`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <textPath
            ref={textPathRef}
            href={`#${pathId}`}
            startOffset="0px"
          >
            {repeatedText}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default TextLoop;
