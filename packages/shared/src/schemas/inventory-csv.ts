import { z } from 'zod';

export const InventoryCsvRowSchema = z.object({
  vin: z
    .string()
    .min(11, 'VIN must be at least 11 characters')
    .max(17, 'VIN must not exceed 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]+$/i, 'VIN contains invalid characters (I, O, Q not permitted)'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().min(1, 'Variant is required'),
  year: z.coerce
    .number()
    .int()
    .min(2018, 'Manufacture year must be 2018 or later')
    .max(new Date().getFullYear() + 1, 'Manufacture year cannot be in the distant future'),
  odometer: z.coerce.number().int().min(0, 'Odometer cannot be negative'),
  regularPrice: z.coerce.number().positive('Regular price must be greater than zero'),
  offerPrice: z.coerce.number().positive('Offer price must be greater than zero'),
  color: z.string().min(1, 'Color is required'),
  fuel: z.enum(['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'], {
    errorMap: () => ({ message: 'Fuel must be PETROL, DIESEL, CNG, ELECTRIC, or HYBRID' }),
  }),
  transmission: z.enum(['MANUAL', 'AUTOMATIC', 'AMT', 'CVT', 'DCT'], {
    errorMap: () => ({ message: 'Transmission must be MANUAL, AUTOMATIC, AMT, CVT, or DCT' }),
  }),
  category: z.enum(['CLEARANCE', 'DEMO', 'PREVIOUS_YEAR'], {
    errorMap: () => ({ message: 'Category must be CLEARANCE, DEMO, or PREVIOUS_YEAR' }),
  }),
  warranty: z.string().min(1, 'Warranty terms are required'),
});

export type InventoryCsvRow = z.infer<typeof InventoryCsvRowSchema>;

export interface CsvValidationRowResult {
  rowNumber: number;
  data: Partial<InventoryCsvRow>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface InventoryCsvValidationReport {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  rows: CsvValidationRowResult[];
}

/**
 * Validates a batch of parsed CSV rows against business rules:
 * - Duplicate VINs within file
 * - DEMO vehicles require odometer > 0
 * - offerPrice < regularPrice
 * - Unrealistic discount warning (> 60% or < 2%)
 */
export function validateInventoryCsvRows(
  rawRows: Array<Record<string, unknown>>,
  existingVins: Set<string> = new Set(),
): InventoryCsvValidationReport {
  const seenVinsInBatch = new Set<string>();
  const results: CsvValidationRowResult[] = [];

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];
    const warnings: string[] = [];

    const parseResult = InventoryCsvRowSchema.safeParse(rawRow);
    const rowData = (parseResult.success ? parseResult.data : rawRow) as Partial<InventoryCsvRow>;

    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        errors.push(`${issue.path.join('.') || 'row'}: ${issue.message}`);
      }
    } else {
      const data = parseResult.data;
      const normalizedVin = data.vin.toUpperCase();

      // Rule 1: Duplicate VIN check
      if (seenVinsInBatch.has(normalizedVin)) {
        errors.push(
          `Duplicate VIN '${normalizedVin}' found in row ${rowNumber} (duplicate within batch)`,
        );
      } else if (existingVins.has(normalizedVin)) {
        errors.push(`VIN '${normalizedVin}' already registered on platform`);
      }
      seenVinsInBatch.add(normalizedVin);

      // Rule 2: DEMO vehicle odometer check
      if (data.category === 'DEMO' && data.odometer <= 0) {
        errors.push('Demo/test-drive vehicles must have an odometer reading greater than 0 km');
      }

      // Rule 3: Price discount check
      if (data.offerPrice >= data.regularPrice) {
        errors.push(
          `Offer price (₹${data.offerPrice.toLocaleString('en-IN')}) must be strictly less than regular price (₹${data.regularPrice.toLocaleString('en-IN')})`,
        );
      } else {
        const discountPercent = ((data.regularPrice - data.offerPrice) / data.regularPrice) * 100;
        if (discountPercent > 60) {
          warnings.push(
            `Unusually high discount: ${discountPercent.toFixed(1)}% off. Please verify pricing.`,
          );
        }
        if (discountPercent < 1) {
          warnings.push(`Negligible discount: ${discountPercent.toFixed(1)}% off.`);
        }
      }
    }

    results.push({
      rowNumber,
      data: rowData,
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  });

  const validRowsCount = results.filter((r) => r.isValid).length;

  return {
    totalRows: results.length,
    validRowsCount,
    invalidRowsCount: results.length - validRowsCount,
    rows: results,
  };
}
