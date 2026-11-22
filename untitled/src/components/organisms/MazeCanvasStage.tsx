import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Info, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { CANVAS_HEIGHT, CANVAS_WIDTH, GRID_COLS, GRID_ROWS } from '../../domain/constants';
import { Coord, GamePhase } from '../../domain/types';
import { CameraView, RenderFrameInput, renderArenaFrame } from '../../engine/pixelRenderer';
import { PhaseStatusLabel } from '../atoms/PhaseStatusLabel';

interface MazeCanvasStageProps {
  frameRef: React.MutableRefObject<RenderFrameInput>;
  phase: GamePhase;
  bricksRemaining: number;
  relocating: boolean;
  hoverStatusText: string | null;
  hoverStatusTone: 'neutral' | 'good' | 'info' | 'bad';
  onHoverTile: (coord: Coord | null) => void;
  onClickTile: (coord: Coord) => void;
  onRightClick: () => void;
  onOpenMobileInspector?: () => void;
  bossPreview?: { name: string; hp: number; count: number } | null;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.25;

function clampCamera(cam: CameraView): CameraView {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom));
  if (zoom <= 1.001) {
    return { zoom: 1, panX: 0, panY: 0 };
  }
  const minPanX = CANVAS_WIDTH - CANVAS_WIDTH * zoom;
  const minPanY = CANVAS_HEIGHT - CANVAS_HEIGHT * zoom;
  return {
    zoom,
    panX: Math.max(minPanX, Math.min(0, cam.panX)),
    panY: Math.max(minPanY, Math.min(0, cam.panY)),
  };
}

export const MazeCanvasStage: React.FC<MazeCanvasStageProps> = ({
  frameRef,
  phase,
  bricksRemaining,
  relocating,
  hoverStatusText,
  hoverStatusTone,
  onHoverTile,
  onClickTile,
  onRightClick,
  onOpenMobileInspector,
  bossPreview,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomPct, setZoomPct] = useState(100);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  }>({
    active: false,
    moved: false,
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const pinchRef = useRef<{
    active: boolean;
    startDist: number;
    startZoom: number;
    midCanvasX: number;
    midCanvasY: number;
  }>({
    active: false,
    startDist: 0,
    startZoom: 1,
    midCanvasX: CANVAS_WIDTH / 2,
    midCanvasY: CANVAS_HEIGHT / 2,
  });

  useEffect(() => {
    let rafId = 0;
    const renderLoop = (ts: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          frameRef.current.nowSec = ts / 1000;
          renderArenaFrame(ctx, frameRef.current);
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };
    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [frameRef]);

  const applyCamera = useCallback(
    (next: CameraView) => {
      const clamped = clampCamera(next);
      frameRef.current.camera = clamped;
      setZoomPct(Math.round(clamped.zoom * 100));
    },
    [frameRef]
  );

  const zoomAtPoint = useCallback(
    (nextZoom: number, focalCanvasX: number, focalCanvasY: number) => {
      const prev = frameRef.current.camera;
      const targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
      const worldX = (focalCanvasX - prev.panX) / prev.zoom;
      const worldY = (focalCanvasY - prev.panY) / prev.zoom;
      const panX = focalCanvasX - worldX * targetZoom;
      const panY = focalCanvasY - worldY * targetZoom;
      applyCamera({ zoom: targetZoom, panX, panY });
    },
    [frameRef, applyCamera]
  );

  const clientToCanvas = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      cx: ((clientX - rect.left) * CANVAS_WIDTH) / rect.width,
      cy: ((clientY - rect.top) * CANVAS_HEIGHT) / rect.height,
      scaleX: CANVAS_WIDTH / rect.width,
      scaleY: CANVAS_HEIGHT / rect.height,
    };
  };

  const toGridCoord = (clientX: number, clientY: number): Coord | null => {
    const pos = clientToCanvas(clientX, clientY);
    if (!pos) return null;
    const cam = frameRef.current.camera;
    const worldX = (pos.cx - cam.panX) / cam.zoom;
    const worldY = (pos.cy - cam.panY) / cam.zoom;
    const gx = Math.floor(worldX / (CANVAS_WIDTH / GRID_COLS));
    const gy = Math.floor(worldY / (CANVAS_HEIGHT / GRID_ROWS));
    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return null;
    return { x: gx, y: gy };
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = clientToCanvas(e.clientX, e.clientY);
    if (!pos) return;
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    zoomAtPoint(frameRef.current.camera.zoom + delta, pos.cx, pos.cy);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isPanButton = e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey);
    if (isPanButton && frameRef.current.camera.zoom > 1.01) {
      e.preventDefault();
      dragRef.current = {
        active: true,
        moved: false,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: frameRef.current.camera.panX,
        startPanY: frameRef.current.camera.panY,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.active) {
      const pos = clientToCanvas(e.clientX, e.clientY);
      if (pos) {
        const dx = (e.clientX - dragRef.current.startClientX) * pos.scaleX;
        const dy = (e.clientY - dragRef.current.startClientY) * pos.scaleY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
        applyCamera({
          zoom: frameRef.current.camera.zoom,
          panX: dragRef.current.startPanX + dx,
          panY: dragRef.current.startPanY + dy,
        });
      }
      return;
    }
    onHoverTile(toGridCoord(e.clientX, e.clientY));
  };

  const handleMouseUp = () => {
    if (dragRef.current.active) {
      dragRef.current.active = false;
    }
  };

  // Touch gestures: 2-finger pinch zoom & 1-finger pan when zoomed in
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const mid = clientToCanvas((t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2);
      pinchRef.current = {
        active: true,
        startDist: Math.max(10, dist),
        startZoom: frameRef.current.camera.zoom,
        midCanvasX: mid ? mid.cx : CANVAS_WIDTH / 2,
        midCanvasY: mid ? mid.cy : CANVAS_HEIGHT / 2,
      };
      dragRef.current.active = false;
      dragRef.current.moved = true;
    } else if (e.touches.length === 1 && frameRef.current.camera.zoom > 1.01) {
      const t = e.touches[0];
      dragRef.current = {
        active: true,
        moved: false,
        startClientX: t.clientX,
        startClientY: t.clientY,
        startPanX: frameRef.current.camera.panX,
        startPanY: frameRef.current.camera.panY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (pinchRef.current.active && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = dist / pinchRef.current.startDist;
      zoomAtPoint(
        pinchRef.current.startZoom * scale,
        pinchRef.current.midCanvasX,
        pinchRef.current.midCanvasY
      );
      return;
    }
    if (dragRef.current.active && e.touches.length === 1) {
      const t = e.touches[0];
      const pos = clientToCanvas(t.clientX, t.clientY);
      if (pos) {
        const dx = (t.clientX - dragRef.current.startClientX) * pos.scaleX;
        const dy = (t.clientY - dragRef.current.startClientY) * pos.scaleY;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          dragRef.current.moved = true;
        }
        applyCamera({
          zoom: frameRef.current.camera.zoom,
          panX: dragRef.current.startPanX + dx,
          panY: dragRef.current.startPanY + dy,
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length < 2) {
      pinchRef.current.active = false;
    }
    if (e.touches.length === 0) {
      dragRef.current.active = false;
    }
  };

  const toneClass =
    hoverStatusTone === 'bad'
      ? 'text-rose-400'
      : hoverStatusTone === 'good'
        ? 'text-emerald-400'
        : hoverStatusTone === 'info'
          ? 'text-sky-300'
          : 'text-slate-400';

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#141920]">
      <div
        className={[
          'flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-1.5 sm:py-2 border-b shrink-0',
          bossPreview && phase !== 'VICTORY' && phase !== 'GAME_OVER'
            ? 'bg-rose-950/45 border-rose-500/40'
            : 'bg-[#1A212C] border-[#293446]',
        ].join(' ')}
      >
        <PhaseStatusLabel
          phase={phase}
          bricksRemaining={bricksRemaining}
          relocating={relocating}
          bossPreview={bossPreview}
        />

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {hoverStatusText && (
            <span
              className={`hidden sm:inline text-xs font-mono font-semibold tabular-nums whitespace-nowrap ${toneClass}`}
            >
              {hoverStatusText}
            </span>
          )}

          {/* Crisp Camera Zoom Controls */}
          <div
            role="group"
            aria-label="Map zoom controls"
            className="inline-flex items-center gap-0.5 sm:gap-1 bg-[#141921] border border-[#2C384B] rounded-md px-1 py-0.5"
          >
            <button
              type="button"
              onClick={() =>
                zoomAtPoint(frameRef.current.camera.zoom - 0.25, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
              }
              disabled={zoomPct <= 100}
              title="Zoom out"
              aria-label="Zoom out"
              className="p-1.5 sm:p-1 text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] tabular-nums text-slate-300 px-1 min-w-[36px] text-center">
              {zoomPct}%
            </span>
            <button
              type="button"
              onClick={() =>
                zoomAtPoint(frameRef.current.camera.zoom + 0.25, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
              }
              disabled={zoomPct >= 225}
              title="Zoom in to inspect pixel sprites (or scroll wheel / pinch)"
              aria-label="Zoom in"
              className="p-1.5 sm:p-1 text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomPct > 100 && (
              <button
                type="button"
                onClick={() => applyCamera({ zoom: 1, panX: 0, panY: 0 })}
                title="Reset camera view"
                aria-label="Reset camera view"
                className="p-1.5 sm:p-1 text-amber-300 hover:text-amber-200 cursor-pointer border-l border-[#2C384B] pl-1.5"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {onOpenMobileInspector && (
            <button
              type="button"
              onClick={onOpenMobileInspector}
              aria-label="Open wave & tile info"
              title="Wave & tile info"
              className="lg:hidden p-1.5 rounded-md bg-[#141921] border border-[#2C384B] text-slate-300 hover:text-white cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center p-1.5 sm:p-2.5 overflow-hidden">
        <div className="relative max-w-full max-h-full aspect-[24/16] w-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseLeave={() => {
              dragRef.current.active = false;
              onHoverTile(null);
            }}
            onClick={(e) => {
              if (dragRef.current.moved) {
                dragRef.current.moved = false;
                return;
              }
              const coord = toGridCoord(e.clientX, e.clientY);
              if (coord) onClickTile(coord);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (dragRef.current.moved) {
                dragRef.current.moved = false;
                return;
              }
              onRightClick();
            }}
            className="pixel-canvas touch-none w-full h-full object-contain rounded-md border border-[#324054] shadow-[0_12px_36px_rgba(0,0,0,0.45)] cursor-crosshair select-none"
          />
          {zoomPct > 100 && (
            <div className="pointer-events-none absolute bottom-2 right-2 px-2 py-1 rounded bg-[#0F172A]/85 border border-[#324054] font-mono text-[10px] text-slate-300">
              Drag to pan · Reset to fit
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
