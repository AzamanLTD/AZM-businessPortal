/**
 * Invoice PDF Generator — uses the browser's native print-to-PDF.
 *
 * Opens a new window with a print-optimized invoice layout and auto-triggers
 * the print dialog. The user can "Save as PDF" from there. No external
 * dependencies required — works on all browsers, produces high-quality vector PDF.
 *
 * Usage:
 *   import { generateInvoicePDF } from '@/lib/invoicePdf';
 *   generateInvoicePDF(invoice, businessProfile);
 */

function fmtUSD(n) {
  const v = Number(n) || 0;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function generateInvoicePDF(invoice, bizProfile = {}) {
  const bizName = bizProfile.businessName || 'Business';
  const bizAddress = bizProfile.address || '';
  const bizPhone = bizProfile.phoneNumber || '';
  const bizEmail = bizProfile.contactEmail || '';
  const bizLogo = bizProfile.logoUrl || '';
  const bizId = bizProfile.bizId || '';

  const customerName = invoice.customer?.username || 'Customer';
  const customerId = invoice.customer?.azamanId || '';
  const invRef = invoice.invoiceRef || `INV-${invoice.id}`;
  const invStatus = invoice.status || 'DRAFT';
  const createdAt = formatDate(invoice.createdAt);
  const sentAt = formatDate(invoice.sentAt);
  const paidAt = formatDate(invoice.paidAt);
  const dueDate = invoice.dueDate ? formatDate(invoice.dueDate) : '';

  const locationLabel = invoice.location?.label || '';
  const locationAddress = invoice.location?.address || '';
  const tableLabel = invoice.table?.label || '';

  const lineItems = invoice.lineItems || [];
  const taxLines = invoice.taxLines || [];

  const subtotal = fmtUSD(invoice.subtotalUsdc);
  const billTotal = fmtUSD(invoice.billTotalUsdc);
  const paidAmount = invoice.status === 'PAID' && invoice.customerPaidUsdc != null
    ? fmtUSD(invoice.customerPaidUsdc)
    : billTotal;

  const tip = invoice.status === 'PAID' && Number(invoice.tipUsdc) > 0
    ? fmtUSD(invoice.tipUsdc) : null;
  const fee = invoice.status === 'PAID' && Number(invoice.feeUsdc) > 0
    ? fmtUSD(invoice.feeUsdc) : null;

  const businessNote = invoice.businessNote || '';
  const customerNote = invoice.customerNote || '';

  // Build the HTML for print
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${invRef}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a2e; background: #f5f5f5; padding: 20px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .invoice-container {
    max-width: 800px; margin: 0 auto; background: #fff;
    border-radius: 12px; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,0.08);
  }
  .invoice-inner { padding: 48px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .biz-info { display: flex; align-items: center; gap: 16px; }
  .biz-logo { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; }
  .biz-logo-placeholder { width: 56px; height: 56px; border-radius: 12px; background: #00d97e; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: #fff; }
  .biz-name { font-size: 20px; font-weight: 700; color: #1a1a2e; }
  .biz-details { font-size: 12px; color: #666; margin-top: 4px; line-height: 1.5; }
  .invoice-meta { text-align: right; }
  .invoice-title { font-size: 28px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
  .invoice-ref { font-size: 14px; color: #666; margin-top: 4px; font-family: monospace; }
  .status-badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    margin-top: 8px;
  }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-sent { background: #dbeafe; color: #1e40af; }
  .status-draft { background: #f3f4f6; color: #6b7280; }
  .status-void { background: #fee2e2; color: #991b1b; }

  /* Dates */
  .dates { display: flex; gap: 32px; margin-bottom: 32px; padding: 16px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; }
  .date-item { display: flex; flex-direction: column; }
  .date-label { font-size: 10px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
  .date-value { font-size: 14px; color: #1a1a2e; margin-top: 4px; }

  /* Parties */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .party-block { padding: 20px; background: #f9fafb; border-radius: 10px; }
  .party-label { font-size: 10px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .party-name { font-size: 15px; font-weight: 600; color: #1a1a2e; }
  .party-sub { font-size: 12px; color: #666; margin-top: 2px; font-family: monospace; }
  .party-detail { font-size: 12px; color: #666; margin-top: 6px; }

  /* Line items table */
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .items-table th {
    text-align: left; padding: 10px 12px; background: #f9fafb;
    font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;
    border-bottom: 2px solid #e5e7eb;
  }
  .items-table th.right { text-align: right; }
  .items-table th.center { text-align: center; }
  .items-table td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  .items-table td.right { text-align: right; font-family: monospace; }
  .items-table td.center { text-align: center; font-family: monospace; }
  .items-table td.desc { color: #1a1a2e; font-weight: 500; }

  /* Totals */
  .totals { margin-left: auto; width: 280px; margin-bottom: 24px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .total-row .label { color: #666; }
  .total-row .value { font-family: monospace; color: #1a1a2e; }
  .total-row.grand { border-top: 2px solid #1a1a2e; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; }
  .total-row.grand .value { color: #00d97e; }

  /* Notes */
  .notes-section { margin-bottom: 24px; }
  .notes-label { font-size: 10px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .notes-content { font-size: 13px; color: #666; padding: 12px 16px; background: #f9fafb; border-radius: 8px; }
  .notes-content + .notes-content { margin-top: 8px; }

  /* Footer */
  .footer { text-align: center; padding: 24px 0 0; border-top: 1px solid #eee; margin-top: 16px; }
  .footer-text { font-size: 11px; color: #999; }
  .footer-brand { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-bottom: 4px; }

  /* Print */
  @media print {
    body { background: #fff; padding: 0; }
    .invoice-container { box-shadow: none; border-radius: 0; max-width: 100%; }
    @page { margin: 0.5in; size: A4; }
    .no-print { display: none; }
  }
  .print-btn {
    position: fixed; top: 20px; right: 20px; z-index: 100;
    padding: 10px 20px; background: #00d97e; color: #fff; border: none;
    border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,217,126,0.3); transition: all 0.2s;
  }
  .print-btn:hover { background: #00c46d; transform: translateY(-1px); }
</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="invoice-container">
    <div class="invoice-inner">
      <!-- Header -->
      <div class="header">
        <div class="biz-info">
          ${bizLogo
            ? `<img class="biz-logo" src="${bizLogo}" alt="${bizName}" />`
            : `<div class="biz-logo-placeholder">${(bizName || 'B').charAt(0).toUpperCase()}</div>`
          }
          <div>
            <div class="biz-name">${bizName}</div>
            <div class="biz-details">
              ${bizAddress ? bizAddress + '<br>' : ''}
              ${bizPhone ? bizPhone + '<br>' : ''}
              ${bizEmail ? bizEmail : ''}
              ${bizId ? '<br>ID: ' + bizId : ''}
            </div>
          </div>
        </div>
        <div class="invoice-meta">
          <div class="invoice-title">Invoice</div>
          <div class="invoice-ref">${invRef}</div>
          <span class="status-badge status-${invStatus.toLowerCase()}">${invStatus}</span>
        </div>
      </div>

      <!-- Dates -->
      <div class="dates">
        <div class="date-item">
          <span class="date-label">Issued</span>
          <span class="date-value">${createdAt}</span>
        </div>
        ${sentAt !== '—' ? `
        <div class="date-item">
          <span class="date-label">Sent</span>
          <span class="date-value">${sentAt}</span>
        </div>` : ''}
        ${paidAt !== '—' ? `
        <div class="date-item">
          <span class="date-label">Paid</span>
          <span class="date-value">${paidAt}</span>
        </div>` : ''}
        ${dueDate ? `
        <div class="date-item">
          <span class="date-label">Due</span>
          <span class="date-value">${dueDate}</span>
        </div>` : ''}
      </div>

      <!-- Parties -->
      <div class="parties">
        <div class="party-block">
          <div class="party-label">Billed To</div>
          <div class="party-name">${customerName}</div>
          ${customerId ? `<div class="party-sub">Azaman ID: ${customerId}</div>` : ''}
        </div>
        <div class="party-block">
          <div class="party-label">Location</div>
          ${locationLabel ? `<div class="party-name">${locationLabel}</div>` : '<div class="party-name">—</div>'}
          ${locationAddress ? `<div class="party-detail">${locationAddress}</div>` : ''}
          ${tableLabel ? `<div class="party-detail">Table: ${tableLabel}</div>` : ''}
        </div>
      </div>

      <!-- Line items -->
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="center">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map(li => `
            <tr>
              <td class="desc">${li.description || '—'}</td>
              <td class="center">${li.quantity || 1}</td>
              <td class="right">${fmtUSD(li.unitPrice)}</td>
              <td class="right">${fmtUSD(li.lineTotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals">
        <div class="total-row">
          <span class="label">Subtotal</span>
          <span class="value">${subtotal}</span>
        </div>
        ${taxLines.map(t => `
        <div class="total-row">
          <span class="label">${t.name || 'Tax'}${t.type === 'PERCENTAGE' ? ` (${t.value}%)` : ''}</span>
          <span class="value">${fmtUSD(t.computedAmount)}</span>
        </div>
        `).join('')}
        ${tip ? `
        <div class="total-row">
          <span class="label">Tip</span>
          <span class="value">${tip}</span>
        </div>` : ''}
        ${fee ? `
        <div class="total-row">
          <span class="label">Platform Fee</span>
          <span class="value" style="color:#999;">${fee}</span>
        </div>` : ''}
        <div class="total-row grand">
          <span class="label">${invStatus === 'PAID' ? 'Total Paid' : 'Amount Due'}</span>
          <span class="value">${paidAmount}</span>
        </div>
      </div>

      <!-- Notes -->
      ${(businessNote || customerNote) ? `
      <div class="notes-section">
        ${businessNote ? `
        <div class="notes-label">Business Note</div>
        <div class="notes-content">${businessNote}</div>` : ''}
        ${customerNote ? `
        <div class="notes-label" style="margin-top:12px;">Customer Note</div>
        <div class="notes-content">${customerNote}</div>` : ''}
      </div>` : ''}

      <!-- Footer -->
      <div class="footer">
        <div class="footer-brand">${bizName}</div>
        <div class="footer-text">Powered by AZAMAN — Secure crypto & mobile money payments</div>
      </div>
    </div>
  </div>
  <script>
    // Auto-trigger print dialog after a brief delay
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>`;

  // Open in a new window
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Please allow popups to generate the invoice PDF.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}
