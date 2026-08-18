export type RecordedProcessTarget = {
  pid: number;
  processGroupId: number;
  ownerToken: string;
};

export function validateProcessTarget(
  target: RecordedProcessTarget,
  expectedOwnerToken: string,
): Pick<RecordedProcessTarget, 'pid' | 'processGroupId'> {
  if (target.ownerToken !== expectedOwnerToken) {
    throw new Error('Refusing to target a process owned by another supervisor');
  }
  if (!Number.isSafeInteger(target.pid) || target.pid <= 100) {
    throw new Error(`Refusing unsafe worker PID ${target.pid}`);
  }
  if (target.processGroupId !== target.pid) {
    throw new Error('Worker process groups must be detached groups led by the recorded PID');
  }
  return { pid: target.pid, processGroupId: target.processGroupId };
}

export function terminateProcessGroup(
  target: RecordedProcessTarget,
  expectedOwnerToken: string,
  signal: NodeJS.Signals = 'SIGTERM',
): void {
  const { processGroupId } = validateProcessTarget(target, expectedOwnerToken);
  try {
    process.kill(-processGroupId, signal);
  } catch (error) {
    const failure = error as NodeJS.ErrnoException;
    if (failure.code !== 'ESRCH') throw error;
  }
}
