import type { Metadata } from 'next';

import Content from './content.mdx';

export const metadata: Metadata = {
  title: 'Run the demonstration',
  description:
    'Start the durable agent tree demo and reproduce process loss and Temporal recovery.',
};

export default function RunItPage() {
  return <Content />;
}
