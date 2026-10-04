import React from 'react';

interface CopLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  height?: number;
  variant?: 'full' | 'icon' | 'badge';
  withText?: boolean;
  showSubtitle?: boolean;
  isDark?: boolean;
}

export const CopLogo: React.FC<CopLogoProps> = ({
  className = '',
  size = 'md',
  height,
  variant = 'full',
  withText = true,
  showSubtitle = true,
  isDark = true,
}) => {
  const pixelHeight =
    height !== undefined
      ? height
      : typeof size === 'number'
      ? size
      : size === 'xs'
      ? 24
      : size === 'sm'
      ? 30
      : size === 'md'
      ? 38
      : size === 'lg'
      ? 48
      : 56;

  // The Official Cathedral of Praise Manila High-Res Emblem
  const emblemSrc = isDark ? '/cop-emblem-white.png' : '/cop-emblem-blue.png';

  const renderEmblem = (imgSize: number) => (
    <img
      src={emblemSrc}
      alt="Cathedral of Praise Official Emblem"
      width={imgSize}
      height={imgSize}
      style={{
        width: `${imgSize}px`,
        height: `${imgSize}px`,
        objectFit: 'contain',
      }}
      className="shrink-0 drop-shadow-sm select-none"
      loading="eager"
      decoding="async"
    />
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderEmblem(pixelHeight)}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#002080] border border-blue-500/40 shadow-sm select-none ${className}`}
      >
        {renderEmblem(pixelHeight)}
        <div className="flex flex-col justify-center leading-none">
          <span
            className="text-white font-extrabold uppercase whitespace-nowrap"
            style={{
              fontFamily:
                "'Plus Jakarta Sans', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: '0.12em',
              fontSize: `${Math.round(pixelHeight * 0.44)}px`,
              lineHeight: 1,
            }}
          >
            CATHEDRAL OF PRAISE
          </span>
          {showSubtitle && (
            <span
              className="text-cyan-300 font-mono font-semibold tracking-wider mt-1 text-[10px]"
              style={{ lineHeight: 1 }}
            >
              NOC COMMAND &amp; INCIDENT MONITOR
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {renderEmblem(pixelHeight)}

      {withText && (
        <div className="flex flex-col justify-center leading-none">
          {/* Official Wordmark: CATHEDRAL OF PRAISE in exact bold uppercase typography */}
          <span
            className="text-white font-extrabold uppercase whitespace-nowrap tracking-wider"
            style={{
              fontFamily:
                "'Plus Jakarta Sans', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: '0.12em',
              fontSize: `${Math.round(pixelHeight * 0.44)}px`,
              lineHeight: 1,
            }}
          >
            CATHEDRAL OF PRAISE
          </span>

          {showSubtitle && (
            <span
              className="text-cyan-400 font-mono font-semibold tracking-widest mt-1 whitespace-nowrap"
              style={{
                fontSize: `${Math.max(9, Math.round(pixelHeight * 0.25))}px`,
                lineHeight: 1,
              }}
            >
              NOC COMMAND &amp; INCIDENT MONITOR
            </span>
          )}
        </div>
      )}
    </div>
  );
};
