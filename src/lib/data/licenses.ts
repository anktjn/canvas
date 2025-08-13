export type UnderutilizedLicensesSummary = {
  organizationName?: string;
  totalLicenses: number;
  underutilizedCount: number;
  utilizationThresholdPercent: number;
  measurementPeriodDays: number;
  topApps?: Array<{ appName: string; underutilizedCount: number }>;
  lastUpdatedIso?: string;
  linkToReport?: string;
};

export type FetchUnderutilizedLicensesInput = {
  organizationName?: string;
  utilizationThresholdPercent: number;
  measurementPeriodDays: number;
  topKApps?: number;
};

/**
 * Platform-level provider call: fetch from an external service if configured via env.
 *
 * Expected external API contract (GET):
 *   `${LICENSES_API_URL}/summary/underutilized?org=<name>&threshold=<0..100>&periodDays=<int>&topK=<int>`
 * Response JSON shape should match UnderutilizedLicensesSummary.
 */
export async function fetchUnderutilizedLicensesSummary(
  input: FetchUnderutilizedLicensesInput
): Promise<{ data?: UnderutilizedLicensesSummary; error?: string }> {
  const baseUrl = process.env.LICENSES_API_URL;
  if (!baseUrl) {
    return { error: 'LICENSES_API_URL not configured' };
  }
  try {
    const url = new URL('/summary/underutilized', baseUrl);
    if (input.organizationName) url.searchParams.set('org', input.organizationName);
    url.searchParams.set('threshold', String(input.utilizationThresholdPercent));
    url.searchParams.set('periodDays', String(input.measurementPeriodDays));
    if (typeof input.topKApps === 'number') url.searchParams.set('topK', String(input.topKApps));

    const res = await fetch(url.toString(), { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: `Upstream responded ${res.status}: ${text || res.statusText}` };
    }
    const data = (await res.json()) as UnderutilizedLicensesSummary;
    // Basic validation
    if (
      typeof data?.totalLicenses !== 'number' ||
      typeof data?.underutilizedCount !== 'number' ||
      typeof data?.utilizationThresholdPercent !== 'number' ||
      typeof data?.measurementPeriodDays !== 'number'
    ) {
      return { error: 'Invalid response from upstream' };
    }
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}


