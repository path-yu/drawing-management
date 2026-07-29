import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Children,
  isValidElement,
  ReactElement,
} from 'react';
import {
  WaterfallContainerProps,
  WaterfallItemLayout,
  ResponsiveColumns,
} from './types';
import { WaterfallContext } from './WaterfallContext';

function resolveColumnCount(
  columns: number | ResponsiveColumns | undefined,
  width: number
): number {
  if (typeof columns === 'number' && columns > 0) {
    return columns;
  }
  if (typeof columns === 'object' && columns !== null) {
    if (width >= 1536 && columns['2xl']) return columns['2xl'];
    if (width >= 1280 && columns.xl) return columns.xl;
    if (width >= 1024 && columns.lg) return columns.lg;
    if (width >= 768 && columns.md) return columns.md;
    if (width >= 640 && columns.sm) return columns.sm;
    return columns.default || 3;
  }
  // Default fallback if nothing specified: responsive by width
  if (width >= 1280) return 4;
  if (width >= 768) return 3;
  if (width >= 640) return 2;
  return 1;
}

export const WaterfallContainer: React.FC<WaterfallContainerProps> = ({
  columns = { default: 2, sm: 2, md: 3, lg: 4, xl: 4 },
  gap = 16,
  rowGap,
  columnGap,
  virtual = true,
  overscan = 400,
  height,
  scrollMode = 'container',
  className = '',
  style,
  children,
  onEndReached,
  onEndReachedThreshold = 300,
  onRenderMetricsChange,
  emptyState,
}) => {
  const gapX = columnGap !== undefined ? columnGap : gap;
  const gapY = rowGap !== undefined ? rowGap : gap;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Container sizing state
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerScrollTop, setContainerScrollTop] = useState<number>(0);
  const [containerClientHeight, setContainerClientHeight] = useState<number>(600);

  // Dynamic height map reported by Waterfall.Item or explicit props
  const itemHeightsRef = useRef<Map<string | number, number>>(new Map());
  const [heightVersion, setHeightVersion] = useState(0);

  // Measure container width and client height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      const style = getComputedStyle(el);
      const pLeft = parseInt(style.paddingLeft, 10) || 0;
      const pRight = parseInt(style.paddingRight, 10) || 0;
      const widthVal = el.clientWidth - pLeft - pRight;
      if (widthVal !== containerWidth) {
        setContainerWidth(widthVal);
      }
      if (scrollMode === 'container') {
        const heightVal = el.clientHeight || window.innerHeight * 0.7;
        setContainerClientHeight(heightVal);
      } else {
        setContainerClientHeight(window.innerHeight);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollMode, containerWidth]);

  // Window scroll handler if scrollMode === 'window'
  useEffect(() => {
    if (scrollMode !== 'window') return;

    const handleWindowScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Relative scrollTop within the waterfall area
      const scrollTop = Math.max(0, -rect.top);
      setContainerScrollTop(scrollTop);
      setContainerClientHeight(window.innerHeight);
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('resize', handleWindowScroll, { passive: true });
    handleWindowScroll();

    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('resize', handleWindowScroll);
    };
  }, [scrollMode]);

  // Scroll handler for scrollMode === 'container'
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (scrollMode !== 'container') return;
      const target = e.currentTarget;
      const scrollTop = target.scrollTop;
      const clientHeight = target.clientHeight;
      const scrollHeight = target.scrollHeight;

      setContainerScrollTop(scrollTop);
      setContainerClientHeight(clientHeight);

      // Check onEndReached
      if (
        onEndReached &&
        scrollHeight > 0 &&
        scrollTop + clientHeight >= scrollHeight - onEndReachedThreshold
      ) {
        onEndReached();
      }
    },
    [scrollMode, onEndReached, onEndReachedThreshold]
  );

  // Also check onEndReached for window scroll
  useEffect(() => {
    if (scrollMode !== 'window' || !onEndReached) return;
    const handleCheckEnd = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const full = document.documentElement.scrollHeight;
      if (full - scrolled <= onEndReachedThreshold) {
        onEndReached();
      }
    };
    window.addEventListener('scroll', handleCheckEnd, { passive: true });
    return () => window.removeEventListener('scroll', handleCheckEnd);
  }, [scrollMode, onEndReached, onEndReachedThreshold]);

  // Calculate Column Count and Width
  const columnCount = useMemo(() => {
    const count = resolveColumnCount(columns, containerWidth || 1024);
    return Math.max(1, count);
  }, [columns, containerWidth]);

  const columnWidth = useMemo(() => {
    if (containerWidth <= 0 || columnCount <= 0) return 0;
    const totalGapWidth = (columnCount - 1) * gapX;
    return Math.max(10, Math.floor((containerWidth - totalGapWidth) / columnCount));
  }, [containerWidth, columnCount, gapX]);

  // Callback for children to register dynamically measured heights
  const registerItemHeight = useCallback(
    (id: string | number, heightVal: number) => {
      const prev = itemHeightsRef.current.get(id);
      if (prev !== heightVal) {
        itemHeightsRef.current.set(id, heightVal);
        setHeightVersion((v) => v + 1);
      }
    },
    []
  );

  // Flatten and inspect children
  const childrenArray = useMemo(() => {
    const list: Array<{
      id: string | number;
      element: ReactElement;
      explicitHeight?: number;
      aspectRatio?: number;
    }> = [];

    Children.forEach(children, (child, index) => {
      if (isValidElement(child)) {
        const el = child as ReactElement<Record<string, any>>;
        const id = el.props.id ?? el.key ?? `item-${index}`;
        list.push({
          id,
          element: el,
          explicitHeight: el.props.height,
          aspectRatio: el.props.aspectRatio,
        });
      }
    });

    return list;
  }, [children]);

  // Masonry layout engine: compute top, left, col for every item
  const { layouts, totalHeight, calcTimeMs } = useMemo(() => {
    const start = performance.now();
    const colHeights = new Array(columnCount).fill(0);
    const result: WaterfallItemLayout[] = [];

    const defaultEstimatedHeight = 240;

    for (let i = 0; i < childrenArray.length; i++) {
      const item = childrenArray[i];
      const { id, explicitHeight, aspectRatio } = item;

      // Determine item height
      let h = itemHeightsRef.current.get(id);
      if (h === undefined) {
        if (typeof explicitHeight === 'number' && explicitHeight > 0) {
          h = explicitHeight;
        } else if (typeof aspectRatio === 'number' && aspectRatio > 0 && columnWidth > 0) {
          h = Math.round(columnWidth / aspectRatio);
        } else {
          h = defaultEstimatedHeight;
        }
      }

      // Find shortest column
      let targetCol = 0;
      let minH = colHeights[0];
      for (let c = 1; c < columnCount; c++) {
        if (colHeights[c] < minH) {
          minH = colHeights[c];
          targetCol = c;
        }
      }

      const top = colHeights[targetCol];
      const left = targetCol * (columnWidth + gapX);

      result.push({
        id,
        index: i,
        top,
        left,
        width: columnWidth,
        height: h,
        column: targetCol,
      });

      colHeights[targetCol] = top + h + gapY;
    }

    const maxColHeight = Math.max(...colHeights);
    const totalH = Math.max(0, maxColHeight - (childrenArray.length > 0 ? gapY : 0));
    const end = performance.now();

    return {
      layouts: result,
      totalHeight: totalH,
      calcTimeMs: Number((end - start).toFixed(2)),
    };
  }, [childrenArray, columnCount, columnWidth, gapX, gapY, heightVersion]);

  // Virtual Scroll Intersection Culling
  const visibleLayouts = useMemo(() => {
    if (!virtual) {
      return layouts;
    }

    const minVisibleY = Math.max(0, containerScrollTop - overscan);
    const maxVisibleY = containerScrollTop + containerClientHeight + overscan;

    return layouts.filter((layout) => {
      const itemBottom = layout.top + layout.height;
      return itemBottom >= minVisibleY && layout.top <= maxVisibleY;
    });
  }, [virtual, layouts, containerScrollTop, containerClientHeight, overscan]);

  // Report performance metrics
  useEffect(() => {
    if (!onRenderMetricsChange) return;
    const totalItems = layouts.length;
    const renderedItems = visibleLayouts.length;
    const savedCount = Math.max(0, totalItems - renderedItems);
    const savedPercent =
      totalItems > 0 ? Math.round((savedCount / totalItems) * 100) : 0;

    onRenderMetricsChange({
      totalItems,
      renderedItems,
      domNodesSavedCount: savedCount,
      domNodesSavedPercent: savedPercent,
      totalHeight,
      columnCount,
      columnWidth,
      calcTimeMs,
    });
  }, [
    layouts.length,
    visibleLayouts.length,
    totalHeight,
    columnCount,
    columnWidth,
    calcTimeMs,
    onRenderMetricsChange,
  ]);

  // Context value for children
  const contextValue = useMemo(
    () => ({
      columnWidth,
      gapX,
      gapY,
      registerItemHeight,
      virtual,
    }),
    [columnWidth, gapX, gapY, registerItemHeight, virtual]
  );

  // Determine outer container styling
  const containerStyle: React.CSSProperties = {
    ...style,
    width: '100%',
    ...(scrollMode === 'container' && {
      height:
        typeof height === 'number'
          ? `${height}px`
          : height || '700px',
      overflowY: 'auto',
      overflowX: 'hidden',
    }),
    ...(scrollMode === 'window' && {
      height: 'auto',
      overflow: 'visible',
    }),
  };

  if (childrenArray.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`w-full flex items-center justify-center py-16 ${className}`}
        style={containerStyle}
      >
        {emptyState || (
          <div className="text-center text-zinc-500">
            <p className="text-base font-medium">No items to display in Waterfall</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <WaterfallContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`relative ${className}`}
        style={containerStyle}
      >
        {/* Inner spacer box matching the exact masonry total height */}
        <div
          ref={contentRef}
          className="relative w-full"
          style={{
            height: `${totalHeight}px`,
            minHeight: '100px',
          }}
        >
          {visibleLayouts.map((layout) => {
            const childObj = childrenArray[layout.index];
            if (!childObj) return null;

            return (
              <div
                key={layout.id}
                style={{
                  position: 'absolute',
                  top: `${layout.top}px`,
                  left: `${layout.left}px`,
                  width: `${columnWidth}px`,
                  transition: 'top 0.25s cubic-bezier(0.2, 0, 0, 1), left 0.25s cubic-bezier(0.2, 0, 0, 1), width 0.2s ease',
                  willChange: 'top, left',
                }}
              >
                {childObj.element}
              </div>
            );
          })}
        </div>
      </div>
    </WaterfallContext.Provider>
  );
};
