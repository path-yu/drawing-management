import { useState, useRef, useMemo, UIEvent, CSSProperties } from 'react';

export interface VirtualListProps<T> {
  /** 所有数据列表 */
  items: T[];
  /** 单个列表项的固定高度 (px) */
  itemHeight: number;
  /** 容器的可视高度 (px) */
  height: number;
  /** 上下额外渲染的节点数，防止快速滚动时白屏 (默认: 3) */
  overscan?: number;
  /** 自定义渲染单个 Item 的回调函数 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 容器额外类名 */
  className?: string;
  /** 容器内联样式 */
  style?: CSSProperties;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  overscan = 3,
  renderItem,
  className = '',
  style,
}: VirtualListProps<T>) {
  // 1. 记录当前滚动的位置 scrollTop
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 2. 计算总数据量与总列表高度
  const totalCount = items.length;
  const totalHeight = totalCount * itemHeight;

  // 3. 计算可视区域能容纳的最大 Item 数量
  const visibleCount = Math.ceil(height / itemHeight);

  // 4. 根据 scrollTop 计算当前应该渲染的起始索引和结束索引
  const { startIndex, visibleItems, offsetY } = useMemo(() => {
    // 粗略计算起始索引
    const rawStart = Math.floor(scrollTop / itemHeight);
    
    // 加上 overscan 边界处理
    const start = Math.max(0, rawStart - overscan);
    const end = Math.min(totalCount, rawStart + visibleCount + overscan);

    // 切片取出当前需要渲染的数据列表
    const visibleData = items.slice(start, end);

    // 内部容器偏移量（通过 translateY 保持滚动条准确且内容处于可视区内）
    const topOffset = start * itemHeight;

    return {
      startIndex: start,
      visibleItems: visibleData,
      offsetY: topOffset,
    };
  }, [scrollTop, itemHeight, totalCount, visibleCount, overscan, items]);

  // 5. 监听滚动事件，更新 scrollTop
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`relative overflow-y-auto ${className}`}
      style={{
        height: `${height}px`,
        ...style,
      }}
    >
      {/* 1. 撑开实际滚动高度的占位盒（保持滚动条真实大小） */}
      <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
        {/* 2. 真实渲染区域，使用 transform 将节点平移至当前视口区域 */}
        <div
          style={{
            transform: `translate3d(0, ${offsetY}px, 0)`,
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={actualIndex}
                style={{
                  height: `${itemHeight}px`,
                  boxSizing: 'border-box',
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}