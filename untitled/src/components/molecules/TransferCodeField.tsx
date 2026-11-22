import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { TactileButton } from '../atoms/TactileButton';

interface TransferCodeFieldProps {
  transferCode: string;
  onImport: (code: string) => Promise<{ ok: boolean; error?: string }>;
}

export const TransferCodeField: React.FC<TransferCodeFieldProps> = ({
  transferCode,
  onImport,
}) => {
  const [copied, setCopied] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'success' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transferCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setStatus({ kind: 'error', message: 'Select and copy the code manually.' });
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importInput.trim()) return;
    const res = await onImport(importInput);
    if (res.ok) {
      setStatus({ kind: 'success', message: 'Profile loaded and saved to this browser.' });
      setImportInput('');
    } else {
      setStatus({ kind: 'error', message: res.error ?? 'Invalid transfer code.' });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Your Portable Transfer Code
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={transferCode}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Your profile transfer code"
            className="flex-1 min-w-0 bg-[#141920] border border-[#324054] rounded-md px-3 py-2 font-mono text-xs text-amber-200 focus:outline-none focus:border-amber-400"
          />
          <TactileButton variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </TactileButton>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">
          Save this string to carry your rank, stats, and board themes to another browser or device without an account.
        </p>
      </div>

      <form onSubmit={handleImportSubmit} className="pt-3 border-t border-[#2D3A4D]">
        <label htmlFor="import-code-input" className="block text-xs font-medium text-slate-300 mb-1.5">
          Load Profile From Another Device
        </label>
        <div className="flex items-center gap-2">
          <input
            id="import-code-input"
            type="text"
            value={importInput}
            onChange={(e) => {
              setImportInput(e.target.value);
              if (status.kind !== 'idle') setStatus({ kind: 'idle', message: '' });
            }}
            placeholder="Paste BM1-XXXX-... code here"
            className="flex-1 min-w-0 bg-[#141920] border border-[#324054] rounded-md px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
          <TactileButton variant="amber" size="sm" type="submit" disabled={!importInput.trim()}>
            <Download className="w-3.5 h-3.5" />
            <span>Load</span>
          </TactileButton>
        </div>
        {status.kind !== 'idle' && (
          <p
            className={`text-xs mt-1.5 ${
              status.kind === 'success' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
};
