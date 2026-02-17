import React from 'react';
import { Panel } from '../../ui/Panel';
import { DocumentationCTA } from '../../ui/DocumentationCTA';

export const DocumentationPanel: React.FC = () => {
  return (
    <Panel>
      <DocumentationCTA />
    </Panel>
  );
};