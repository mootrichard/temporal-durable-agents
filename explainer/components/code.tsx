import {
  type AnnotationHandler,
  InnerLine,
  Pre,
  type RawCode,
  highlight,
} from 'codehike/code';

import { PreWithFocus } from './focus.client';

const focus: AnnotationHandler = {
  name: 'focus',
  onlyIfAnnotated: true,
  PreWithRef: PreWithFocus,
  Line: (props) => <InnerLine merge={props} className="code-line" />,
  AnnotatedLine: ({ annotation: _annotation, ...props }) => (
    <InnerLine merge={props} className="code-line code-line-focus" data-focus="true" />
  ),
};

const lineNumbers: AnnotationHandler = {
  name: 'line-numbers',
  Line: (props) => (
    <div className="numbered-line">
      <span aria-hidden="true" className="line-number">
        {props.lineNumber}
      </span>
      <InnerLine merge={props} />
    </div>
  ),
};

type CodeProps = {
  codeblock: RawCode;
  compact?: boolean;
};

export async function Code({ codeblock, compact = false }: CodeProps) {
  const highlighted = await highlight(codeblock, 'github-dark-dimmed');
  const filename = highlighted.meta || languageLabel(highlighted.lang);
  const sourcePath = sourcePathFromMeta(highlighted.meta);

  return (
    <figure className={`code-frame${compact ? ' code-frame-compact' : ''}`}>
      <figcaption>
        <span aria-hidden="true" className="window-controls">
          <i />
          <i />
          <i />
        </span>
        <span className="code-source">
          {sourcePath ? (
            <a
              aria-label={`Open ${sourcePath} on GitHub`}
              className="code-source-link"
              href={githubSourceUrl(sourcePath)}
              rel="noreferrer"
              target="_blank"
            >
              {filename}<span aria-hidden="true"> ↗</span>
            </a>
          ) : filename}
        </span>
        <span className="code-language">{languageLabel(highlighted.lang)}</span>
      </figcaption>
      <Pre
        code={highlighted}
        handlers={[focus, lineNumbers]}
        style={highlighted.style}
      />
    </figure>
  );
}

function sourcePathFromMeta(meta: string): string | undefined {
  return meta.match(/^(src\/[^\s·]+|fixture\/[^\s·]+|tests\/[^\s·]+|scripts\/[^\s·]+)/)?.[1];
}

function githubSourceUrl(sourcePath: string): string {
  const encodedPath = sourcePath.split('/').map(encodeURIComponent).join('/');
  return `https://github.com/mootrichard/temporal-durable-agents/blob/main/${encodedPath}`;
}

function languageLabel(language: string): string {
  if (language === 'ts' || language === 'typescript') return 'TypeScript';
  if (language === 'bash' || language === 'shell') return 'Shell';
  if (language === 'diff') return 'Diff';
  if (language === 'json') return 'JSON';
  return language || 'Text';
}
