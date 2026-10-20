import React from 'react';
import { ApiDocsPage } from '../pages/docs/ApiDocsPage';

interface ApiIntegrationViewProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidebar?: () => void;
  onViewChange?: (view: string) => void;
}

export default function ApiIntegrationView({
  onViewChange
}: ApiIntegrationViewProps) {
  return (
    <ApiDocsPage 
      onBackToDashboard={() => {
        window.history.pushState({}, '', '/');
        onViewChange?.('developer');
      }} 
    />
  );
}
