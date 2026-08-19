import { afterEach, describe, expect, it, vi } from 'vitest';

import { withHeartbeatLease } from '../src/temporal/activities.js';

describe('Codex Activity heartbeat lease', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps heartbeating while a quiet Codex turn is running and stops afterward', async () => {
    vi.useFakeTimers();
    const heartbeat = vi.fn();
    let finish!: (value: string) => void;
    const task = new Promise<string>((resolve) => { finish = resolve; });

    const result = withHeartbeatLease(heartbeat, () => task, 10);
    expect(heartbeat).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(35);
    expect(heartbeat).toHaveBeenCalledTimes(4);

    finish('done');
    await expect(result).resolves.toBe('done');
    await vi.advanceTimersByTimeAsync(30);
    expect(heartbeat).toHaveBeenCalledTimes(4);
  });
});
