'use client';

import React from 'react';
import { AuditTimelineEvent } from '@/types/promise';

interface AuditTimelineCardProps {
  timeline: AuditTimelineEvent[];
}

export function AuditTimelineCard({ timeline }: AuditTimelineCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Audit Trail</h4>
        <p className="text-[11px] text-slate-500">History by user in timeline:</p>
      </div>
      {timeline.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No events recorded yet.</p>
      ) : (
        <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
          {timeline.map((event, idx) => {
            const userEmail = event.actor?.includes('@') ? event.actor : 'bob.bonchent@example.com';
            return (
              <div key={idx} className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100 last:border-b-0">
                <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {userEmail.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-800 truncate">{userEmail}</span>
                  </div>
                  <p className="font-bold text-[#0070BA] text-[11px] uppercase tracking-wide mt-0.5">
                    {event.eventType}
                  </p>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

