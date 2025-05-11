import React from 'react';

const LeadDetailPage = ({ params }: { params: { id: string } }) => {
  return (
    <div>Lead Detail Page for ID: {params.id}</div>
  );
};

export default LeadDetailPage;
