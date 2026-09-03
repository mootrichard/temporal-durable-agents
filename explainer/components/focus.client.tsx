'use client';

import {
  type AnnotationHandler,
  InnerPre,
  getPreRef,
} from 'codehike/code';
import { useLayoutEffect, useRef } from 'react';

export const PreWithFocus: AnnotationHandler['PreWithRef'] = (props) => {
  const ref = getPreRef(props);
  useScrollToFocus(ref);
  return <InnerPre merge={props} />;
};

function useScrollToFocus(ref: React.RefObject<HTMLPreElement | null>) {
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    const pre = ref.current;
    if (!pre) return;

    const focusedLines = pre.querySelectorAll<HTMLElement>('[data-focus="true"]');
    if (focusedLines.length === 0) return;

    const container = pre.getBoundingClientRect();
    let top = Number.POSITIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;

    focusedLines.forEach((line) => {
      const bounds = line.getBoundingClientRect();
      top = Math.min(top, bounds.top - container.top);
      bottom = Math.max(bottom, bounds.bottom - container.top);
    });

    if (bottom > container.height || top < 0) {
      pre.scrollTo({
        behavior: firstRender.current ? 'instant' : 'smooth',
        top: pre.scrollTop + top - 24,
      });
    }
    firstRender.current = false;
  });
}
