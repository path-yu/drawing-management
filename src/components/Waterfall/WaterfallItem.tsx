import React, { useEffect, useRef } from 'react';
import { WaterfallItemProps } from './types';
import { useWaterfallContext } from './WaterfallContext';

export const WaterfallItem: React.FC<WaterfallItemProps> = ({
  id,
  height,
  aspectRatio,
  className = '',
  style,
  children,
  onMeasure,
}) => {
  const { columnWidth, registerItemHeight } = useWaterfallContext();
  const elementRef = useRef<HTMLDivElement>(null);
  const lastReportedHeightRef = useRef<number | null>(null);

  // Compute immediate height if possible
  const calculatedHeight = React.useMemo(() => {
    if (typeof height === 'number' && height > 0) {
      return height;
    }
    if (typeof aspectRatio === 'number' && aspectRatio > 0 && columnWidth > 0) {
      return Math.round(columnWidth / aspectRatio);
    }
    return undefined;
  }, [height, aspectRatio, columnWidth]);

  // Report calculated height immediately if known
  useEffect(() => {
    if (id === undefined || id === null) return;
    if (calculatedHeight !== undefined && lastReportedHeightRef.current !== calculatedHeight) {
      lastReportedHeightRef.current = calculatedHeight;
      registerItemHeight(id, calculatedHeight);
      onMeasure?.(id, calculatedHeight);
    }
  }, [id, calculatedHeight, registerItemHeight, onMeasure]);

  // Dynamic height measurement with ResizeObserver for unknown heights or dynamic changes
  useEffect(() => {
    if (id === undefined || id === null) return;
    const el = elementRef.current;
    if (!el) return;

    // If explicit height or aspectRatio is provided, we still observe in case content grows,
    // but only update if there's a significant difference (> 2px) to prevent unnecessary layout loops
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const borderBoxHeight = entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height;
        const measuredHeight = Math.ceil(borderBoxHeight);

        if (measuredHeight > 0) {
          const prev = lastReportedHeightRef.current;
          if (prev === null || Math.abs(prev - measuredHeight) > 2) {
            lastReportedHeightRef.current = measuredHeight;
            registerItemHeight(id, measuredHeight);
            onMeasure?.(id, measuredHeight);
          }
        }
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [id, registerItemHeight, onMeasure]);

  return (
    <div
      ref={elementRef}
      className={`transition-opacity duration-200 ${className}`}
      style={{
        width: columnWidth > 0 ? `${columnWidth}px` : '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
