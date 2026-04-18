import { BigQuery } from '@google-cloud/bigquery';

// Singleton — reused across API route invocations in the same process.
// Uses Application Default Credentials (ADC) — no keys in code.
// Locally: gcloud auth application-default login
// Cloud Run: attached service account
let _bq: BigQuery | null = null;

export function getBQClient(): BigQuery {
  if (!_bq) {
    _bq = new BigQuery({ projectId: 'qqq-anomaly-lab' });
  }
  return _bq;
}

export const DATASET = 'qqq_finance';
export const PROJECT = 'qqq-anomaly-lab';

// Helper: run a parameterized query and return typed rows
export async function runQuery<T>(
  query: string,
  params?: Record<string, string | number | boolean>
): Promise<T[]> {
  const bq = getBQClient();
  const [rows] = await bq.query({
    query,
    params,
    location: 'US',
  });
  return rows as T[];
}
