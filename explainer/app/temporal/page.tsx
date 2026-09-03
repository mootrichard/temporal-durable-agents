import Link from 'next/link';
import type { Metadata } from 'next';

import { Migration } from '../../components/migration';
import Content from './content.mdx';

export const metadata: Metadata = {
  title: 'Scenario 2: Temporal recovery',
  description: 'Compare the original agent code with its Temporal replacement.',
};

const changes = [
  ['Direct Codex call', 'Activity'],
  ['Investigation method', 'Child Workflow'],
  ['Process snapshot', 'Workflow state'],
  ['Process restart', 'Workflow replay'],
];

export default function TemporalPage() {
  return (
    <main id="main-content">
      <header className="doc-hero page-shell">
        <p className="eyebrow">Scenario 2 · History-owned orchestration</p>
        <h1>Move orchestration state into Temporal</h1>
        <p>
          The agent protocol stays the same. Temporal records its decisions,
          completed results, and next step outside the Worker process.
        </p>
        <dl className="migration-map">
          {changes.map(([before, after]) => (
            <div key={before}>
              <dt>{before}</dt><dd>{after}</dd>
            </div>
          ))}
        </dl>
      </header>
      <section aria-label="Temporal migration code trace" className="walkthrough-shell page-shell">
        <Migration content={Content} />
      </section>
      <section aria-labelledby="recovery-title" className="recovery-summary page-shell">
        <p className="section-label">Recovery</p>
        <h2 id="recovery-title">The replacement Worker replays history</h2>
        <ol>
          <li>Temporal supplies completed Workflow and Child Workflow results.</li>
          <li>Temporal retries unfinished Activities.</li>
          <li>Heartbeat details help an Activity resume its Codex thread.</li>
          <li>The Workflow continues with the next recorded step.</li>
        </ol>
      </section>
      <section className="boundary-strip page-shell">
        <p><strong>Event History</strong> preserves orchestration progress.</p>
        <p><strong>Heartbeats</strong> preserve retry hints for active work.</p>
        <p><strong>Idempotency</strong> still protects external side effects.</p>
        <Link className="primary-link" href="/run-it/">Run the demo →</Link>
      </section>
    </main>
  );
}
