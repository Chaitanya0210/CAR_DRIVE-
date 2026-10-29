/**
 * Money utilities for GroupDrive.
 * All amounts are stored as integer paise (1 Rupee = 100 paise) to prevent floating-point inaccuracies.
 */

export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new TypeError('Rupees value must be a finite number');
  }
  return Math.round(rupees * 100);
}

export function toRupees(paise: number): number {
  if (!Number.isSafeInteger(paise)) {
    throw new TypeError('Paise value must be a safe integer');
  }
  return paise / 100;
}

export interface FormatPaiseOptions {
  includeSymbol?: boolean;
  showDecimal?: boolean;
}

export function formatPaise(
  paise: number,
  options: FormatPaiseOptions = { includeSymbol: true, showDecimal: false },
): string {
  if (!Number.isSafeInteger(paise)) {
    throw new TypeError(`Paise must be a safe integer, received: ${paise}`);
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;

  // Format integer part using Indian numbering system
  const rupeesStr = rupees.toString();
  let formattedRupees = '';

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.substring(rupeesStr.length - 3);
    const otherNumbers = rupeesStr.substring(0, rupeesStr.length - 3);
    const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${formattedOther},${lastThree}`;
  }

  let result = formattedRupees;
  if (options.showDecimal) {
    result += `.${remainingPaise.toString().padStart(2, '0')}`;
  }

  if (options.includeSymbol) {
    result = `₹${result}`;
  }

  return isNegative ? `-${result}` : result;
}
