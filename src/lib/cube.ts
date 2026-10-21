export type Vec3 = readonly [number, number, number];
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export type Face = "U" | "D" | "L" | "R" | "F" | "B";
export type Turns = 1 | 2 | 3;

export interface Move {
  face: Face;
  turns: Turns;
}

export interface Sticker {
  normal: Vec3;
  color: string;
}

export interface Cubie {
  id: string;
  position: Vec3;
  orientation: Mat3;
  stickers: Sticker[];
}

export const FACES: Face[] = ["U", "D", "L", "R", "F", "B"];

export const FACE_COLORS: Record<Face, string> = {
  U: "#f4f6fb",
  D: "#fbbf24",
  F: "#22c55e",
  B: "#3b82f6",
  R: "#ef4444",
  L: "#fb923c",
};

export const FACE_NAMES: Record<Face, string> = {
  U: "Up",
  D: "Down",
  L: "Left",
  R: "Right",
  F: "Front",
  B: "Back",
};

interface FaceInfo {
  axis: 0 | 1 | 2;
  layer: 1 | -1;
  clockwiseDegrees: number;
}

export const FACE_INFO: Record<Face, FaceInfo> = {
  R: { axis: 0, layer: 1, clockwiseDegrees: -90 },
  L: { axis: 0, layer: -1, clockwiseDegrees: 90 },
  U: { axis: 1, layer: 1, clockwiseDegrees: -90 },
  D: { axis: 1, layer: -1, clockwiseDegrees: 90 },
  F: { axis: 2, layer: 1, clockwiseDegrees: -90 },
  B: { axis: 2, layer: -1, clockwiseDegrees: 90 },
};

const IDENTITY: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

export function rotationMatrixRadians(axis: 0 | 1 | 2, radians: number): Mat3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);

  if (axis === 0) {
    return [
      [1, 0, 0],
      [0, c, -s],
      [0, s, c],
    ];
  }
  if (axis === 1) {
    return [
      [c, 0, s],
      [0, 1, 0],
      [-s, 0, c],
    ];
  }
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
}

function rotationMatrixDegrees(axis: 0 | 1 | 2, degrees: number): Mat3 {
  const matrix = rotationMatrixRadians(axis, (degrees * Math.PI) / 180);
  return matrix.map((row) =>
    row.map((value) => Math.round(value)),
  ) as unknown as Mat3;
}

export function multiplyMat(a: Mat3, b: Mat3): Mat3 {
  return [
    [
      a[0][0] * b[0][0] + a[0][1] * b[1][0] + a[0][2] * b[2][0],
      a[0][0] * b[0][1] + a[0][1] * b[1][1] + a[0][2] * b[2][1],
      a[0][0] * b[0][2] + a[0][1] * b[1][2] + a[0][2] * b[2][2],
    ],
    [
      a[1][0] * b[0][0] + a[1][1] * b[1][0] + a[1][2] * b[2][0],
      a[1][0] * b[0][1] + a[1][1] * b[1][1] + a[1][2] * b[2][1],
      a[1][0] * b[0][2] + a[1][1] * b[1][2] + a[1][2] * b[2][2],
    ],
    [
      a[2][0] * b[0][0] + a[2][1] * b[1][0] + a[2][2] * b[2][0],
      a[2][0] * b[0][1] + a[2][1] * b[1][1] + a[2][2] * b[2][1],
      a[2][0] * b[0][2] + a[2][1] * b[1][2] + a[2][2] * b[2][2],
    ],
  ];
}

export function multiplyVec(matrix: Mat3, vector: Vec3): Vec3 {
  return [
    matrix[0][0] * vector[0] +
      matrix[0][1] * vector[1] +
      matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] +
      matrix[1][1] * vector[1] +
      matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] +
      matrix[2][1] * vector[1] +
      matrix[2][2] * vector[2],
  ];
}

export function moveMatrix(move: Move): Mat3 {
  const info = FACE_INFO[move.face];
  return rotationMatrixDegrees(info.axis, info.clockwiseDegrees * move.turns);
}

export function createSolvedCube(): Cubie[] {
  const cubies: Cubie[] = [];

  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        if (x === 0 && y === 0 && z === 0) continue;

        const stickers: Sticker[] = [];

        if (x === 1) stickers.push({ normal: [1, 0, 0], color: FACE_COLORS.R });
        if (x === -1)
          stickers.push({ normal: [-1, 0, 0], color: FACE_COLORS.L });
        if (y === 1) stickers.push({ normal: [0, 1, 0], color: FACE_COLORS.U });
        if (y === -1)
          stickers.push({ normal: [0, -1, 0], color: FACE_COLORS.D });
        if (z === 1) stickers.push({ normal: [0, 0, 1], color: FACE_COLORS.F });
        if (z === -1)
          stickers.push({ normal: [0, 0, -1], color: FACE_COLORS.B });

        cubies.push({
          id: `${x}:${y}:${z}`,
          position: [x, y, z],
          orientation: IDENTITY,
          stickers,
        });
      }
    }
  }

  return cubies;
}

export function applyMove(cubies: Cubie[], move: Move): void {
  const info = FACE_INFO[move.face];
  const matrix = moveMatrix(move);

  for (const cubie of cubies) {
    if (cubie.position[info.axis] !== info.layer) continue;

    cubie.position = multiplyVec(matrix, cubie.position).map((value) =>
      Math.round(value),
    ) as unknown as Vec3;
    cubie.orientation = multiplyMat(matrix, cubie.orientation);
  }
}

function faceFromNormal(normal: Vec3): Face {
  if (normal[0] === 1) return "R";
  if (normal[0] === -1) return "L";
  if (normal[1] === 1) return "U";
  if (normal[1] === -1) return "D";
  if (normal[2] === 1) return "F";
  return "B";
}

export function isSolved(cubies: Cubie[]): boolean {
  const colorsByFace: Record<Face, Set<string>> = {
    U: new Set(),
    D: new Set(),
    L: new Set(),
    R: new Set(),
    F: new Set(),
    B: new Set(),
  };

  for (const cubie of cubies) {
    for (const sticker of cubie.stickers) {
      const normal = multiplyVec(cubie.orientation, sticker.normal);
      colorsByFace[faceFromNormal(normal)].add(sticker.color);
    }
  }

  return FACES.every((face) => colorsByFace[face].size === 1);
}

export function formatMove(move: Move): string {
  if (move.turns === 2) return `${move.face}2`;
  if (move.turns === 3) return `${move.face}'`;
  return move.face;
}

function invertMove(move: Move): Move {
  return {
    face: move.face,
    turns: move.turns === 2 ? 2 : move.turns === 1 ? 3 : 1,
  };
}

export function invertSequence(moves: Move[]): Move[] {
  return [...moves].reverse().map(invertMove);
}

export function simplifySequence(moves: Move[]): Move[] {
  const result: Move[] = [];

  for (const move of moves) {
    const last = result[result.length - 1];

    if (last && last.face === move.face) {
      const turns = (last.turns + move.turns) % 4;

      if (turns === 0) {
        result.pop();
      } else {
        result[result.length - 1] = {
          face: move.face,
          turns: turns as Turns,
        };
      }
      continue;
    }

    result.push(move);
  }

  return result;
}

export function randomScramble(
  length = 22,
  random: () => number = Math.random,
): Move[] {
  const moves: Move[] = [];
  let previousFace: Face | null = null;

  while (moves.length < length) {
    const face = FACES[Math.floor(random() * FACES.length)];

    if (face === previousFace) continue;

    const turns = (1 + Math.floor(random() * 3)) as Turns;
    moves.push({ face, turns });
    previousFace = face;
  }

  return moves;
}
