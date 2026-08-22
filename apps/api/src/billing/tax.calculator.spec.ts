import { TaxCalculator } from './tax.calculator';
import Decimal from 'decimal.js';

describe('TaxCalculator', () => {
  describe('calculateLineItem', () => {
    it('should accurately calculate GST on tax-exclusive price with Decimal precision', () => {
      // 3 units @ ₹45.50 with 18% GST
      const result = TaxCalculator.calculateLineItem(3, 45.5, 18, false);

      expect(result.taxableAmount.toString()).toBe('136.5');
      expect(result.taxAmount.toString()).toBe('24.57');
      expect(result.lineTotal.toString()).toBe('161.07');
    });

    it('should accurately reverse calculate tax for tax-inclusive pricing without fractional paisa drift', () => {
      // 1 unit @ ₹100 MRP with 5% tax included
      const result = TaxCalculator.calculateLineItem(1, 100, 5, true);

      expect(result.taxableAmount.toString()).toBe('95.24');
      expect(result.taxAmount.toString()).toBe('4.76');
      expect(result.lineTotal.toString()).toBe('100');
    });
  });

  describe('splitTax', () => {
    it('should split intra-state GST 50/50 into CGST and SGST without rounding loss', () => {
      const totalTax = new Decimal('24.57');
      const taxPercent = new Decimal('18');

      const split = TaxCalculator.splitTax(totalTax, taxPercent, false);

      expect(split.cgst.toString()).toBe('12.29');
      expect(split.sgst.toString()).toBe('12.28'); // 12.29 + 12.28 = 24.57 (balanced)
      expect(split.cgst.plus(split.sgst).toString()).toBe('24.57');
      expect(split.igst.toString()).toBe('0');
    });

    it('should assign full tax to IGST for inter-state sales', () => {
      const totalTax = new Decimal('50.00');
      const taxPercent = new Decimal('18');

      const split = TaxCalculator.splitTax(totalTax, taxPercent, true);

      expect(split.cgst.toString()).toBe('0');
      expect(split.sgst.toString()).toBe('0');
      expect(split.igst.toString()).toBe('50');
    });
  });

  describe('calculateBill', () => {
    it('should compute full bill totals with discount applied', () => {
      const lineItems = [
        { qty: 2, priceAtSale: 100, taxPercent: 12 }, // taxable: 200, tax: 24
        { qty: 1, priceAtSale: 50, taxPercent: 0 },    // taxable: 50, tax: 0
      ];

      const bill = TaxCalculator.calculateBill(lineItems, 20); // ₹20 discount

      expect(bill.subtotal.toString()).toBe('250');
      expect(bill.taxTotal.toString()).toBe('24');
      expect(bill.discount.toString()).toBe('20');
      expect(bill.grandTotal.toString()).toBe('254'); // 250 + 24 - 20 = 254
    });
  });
});
