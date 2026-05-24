import type { ComponentType } from 'react';

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  action?: string;
  className?: string;
}

declare const TurnstileWidget: ComponentType<TurnstileWidgetProps>;

export default TurnstileWidget;
