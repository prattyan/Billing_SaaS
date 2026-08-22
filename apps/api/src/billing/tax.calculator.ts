import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface TaxBreakdown {
  taxableAmount: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  totalTax: Decimal;
}

export interface LineItemCalc {
  itemId: string;
  qty: Decimal;
  mrp: Decimal;
  priceAtSale: Decimal;
  taxPercent: Decimal;
  taxAmount: Decimal;
  lineTotal: Decimal;
}

/**
 * Tax calculation service.
 * All arithmetic uses Decimal.js — zero floating-point errors.
 *
 * GST Mode: CGST+SGST (intra-state) — splits tax 50/50.
 * For inter-state (IGST), set isInterState = true.
 */
export class TaxCalculator {
  /**
   * Calculate tax for a single line item.
   * price is the per-unit price (inclusive of GST if taxIncluded=true).
   */
  static calculateLineItem(
    qty: number,
    pricePerUnit: number,
    taxPercent: number,
    taxIncluded = false,
  ): { taxableAmount: Decimal; taxAmount: Decimal; lineTotal: Decimal } {
    const qtyD = new Decimal(qty);
    const priceD = new Decimal(pricePerUnit);
    const taxRateD = new Decimal(taxPercent).div(100);

    let taxableAmount: Decimal;
    let taxAmount: Decimal;
    let lineTotal: Decimal;

    if (taxIncluded) {
      // Price is tax-inclusive: taxable = price / (1 + rate)
      lineTotal = qtyD.mul(priceD);
      taxableAmount = lineTotal.div(new Decimal(1).plus(taxRateD));
      taxAmount = lineTotal.minus(taxableAmount);
    } else {
      // Price is tax-exclusive: tax added on top
      taxableAmount = qtyD.mul(priceD);
      taxAmount = taxableAmount.mul(taxRateD);
      lineTotal = taxableAmount.plus(taxAmount);
    }

    return {
      taxableAmount: taxableAmount.toDecimalPlaces(2),
      taxAmount: taxAmount.toDecimalPlaces(2),
      lineTotal: lineTotal.toDecimalPlaces(2),
    };
  }

  /**
   * Split tax into CGST + SGST (intra-state) or IGST (inter-state).
   */
  static splitTax(
    totalTax: Decimal,
    taxPercent: Decimal,
    isInterState = false,
  ): TaxBreakdown {
    const taxableAmount = totalTax.div(taxPercent.div(100));

    if (isInterState) {
      return {
        taxableAmount: taxableAmount.toDecimalPlaces(2),
        cgst: new Decimal(0),
        sgst: new Decimal(0),
        igst: totalTax.toDecimalPlaces(2),
        totalTax: totalTax.toDecimalPlaces(2),
      };
    }

    const halfTax = totalTax.div(2).toDecimalPlaces(2);
    // Ensure rounding doesn't lose a paisa
    const cgst = halfTax;
    const sgst = totalTax.minus(cgst).toDecimalPlaces(2);

    return {
      taxableAmount: taxableAmount.toDecimalPlaces(2),
      cgst,
      sgst,
      igst: new Decimal(0),
      totalTax: totalTax.toDecimalPlaces(2),
    };
  }

  /**
   * Calculate full bill totals from line items.
   */
  static calculateBill(
    lineItems: Array<{
      qty: number;
      priceAtSale: number;
      taxPercent: number;
    }>,
    billDiscount = 0,
  ): {
    subtotal: Decimal;
    taxTotal: Decimal;
    discount: Decimal;
    grandTotal: Decimal;
  } {
    let subtotal = new Decimal(0);
    let taxTotal = new Decimal(0);

    for (const item of lineItems) {
      const { taxableAmount, taxAmount } = this.calculateLineItem(
        item.qty,
        item.priceAtSale,
        item.taxPercent,
      );
      subtotal = subtotal.plus(taxableAmount);
      taxTotal = taxTotal.plus(taxAmount);
    }

    const discount = new Decimal(billDiscount).toDecimalPlaces(2);
    const grandTotal = subtotal.plus(taxTotal).minus(discount).toDecimalPlaces(2);

    return {
      subtotal: subtotal.toDecimalPlaces(2),
      taxTotal: taxTotal.toDecimalPlaces(2),
      discount,
      grandTotal: grandTotal.isNegative() ? new Decimal(0) : grandTotal,
    };
  }
}
