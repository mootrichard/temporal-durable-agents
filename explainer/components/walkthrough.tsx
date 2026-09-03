import { Block, CodeBlock, parseRoot } from 'codehike/blocks';
import {
  Selection,
  SelectionProvider,
} from 'codehike/utils/selection';
import { z } from 'zod';
import type { MDXContent } from 'mdx/types';
import type { RawCode } from 'codehike/code';

import { AgentInvocation } from './agent-invocation';
import { Code } from './code';
import { WalkthroughStep } from './walkthrough-step.client';

const WalkthroughSchema = Block.extend({
  steps: z.array(
    Block.extend({
      code: CodeBlock,
      prompt: CodeBlock.optional(),
      owner: z.string(),
    }),
  ),
});

export function Walkthrough({ content }: { content: unknown }) {
  type Step = {
    title?: string;
    children?: React.ReactNode;
    code: RawCode;
    prompt?: RawCode;
    owner: string;
  };
  const { steps } = parseRoot(
    content as MDXContent,
    WalkthroughSchema as never,
  ) as { steps: Step[] };

  return (
    <SelectionProvider className="walkthrough">
      <div className="walkthrough-steps">
        {steps.map((step, index) => (
          <WalkthroughStep
            index={index}
            key={`${index}-${step.title ?? 'step'}`}
            owner={step.owner}
            title={step.title}
          >
            {step.children}
          </WalkthroughStep>
        ))}
      </div>
      <aside aria-label="Selected implementation" className="walkthrough-code">
        <div className="code-sticky">
          <p className="code-pane-label">Implementation trace</p>
          <Selection
            from={steps.map((step) =>
              step.prompt ? (
                <AgentInvocation
                  invocation={<Code codeblock={step.code} />}
                  key={step.title ?? step.code.meta}
                  prompt={<Code codeblock={step.prompt} />}
                />
              ) : (
                <Code codeblock={step.code} key={step.title ?? step.code.meta} />
              ),
            )}
          />
        </div>
      </aside>
    </SelectionProvider>
  );
}
