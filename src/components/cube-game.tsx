"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  FACES,
  FACE_COLORS,
  FACE_NAMES,
  formatMove,
  invertSequence,
  randomScramble,
  simplifySequence,
  type Face,
  type Move,
} from "@/lib/cube";
import { CubeEngine } from "@/lib/cube-engine";

const CubeScene = dynamic(() => import("./cube-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-white/40">
      Loading cube…
    </div>
  ),
});

type Phase = "scrambling" | "playing" | "solving";

const SCRAMBLE_LENGTH = 22;
const MOVE_SPEED = 0.16;
const SCRAMBLE_SPEED = 0.07;

export default function CubeGame() {
  const [engine] = useState(() => new CubeEngine());

  const modeRef = useRef<Phase>("scrambling");
  const startedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("scrambling");
  const [history, setHistory] = useState<Move[]>([]);
  const [solution, setSolution] = useState<Move[] | null>(null);
  const [solved, setSolved] = useState(false);
  const [turns, setTurns] = useState(0);

  useEffect(() => {
    engine.setListeners({
      onMoveComplete: (move) => {
        if (modeRef.current === "solving") {
          setHistory((current) => [...current, move]);
          return;
        }

        if (modeRef.current !== "playing") return;

        setHistory((current) => [...current, move]);
        setTurns((current) => current + 1);

        if (engine.isSolved()) {
          setSolved(true);
          setSolution(null);
          setHistory([]);
        }
      },
      onIdle: () => {
        if (modeRef.current === "solving" && engine.isSolved()) {
          setSolved(true);
          setSolution(null);
          setHistory([]);
        }

        modeRef.current = "playing";
        setPhase("playing");
      },
    });

    return () => engine.setListeners(null);
  }, [engine]);

  const startScramble = useCallback(() => {
    const scramble = randomScramble(SCRAMBLE_LENGTH);

    engine.reset();
    engine.enqueueAll(scramble, SCRAMBLE_SPEED);

    modeRef.current = "scrambling";
    setPhase("scrambling");
    setHistory(scramble);
    setTurns(0);
    setSolved(false);
    setSolution(null);
  }, [engine]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startScramble();
  }, [startScramble]);

  const playMove = useCallback(
    (move: Move) => {
      if (modeRef.current !== "playing" || engine.isSolved()) return;
      setSolution(null);
      engine.enqueue(move, MOVE_SPEED);
    },
    [engine],
  );

  const toggleSolution = useCallback(() => {
    if (solution) {
      setSolution(null);
      return;
    }
    setSolution(simplifySequence(invertSequence(history)));
  }, [history, solution]);

  const playSolution = useCallback(() => {
    if (!solution || modeRef.current !== "playing") return;
    modeRef.current = "solving";
    setPhase("solving");
    engine.enqueueAll(solution, MOVE_SPEED);
  }, [engine, solution]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const face = event.key.toUpperCase() as Face;
      if (!FACES.includes(face)) return;

      event.preventDefault();
      playMove({ face, turns: event.shiftKey ? 3 : 1 });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playMove]);

  const isInteractive = phase === "playing" && !solved;
  const canShowSolution = phase === "playing" && !solved && history.length > 0;

  const status = solved
    ? { label: "Solved", tone: "bg-emerald-400/15 text-emerald-300" }
    : phase === "scrambling"
      ? { label: "Scrambling", tone: "bg-amber-400/15 text-amber-300" }
      : phase === "solving"
        ? { label: "Auto-solving", tone: "bg-sky-400/15 text-sky-300" }
        : { label: "Your move", tone: "bg-white/10 text-white/70" };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#07070c] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-[-10%] h-[32rem] w-[32rem] rounded-full bg-violet-600/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 bottom-[-20%] h-[34rem] w-[34rem] rounded-full bg-emerald-500/10 blur-[140px]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-5 pb-2 pt-8 sm:px-8">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/40">
            A little puzzle
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Rubik&apos;s Cube
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">
            Scramble it, turn the faces, and peek at the solution if you get
            stuck.
          </p>
        </div>
        <span
          className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:inline-flex ${status.tone}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {status.label}
        </span>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 pb-8 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6 lg:px-8">
        <section className="relative min-h-[380px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] shadow-[0_30px_120px_-40px_rgba(139,92,246,0.45)] sm:min-h-[460px] lg:min-h-[600px]">
          <CubeScene engine={engine} />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/40 to-transparent px-5 pb-4 pt-10 text-[11px] text-white/35">
            <span>Drag to orbit</span>
            <span>Scroll to zoom</span>
          </div>

          {solved && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
              <div className="mx-6 w-full max-w-xs rounded-3xl border border-emerald-300/25 bg-[#0b1512]/90 p-6 text-center shadow-2xl">
                <span className="text-4xl">🎉</span>
                <h2 className="mt-3 text-2xl font-semibold text-emerald-300">
                  Solved!
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  {turns > 0
                    ? `Finished in ${turns} turn${turns === 1 ? "" : "s"}.`
                    : "The cube is in its solved state."}
                </p>
                <button
                  onClick={startScramble}
                  className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
                >
                  Scramble again
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                Turns
              </h2>
              <div className="flex items-baseline gap-4 text-xs text-white/40">
                <span>
                  <span className="text-lg font-semibold text-white">
                    {turns}
                  </span>{" "}
                  yours
                </span>
                <span>
                  <span className="text-lg font-semibold text-white">
                    {solution ? solution.length : 0}
                  </span>{" "}
                  in solution
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {FACES.map((face) => (
                <div
                  key={face}
                  className="rounded-xl border border-white/[0.07] bg-black/20 p-1.5"
                >
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => playMove({ face, turns: 1 })}
                      disabled={!isInteractive}
                      aria-label={`Turn ${FACE_NAMES[face]} clockwise`}
                      className="h-10 flex-1 rounded-lg bg-white/[0.07] text-base font-semibold transition hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {face}
                    </button>
                    <button
                      onClick={() => playMove({ face, turns: 3 })}
                      disabled={!isInteractive}
                      aria-label={`Turn ${FACE_NAMES[face]} counter-clockwise`}
                      className="h-10 w-9 rounded-lg bg-white/[0.04] text-sm font-medium text-white/60 transition hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {face}&apos;
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: FACE_COLORS[face] }}
                    />
                    <span className="text-[10px] uppercase tracking-wider text-white/35">
                      {FACE_NAMES[face]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-white/30">
              Click a face or press{" "}
              <span className="font-mono text-white/50">U D L R F B</span>. Hold{" "}
              <span className="font-mono text-white/50">Shift</span> to turn the
              other way.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Stuck?</h2>
                <p className="mt-0.5 text-xs text-white/40">
                  Reveal the way back to solved.
                </p>
              </div>
              <button
                onClick={toggleSolution}
                disabled={!canShowSolution && !solution}
                className="rounded-xl border border-violet-300/25 bg-violet-400/15 px-3.5 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/25 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {solution ? "Hide" : "Show solution"}
              </button>
            </div>

            {solution && (
              <div className="mt-4">
                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pr-1">
                  {solution.map((move, index) => (
                    <span
                      key={`${formatMove(move)}-${index}`}
                      className="inline-flex min-w-8 items-center justify-center rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-xs text-white/75"
                    >
                      {formatMove(move)}
                    </span>
                  ))}
                </div>
                <button
                  onClick={playSolution}
                  disabled={phase !== "playing"}
                  className="mt-3 w-full rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-semibold text-violet-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Play it for me
                </button>
                <p className="mt-2 text-center text-[11px] text-white/30">
                  Plain letters turn clockwise, &apos; turns the other way.
                </p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
