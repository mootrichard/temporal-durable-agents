import type { ReactNode } from 'react';

export function AgentInvocation({
  invocation,
  prompt,
}: {
  invocation: ReactNode;
  prompt: ReactNode;
}) {
  return (
    <div className="agent-invocation">
      <section aria-label="Agent invocation">
        <p className="code-column-label">Invocation</p>
        {invocation}
      </section>
      <section aria-label="Prompt sent to the agent">
        <p className="code-column-label">Prompt source</p>
        {prompt}
      </section>
    </div>
  );
}
