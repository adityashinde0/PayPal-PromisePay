'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { PromiseSummaryResponse } from '@/types/promise';
import { PayPalLogo } from './PayPalLogo';
import {
  Laptop,
  FileText,
  Package,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
} from 'lucide-react';

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
              className="font-mono text-xs font-bold text-[#0070BA] hover:text-[#003087] hover:underline px-2 py-1 rounded-lg bg-blue-50/90 border border-blue-200/80 shadow-2xs"
              title="Click to inspect Promise Graph"
            >
              {params.data.promiseId}
            </Link>
          </div>
        );
      },
    },
    {
      headerName: 'Type',
      field: 'category',
      width: 170,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        if (!params.value) return null;
        const catMap: Record<string, { label: string; color: string; border: string }> = {
          digital_project: { label: 'Digital Project', color: 'text-indigo-700 bg-indigo-50/90', border: 'border-indigo-200' },
          professional_document: { label: 'Document', color: 'text-cyan-800 bg-cyan-50/90', border: 'border-cyan-200' },
          delivery: { label: 'Delivery', color: 'text-emerald-700 bg-emerald-50/90', border: 'border-emerald-200' },
        };
        const conf = catMap[params.value] || { label: params.value, color: 'text-slate-700 bg-slate-50', border: 'border-slate-200' };
        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${conf.color} ${conf.border}`}>
              {conf.label}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Description',
      field: 'title',
      flex: 2,
      minWidth: 240,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        return (
          <div className="flex items-center h-full">
            <span className="font-semibold text-slate-800 truncate" title={params.value}>
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
          <div className="flex items-center justify-end h-full font-mono text-xs font-black text-slate-900">
            ${params.data.amount.value} <span className="ml-1 text-[10px] font-medium text-slate-400">{params.data.amount.currencyCode}</span>
          </div>
        );
      },
    },
    {
      headerName: 'PayPal Status',
      field: 'paymentState',
      width: 155,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        const state = params.value || 'NOT_STARTED';
        const isCaptured = state === 'CAPTURED';
        const isRefunded = state === 'REFUNDED';
        const isCreated = state === 'ORDER_CREATED';

        const badgeColor = isCaptured
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : isRefunded
          ? 'bg-purple-50 text-purple-800 border-purple-200'
          : isCreated
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : 'bg-slate-100 text-slate-700 border-slate-200';

        return (
          <div className="flex items-center gap-1.5 h-full">
            <PayPalLogo height={13} variant="monogram" />
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold border ${badgeColor}`}>
              {state}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'AI Verification',
      field: 'confidence',
      width: 165,
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        const val = params.value;
        if (val === undefined || val === null) {
          return (
            <div className="flex items-center h-full text-xs text-slate-400 italic">
              Pending
            </div>
          );
        }

        const pct = Math.round(val * 100);
        const barColor =
          pct >= 85 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-500' : 'bg-rose-500';

        return (
          <div className="flex items-center gap-2 h-full w-full">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs font-bold text-slate-700 w-8 text-right">
              {pct}%
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 160,
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
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${color}`}>
              {st}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Actions',
      field: 'promiseId',
      width: 100,
      sortable: false,
      filter: false,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<PromiseSummaryResponse>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center justify-center h-full">
            <Link
              href={`/promises/${params.data.promiseId}`}
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-500 hover:text-[#0070BA] hover:bg-blue-50 transition-colors"
              title="View verification report"
            >
              <Eye className="h-4 w-4" />
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
      className="w-full ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm"
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
