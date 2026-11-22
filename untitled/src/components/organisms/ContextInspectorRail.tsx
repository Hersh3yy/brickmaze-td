import React from 'react';
import { ArrowUpCircle, Eraser, Lock, Move, Skull, Trash2, X } from 'lucide-react';
import {
  BRICK_COLORS,
  BRICK_COLOR_LIST,
  CLEAR_GRAY_BRICK_COST,
  DIFFICULTY_DEFS,
  SYNERGY_CATALOG,
  TOWER_DEFS,
  getWaveDefinition,
} from '../../domain/constants';
import { computeTileModifiers } from '../../domain/synergy';
import { Coord, DifficultyId, GamePhase, GridCell, TargetingMode, Tower } from '../../domain/types';
import { BrickColorGlyph } from '../atoms/BrickColorGlyph';
import { TactileButton } from '../atoms/TactileButton';
import { SynergyLinkRow } from '../molecules/SynergyLinkRow';
import { TargetPrioritySwitch } from '../molecules/TargetPrioritySwitch';

interface ContextInspectorRailProps {
  grid: GridCell[][];
  wave: number;
  difficulty: DifficultyId;
  gold: number;
  phase: GamePhase;
  selectedCell: GridCell | null;
  selectedTower: Tower | null;
  relocatingTowerId: string | null;
  onUpgradeTower: (towerId: string) => void;
  onStartRelocate: (towerId: string) => void;
  onCancelRelocate: () => void;
  onSellTower: (towerId: string) => void;
  onChangeTargeting: (towerId: string, mode: TargetingMode) => void;
  onClearGrayBrick: (coord: Coord) => void;
  onCloseMobile?: () => void;
}

export const ContextInspectorRail: React.FC<ContextInspectorRailProps> = ({
  grid,
  wave,
  difficulty,
  gold,
  phase,
  selectedCell,
  selectedTower,
  relocatingTowerId,
  onUpgradeTower,
  onStartRelocate,
  onCancelRelocate,
  onSellTower,
  onChangeTargeting,
  onClearGrayBrick,
  onCloseMobile,
}) => {
  const isCombat = phase === 'COMBAT';
  const currentWaveDef = getWaveDefinition(wave, difficulty);
  const diffLabel = DIFFICULTY_DEFS[difficulty].label;

  const mobileCloseBtn = onCloseMobile ? (
    <button
      type="button"
      onClick={onCloseMobile}
      aria-label="Close panel"
      className="lg:hidden p-1.5 -mr-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
    >
      <X className="w-4 h-4" />
    </button>
  ) : null;

  if (selectedTower) {
    const def = TOWER_DEFS[selectedTower.type];
    const mods = computeTileModifiers(grid, selectedTower.x, selectedTower.y);
    const dmgScale = selectedTower.level === 1 ? 1 : selectedTower.level === 2 ? 1.6 : 2.4;
    const rateScale = selectedTower.level === 1 ? 1 : selectedTower.level === 2 ? 1.15 : 1.32;
    const rangeScale = 1 + (selectedTower.level - 1) * 0.1;

    const finalDmg = Math.round(def.baseDamage * dmgScale * mods.damageMult);
    const finalRate = (def.baseFireRate * rateScale * mods.fireRateMult).toFixed(1);
    const finalRange = (def.baseRange * rangeScale * mods.rangeMult).toFixed(1);

    const upgradeCost = selectedTower.level < 3 ? def.upgradeCosts[selectedTower.level - 1] : null;
    const sellValue = Math.round(selectedTower.investedGold * 0.75);
    const isRelocatingThis = relocatingTowerId === selectedTower.id;

    return (
      <aside className="flex flex-col h-full bg-[#1C2430] lg:border-l border-[#2F3D51] overflow-y-auto p-4 space-y-4">
        <div className="pb-3 border-b border-[#2D3A4D]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-100">{def.name}</h3>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-amber-300">Tier {selectedTower.level}/3</span>
              {mobileCloseBtn}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Weapon: {def.shortRole} · Ammo:{' '}
            <span className="text-slate-200 font-medium">{mods.ammoLabel}</span>
          </p>
        </div>

        {/* Core Weapon Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-slate-400">Damage</div>
            <div className="font-mono font-bold text-slate-100 tabular-nums mt-0.5">{finalDmg}</div>
          </div>
          <div>
            <div className="text-slate-400">Speed</div>
            <div className="font-mono font-bold text-slate-100 tabular-nums mt-0.5">{finalRate}/s</div>
          </div>
          <div>
            <div className="text-slate-400">Range</div>
            <div className="font-mono font-bold text-slate-100 tabular-nums mt-0.5">{finalRange}</div>
          </div>
        </div>

        {/* Active Elemental Ammo Effects */}
        <div className="pt-2 border-t border-[#2D3A4D] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Loaded Projectile Type</span>
            {mods.isDoubleElement && (
              <span className="font-mono font-bold text-amber-300">×2 FUSED</span>
            )}
          </div>
          {mods.primaryElement === 'kinetic' ? (
            <p className="text-xs text-slate-400">
              Gray Brick (Kinetic). Move onto a Yellow, Red, or Green brick between waves to infuse elemental ammo.
            </p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                {mods.isDoubleElement && mods.brickColors[0] ? (
                  <BrickColorGlyph
                    color={mods.brickColors[0]}
                    secondaryColor={mods.brickColors[0]}
                    size="sm"
                    showLabel
                  />
                ) : (
                  mods.brickColors.map((c, idx) => (
                    <BrickColorGlyph key={`${c}-${idx}`} color={c} size="sm" showLabel />
                  ))
                )}
              </div>
              <div className="text-xs text-slate-300 space-y-0.5 tabular-nums">
                {mods.chainCount > 0 && <div>⚡ Chains to +{mods.chainCount} targets</div>}
                {mods.extraSplashRadius > 0 && (
                  <div>
                    🔥 +{mods.extraSplashRadius}px splash · {Math.round(mods.burnDpsRatio * 100)}% burn/s
                  </div>
                )}
                {mods.slowFactor > 0 && (
                  <div>
                    ☣ {Math.round(mods.slowFactor * 100)}% slow ({mods.slowDuration.toFixed(1)}s) ·{' '}
                    {Math.round(mods.poisonDpsRatio * 100)}% DoT/s
                  </div>
                )}
                {mods.sameColorNeighbors >= 2 && (
                  <div className="text-amber-300">
                    Cluster Resonance: {mods.sameColorNeighbors} matching neighbors
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedTower.type !== 'pulse' && (
          <div className="space-y-1.5 pt-2 border-t border-[#2D3A4D]">
            <div className="text-xs text-slate-400">Target</div>
            <TargetPrioritySwitch
              value={selectedTower.targeting}
              onChange={(mode) => onChangeTargeting(selectedTower.id, mode)}
            />
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-[#2D3A4D]">
          {upgradeCost !== null ? (
            <TactileButton
              variant="amber"
              fullWidth
              disabled={gold < upgradeCost}
              onClick={() => onUpgradeTower(selectedTower.id)}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Upgrade · {upgradeCost}g</span>
            </TactileButton>
          ) : (
            <div className="text-xs text-center font-mono text-amber-300 py-1">Max Tier</div>
          )}

          {isRelocatingThis ? (
            <TactileButton variant="secondary" fullWidth onClick={onCancelRelocate}>
              Cancel Move
            </TactileButton>
          ) : (
            <TactileButton
              variant="secondary"
              fullWidth
              disabled={isCombat}
              onClick={() => onStartRelocate(selectedTower.id)}
            >
              {isCombat ? <Lock className="w-3.5 h-3.5" /> : <Move className="w-3.5 h-3.5" />}
              <span>{isCombat ? 'Move Locked' : 'Move Tower (Free)'}</span>
            </TactileButton>
          )}

          <TactileButton
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => onSellTower(selectedTower.id)}
            className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sell (+{sellValue}g)</span>
          </TactileButton>
        </div>

        {mods.activeSynergies.length > 0 && (
          <div className="pt-2 border-t border-[#2D3A4D]">
            <div className="text-xs text-amber-300 font-medium mb-1">Active Combos</div>
            {mods.activeSynergies.map((syn) => (
              <SynergyLinkRow key={syn.id} synergy={syn} active />
            ))}
          </div>
        )}
      </aside>
    );
  }

  if (
    selectedCell &&
    (selectedCell.kind === 'GRAY_WALL' ||
      selectedCell.kind === 'ACTIVE_BRICK' ||
      selectedCell.kind === 'MASTER_BRICK')
  ) {
    const isGray = selectedCell.kind === 'GRAY_WALL';
    const mods = computeTileModifiers(grid, selectedCell.x, selectedCell.y);
    const canDeleteGray =
      isGray &&
      gold >= CLEAR_GRAY_BRICK_COST &&
      phase !== 'VICTORY' &&
      phase !== 'GAME_OVER';

    return (
      <aside className="flex flex-col h-full bg-[#1C2430] lg:border-l border-[#2F3D51] overflow-y-auto p-4 space-y-4">
        <div className="pb-3 border-b border-[#2D3A4D]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-100">
              {selectedCell.kind === 'MASTER_BRICK'
                ? `Master: ${mods.ammoLabel}`
                : selectedCell.kind === 'ACTIVE_BRICK'
                  ? `${BRICK_COLORS[selectedCell.color!].elementName} Brick`
                  : 'Gray Maze Wall'}
            </h3>
            {mobileCloseBtn}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isGray
              ? 'Neutral Kinetic mount. Replant a colored brick free next turn, or delete anytime (even mid-wave) to open space.'
              : 'Any weapon mounted here fires this brick’s elemental ammo.'}
          </p>
        </div>

        {!isGray && selectedCell.color && (
          <div className="space-y-2">
            <BrickColorGlyph
              color={selectedCell.color}
              secondaryColor={selectedCell.secondaryColor}
              size="md"
              showLabel
            />
            <p className="text-xs text-slate-300 leading-relaxed">
              {mods.isDoubleElement
                ? selectedCell.color === 'green'
                  ? `Double Venom (×2): ${Math.round(mods.slowFactor * 100)}% slow for ${mods.slowDuration.toFixed(1)}s + ${Math.round(mods.poisonDpsRatio * 100)}% corrosive DoT/s (ignores armor).`
                  : selectedCell.color === 'red'
                    ? `Double Fire (×2): +${Math.round((mods.damageMult - 1) * 100)}% damage, +${mods.extraSplashRadius}px splash & ${Math.round(mods.burnDpsRatio * 100)}% burn/s.`
                    : `Double Lightning (×2): +${Math.round((mods.fireRateMult - 1) * 100)}% attack speed & ${mods.chainCount} lightning chains.`
                : BRICK_COLORS[selectedCell.color].bonusDetail}
            </p>
            {mods.adjacentLinkCount > 0 && (
              <p className="text-[11px] text-amber-300">
                Linked to {mods.adjacentLinkCount} adjacent brick
                {mods.adjacentLinkCount === 1 ? '' : 's'}
                {mods.sameColorNeighbors >= 2 ? ` (${mods.sameColorNeighbors} same-color cluster bonus!)` : '.'}
              </p>
            )}
          </div>
        )}

        {mods.activeSynergies.length > 0 && (
          <div className="pt-2 border-t border-[#2D3A4D]">
            <div className="text-xs text-amber-300 font-medium mb-1">Active Combos</div>
            {mods.activeSynergies.map((syn) => (
              <SynergyLinkRow key={syn.id} synergy={syn} active />
            ))}
          </div>
        )}

        {isGray && (
          <div className="pt-2 border-t border-[#2D3A4D] space-y-2">
            <TactileButton
              variant="danger"
              fullWidth
              disabled={!canDeleteGray}
              onClick={() => onClearGrayBrick({ x: selectedCell.x, y: selectedCell.y })}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Delete Gray Wall ({CLEAR_GRAY_BRICK_COST}g)</span>
            </TactileButton>
            {isCombat && (
              <p className="text-[11px] text-slate-400">
                Mid-wave delete opens the tile immediately for upcoming creeps.
              </p>
            )}
          </div>
        )}
      </aside>
    );
  }

  const isBossWave = currentWaveDef.trait === 'boss';
  const isPreBoss = wave % 5 === 4;

  return (
    <aside className="flex flex-col h-full bg-[#1C2430] lg:border-l border-[#2F3D51] overflow-y-auto p-4 space-y-5">
      <div
        className={[
          'space-y-1.5',
          isBossWave ? 'p-3 rounded-md bg-rose-950/45 border border-rose-500/45' : '',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2">
          <div
            className={`text-[11px] font-semibold flex items-center gap-1.5 ${
              isBossWave ? 'text-rose-300' : 'text-slate-400'
            }`}
          >
            {isBossWave && <Skull className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
            <span>{isBossWave ? `BOSS WAVE · ${diffLabel}` : `Next Wave · ${diffLabel}`}</span>
          </div>
          {mobileCloseBtn}
        </div>
        <div className="text-sm font-bold text-slate-100">
          Wave {currentWaveDef.wave} · {currentWaveDef.name}
        </div>
        <div className="font-mono text-xs text-slate-300 tabular-nums">
          {currentWaveDef.count}x · {currentWaveDef.hp.toLocaleString()} HP ·{' '}
          {Math.round(currentWaveDef.armor * 100)}% Armor
        </div>
        {isBossWave && (
          <p className="text-[11px] text-rose-200/90 leading-snug pt-0.5">
            Bosses cost 3 lives if leaked. Fortify with Rail Snipers, Fire bursts, or Venom slow!
          </p>
        )}
        {isPreBoss && (
          <p className="text-[11px] text-amber-300/90 pt-0.5">
            Heads up: Boss fight arrives on Wave {wave + 1}.
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-[#2D3A4D] space-y-2">
        <div className="text-xs font-semibold text-slate-200">Brick = Ammo Type</div>
        <div className="space-y-2">
          {BRICK_COLOR_LIST.map((c) => (
            <div key={c} className="flex items-start gap-2 text-xs">
              <BrickColorGlyph color={c} size="sm" />
              <div className="min-w-0">
                <div className="font-semibold text-slate-100">{BRICK_COLORS[c].elementName}</div>
                <div className="text-[11px] text-slate-400 leading-snug">
                  {c === 'yellow'
                    ? 'Speed + Lightning Chain'
                    : c === 'red'
                      ? 'Bonus Damage + Fire Splash'
                      : 'Slow + Corrosive DoT'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-[#2D3A4D] space-y-1">
        <div className="text-xs font-semibold text-slate-200 mb-1">Brick Combos</div>
        {Object.values(SYNERGY_CATALOG).map((syn) => (
          <SynergyLinkRow key={syn.id} synergy={syn} />
        ))}
      </div>
    </aside>
  );
};
