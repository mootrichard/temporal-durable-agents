import Link from 'next/link';

const loop = [
  ['01', 'Observe', 'Read the goal and current state.'],
  ['02', 'Decide', 'Choose the next action.'],
  ['03', 'Act', 'Use a tool or delegate work.'],
  ['04', 'Evaluate', 'Read the result and repeat.'],
];

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="intro-hero page-shell">
        <p className="eyebrow">Agent orchestration walkthrough</p>
        <h1>One bug. Two execution models.</h1>
        <p className="hero-summary">
          A coordinator delegates two investigations of a retry bug. The
          walkthrough compares process-owned orchestration with Temporal Event
          History.
        </p>
      </section>

      <section aria-labelledby="boundary-title" className="scope-statement page-shell">
        <p className="section-label">Design choice</p>
        <div>
          <h2 id="boundary-title">Make the agent protocol explicit</h2>
          <p>
            Codex supplies planning and investigation. Application code owns
            dispatch, joins, and recovery. This boundary works for local or remote
            agents and makes the failure mode visible.
          </p>
        </div>
      </section>

      <section aria-labelledby="job-title" className="stage-section page-shell">
        <div className="section-heading compact-heading">
          <p className="section-label">The job</p>
          <h2 id="job-title">Fix one retry bug</h2>
        </div>
        <div className="agent-tree" role="list">
          <article className="agent-node coordinator-node" role="listitem">
            <span>Coordinator</span>
            <strong>Plan and implement</strong>
          </article>
          <article className="agent-node" role="listitem">
            <span>Investigator 1</span>
            <strong>Inspect source</strong>
          </article>
          <article className="agent-node" role="listitem">
            <span>Investigator 2</span>
            <strong>Inspect tests</strong>
          </article>
          <article className="agent-node" role="listitem">
            <span>Test runner</span>
            <strong>Reproduce the bug</strong>
          </article>
        </div>
      </section>

      <section aria-labelledby="loop-title" className="loop-section">
        <div className="page-shell">
          <div className="section-heading compact-heading">
            <p className="section-label">The agentic loop</p>
            <h2 id="loop-title">Each result becomes the next input</h2>
          </div>
          <ol className="loop-grid">
            {loop.map(([number, title, copy]) => (
              <li key={number}>
                <span>{number}</span>
                <strong>{title}</strong>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
          <p className="delegation-note">
            The coordinator returns a plan. The application starts two Codex
            threads, waits for their reports, then resumes the coordinator.
          </p>
        </div>
      </section>

      <section aria-labelledby="scenarios-title" className="scenario-section page-shell">
        <div className="section-heading compact-heading">
          <p className="section-label">The walkthrough</p>
          <h2 id="scenarios-title">Follow the same work twice</h2>
        </div>
        <div className="scenario-cards">
          <Link className="scenario-card" href="/walkthrough/">
            <span>Scenario 1</span>
            <h3>Process-owned orchestration</h3>
            <p>The worker owns dispatch state, joins, and the next step.</p>
            <strong>Trace the failure →</strong>
          </Link>
          <Link className="scenario-card temporal-card" href="/temporal/">
            <span>Scenario 2</span>
            <h3>History-owned orchestration</h3>
            <p>Temporal records progress. A replacement worker continues the run.</p>
            <strong>Trace the recovery →</strong>
          </Link>
        </div>
      </section>
    </main>
  );
}
