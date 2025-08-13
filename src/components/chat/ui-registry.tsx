"use client";
import React from 'react';
import { UnderutilizedLicensesCard, type UnderutilizedLicensesCardProps } from '@/components/custom-components/UnderutilizedLicensesCard';

type CardProps = { title: string; body: string };
const Card: React.FC<CardProps> = ({ title, body }) => (
  <div className="rounded-lg border p-4">
    <h4 className="font-semibold mb-2">{title}</h4>
    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{body}</p>
  </div>
);

type TableProps = { columns: string[]; rows: Array<Record<string, unknown>> };
const Table: React.FC<TableProps> = ({ columns, rows }) => (
  <div className="w-full overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} className="text-left p-2 font-medium border-b">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} className="border-b last:border-0">
            {columns.map((c) => (
              <td key={c} className="p-2 align-top">{String(row[c] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export type UIMessagePayload =
  | { type: 'card'; props: CardProps }
  | { type: 'table'; props: TableProps }
  | { type: 'underutilized-licenses-card'; props: UnderutilizedLicensesCardProps };

export function renderUIMessage(ui: UIMessagePayload) {
  switch (ui.type) {
    case 'card':
      return <Card {...ui.props} />;
    case 'table':
      return <Table {...ui.props} />;
    case 'underutilized-licenses-card':
      return <UnderutilizedLicensesCard {...ui.props} />;
    default:
      return null;
  }
}


