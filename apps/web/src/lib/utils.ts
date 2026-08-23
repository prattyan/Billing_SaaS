import { format } from 'date-fns';

/**
 * Returns the public customer-facing digital invoice URL.
 */
export function getPublicInvoiceUrl(billId: string): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('onrender.com') || (!hostname.includes('localhost') && !hostname.includes('127.0.0.1') && !hostname.includes('192.168.'))) {
      return `${window.location.origin}/bill/${billId}`;
    }
  }
  return `https://billing-saas-web.onrender.com/bill/${billId}`;
}

/**
 * Generates the clean, universally compatible WhatsApp bill text matching the thermal shop receipt
 * without problematic multi-byte emojis that turn into question marks on WhatsApp clients.
 */
export function formatWhatsAppBillMessage(bill: any, invoiceUrl: string): string {
  const storeName = bill.tenant?.name || 'Store';
  const billNumber = bill.billNumber || '';
  const dateStr = bill.createdAt
    ? format(new Date(bill.createdAt), 'dd/MM/yyyy hh:mm a')
    : format(new Date(), 'dd/MM/yyyy hh:mm a');
  const grandTotal = Number(bill.grandTotal || 0).toFixed(2);
  const paymentMode = bill.paymentMode || 'CASH';

  const phoneStr = bill.customer?.phone && !bill.customer.phone.startsWith('GUEST-') ? ` (${bill.customer.phone})` : '';
  const customerName = bill.customer?.name && bill.customer.name !== 'Walk-in Customer'
    ? `${bill.customer.name}${phoneStr}`
    : (bill.customer?.phone && !bill.customer.phone.startsWith('GUEST-') || bill.customerPhone ? `Walk-in (${bill.customer?.phone || bill.customerPhone})` : 'Walk-in');

  let itemsSummary = '';
  if (bill.items && Array.isArray(bill.items) && bill.items.length > 0) {
    itemsSummary = '\n*Items:*\n' + bill.items.slice(0, 5).map((it: any) => 
      `• ${it.itemNameAtSale} (x${Number(it.qty).toFixed(0)}) = Rs. ${Number(it.lineTotal).toFixed(2)}`
    ).join('\n');
    if (bill.items.length > 5) {
      itemsSummary += `\n...and ${bill.items.length - 5} more items`;
    }
    itemsSummary += '\n--------------------------------';
  }

  return `*TAX INVOICE: ${storeName}*\n================================\n*Invoice No:* ${billNumber}\n*Date:* ${dateStr}\n*Customer:* ${customerName}\n*Payment:* ${paymentMode}${itemsSummary}\n*TOTAL AMOUNT: Rs. ${grandTotal}*\n================================\n*View & Download Full Shop Receipt:*\n${invoiceUrl}\n\n*THANK YOU FOR SHOPPING!*`;
}
