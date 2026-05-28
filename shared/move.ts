export type BoxKind = "hurtbox" | "hitbox";

export type AabbBox = {
  id: string;
  kind: BoxKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};

export type SpriteRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MoveFrame = {
  id: string;
  name: string;
  duration: number;
  sprite: SpriteRect;
  boxes: AabbBox[];
};

export type MoveDefinition = {
  name: string;
  spriteSheetName: string;
  spriteSheetDataUrl: string;
  frames: MoveFrame[];
};

let nextId = 1;

export function createId(prefix: string): string {
  nextId += 1;
  return `${prefix}_${nextId.toString(36)}`;
}

export function createBox(kind: BoxKind, index: number): AabbBox {
  return {
    id: createId(kind),
    kind,
    x: 24,
    y: kind === "hurtbox" ? 16 : 28,
    w: kind === "hurtbox" ? 44 : 36,
    h: kind === "hurtbox" ? 76 : 24,
    label: `${kind} ${index}`
  };
}

export function createFrame(index: number, sprite?: SpriteRect): MoveFrame {
  return {
    id: createId("frame"),
    name: `Frame ${index}`,
    duration: 1,
    sprite: sprite ?? { x: 0, y: 0, w: 96, h: 96 },
    boxes: []
  };
}

export function createDefaultMove(): MoveDefinition {
  return {
    name: "new_move",
    spriteSheetName: "",
    spriteSheetDataUrl: "",
    frames: [createFrame(1)]
  };
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeMove(value: MoveDefinition): MoveDefinition {
  const frames = value.frames.map((frame, frameIndex) => ({
    id: frame.id || createId("frame"),
    name: frame.name.trim() || `Frame ${frameIndex + 1}`,
    duration: clampNumber(frame.duration, 1, 999),
    sprite: {
      x: clampNumber(frame.sprite.x, 0, 99999),
      y: clampNumber(frame.sprite.y, 0, 99999),
      w: clampNumber(frame.sprite.w, 1, 99999),
      h: clampNumber(frame.sprite.h, 1, 99999)
    },
    boxes: frame.boxes.map((box, boxIndex) => ({
      id: box.id || createId(box.kind),
      kind: box.kind === "hitbox" ? "hitbox" : "hurtbox",
      x: clampNumber(box.x, 0, 99999),
      y: clampNumber(box.y, 0, 99999),
      w: clampNumber(box.w, 1, 99999),
      h: clampNumber(box.h, 1, 99999),
      label: box.label.trim() || `${box.kind} ${boxIndex + 1}`
    }))
  }));

  return {
    name: value.name.trim() || "new_move",
    spriteSheetName: value.spriteSheetName,
    spriteSheetDataUrl: value.spriteSheetDataUrl,
    frames: frames.length ? frames : [createFrame(1)]
  };
}
