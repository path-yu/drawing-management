import React, { ReactNode } from 'react';

export type ResponsiveColumns = {
  default: number;
  sm?: number; // >= 640px
  md?: number; // >= 768px
  lg?: number; // >= 1024px
  xl?: number; // >= 1280px
  '2xl'?: number; // >= 1536px
};

export interface WaterfallMetrics {
  totalItems: number;
  renderedItems: number;
  domNodesSavedCount: number;
  domNodesSavedPercent: number;
  totalHeight: number;
  columnCount: number;
  columnWidth: number;
  calcTimeMs: number;
}

export interface WaterfallItemLayout {
  id: string | number;
  index: number;
  top: number;
  left: number;
  width: number;
  height: number;
  column: number;
}

export interface WaterfallContainerProps {
  /**
   * Number of columns. Can be a fixed integer or responsive object,
   * e.g. { default: 2, sm: 3, md: 4, lg: 5 }
   */
  columns?: number | ResponsiveColumns;
  
  /**
   * Space between items and columns in pixels. Default is 16.
   */
  gap?: number;
  /**
   * Optional distinct row gap and column gap
   */
  rowGap?: number;
  columnGap?: number;

  /**
   * Whether Virtual Scrolling is enabled. Default is true.
   * When enabled, only items visible within the viewport (+ overscan) are rendered in the DOM.
   */
  virtual?: boolean;

  /**
   * Pixels above and below the viewport to pre-render.
   * Default is 400px.
   */
  overscan?: number;

  /**
   * Optional fixed height for container scroll mode (e.g. 700 or "700px" or "80vh").
   * If not provided or set to 'auto', it can adapt to window scroll or fill parent container.
   */
  height?: number | string;

  /**
   * Whether to scroll within the Container box ('container') or use the Window/Page scroll ('window').
   * Default is 'container'.
   */
  scrollMode?: 'container' | 'window';

  /**
   * Optional CSS class names for the outer container
   */
  className?: string;

  /**
   * Optional inline styles for the outer container
   */
  style?: React.CSSProperties;

  /**
   * Children items (<Waterfall.Item>)
   */
  children: ReactNode;

  /**
   * Callback fired when the scroll position reaches near the bottom
   */
  onEndReached?: () => void;

  /**
   * Distance in pixels from the bottom to trigger onEndReached. Default is 300.
   */
  onEndReachedThreshold?: number;

  /**
   * Callback providing real-time metrics on virtual rendering performance
   */
  onRenderMetricsChange?: (metrics: WaterfallMetrics) => void;

  /**
   * Custom empty state when there are no children
   */
  emptyState?: ReactNode;
}

export interface WaterfallItemProps {
  /**
   * Unique ID for the item. Recommended for accurate virtual scroll caching.
   */
  id?: string | number;

  /**
   * Explicit height in pixels if known in advance.
   * If not provided, height can be calculated from aspectRatio or measured via ResizeObserver.
   */
  height?: number;

  /**
   * Aspect ratio (width / height) if image or card aspect is known (e.g. 1.5, 0.75, 4/3).
   * Used to calculate height = columnWidth / aspectRatio instantly without layout shifts.
   */
  aspectRatio?: number;

  /**
   * Custom CSS class name for the item wrap
   */
  className?: string;

  /**
   * Custom inline style
   */
  style?: React.CSSProperties;

  /**
   * Children content
   */
  children: ReactNode;

  /**
   * Callback when this item is rendered or its dimensions change
   */
  onMeasure?: (id: string | number, height: number) => void;
}

export interface WaterfallContextValue {
  columnWidth: number;
  gapX: number;
  gapY: number;
  registerItemHeight: (id: string | number, height: number) => void;
  virtual: boolean;
}
