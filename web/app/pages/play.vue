<script setup lang="ts">
import { BRICKS_PER_TURN, getWaveDefinition } from '~/game/domain/constants';
import { waveTitle } from '~/game/worlds';

const { profile, ensureLoaded, recordMatchEnd } = useProfile();
const { selectedMap, selectedDifficulty } = useMatchSetup();

// The profile decides starting perks and the board theme, so load it before the match starts.
await ensureLoaded();

// Map and difficulty are fixed for the lifetime of a match.
const difficulty = selectedDifficulty.value;

const {
  grid,
  phase,
  wave,
  endlessMode,
  lives,
  gold,
  rerollsRemaining,
  draftQueue,
  placedTurnCoords,
  pickIndex,
  mobileInspectorOpen,
  placingTowerType,
  relocatingTowerId,
  speed,
  muted,
  creepsRemainingUi,
  waveTotalCreepsUi,
  outcomeSummary,
  sellArmedId,
  waveReport,
  shortcutsOpen,
  towers,
  pathResult,
  hoverPreview,
  selectedCell,
  selectedTower,
  eliteTowerCount,
  tileMenu,
  bossPreview,
  frame,
  rerollDraft,
  undoLastBrick,
  selectDraftBrick,
  keepSelectedBrick,
  fuseTurnPair,
  clearGrayBrick,
  sendWave,
  selectTowerType,
  placeTowerOnSelected,
  upgradeTower,
  sellTower,
  changeTargeting,
  startRelocate,
  cancelRelocate,
  clickTile,
  hoverTile,
  cancelInteraction,
  closeTileMenu,
  openTowerDetails,
  toggleMute,
  setSpeed,
  continueEndless,
  playAgain,
} = useArenaMatch({
  profile,
  mapLayout: selectedMap.value,
  difficulty,
  recordMatchEnd,
});

const world = useWorld();
/** "Wave 3 · Micro Swarm · 21× 101 HP", for the phone dock. */
const waveLine = computed(() => {
  const def = getWaveDefinition(wave.value, difficulty);
  const prefix = phase.value === 'COMBAT' ? 'Now' : 'Next';
  return `${prefix}: Wave ${def.wave} · ${waveTitle(def, world.value)} · ${def.count}× ${def.hp.toLocaleString()} HP`;
});

function exitToLobby() {
  return navigateTo('/');
}
</script>

<template>
  <TacticalArenaTemplate
    :mobile-inspector-open="mobileInspectorOpen"
    @close-mobile-inspector="mobileInspectorOpen = false"
  >
    <template #hud>
      <MatchHudBar
        :wave="wave"
        :difficulty="difficulty"
        :endless-mode="endlessMode"
        :lives="lives"
        :gold="gold"
        :path-length="pathResult.length"
        :phase="phase"
        :speed="speed"
        :muted="muted"
        @change-speed="setSpeed"
        @toggle-mute="toggleMute"
        @send-wave="sendWave"
        @exit-to-lobby="exitToLobby"
        @open-shortcuts="shortcutsOpen = true"
      />
    </template>

    <template #stage>
      <MazeCanvasStage
        :frame="frame"
        :phase="phase"
        :bricks-remaining="BRICKS_PER_TURN - placedTurnCoords.length"
        :relocating="Boolean(relocatingTowerId)"
        :hover-status-text="hoverPreview.statusText"
        :hover-status-tone="hoverPreview.tone"
        :boss-preview="bossPreview"
        :path-length="pathResult.length"
        :creeps-remaining="creepsRemainingUi"
        :wave-total-creeps="waveTotalCreepsUi"
        @hover-tile="hoverTile"
        @click-tile="clickTile"
        @right-click="cancelInteraction"
        @open-mobile-inspector="mobileInspectorOpen = true"
      >
        <template #overlay="{ tileRect }">
          <WaveReportToast v-if="waveReport" :report="waveReport" />
          <TileActionMenu
            v-if="tileMenu"
            :menu="tileMenu"
            :gold="gold"
            :tile-rect="tileRect"
            :avoid="tileMenu.kind === 'draft' ? placedTurnCoords : towers"
            :sell-armed="tileMenu.kind === 'tower' && sellArmedId === tileMenu.tower.id"
            :elite-count="eliteTowerCount"
            @keep="keepSelectedBrick"
            @fuse="fuseTurnPair"
            @mount="placeTowerOnSelected"
            @remove="tileMenu && clearGrayBrick(tileMenu.coord)"
            @upgrade="upgradeTower"
            @move="startRelocate"
            @sell="sellTower"
            @targeting="changeTargeting"
            @details="openTowerDetails"
            @close="closeTileMenu"
          />
        </template>
      </MazeCanvasStage>
    </template>

    <template #inspector>
      <ContextInspectorRail
        :grid="grid"
        :wave="wave"
        :difficulty="difficulty"
        :phase="phase"
        :selected-cell="selectedCell"
        :selected-tower="selectedTower"
        :elite-count="eliteTowerCount"
        @close-mobile="mobileInspectorOpen = false"
      />
    </template>

    <template #dock>
      <BuildControlDock
        :phase="phase"
        :draft-queue="draftQueue"
        :placed-turn-coords="placedTurnCoords"
        :rerolls-remaining="rerollsRemaining"
        :pick-index="pickIndex"
        :gold="gold"
        :placing-tower-type="placingTowerType"
        :wave-line="waveLine"
        @reroll-draft="rerollDraft"
        @undo-last-brick="undoLastBrick"
        @select-draft-brick="selectDraftBrick"
        @select-tower-type="selectTowerType"
        @open-details="mobileInspectorOpen = true"
      />
    </template>

    <template #modal>
      <ShortcutSheet v-if="shortcutsOpen" @close="shortcutsOpen = false" />
      <MatchOutcomeModal
        v-if="outcomeSummary"
        :summary="outcomeSummary"
        @continue-endless="continueEndless"
        @play-again="playAgain"
        @return-lobby="exitToLobby"
      />
    </template>
  </TacticalArenaTemplate>
</template>
