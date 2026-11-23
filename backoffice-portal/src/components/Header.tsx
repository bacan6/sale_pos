import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import type { TenantInfo } from '../types/auth';

interface HeaderProps {
  title: string;
  subtitle: string;
  tenant: TenantInfo | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  tenant,
  onRefresh,
  isLoading,
}) => {
  return (
    <header className="h-16 bg-neutral-900 border-b border-neutral-800 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
      <div>
        <h2 className="text-base font-black text-white leading-tight flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-neutral-400 font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800/80 border border-neutral-700/60 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-neutral-300 font-semibold truncate">
            {tenant?.name || 'SaaS Business'}
          </span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        )}
      </div>
    </header>
  );
};
