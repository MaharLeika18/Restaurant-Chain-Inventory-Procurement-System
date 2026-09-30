import * as React from 'react';
import Alert from '@mui/material/Alert';
import { useLocation } from 'react-router';
import PageContainer from './PageContainer';

// Shown for sidebar links that don't have a page yet (the three Workflow pages,
// and the group headings like "Food" or "Sales").
const WORKFLOW_TAGS: Record<string, string> = {
  order_processing: 'Order Processing',
  inventory_operations: 'Inventory Operations',
  procurement_management: 'Procurement',
};

export default function ComingSoon() {
  const { pathname } = useLocation();
  const slug = pathname.split('/').filter(Boolean).pop() ?? '';
  const title = slug
    ? slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Page not found';
  const tag = WORKFLOW_TAGS[slug];

  return (
    <PageContainer title={title} breadcrumbs={[{ title }]}>
      <Alert severity="info">
        {tag
          ? `The "${title}" workflow page hasn't been built yet. The backend for it is ready: see the "${tag}" section at http://localhost:8000/docs.`
          : 'There is no page here. Pick one of the tables from the sidebar.'}
      </Alert>
    </PageContainer>
  );
}
