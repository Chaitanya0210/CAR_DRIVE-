export type LanguageCode = 'en' | 'hi' | 'mr';

/**
 * Formats a number using the Indian Numbering System (Lakh and Crore commas).
 * Example: 1250000 -> "12,50,000", 10000000 -> "1,00,00,000"
 */
export function formatIndianNumber(num: number): string {
  if (!Number.isFinite(num)) {
    return '0';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const parts = absNum.toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';

  if (integerPart.length <= 3) {
    return `${isNegative ? '-' : ''}${integerPart}${decimalPart}`;
  }

  const lastThree = integerPart.substring(integerPart.length - 3);
  const rest = integerPart.substring(0, integerPart.length - 3);
  const formattedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${isNegative ? '-' : ''}${formattedRest},${lastThree}${decimalPart}`;
}

/**
 * Formats integer paise into localized Lakh / Crore representations with Indian Rupee symbol.
 * E.g., 125000000 paise (₹12,50,000) ->
 *   - en: "₹12.50 Lakh"
 *   - hi: "₹12.50 लाख"
 *   - mr: "₹12.50 लाख"
 * E.g., 1500000000 paise (₹1,50,00,000) ->
 *   - en: "₹1.50 Crore"
 *   - hi: "₹1.50 करोड़"
 *   - mr: "₹1.50 कोटी"
 */
export function formatLakhCrore(paise: number, lang: LanguageCode = 'en'): string {
  if (!Number.isSafeInteger(paise)) {
    return '₹0';
  }

  const isNegative = paise < 0;
  const absRupees = Math.abs(paise) / 100;

  const unitLabels = {
    en: { crore: 'Crore', lakh: 'Lakh', thousand: 'K' },
    hi: { crore: 'करोड़', lakh: 'लाख', thousand: 'हजार' },
    mr: { crore: 'कोटी', lakh: 'लाख', thousand: 'हजार' },
  };

  const labels = unitLabels[lang] || unitLabels.en;

  let formatted = '';
  if (absRupees >= 10000000) {
    // 1 Crore or more
    const crores = absRupees / 10000000;
    formatted = `${crores.toFixed(2)} ${labels.crore}`;
  } else if (absRupees >= 100000) {
    // 1 Lakh or more
    const lakhs = absRupees / 100000;
    formatted = `${lakhs.toFixed(2)} ${labels.lakh}`;
  } else {
    formatted = formatIndianNumber(Math.round(absRupees));
  }

  return `${isNegative ? '-' : ''}₹${formatted}`;
}
