import { temporalAddress } from '../src/runtime/environment.js';
import { runPreflight } from '../src/runtime/preflight.js';

const preflight = await runPreflight(temporalAddress());

report('Codex authentication', preflight.codexLogin, preflight.codexReady);
report(
  'Temporal server',
  preflight.temporalReachable ? `${preflight.temporalAddress} reachable` : 'start with npm run temporal:up',
  preflight.temporalReachable,
);
report(
  'Codex runner',
  process.env.CODEX_MODEL ? `model override: ${process.env.CODEX_MODEL}` : 'inherits configured model',
  true,
);

process.exitCode = preflight.codexReady && preflight.temporalReachable ? 0 : 1;

function report(label: string, detail: string, okay: boolean): void {
  process.stdout.write(`${okay ? '✓' : '✗'} ${label}: ${detail}\n`);
}
