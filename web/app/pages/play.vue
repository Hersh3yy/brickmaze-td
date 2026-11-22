<script setup lang="ts">
import { BRICKS_PER_TURN } from '~/game/domain/constants';

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
  mobileInspectorOpen,
  placingTowerType,
  relocatingTowerId,
  speed,
  muted,
  creepsRemainingUi,
  waveTotalCreepsUi,
  outcomeSummary,
  pathResult,
  fusionOptions,
  hoverPreview,
  selectedCell,
  selectedTower,
  bossPreview,
  frame,
  rerollDraft,
  undoLastBrick,
  pickTurnBrick,
  fuseTurnPair,
  clearGrayBrick,
  sendWave,
  selectTowerType,
  upgradeTower,
  sellTower,
  changeTargeting,
  startRelocate,
  cancelRelocate,
  clickTile,
  hoverTile,
  cancelInteraction,
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
        @hover-tile="hoverTile"
        @click-tile="clickTile"
        @right-click="cancelInteraction"
        @open-mobile-inspector="mobileInspectorOpen = true"
      />
    </template>

    <template #inspector>
      <ContextInspectorRail
        :grid="grid"
        :wave="wave"
        :difficulty="difficulty"
        :gold="gold"
        :phase="phase"
        :selected-cell="selectedCell"
        :selected-tower="selectedTower"
        :relocating-tower-id="relocatingTowerId"
        @upgrade-tower="upgradeTower"
        @start-relocate="startRelocate"
        @cancel-relocate="cancelRelocate"
        @sell-tower="sellTower"
        @change-targeting="changeTargeting"
        @clear-gray-brick="clearGrayBrick"
        @close-mobile="mobileInspectorOpen = false"
      />
    </template>

    <template #dock>
      <BuildControlDock
        :phase="phase"
        :draft-queue="draftQueue"
        :placed-turn-coords="placedTurnCoords"
        :rerolls-remaining="rerollsRemaining"
        :fusion-options="fusionOptions"
        :gold="gold"
        :placing-tower-type="placingTowerType"
        :creeps-remaining="creepsRemainingUi"
        :wave-total-creeps="waveTotalCreepsUi"
        @reroll-draft="rerollDraft"
        @undo-last-brick="undoLastBrick"
        @pick-turn-brick="pickTurnBrick"
        @fuse-turn-pair="fuseTurnPair"
        @select-tower-type="selectTowerType"
      />
    </template>

    <template #modal>
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
