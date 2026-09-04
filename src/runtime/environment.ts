export function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function temporalAddress(): string {
  return process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
}
