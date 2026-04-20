import { BigQuery, type BigQueryOptions } from '@google-cloud/bigquery';

// Singleton — reused across API route invocations in the same process.
//
// Credentials resolution order:
//   1. GCP_SERVICE_ACCOUNT_JSON env var — full service-account JSON as a
//      single string. Used on Vercel (and any host that can't provide
//      Application Default Credentials natively).
//   2. Application Default Credentials — used locally via
//      `gcloud auth application-default login`, or on Cloud Run / GCE
//      where the attached service account is picked up automatically.
let _bq: BigQuery | null = null;

export function getBQClient(): BigQuery {
  if (!_bq) {
    const options: BigQueryOptions = { projectId: 'qqq-anomaly-lab' };
    const inlineJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (inlineJson) {
      const creds = JSON.parse(inlineJson);
      options.credentials = {
        client_email: creds.client_email,
        private_key:  creds.private_key,
      };
    }
    _bq = new BigQuery(options);
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
