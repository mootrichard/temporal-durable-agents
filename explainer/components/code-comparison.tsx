'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';

export function CodeComparison({
  original,
  temporal,
}: {
  original: ReactNode;
  temporal: ReactNode;
}) {
  const [version, setVersion] = useState<'original' | 'temporal'>('temporal');
  const id = useId();

  return (
    <div className="code-comparison">
      <div aria-label="Implementation version" className="code-version-tabs" role="tablist">
        <button
          aria-controls={`${id}-original`}
          aria-selected={version === 'original'}
          id={`${id}-original-tab`}
          onClick={() => setVersion('original')}
          role="tab"
          type="button"
        >
          Original process
        </button>
        <button
          aria-controls={`${id}-temporal`}
          aria-selected={version === 'temporal'}
          id={`${id}-temporal-tab`}
          onClick={() => setVersion('temporal')}
          role="tab"
          type="button"
        >
          With Temporal
        </button>
      </div>
      <div
        aria-labelledby={`${id}-original-tab`}
        hidden={version !== 'original'}
        id={`${id}-original`}
        role="tabpanel"
      >
        {original}
      </div>
      <div
        aria-labelledby={`${id}-temporal-tab`}
        hidden={version !== 'temporal'}
        id={`${id}-temporal`}
        role="tabpanel"
      >
        {temporal}
      </div>
    </div>
  );
}
