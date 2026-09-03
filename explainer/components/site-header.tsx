import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/">
        <span aria-hidden="true" className="wordmark-mark">
          <i />
          <i />
          <i />
        </span>
        <span>
          Durable agent repair
        </span>
      </Link>
      <nav aria-label="Explainer documentation">
        <Link href="/walkthrough/">1 · Agent tree</Link>
        <Link href="/temporal/">2 · Temporal</Link>
        <Link href="/run-it/">Run it</Link>
      </nav>
    </header>
  );
}
