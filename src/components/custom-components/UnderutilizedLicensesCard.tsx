"use client";
import React from 'react';

export type UnderutilizedAppItem = {
  appName: string;
  instanceName: string;
  iconUrl?: string;
  accountsCount: number;
};

export type UnderutilizedLicensesCardProps = {
  title?: string;
  organizationName?: string;
  totalLicenses: number;
  underutilizedCount: number;
  utilizationThresholdPercent: number;
  measurementPeriodDays: number;
  apps?: UnderutilizedAppItem[];
  lastUpdatedIso?: string;
  linkToReport?: string;
  /**
   * When true, renders loading placeholders and progressively reveals
   * content for a streamed-like experience while data is being prepared.
   */
  isLoading?: boolean;
  /**
   * When true, the card reveals sections (header → KPI → list → cta)
   * with small staged delays on mount for a more streamed feel.
   */
  progressive?: boolean;
};

export const UnderutilizedLicensesCard: React.FC<UnderutilizedLicensesCardProps> = ({
  title = 'Underutilized Licenses',
  organizationName,
  totalLicenses,
  underutilizedCount,
  utilizationThresholdPercent,
  measurementPeriodDays,
  apps,
  lastUpdatedIso,
  linkToReport,
  isLoading = false,
  progressive = false,
}) => {
  const percentage = totalLicenses > 0 ? Math.round((underutilizedCount / totalLicenses) * 100) : 0;
  const lastUpdated = lastUpdatedIso ? new Date(lastUpdatedIso).toLocaleString() : undefined;

  // Staged reveal when progressive=true
  const [stage, setStage] = React.useState<number>(progressive ? 0 : 3);
  React.useEffect(() => {
    if (!progressive) return;
    const t1 = setTimeout(() => setStage(1), 150);
    const t2 = setTimeout(() => setStage(2), 350);
    const t3 = setTimeout(() => setStage(3), 650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [progressive]);

  const showKpi = stage >= 1;
  const showList = stage >= 2;
  const showCta = stage >= 3;

  return (
    <div className="rounded-lg border p-4 min-w-sm max-w-lg bg-background" aria-busy={isLoading}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold mb-1">{title}{organizationName ? ` · ${organizationName}` : ''}</h4>
        </div>
        {showKpi ? (
          <div className="text-right">
            {isLoading ? (
              <div className="h-6 w-12 rounded bg-muted animate-pulse" />
            ) : (
              <div className="text-xl font-bold">{underutilizedCount}</div>
            )}
          </div>
        ) : (
          <div className="text-right">
            <div className="h-6 w-10 rounded bg-muted animate-pulse" />
          </div>
        )}
      </div>

      {showList ? (
        Array.isArray(apps) && apps.length > 0 ? (
          <div className="mt-4">
            <div className="text-xs font-medium mb-2">Apps with underutilized accounts</div>
            <ul className="divide-y">
              {(apps.slice(0, 5)).map((a, idx) => (
                <li key={`${a.appName}:${a.instanceName}`} className="flex items-center justify-between py-2 gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="bg-gradient-to-b from-[#fafafa] to-[#f1f1f3] rounded-md p-1.5">
                      {isLoading ? (
                        <div className="h-6 w-6 rounded bg-muted animate-pulse" />
                      ) : a.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.iconUrl} alt={a.appName} className="h-6 w-6 rounded" />
                      ) : (
                        <div className="h-6 w-6 rounded bg-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      {isLoading ? (
                        <>
                          <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                          <div className="h-3 w-20 rounded bg-muted animate-pulse mt-1" />
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-medium text-foreground truncate">{a.appName}</div>
                          <div className="text-xs text-muted-foreground truncate">{a.instanceName}</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-100 text-slate-900 text-[12px] font-medium rounded-full px-2.5 py-0.5 whitespace-nowrap">
                    {isLoading ? (
                      <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                    ) : (
                      <>{a.accountsCount} Accounts</>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null
      ) : (
        <div className="mt-4 space-y-2">
          <div className="h-3 w-44 rounded bg-muted animate-pulse" />
          <div className="h-10 w-full rounded bg-muted animate-pulse" />
          <div className="h-10 w-full rounded bg-muted animate-pulse" />
          <div className="h-10 w-3/4 rounded bg-muted animate-pulse" />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
      </div>
      <div className="mt-4">
        {showCta ? (
          <button className="bg-slate-900 text-slate-50 rounded-md px-4 py-2 text-sm font-medium w-full">
            Initiate Access review
          </button>
        ) : (
          <div className="h-9 w-full rounded bg-muted animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default UnderutilizedLicensesCard;


