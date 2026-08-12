export function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

let inrFormatter: Intl.NumberFormat | null = null;

function getInrFormatter(): Intl.NumberFormat {
  if (!inrFormatter) {
    inrFormatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return inrFormatter;
}

export function formatINR(value: number): string {
  const amount = round2(value);
  const formatted = getInrFormatter().format(amount);
  if (formatted.includes("₹")) {
    return formatted;
  }
  const plain = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `₹${plain}`;
}