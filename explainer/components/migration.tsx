import { Block, CodeBlock, parseRoot } from 'codehike/blocks';
import { Selection, SelectionProvider } from 'codehike/utils/selection';
import type { RawCode } from 'codehike/code';
import type { MDXContent } from 'mdx/types';
import { z } from 'zod';

import { AgentInvocation } from './agent-invocation';
import { Code } from './code';
import { CodeComparison } from './code-comparison';
import { WalkthroughStep } from './walkthrough-step.client';

const MigrationSchema = Block.extend({
  steps: z.array(
    Block.extend({
      before: CodeBlock,
      after: CodeBlock,
      prompt: CodeBlock.optional(),
      change: z.string(),
    }),
  ),
});

export function Migration({ content }: { content: unknown }) {
  type Step = {
    title?: string;
    children?: React.ReactNode;
    before: RawCode;
    after: RawCode;
    prompt?: RawCode;
    change: string;
  };
  const { steps } = parseRoot(
    content as MDXContent,
    MigrationSchema as never,
  ) as { steps: Step[] };

  return (
    <SelectionProvider className="walkthrough migration">
      <div className="walkthrough-steps">
        {steps.map((step, index) => (
          <WalkthroughStep
            index={index}
            key={`${index}-${step.title ?? 'step'}`}
            label="Code change"
            owner={step.change}
            title={step.title}
          >
            {step.children}
          </WalkthroughStep>
        ))}
      </div>
      <aside aria-label="Original and Temporal code" className="walkthrough-code">
        <div className="code-sticky">
          <p className="code-pane-label">Compare the implementation</p>
          <Selection
            from={steps.map((step) => {
              const comparison = (
                <CodeComparison
                  original={<Code codeblock={step.before} />}
                  temporal={<Code codeblock={step.after} />}
                />
              );

              return step.prompt ? (
                <AgentInvocation
                  invocation={comparison}
                  key={step.title ?? step.before.meta}
                  prompt={<Code codeblock={step.prompt} />}
                />
              ) : (
                <CodeComparison
                  key={step.title ?? step.before.meta}
                  original={<Code codeblock={step.before} />}
                  temporal={<Code codeblock={step.after} />}
                />
              );
            })}
          />
        </div>
      </aside>
    </SelectionProvider>
  );
}
