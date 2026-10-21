import {
  applyMove,
  createSolvedCube,
  FACE_INFO,
  isSolved,
  multiplyMat,
  multiplyVec,
  rotationMatrixRadians,
  type Cubie,
  type Mat3,
  type Move,
  type Vec3,
} from "./cube";

export interface Transform {
  position: Vec3;
  orientation: Mat3;
}

interface QueuedMove {
  move: Move;
  duration: number;
}

interface ActiveMove {
  move: Move;
  axis: 0 | 1 | 2;
  angle: number;
  elapsed: number;
  duration: number;
  base: Map<string, { position: Vec3; orientation: Mat3 }>;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class CubeEngine {
  cubies: Cubie[] = createSolvedCube();

  private onMoveComplete: ((move: Move) => void) | null = null;
  private onIdle: (() => void) | null = null;

  private queue: QueuedMove[] = [];
  private active: ActiveMove | null = null;

  setListeners(listeners: {
    onMoveComplete?: (move: Move) => void;
    onIdle?: () => void;
  } | null): void {
    this.onMoveComplete = listeners?.onMoveComplete ?? null;
    this.onIdle = listeners?.onIdle ?? null;
  }

  get busy(): boolean {
    return this.active !== null || this.queue.length > 0;
  }

  isSolved(): boolean {
    return isSolved(this.cubies);
  }

  reset(): void {
    this.cubies = createSolvedCube();
    this.queue = [];
    this.active = null;
  }

  enqueue(move: Move, duration = 0.18): void {
    this.queue.push({ move, duration });
  }

  enqueueAll(moves: Move[], duration = 0.18): void {
    for (const move of moves) this.enqueue(move, duration);
  }

  tick(delta: number): void {
    const dt = Math.min(delta, 0.05);

    if (!this.active) {
      const next = this.queue.shift();
      if (!next) return;
      this.start(next);
    }

    const active = this.active;
    if (!active) return;

    active.elapsed += dt;

    if (active.elapsed >= active.duration) {
      this.finish();
    }
  }

  transformFor(cubie: Cubie): Transform {
    const active = this.active;
    if (!active) {
      return { position: cubie.position, orientation: cubie.orientation };
    }

    const base = active.base.get(cubie.id);
    if (!base) {
      return { position: cubie.position, orientation: cubie.orientation };
    }

    const progress = Math.min(active.elapsed / active.duration, 1);
    const partial = rotationMatrixRadians(
      active.axis,
      active.angle * easeInOut(progress),
    );

    return {
      position: multiplyVec(partial, base.position),
      orientation: multiplyMat(partial, base.orientation),
    };
  }

  private start(item: QueuedMove): void {
    const info = FACE_INFO[item.move.face];
    const clockwise = (info.clockwiseDegrees * Math.PI) / 180;

    const angle =
      item.move.turns === 1
        ? clockwise
        : item.move.turns === 2
          ? Math.PI
          : -clockwise;

    const base = new Map<string, { position: Vec3; orientation: Mat3 }>();

    for (const cubie of this.cubies) {
      if (cubie.position[info.axis] === info.layer) {
        base.set(cubie.id, {
          position: cubie.position,
          orientation: cubie.orientation,
        });
      }
    }

    this.active = {
      move: item.move,
      axis: info.axis,
      angle,
      elapsed: 0,
      duration: item.duration,
      base,
    };
  }

  private finish(): void {
    const active = this.active;
    if (!active) return;

    applyMove(this.cubies, active.move);
    this.active = null;

    this.onMoveComplete?.(active.move);

    if (!this.busy) {
      this.onIdle?.();
    }
  }
}
