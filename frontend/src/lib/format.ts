// Format currency from micros (1,000,000 = 1 EUR)
export function formatCurrency(micros: string | number | null | undefined, currency = 'EUR'): string {
  if (micros === null || micros === undefined || micros === '') return '-';
  const value = typeof micros === 'string' ? parseFloat(micros) : micros;
  if (isNaN(value)) return '-';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 1000000);
}

// Format number with thousands separator
export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('it-IT').format(num);
}

// Format percentage
export function formatPercent(
  value: string | number | null | undefined,
  decimals = 2,
): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return `${num.toFixed(decimals)}%`;
}

// Format CTR (already a percentage)
export function formatCtr(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return `${num.toFixed(2)}%`;
}

// Format Quality Score
export function formatQualityScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${value}/10`;
}

// Format impression share (0.65 -> 65%)
export function formatImpressionShare(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return `${(num * 100).toFixed(1)}%`;
}

// Format ROAS
export function formatRoas(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}x`;
}

// Status badge variants
export function getStatusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status?.toUpperCase()) {
    case 'ENABLED':
      return 'default';
    case 'PAUSED':
      return 'secondary';
    case 'REMOVED':
      return 'destructive';
    default:
      return 'outline';
  }
}

// Ad strength badge variants
export function getAdStrengthVariant(
  strength: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (strength?.toUpperCase()) {
    case 'EXCELLENT':
      return 'default';
    case 'GOOD':
      return 'secondary';
    case 'AVERAGE':
    case 'POOR':
      return 'destructive';
    default:
      return 'outline';
  }
}

// Quality score color
export function getQualityScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-muted-foreground';
  if (score >= 7) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
}

// Match type display
export function formatMatchType(matchType: string): string {
  switch (matchType?.toUpperCase()) {
    case 'EXACT':
      return '[exact]';
    case 'PHRASE':
      return '"phrase"';
    case 'BROAD':
      return 'broad';
    default:
      return matchType || '-';
  }
}
