var test = require('node:test');
var assert = require('node:assert/strict');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');

function riceOrder(coupon) {
  var items = [{
    id: 1,
    sku: 'GRN-001',
    name: 'Rice',
    hsn: '1006',
    price: 1000,
    qty: 3
  }];
  var totals = pricing.computeTotals(items, coupon || '');

  return {
    id: 1001,
    date: '01/01/2026',
    customer: 'Test customer',
    paymentMode: 'cash',
    status: 'completed',
    items: items,
    coupon: coupon || '',
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total
  };
}

test('invoice matches billed HSN GST when order lines contain HSN but no gstRate', function () {
  var order = riceOrder('');
  var billed = pricing.computeTotals(order.items, order.coupon);
  var invoiced = invoice.computeInvoiceFigures(order);

  assert.equal(billed.subtotal, 3000);
  assert.equal(billed.tax, 150);
  assert.equal(billed.total, 3150);
  assert.equal(billed.lines[0].gstPercent, 5);

  assert.equal(invoiced.subtotal, 3000);
  assert.equal(invoiced.tax, 150);
  assert.equal(invoiced.total, 3150);
  assert.equal(invoiced.rows[0].gstPercent, 5);
});

test('invoice matches billed coupon cap and post-discount GST calculation', function () {
  var order = riceOrder('SAVE10');
  var billed = pricing.computeTotals(order.items, order.coupon);
  var invoiced = invoice.computeInvoiceFigures(order);

  assert.equal(billed.discount, 150);
  assert.equal(billed.tax, 142.5);
  assert.equal(billed.total, 2992.5);

  assert.equal(invoiced.discount, 150);
  assert.equal(invoiced.tax, 142.5);
  assert.equal(invoiced.total, 2992.5);
  assert.equal(invoiced.rows[0].line, 3000);
  assert.equal(invoiced.rows[0].lineTax, 142.5);
});

test('rendered invoice shows billed GST and total without a reconciliation mismatch', function () {
  var order = riceOrder('SAVE10');
  var html = invoice.render(order);

  assert.match(html, /5%/);
  assert.match(html, /₹142\.50/);
  assert.match(html, /Invoice Total<\/td><td class="r">₹2992\.50/);
  assert.doesNotMatch(html, /differs from Order Ledger recorded total/);
});
