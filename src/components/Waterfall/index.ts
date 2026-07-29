import { WaterfallContainer } from './WaterfallContainer';
import { WaterfallItem } from './WaterfallItem';
import {
  WaterfallContainerProps,
  WaterfallItemProps,
  WaterfallMetrics,
  WaterfallItemLayout,
  ResponsiveColumns,
} from './types';

// Compound component export
export const Waterfall = {
  Container: WaterfallContainer,
  Item: WaterfallItem,
};

// Named exports
export {
  WaterfallContainer,
  WaterfallItem,
};

// Type exports
export type {
  WaterfallContainerProps,
  WaterfallItemProps,
  WaterfallMetrics,
  WaterfallItemLayout,
  ResponsiveColumns,
};

export default Waterfall;
