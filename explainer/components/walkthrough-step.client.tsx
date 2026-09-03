'use client';

import { Selectable } from 'codehike/utils/selection';
import type { ReactNode } from 'react';

type WalkthroughStepProps = {
  children: ReactNode;
  index: number;
  label?: string;
  owner: string;
  title?: string;
};

export function WalkthroughStep({
  children,
  index,
  label = 'State owner',
  owner,
  title,
}: WalkthroughStepProps) {
  return (
    <Selectable
      aria-label={`Show code for ${title ?? `step ${index + 1}`}`}
      className="walkthrough-step"
      index={index}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      role="button"
      selectOn={['click', 'scroll']}
      tabIndex={0}
    >
      <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
      <div className="step-copy">
        <p className="owner-label">{label} · {owner}</p>
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
    </Selectable>
  );
}
