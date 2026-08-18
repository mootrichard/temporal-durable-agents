# Retry helper fixture

`retry()` promises to call an operation at most `maxAttempts` times. One test
currently fails because the loop treats `maxAttempts` as a retry count instead
of a total-attempt count.

The demo copies this frozen fixture into an isolated run directory before any
agent is allowed to inspect or change it.
