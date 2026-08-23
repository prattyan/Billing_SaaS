import BillInvoiceClient from './BillInvoiceClient';

export function generateStaticParams() {
  return [{ id: 'invoice' }];
}

export default function PublicBillInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  return <BillInvoiceClient params={params} />;
}
