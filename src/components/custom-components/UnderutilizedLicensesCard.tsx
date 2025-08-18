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
}) => {
  const percentage = totalLicenses > 0 ? Math.round((underutilizedCount / totalLicenses) * 100) : 0;
  const lastUpdated = lastUpdatedIso ? new Date(lastUpdatedIso).toLocaleString() : undefined;

  return (
    <div className="rounded-lg border p-4 min-w-sm max-w-lg bg-background">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold mb-1">{title}{organizationName ? ` · ${organizationName}` : ''}</h4>
        </div>
        {typeof percentage === 'number' ? (
          <div className="text-right">
            <div className="text-xl font-bold">{underutilizedCount}</div>
          </div>
        ) : null}
      </div>

      {Array.isArray(apps) && apps.length > 0 ? (
        <div className="mt-4">
          <div className="text-xs font-medium mb-2">Apps with underutilized accounts</div>
          <ul className="divide-y">
            {apps.slice(0, 5).map((a) => (
              <li key={`${a.appName}:${a.instanceName}`} className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="bg-gradient-to-b from-[#fafafa] to-[#f1f1f3] rounded-md p-1.5">
                    {a.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.iconUrl} alt={a.appName} className="h-6 w-6 rounded" />
                    ) : (
                      <div className="h-6 w-6 rounded bg-muted" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{a.appName}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.instanceName}</div>
                  </div>
                </div>
                <div className="bg-slate-100 text-slate-900 text-[12px] font-medium rounded-full px-2.5 py-0.5 whitespace-nowrap">
                  {a.accountsCount} Accounts
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
      </div>
      <div className="mt-4">
        <button className="bg-slate-900 text-slate-50 rounded-md px-4 py-2 text-sm font-medium w-full">
          Initiate Access review
        </button>
      </div>
    </div>
  );
};

export default UnderutilizedLicensesCard;


