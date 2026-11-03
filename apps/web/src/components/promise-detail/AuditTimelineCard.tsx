'use client';

import React from 'react';
import { AuditTimelineEvent } from '@/types/promise';

interface AuditTimelineCardProps {
  timeline: AuditTimelineEvent[];
}

export function AuditTimelineCard({ timeline }: AuditTimelineCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <h4 className="text-sm font-bold text-slate-900">Audit Trail</h4>
      {timeline.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No events recorded yet.</p>
      ) : (
        <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
          {timeline.map((event, idx) => (
            <div key={idx} className="border-l-2 border-[#0070BA] pl-3 space-y-0.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-600">{event.actor}</span>
                <span>
                  {new Date(event.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="font-medium text-slate-800">{event.eventType}</p>
              <p className="text-slate-500 text-[11px]">{event.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

