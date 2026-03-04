import { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { getPeriodEntityMetrics, type EntityMetrics, type PeriodEntityMetricsResponse } from '@/api/audit';
import type { AuditLayoutContext } from '@/components/Layout/AuditLayout';

/**
 * Hook that fetches period-filtered entity metrics from daily_metrics.
 * Returns a metrics map (entityId -> metrics) that can be used to overlay
 * period-filtered data on entity tables.
 */
export function usePeriodEntityMetrics(entityType: string) {
  const { accountId } = useParams<{ accountId: string }>();
  const { period } = useOutletContext<AuditLayoutContext>();
  const [data, setData] = useState<PeriodEntityMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const result = await getPeriodEntityMetrics(
        accountId,
        entityType,
        period.dateFrom,
        period.dateTo,
      );
      setData(result);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, entityType, period.dateFrom, period.dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Get period-filtered metrics for a specific entity.
   * Returns null if no daily data is available.
   */
  const getEntityMetrics = useCallback(
    (entityId: string): EntityMetrics | null => {
      if (!data?.hasData || !data.metrics[entityId]) return null;
      return data.metrics[entityId];
    },
    [data],
  );

  return {
    periodData: data,
    hasData: data?.hasData ?? false,
    isLoading,
    getEntityMetrics,
  };
}
