"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { txToExplorer } from "@/lib/format";

interface ModalAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export interface ActionSuccessState {
  title: string;
  description: string;
  txHash?: string;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
}

interface ActionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  state: ActionSuccessState | null;
}

function ModalButton({ action, onClose }: { action: ModalAction; onClose: () => void }) {
  const className = action.variant === "secondary" ? "vm-secondary-btn min-h-0 px-5 py-3" : "vm-primary-btn min-h-0 px-5 py-3";

  if (action.href) {
    return (
      <Link href={action.href} className={className} onClick={onClose}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        action.onClick?.();
        onClose();
      }}
      className={className}
    >
      {action.label}
    </button>
  );
}

export function ActionSuccessModal({ open, onClose, state }: ActionSuccessModalProps) {
  if (!open || !state) return null;

  const explorerHref = state.txHash ? txToExplorer(state.txHash) : "";

  return (
    <div className="vm-modal-backdrop">
      <div className="vm-modal vm-success-modal">
        <button type="button" onClick={onClose} className="vm-icon-btn absolute right-5 top-5">
          <span className="sr-only">Close</span>×
        </button>

        <div className="vm-success-modal__badge">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Action completed
          </div>
          <h3 className="font-display mt-5 text-3xl font-bold text-white">{state.title}</h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-white/68">{state.description}</p>
        </div>

        {state.txHash ? (
          <div className="mt-6 rounded-[1.2rem] border border-white/8 bg-white/[0.04] p-4 text-left">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Transaction</div>
            <div className="mt-2 break-all font-mono text-sm text-white/82">{state.txHash}</div>
            {explorerHref ? (
              <a
                href={explorerHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
              >
                View on explorer
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {state.secondaryAction ? <ModalButton action={state.secondaryAction} onClose={onClose} /> : null}
          {state.primaryAction ? <ModalButton action={state.primaryAction} onClose={onClose} /> : null}
        </div>
      </div>
    </div>
  );
}
