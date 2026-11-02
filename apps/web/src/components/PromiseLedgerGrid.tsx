'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { PromiseSummaryResponse } from '@/types/promise';

interface PromiseLedgerGridProps {
  rowData: PromiseSummaryResponse[];
  quickFilterText?: string;
  loading?: boolean;
}

export function PromiseLedgerGrid({ rowData, quickFilterText = '', loading = false }: PromiseLedgerGridProps) {
  const columnDefs = useMemo<ColDef<PromiseSummaryResponse>[]>(() => [
    {
      headerName: 'Promise ID',
      field: 'promiseId',
      width: 175,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center h-full">
            <Link
              href={`/promises/${params.data.promiseId}`}
              className="font-mono text-xs font-bold text-[#0070BA] hover:text-[#003087] hover:underline px-2 py-1 rounded bg-blue-50 border border-blue-200"
              title="Click to view Promise Graph"
            >
              {params.data.promiseId}
            </Link>
          </div>
        );
      },
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 170,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        if (!params.value) return null;
        const catMap: Record<string, { label: string; color: string; border: string }> = {
          digital_project: { label: 'Digital Project', color: 'text-indigo-700 bg-indigo-50', border: 'border-indigo-200' },
          professional_document: { label: 'Pro Document', color: 'text-cyan-700 bg-cyan-50', border: 'border-cyan-200' },
          delivery: { label: 'Physical Delivery', color: 'text-emerald-700 bg-emerald-50', border: 'border-emerald-200' },
        };
        const conf = catMap[params.value] || { label: params.value, color: 'text-slate-700 bg-slate-50', border: 'border-slate-200' };
        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${conf.color} ${conf.border}`}>
              {conf.label}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Agreement Title',
      field: 'title',
      flex: 2,
      minWidth: 240,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        return (
          <div className="flex items-center h-full">
            <span className="font-medium text-slate-900 truncate" title={params.value}>
              {params.value}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 130,
      valueGetter: (params) => (params.data?.amount ? parseFloat(params.data.amount.value) : 0),
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center justify-end h-full font-mono text-xs font-bold text-slate-800">
            ${params.data.amount.value} {params.data.amount.currencyCode}
          </div>
        );
      },
    },
    {
      headerName: 'PayPal State',
      field: 'paymentState',
      width: 145,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        const state = params.value || 'NOT_STARTED';
        const isCaptured = state === 'CAPTURED';
        const isCreated = state === 'ORDER_CREATED';
        const isRefunded = state === 'REFUNDED';

        const badgeColor = isCaptured
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : isRefunded
          ? 'bg-purple-50 text-purple-700 border-purple-200'
          : isCreated
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-slate-100 text-slate-600 border-slate-200';

        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${badgeColor}`}>
              {state}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Promise Status',
      field: 'status',
      width: 175,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        const st = params.value;
        const color =
          st === 'COMPLETE'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : st === 'REVIEW_REQUIRED'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : st === 'PAID'
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : st === 'READY_FOR_PAYMENT'
            ? 'bg-sky-50 text-sky-800 border-sky-200'
            : 'bg-slate-100 text-slate-700 border-slate-200';

        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${color}`}>
              {st}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'AI Outcome',
      field: 'outcome',
      width: 165,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        const outcome = params.value;
        if (!outcome) {
          return (
            <div className="flex items-center h-full">
              <span className="text-xs text-slate-400 font-medium italic">Pending Verification</span>
            </div>
          );
        }

        const color =
          outcome === 'COMPLETE'
            ? 'bg-emerald-100 text-emerald-800'
            : outcome === 'REVIEW_REQUIRED'
            ? 'bg-amber-100 text-amber-900'
            : 'bg-rose-100 text-rose-800';

        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${color}`}>
              {outcome}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Confidence',
      field: 'confidence',
      width: 155,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        const val = params.value;
        if (val === undefined || val === null) {
          return (
            <div className="flex items-center h-full text-xs text-slate-400">
              —
            </div>
          );
        }

        const pct = Math.round(val * 100);
        const barColor =
          pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';

        return (
          <div className="flex items-center gap-2 h-full w-full">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs font-bold text-slate-700 w-8 text-right">
              {pct}%
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Drill-Down',
      field: 'promiseId',
      width: 135,
      sortable: false,
      filter: false,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center justify-center h-full">
            <Link
              href={`/promises/${params.data.promiseId}`}
              className="inline-flex items-center text-xs font-semibold text-[#0070BA] hover:text-[#003087] transition-colors"
            >
              View Graph &rarr;
            </Link>
          </div>
        );
      },
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div
      className="w-full ag-theme-quartz rounded-xl overflow-hidden border border-slate-200 shadow-sm"
      style={{ height: '520px' }}
      aria-label="PromisePay Enterprise Ledger"
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        quickFilterText={quickFilterText}
        pagination={true}
        paginationPageSize={10}
        paginationPageSizeSelector={[10, 25, 50]}
        animateRows={true}
        rowSelection="single"
        loading={loading}
      />
    </div>
  );
}
