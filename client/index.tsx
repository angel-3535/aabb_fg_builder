import { useAuth } from "lakebed/client";
import type { ComponentChildren } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  clampNumber,
  createBox,
  createDefaultMove,
  createFrame,
  createId,
  normalizeMove,
  type AabbBox,
  type BoxKind,
  type MoveDefinition,
  type MoveFrame,
  type SpriteRect
} from "../shared/move";

type DragState =
  | { mode: "move"; boxId: string; offsetX: number; offsetY: number }
  | { mode: "resize"; boxId: string; handle: ResizeHandle; startX: number; startY: number; box: AabbBox };

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

type CropDragState =
  | { mode: "create"; startX: number; startY: number; currentX: number; currentY: number }
  | { mode: "move"; rect: SpriteRect; offsetX: number; offsetY: number }
  | { mode: "resize"; rect: SpriteRect; handle: ResizeHandle };

type BoxContextMenu = {
  x: number;
  y: number;
  boxX: number;
  boxY: number;
};

const STORAGE_KEY = "aabb_fg_builder.move.v1";
const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function handleStyle(handle: ResizeHandle, scale: number) {
  const offset = -5;
  const middle = "50%";
  const positions: Record<ResizeHandle, { left?: string; right?: string; top?: string; bottom?: string; cursor: string }> = {
    n: { left: middle, top: `${offset}px`, cursor: "ns-resize" },
    ne: { right: `${offset}px`, top: `${offset}px`, cursor: "nesw-resize" },
    e: { right: `${offset}px`, top: middle, cursor: "ew-resize" },
    se: { right: `${offset}px`, bottom: `${offset}px`, cursor: "nwse-resize" },
    s: { left: middle, bottom: `${offset}px`, cursor: "ns-resize" },
    sw: { left: `${offset}px`, bottom: `${offset}px`, cursor: "nesw-resize" },
    w: { left: `${offset}px`, top: middle, cursor: "ew-resize" },
    nw: { left: `${offset}px`, top: `${offset}px`, cursor: "nwse-resize" }
  };
  const position = positions[handle];
  const translateX = position.left === middle ? "-50%" : "0";
  const translateY = position.top === middle ? "-50%" : "0";

  return {
    ...position,
    width: `${Math.max(8, scale * 2)}px`,
    height: `${Math.max(8, scale * 2)}px`,
    transform: `translate(${translateX}, ${translateY})`
  };
}

function loadInitialMove(): MoveDefinition {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return normalizeMove(JSON.parse(saved) as MoveDefinition);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return createDefaultMove();
}

function replaceFrame(move: MoveDefinition, frameId: string, update: (frame: MoveFrame) => MoveFrame): MoveDefinition {
  return {
    ...move,
    frames: move.frames.map((frame) => (frame.id === frameId ? update(frame) : frame))
  };
}

function replaceBox(move: MoveDefinition, frameId: string, boxId: string, update: (box: AabbBox) => AabbBox): MoveDefinition {
  return replaceFrame(move, frameId, (frame) => ({
    ...frame,
    boxes: frame.boxes.map((box) => (box.id === boxId ? update(box) : box))
  }));
}

function fitBoxToSprite(box: AabbBox, sprite: SpriteRect): AabbBox {
  const w = clampNumber(box.w, 1, sprite.w);
  const h = clampNumber(box.h, 1, sprite.h);

  return {
    ...box,
    x: clampNumber(box.x, 0, Math.max(0, sprite.w - w)),
    y: clampNumber(box.y, 0, Math.max(0, sprite.h - h)),
    w,
    h
  };
}

function readNumber(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampNumber(parsed, min, max) : fallback;
}

function downloadJson(move: MoveDefinition) {
  const cleanMove = normalizeMove(move);
  const blob = new Blob([JSON.stringify(cleanMove, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${cleanMove.name || "move"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function NumberField(props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onInput: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-neutral-400">
      <span>{props.label}</span>
      <input
        className="h-9 w-full border border-neutral-800 bg-neutral-950 px-2 text-sm text-white outline-none focus:border-cyan-400"
        max={props.max}
        min={props.min ?? 0}
        type="number"
        value={props.value}
        onInput={(event) => props.onInput(readNumber((event.currentTarget as HTMLInputElement).value, props.value, props.min ?? 0, props.max ?? 99999))}
      />
    </label>
  );
}

function Button(props: {
  children: ComponentChildren;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: (event: any) => void;
}) {
  const disabled = props.disabled ? "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-600" : "";
  const active = props.active ? "border-cyan-400 bg-cyan-400 text-black" : "border-neutral-700 bg-neutral-950 text-white hover:border-neutral-500";
  const danger = props.danger ? "border-red-500/70 text-red-200 hover:border-red-400" : active;

  return (
    <button className={`h-9 border px-3 text-sm font-medium ${props.disabled ? disabled : props.danger ? danger : active}`} disabled={props.disabled} type={props.type ?? "button"} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

export function App() {
  const auth = useAuth();
  const [move, setMove] = useState<MoveDefinition>(loadInitialMove);
  const [sheetSize, setSheetSize] = useState({ w: 0, h: 0 });
  const [selectedFrameId, setSelectedFrameId] = useState(move.frames[0]?.id ?? "");
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [editorTab, setEditorTab] = useState<"boxes" | "crop">("boxes");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackFps, setPlaybackFps] = useState(60);
  const [playheadTick, setPlayheadTick] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [cropDrag, setCropDrag] = useState<CropDragState | null>(null);
  const [contextMenu, setContextMenu] = useState<BoxContextMenu | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const frame = useMemo(
    () => move.frames.find((item) => item.id === selectedFrameId) ?? move.frames[0],
    [move.frames, selectedFrameId]
  );
  const selectedBox = frame?.boxes.find((box) => box.id === selectedBoxId);
  const scale = frame ? Math.min(5, Math.max(2, Math.floor(520 / Math.max(frame.sprite.w, frame.sprite.h, 1)))) : 3;
  const sheetScale = sheetSize.w && sheetSize.h ? Math.min(3, Math.max(1, Math.floor(760 / Math.max(sheetSize.w, sheetSize.h, 1)))) : 1;
  const activeCrop = cropDrag?.mode === "create" && frame ? rectFromPoints(cropDrag.startX, cropDrag.startY, cropDrag.currentX, cropDrag.currentY, sheetSize) : frame?.sprite;
  const visibleBoxes = frame ? frame.boxes : [];
  const selectedFrameIndex = useMemo(
    () => Math.max(0, move.frames.findIndex((item) => item.id === frame?.id)),
    [frame?.id, move.frames]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(move));
  }, [move]);

  useEffect(() => {
    if (!move.spriteSheetDataUrl) {
      return;
    }

    const image = new Image();
    image.onload = () => setSheetSize({ w: image.naturalWidth, h: image.naturalHeight });
    image.src = move.spriteSheetDataUrl;
  }, []);

  useEffect(() => {
    if (!isPlaying || move.frames.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setPlayheadTick((currentTick) => {
        const currentIndex = move.frames.findIndex((item) => item.id === selectedFrameId);
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const currentFrame = move.frames[safeIndex];
        const duration = Math.max(1, currentFrame?.duration ?? 1);

        if (currentTick + 1 < duration) {
          return currentTick + 1;
        }

        const nextFrame = move.frames[(safeIndex + 1) % move.frames.length];
        setSelectedFrameId(nextFrame.id);
        setSelectedBoxId("");
        return 0;
      });
    }, 1000 / playbackFps);

    return () => window.clearInterval(interval);
  }, [isPlaying, move.frames, playbackFps, selectedFrameId]);

  function selectFrame(frameId: string) {
    setSelectedFrameId(frameId);
    setSelectedBoxId("");
    setPlayheadTick(0);
  }

  function updateCurrentFrame(update: (frame: MoveFrame) => MoveFrame) {
    if (!frame) {
      return;
    }

    setMove((current) => replaceFrame(current, frame.id, update));
  }

  function updateSprite(partial: Partial<SpriteRect>) {
    updateCurrentFrame((currentFrame) => ({
      ...currentFrame,
      sprite: { ...currentFrame.sprite, ...partial }
    }));
  }

  function setSpriteRect(sprite: SpriteRect) {
    updateCurrentFrame((currentFrame) => ({
      ...currentFrame,
      sprite,
      boxes: currentFrame.boxes.map((box) => fitBoxToSprite(box, sprite))
    }));
  }

  function updateSelectedBox(update: (box: AabbBox) => AabbBox) {
    if (!frame || !selectedBox) {
      return;
    }

    setMove((current) => replaceBox(current, frame.id, selectedBox.id, update));
  }

  function addFrame() {
    const nextFrame = createFrame(move.frames.length + 1, frame?.sprite);
    setMove((current) => ({ ...current, frames: [...current.frames, nextFrame] }));
    selectFrame(nextFrame.id);
  }

  function duplicateFrame() {
    if (!frame) {
      return;
    }

    const nextFrame = {
      ...frame,
      id: createId("frame"),
      name: `${frame.name} copy`,
      boxes: frame.boxes.map((box) => ({ ...box, id: createId(box.kind) }))
    };
    setMove((current) => ({ ...current, frames: [...current.frames, nextFrame] }));
    selectFrame(nextFrame.id);
  }

  function deleteFrame() {
    if (!frame || move.frames.length === 1) {
      return;
    }

    const remainingFrames = move.frames.filter((item) => item.id !== frame.id);
    setMove((current) => ({ ...current, frames: remainingFrames }));
    selectFrame(remainingFrames[Math.min(selectedFrameIndex, remainingFrames.length - 1)].id);
  }

  function addBox(kind: BoxKind, x = 24, y = kind === "hurtbox" ? 16 : 28) {
    if (!frame) {
      return;
    }

    const baseBox = createBox(kind, frame.boxes.filter((item) => item.kind === kind).length + 1);
    const box = {
      ...baseBox,
      x: clampNumber(x, 0, Math.max(0, frame.sprite.w - baseBox.w)),
      y: clampNumber(y, 0, Math.max(0, frame.sprite.h - baseBox.h))
    };
    updateCurrentFrame((currentFrame) => ({ ...currentFrame, boxes: [...currentFrame.boxes, box] }));
    setSelectedBoxId(box.id);
    setContextMenu(null);
  }

  function deleteSelectedBox() {
    if (!frame || !selectedBox) {
      return;
    }

    updateCurrentFrame((currentFrame) => ({
      ...currentFrame,
      boxes: currentFrame.boxes.filter((box) => box.id !== selectedBox.id)
    }));
    setSelectedBoxId("");
  }

  function pointFromEvent(event: any) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || !frame) {
      return { x: 0, y: 0 };
    }

    return {
      x: clampNumber((event.clientX - rect.left) / scale, 0, frame.sprite.w),
      y: clampNumber((event.clientY - rect.top) / scale, 0, frame.sprite.h)
    };
  }

  function pointFromSheetEvent(event: any) {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect || !sheetSize.w || !sheetSize.h) {
      return { x: 0, y: 0 };
    }

    return {
      x: clampNumber((event.clientX - rect.left) / sheetScale, 0, sheetSize.w),
      y: clampNumber((event.clientY - rect.top) / sheetScale, 0, sheetSize.h)
    };
  }

  function rectFromPoints(startX: number, startY: number, currentX: number, currentY: number, bounds: { w: number; h: number }): SpriteRect {
    const left = clampNumber(Math.min(startX, currentX), 0, Math.max(0, bounds.w - 1));
    const top = clampNumber(Math.min(startY, currentY), 0, Math.max(0, bounds.h - 1));
    const right = clampNumber(Math.max(startX, currentX), left + 1, bounds.w);
    const bottom = clampNumber(Math.max(startY, currentY), top + 1, bounds.h);

    return {
      x: left,
      y: top,
      w: Math.max(1, right - left),
      h: Math.max(1, bottom - top)
    };
  }

  function resizeSpriteRect(rect: SpriteRect, handle: ResizeHandle, point: { x: number; y: number }, bounds: { w: number; h: number }): SpriteRect {
    const left = rect.x;
    const right = rect.x + rect.w;
    const top = rect.y;
    const bottom = rect.y + rect.h;
    let nextLeft = left;
    let nextRight = right;
    let nextTop = top;
    let nextBottom = bottom;

    if (handle.includes("w")) {
      nextLeft = clampNumber(point.x, 0, right - 1);
    }
    if (handle.includes("e")) {
      nextRight = clampNumber(point.x, left + 1, bounds.w);
    }
    if (handle.includes("n")) {
      nextTop = clampNumber(point.y, 0, bottom - 1);
    }
    if (handle.includes("s")) {
      nextBottom = clampNumber(point.y, top + 1, bounds.h);
    }

    return {
      x: nextLeft,
      y: nextTop,
      w: Math.max(1, nextRight - nextLeft),
      h: Math.max(1, nextBottom - nextTop)
    };
  }

  function onStagePointerDown(event: any) {
    if (!frame || event.button !== 0) {
      return;
    }

    setContextMenu(null);
    if (!(event.target as HTMLElement).dataset.boxId) {
      setSelectedBoxId("");
    }
  }

  function onBoxPointerDown(event: any, box: AabbBox) {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    setContextMenu(null);
    setSelectedBoxId(box.id);
    const point = pointFromEvent(event);
    setDrag({ mode: "move", boxId: box.id, offsetX: point.x - box.x, offsetY: point.y - box.y });
    (stageRef.current as HTMLElement | null)?.setPointerCapture(event.pointerId);
  }

  function onResizeHandlePointerDown(event: any, box: AabbBox, handle: ResizeHandle) {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    setContextMenu(null);
    setSelectedBoxId(box.id);
    const point = pointFromEvent(event);
    setDrag({ mode: "resize", boxId: box.id, handle, startX: point.x, startY: point.y, box });
    (stageRef.current as HTMLElement | null)?.setPointerCapture(event.pointerId);
  }

  function resizeBox(box: AabbBox, handle: ResizeHandle, point: { x: number; y: number }, sprite: SpriteRect): AabbBox {
    const left = box.x;
    const right = box.x + box.w;
    const top = box.y;
    const bottom = box.y + box.h;
    let nextLeft = left;
    let nextRight = right;
    let nextTop = top;
    let nextBottom = bottom;

    if (handle.includes("w")) {
      nextLeft = clampNumber(point.x, 0, right - 1);
    }
    if (handle.includes("e")) {
      nextRight = clampNumber(point.x, left + 1, sprite.w);
    }
    if (handle.includes("n")) {
      nextTop = clampNumber(point.y, 0, bottom - 1);
    }
    if (handle.includes("s")) {
      nextBottom = clampNumber(point.y, top + 1, sprite.h);
    }

    return {
      ...box,
      x: nextLeft,
      y: nextTop,
      w: Math.max(1, nextRight - nextLeft),
      h: Math.max(1, nextBottom - nextTop)
    };
  }

  function onStagePointerMove(event: any) {
    if (!drag || !frame) {
      return;
    }

    const point = pointFromEvent(event);
    if (drag.mode === "resize") {
      setMove((current) => replaceBox(current, frame.id, drag.boxId, () => resizeBox(drag.box, drag.handle, point, frame.sprite)));
      return;
    }

    const movingBox = frame.boxes.find((box) => box.id === drag.boxId);
    if (!movingBox) {
      return;
    }

    setMove((current) =>
      replaceBox(current, frame.id, drag.boxId, (box) => ({
        ...box,
        x: clampNumber(point.x - drag.offsetX, 0, Math.max(0, frame.sprite.w - box.w)),
        y: clampNumber(point.y - drag.offsetY, 0, Math.max(0, frame.sprite.h - box.h))
      }))
    );
  }

  function onStagePointerUp() {
    setDrag(null);
  }

  function onStageContextMenu(event: any) {
    event.preventDefault();
    if (!frame) {
      return;
    }

    const point = pointFromEvent(event);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      boxX: point.x,
      boxY: point.y
    });
  }

  function onSheetPointerDown(event: any) {
    if (!move.spriteSheetDataUrl || event.button !== 0) {
      return;
    }

    event.preventDefault();
    setSelectedBoxId("");
    const point = pointFromSheetEvent(event);
    setCropDrag({ mode: "create", startX: point.x, startY: point.y, currentX: point.x, currentY: point.y });
    (sheetRef.current as HTMLElement | null)?.setPointerCapture(event.pointerId);
  }

  function onCropPointerDown(event: any) {
    if (!frame || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedBoxId("");
    const point = pointFromSheetEvent(event);
    setCropDrag({
      mode: "move",
      rect: frame.sprite,
      offsetX: point.x - frame.sprite.x,
      offsetY: point.y - frame.sprite.y
    });
    (sheetRef.current as HTMLElement | null)?.setPointerCapture(event.pointerId);
  }

  function onCropResizeHandlePointerDown(event: any, handle: ResizeHandle) {
    if (!frame || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedBoxId("");
    setCropDrag({ mode: "resize", rect: frame.sprite, handle });
    (sheetRef.current as HTMLElement | null)?.setPointerCapture(event.pointerId);
  }

  function onSheetPointerMove(event: any) {
    if (!cropDrag || !frame || !sheetSize.w || !sheetSize.h) {
      return;
    }

    const point = pointFromSheetEvent(event);
    if (cropDrag.mode === "create") {
      setCropDrag({ ...cropDrag, currentX: point.x, currentY: point.y });
      return;
    }

    if (cropDrag.mode === "resize") {
      setSpriteRect(resizeSpriteRect(cropDrag.rect, cropDrag.handle, point, sheetSize));
      return;
    }

    setSpriteRect({
      ...cropDrag.rect,
      x: clampNumber(point.x - cropDrag.offsetX, 0, Math.max(0, sheetSize.w - cropDrag.rect.w)),
      y: clampNumber(point.y - cropDrag.offsetY, 0, Math.max(0, sheetSize.h - cropDrag.rect.h))
    });
  }

  function onSheetPointerUp() {
    if (!cropDrag || !sheetSize.w || !sheetSize.h) {
      setCropDrag(null);
      return;
    }

    if (cropDrag.mode === "create") {
      setSpriteRect(rectFromPoints(cropDrag.startX, cropDrag.startY, cropDrag.currentX, cropDrag.currentY, sheetSize));
    }
    setCropDrag(null);
  }

  async function onSpriteSheetChange(event: any) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const image = new Image();
      image.onload = () => {
        setSheetSize({ w: image.naturalWidth, h: image.naturalHeight });
        setMove((current) => ({
          ...current,
          spriteSheetName: file.name,
          spriteSheetDataUrl: dataUrl,
          frames: current.frames.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  sprite: {
                    x: 0,
                    y: 0,
                    w: Math.min(96, image.naturalWidth || 96),
                    h: Math.min(96, image.naturalHeight || 96)
                  }
                }
              : item
          )
        }));
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function onImportJson(event: any) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeMove(JSON.parse(String(reader.result ?? "")) as MoveDefinition);
        setMove(imported);
        selectFrame(imported.frames[0]?.id ?? "");
        setIsPlaying(false);
        if (imported.spriteSheetDataUrl) {
          const image = new Image();
          image.onload = () => setSheetSize({ w: image.naturalWidth, h: image.naturalHeight });
          image.src = imported.spriteSheetDataUrl;
        }
      } catch {
        window.alert("Could not import that JSON file.");
      }
    };
    reader.readAsText(file);
  }

  if (!frame) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              className="h-10 w-56 border border-neutral-800 bg-black px-3 text-lg font-semibold outline-none focus:border-cyan-400"
              value={move.name}
              onInput={(event) => setMove({ ...move, name: (event.currentTarget as HTMLInputElement).value })}
            />
            <p className="font-mono text-xs text-neutral-500">{auth.userId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="grid h-9 cursor-pointer place-items-center border border-neutral-700 bg-neutral-950 px-3 text-sm font-medium hover:border-neutral-500">
              Sprite sheet
              <input className="hidden" accept="image/*" type="file" onChange={(event) => void onSpriteSheetChange(event)} />
            </label>
            <label className="grid h-9 cursor-pointer place-items-center border border-neutral-700 bg-neutral-950 px-3 text-sm font-medium hover:border-neutral-500">
              Import JSON
              <input className="hidden" accept="application/json" type="file" onChange={onImportJson} />
            </label>
            <Button onClick={() => downloadJson(move)}>Export JSON</Button>
          </div>
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-65px)] grid-cols-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(360px,1fr)_300px]">
        <section className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button active={editorTab === "boxes"} onClick={() => setEditorTab("boxes")}>Hurtboxes</Button>
              <Button active={editorTab === "crop"} onClick={() => setEditorTab("crop")}>Sprite Crop</Button>
            </div>
            <p className="text-sm text-neutral-400">
              {editorTab === "crop" ? "Drag on the sheet to crop the current frame." : "Right-click the sprite to add a box."}
            </p>
          </div>

          {editorTab === "crop" ? (
            <div className="flex flex-1 flex-col overflow-hidden bg-neutral-900 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Sprite Crop</h2>
                <div className="flex items-center gap-3 text-sm text-neutral-400">
                  <span>{move.spriteSheetName || "No sprite sheet loaded"}</span>
                  {sheetSize.w ? <span className="font-mono text-xs text-neutral-500">{frame.sprite.x}, {frame.sprite.y}, {frame.sprite.w} x {frame.sprite.h}</span> : null}
                </div>
              </div>
              <div className="flex-1 overflow-auto border border-neutral-800 bg-black">
                {move.spriteSheetDataUrl && sheetSize.w && sheetSize.h ? (
                  <div
                    ref={sheetRef}
                    className="relative touch-none"
                    style={{
                      width: `${sheetSize.w * sheetScale}px`,
                      height: `${sheetSize.h * sheetScale}px`,
                      backgroundImage: `url(${move.spriteSheetDataUrl})`,
                      backgroundSize: `${sheetSize.w * sheetScale}px ${sheetSize.h * sheetScale}px`,
                      imageRendering: "pixelated"
                    }}
                    onPointerDown={onSheetPointerDown}
                    onPointerMove={onSheetPointerMove}
                    onPointerUp={onSheetPointerUp}
                    onPointerCancel={() => setCropDrag(null)}
                  >
                    {activeCrop ? (
                      <div
                        className="absolute cursor-move border-2 border-cyan-300 bg-cyan-300/20 ring-2 ring-black/80"
                        style={{
                          left: `${activeCrop.x * sheetScale}px`,
                          top: `${activeCrop.y * sheetScale}px`,
                          width: `${activeCrop.w * sheetScale}px`,
                          height: `${activeCrop.h * sheetScale}px`
                        }}
                        onPointerDown={onCropPointerDown}
                      >
                        <span className="pointer-events-none absolute left-1 top-1 bg-black/70 px-1 font-mono text-[10px] leading-4 text-white">
                          {activeCrop.w} x {activeCrop.h}
                        </span>
                        {RESIZE_HANDLES.map((handle) => (
                          <button
                            aria-label={`Resize crop ${handle}`}
                            className="absolute border border-black bg-white"
                            key={handle}
                            style={handleStyle(handle, sheetScale)}
                            type="button"
                            onPointerDown={(event) => onCropResizeHandlePointerDown(event, handle)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid h-full min-h-80 place-items-center px-4 text-center text-sm text-neutral-500">
                    Load a sprite sheet to crop the current frame.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid flex-1 place-items-center overflow-auto bg-neutral-900 p-8">
              <div
                ref={stageRef}
                className="relative touch-none border border-neutral-700 bg-black shadow-2xl"
                style={{
                  width: `${frame.sprite.w * scale}px`,
                  height: `${frame.sprite.h * scale}px`,
                  backgroundImage: move.spriteSheetDataUrl ? `url(${move.spriteSheetDataUrl})` : "none",
                  backgroundPosition: `${-frame.sprite.x * scale}px ${-frame.sprite.y * scale}px`,
                  backgroundSize: sheetSize.w && sheetSize.h ? `${sheetSize.w * scale}px ${sheetSize.h * scale}px` : "auto",
                  imageRendering: "pixelated"
                }}
                onPointerDown={onStagePointerDown}
                onPointerMove={onStagePointerMove}
                onPointerUp={onStagePointerUp}
                onPointerCancel={() => setDrag(null)}
                onContextMenu={onStageContextMenu}
              >
                {!move.spriteSheetDataUrl ? (
                  <div className="grid h-full place-items-center px-8 text-center text-sm text-neutral-500">
                    Load a sprite sheet, then set the frame crop and right-click to add boxes.
                  </div>
                ) : null}
                {visibleBoxes.map((box) => {
                  const selected = box.id === selectedBoxId;
                  const color = box.kind === "hurtbox" ? "border-emerald-400 bg-emerald-400/20" : "border-red-400 bg-red-400/20";
                  return (
                    <div
                      className={`absolute border-2 ${color} ${selected ? "ring-2 ring-white" : ""}`}
                      data-box-id={box.id}
                      key={box.id}
                      role="button"
                      style={{
                        left: `${box.x * scale}px`,
                        top: `${box.y * scale}px`,
                        width: `${box.w * scale}px`,
                        height: `${box.h * scale}px`
                      }}
                      tabIndex={0}
                      onPointerDown={(event) => onBoxPointerDown(event, box)}
                    >
                      <span className="absolute left-1 top-1 bg-black/70 px-1 text-[10px] leading-4 text-white">{box.label}</span>
                      {selected
                        ? RESIZE_HANDLES.map((handle) => (
                            <button
                              aria-label={`Resize ${handle}`}
                              className="absolute border border-black bg-white"
                              data-box-id={box.id}
                              key={handle}
                              style={handleStyle(handle, scale)}
                              type="button"
                              onPointerDown={(event) => onResizeHandlePointerDown(event, box, handle)}
                            />
                          ))
                        : null}
                    </div>
                  );
                })}
                {contextMenu ? (
                  <div
                    className="fixed z-50 grid min-w-36 border border-neutral-700 bg-neutral-950 p-1 shadow-xl"
                    style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
                    onContextMenu={(event) => event.preventDefault()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <button className="px-3 py-2 text-left text-sm hover:bg-neutral-800" type="button" onClick={() => addBox("hurtbox", contextMenu.boxX, contextMenu.boxY)}>
                      Add hurtbox
                    </button>
                    <button className="px-3 py-2 text-left text-sm hover:bg-neutral-800" type="button" onClick={() => addBox("hitbox", contextMenu.boxX, contextMenu.boxY)}>
                      Add hitbox
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <aside className="overflow-auto border-l border-neutral-800 bg-black/40 p-4">
          <div className="mb-5 grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Frame</h2>
              <Button danger disabled={move.frames.length === 1} onClick={deleteFrame}>Delete</Button>
            </div>
            <label className="grid gap-1 text-xs font-medium text-neutral-400">
              <span>Name</span>
              <input
                className="h-9 border border-neutral-800 bg-neutral-950 px-2 text-sm text-white outline-none focus:border-cyan-400"
                value={frame.name}
                onInput={(event) => updateCurrentFrame((item) => ({ ...item, name: (event.currentTarget as HTMLInputElement).value }))}
              />
            </label>
            <NumberField label="Duration" min={1} value={frame.duration} onInput={(value) => updateCurrentFrame((item) => ({ ...item, duration: value }))} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Sprite X" value={frame.sprite.x} onInput={(value) => updateSprite({ x: value })} />
              <NumberField label="Sprite Y" value={frame.sprite.y} onInput={(value) => updateSprite({ y: value })} />
              <NumberField label="Sprite W" min={1} value={frame.sprite.w} onInput={(value) => updateSprite({ w: value })} />
              <NumberField label="Sprite H" min={1} value={frame.sprite.h} onInput={(value) => updateSprite({ h: value })} />
            </div>
            {sheetSize.w ? <p className="text-xs text-neutral-500">Sheet {sheetSize.w} x {sheetSize.h}</p> : null}
          </div>

          <div className="mb-5 grid gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Boxes</h2>
            {frame.boxes.length === 0 ? <p className="text-sm text-neutral-500">Right-click the sprite to add a box.</p> : null}
            {frame.boxes.map((box) => (
              <button
                className={`flex items-center justify-between border px-3 py-2 text-left ${box.id === selectedBoxId ? "border-cyan-400 bg-cyan-400 text-black" : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"}`}
                key={box.id}
                type="button"
                onClick={() => {
                  setEditorTab("boxes");
                  setSelectedBoxId(box.id);
                }}
              >
                <span className="text-sm font-medium">{box.label}</span>
                <span className="text-xs opacity-70">{box.kind === "hurtbox" ? "hurt" : "hit"}</span>
              </button>
            ))}
          </div>

          {selectedBox ? (
            <div className="grid gap-3 border-t border-neutral-800 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Selected</h2>
                <Button danger onClick={deleteSelectedBox}>Delete</Button>
              </div>
              <label className="grid gap-1 text-xs font-medium text-neutral-400">
                <span>Label</span>
                <input
                  className="h-9 border border-neutral-800 bg-neutral-950 px-2 text-sm text-white outline-none focus:border-cyan-400"
                  value={selectedBox.label}
                  onInput={(event) => updateSelectedBox((box) => ({ ...box, label: (event.currentTarget as HTMLInputElement).value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="X" value={selectedBox.x} onInput={(value) => updateSelectedBox((box) => ({ ...box, x: value }))} />
                <NumberField label="Y" value={selectedBox.y} onInput={(value) => updateSelectedBox((box) => ({ ...box, y: value }))} />
                <NumberField label="W" min={1} value={selectedBox.w} onInput={(value) => updateSelectedBox((box) => ({ ...box, w: value }))} />
                <NumberField label="H" min={1} value={selectedBox.h} onInput={(value) => updateSelectedBox((box) => ({ ...box, h: value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button active={selectedBox.kind === "hurtbox"} onClick={() => updateSelectedBox((box) => ({ ...box, kind: "hurtbox" }))}>Hurt</Button>
                <Button active={selectedBox.kind === "hitbox"} onClick={() => updateSelectedBox((box) => ({ ...box, kind: "hitbox" }))}>Hit</Button>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="border-t border-neutral-800 bg-black/70 p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setIsPlaying((value) => !value)}>{isPlaying ? "Pause" : "Play"}</Button>
              <Button
                onClick={() => {
                  selectFrame(move.frames[(selectedFrameIndex + 1) % move.frames.length].id);
                }}
              >
                Next
              </Button>
              <Button onClick={addFrame}>Add Frame</Button>
              <Button onClick={duplicateFrame}>Copy Frame</Button>
            </div>
            <div className="w-28">
              <NumberField label="FPS" min={1} max={240} value={playbackFps} onInput={setPlaybackFps} />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {move.frames.map((item, index) => (
              <button
                className={`grid min-w-36 border px-3 py-2 text-left ${item.id === frame.id ? "border-cyan-400 bg-cyan-400 text-black" : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"}`}
                key={item.id}
                type="button"
                onClick={() => selectFrame(item.id)}
              >
                <span className="text-sm font-semibold">{index + 1}. {item.name}</span>
                <span className="text-xs opacity-70">{item.duration} ticks, {item.boxes.length} boxes</span>
                {item.id === frame.id ? <span className="mt-1 h-1 bg-black/40" style={{ width: `${clampNumber(((playheadTick + 1) / Math.max(1, item.duration)) * 100, 5, 100)}%` }} /> : <span className="mt-1 h-1 bg-neutral-800" />}
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
