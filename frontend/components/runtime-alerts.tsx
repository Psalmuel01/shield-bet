"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { RuntimeDiagnostic } from "@/lib/runtime-config";

interface RuntimeAlertsProps {
  diagnostics: RuntimeDiagnostic[];
}

export function RuntimeAlerts({ diagnostics }: RuntimeAlertsProps) {
  if (!diagnostics.length) return null;

  return (
    <div className="space-y-2">
      {diagnostics.map((diagnostic) => (
        <div
          key={`${diagnostic.severity}-${diagnostic.message}`}
          className={`rounded-2xl border px-4 py-3 text-sm ${
            diagnostic.severity === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
          }`}
        >
          <p className="flex items-start gap-2 font-medium">
            {diagnostic.severity === "error" ? (
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{diagnostic.message}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
