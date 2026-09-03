import Link from 'next/link';
import type { Metadata } from 'next';

import { Walkthrough } from '../../components/walkthrough';
import Content from './content.mdx';

export const metadata: Metadata = {
  title: 'Scenario 1: Process-owned orchestration',
  description: 'Trace the agent protocol and see why a worker kill loses its continuation.',
};

export default function WalkthroughPage() {
  return (
    <main id="main-content">
      <header className="doc-hero page-shell">
        <p className="eyebrow">Scenario 1 · Process-owned orchestration</p>
        <h1>Process memory owns the agent continuation</h1>
        <p>
          This coordinator-worker protocol matches the core subagent pattern. The
          coordinator delegates bounded work, waits, and combines the results.
        </p>
        <p className="excerpt-note">
          The application implements the protocol explicitly. This design exposes
          state ownership and supports local or remote agent workers.
        </p>
        <div className="flow-strip" aria-label="Agent repair sequence">
          <span>Plan</span><i aria-hidden="true">→</i>
          <span>Delegate</span><i aria-hidden="true">→</i>
          <span>Collect</span><i aria-hidden="true">→</i>
          <span>Implement</span><i aria-hidden="true">→</i>
          <span>Verify</span>
        </div>
      </header>
      <section aria-label="Process-owned orchestration code trace" className="walkthrough-shell page-shell">
        <Walkthrough content={Content} />
      </section>
      <section className="walkthrough-outro page-shell">
        <p className="section-label">The failure</p>
        <h2>The continuation has the wrong owner.</h2>
        <p>
          The agent protocol is valid. Process memory holds the active joins and
          the next step, so a kill removes the continuation.
        </p>
        <Link className="primary-link" href="/temporal/">Move the run into Temporal →</Link>
      </section>
    </main>
  );
}
