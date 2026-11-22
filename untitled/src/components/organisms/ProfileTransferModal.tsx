import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getProfilePerks, getXpForNextLevel } from '../../domain/constants';
import { PlayerProfile } from '../../domain/types';
import { ProgressTrackBar } from '../atoms/ProgressTrackBar';
import { TactileButton } from '../atoms/TactileButton';
import { TransferCodeField } from '../molecules/TransferCodeField';

interface ProfileTransferModalProps {
  profile: PlayerProfile;
  transferCode: string;
  onClose: () => void;
  onUpdateDisplayName: (name: string) => void;
  onImportCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
}

export const ProfileTransferModal: React.FC<ProfileTransferModalProps> = ({
  profile,
  transferCode,
  onClose,
  onUpdateDisplayName,
  onImportCode,
}) => {
  const [nameInput, setNameInput] = useState(profile.displayName);
  const nextXp = getXpForNextLevel(profile.level);
  const perks = getProfilePerks(profile.level);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim().slice(0, 24);
    if (cleaned) onUpdateDisplayName(cleaned);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-lg rounded-lg bg-[#1D2531] border border-[#36475F] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2D3A4D]">
          <div>
            <h2 id="profile-modal-title" className="text-lg font-bold text-slate-100">
              Architect Profile & Transfer
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID: {profile.profileId} · Rank {profile.level}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Display Name */}
          <form onSubmit={handleSaveName} className="space-y-1.5">
            <label htmlFor="profile-name-input" className="block text-xs font-medium text-slate-300">
              Workshop Name
            </label>
            <div className="flex items-center gap-2">
              <input
                id="profile-name-input"
                type="text"
                maxLength={24}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 bg-[#141920] border border-[#324054] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
              <TactileButton type="submit" variant="secondary" size="sm">
                Save Name
              </TactileButton>
            </div>
          </form>

          {/* Rank Progress & Light QoL Perks */}
          <div className="space-y-2 pt-3 border-t border-[#2D3A4D]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Architect Rank {profile.level}</span>
              <span className="font-mono text-slate-400 tabular-nums">
                {profile.xp} / {nextXp} XP
              </span>
            </div>
            <ProgressTrackBar
              value={profile.xp}
              max={nextXp}
              fillClass="bg-amber-400"
              ariaLabel="Architect experience progress"
            />
            <div className="text-xs text-slate-400">
              Active Perks: <span className="text-emerald-300">{perks.perkSummary.join(' · ')}</span>
            </div>
          </div>

          {/* Lifetime Stats */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#2D3A4D] text-xs">
            <div>
              <div className="text-slate-400">Matches / Wins</div>
              <div className="font-mono font-bold text-slate-100 text-sm tabular-nums mt-0.5">
                {profile.stats.gamesPlayed} / {profile.stats.gamesWon}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Highest Wave</div>
              <div className="font-mono font-bold text-amber-300 text-sm tabular-nums mt-0.5">
                {profile.stats.highestWave}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Longest Maze</div>
              <div className="font-mono font-bold text-sky-300 text-sm tabular-nums mt-0.5">
                {profile.stats.longestMazePath} tiles
              </div>
            </div>
          </div>

          {/* Portable Transfer Code */}
          <div className="pt-3 border-t border-[#2D3A4D]">
            <TransferCodeField transferCode={transferCode} onImport={onImportCode} />
          </div>
        </div>
      </div>
    </div>
  );
};
