import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";

const TOTAL_BALLS = 75;
const LETTERS = ["B", "I", "N", "G", "O"];
const COLORS = {
  B: "from-sky-400 to-blue-600",
  I: "from-rose-400 to-red-600",
  N: "from-violet-400 to-purple-600",
  G: "from-amber-300 to-orange-500",
  O: "from-emerald-400 to-green-600",
};

function getLetter(number) {
  return LETTERS[Math.floor((number - 1) / 15)];
}

function Card({ children, className = "" }) {
  return <section className={className}>{children}</section>;
}

function BingoBall({ number, size = "large", className = "" }) {
  const letter = getLetter(number);
  const dimensions = size === "large" ? "h-32 w-32 sm:h-40 sm:w-40" : "h-12 w-12";
  const numberSize = size === "large" ? "text-4xl sm:text-5xl" : "text-sm";

  return (
    <div className={`${dimensions} ${className} relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${COLORS[letter]} shadow-[inset_-15px_-18px_24px_rgba(0,0,0,.3),inset_12px_10px_18px_rgba(255,255,255,.48),0_18px_35px_rgba(15,23,42,.28)]`}>
      <div className="absolute inset-[7%] rounded-full border border-white/25" />
      <div className="absolute left-[16%] top-[10%] h-[27%] w-[27%] rounded-full bg-white/65 blur-[2px]" />
      <div className={`${size === "large" ? "h-[72%] w-[72%]" : "h-[70%] w-[70%]"} relative grid place-items-center rounded-full border-2 border-white/80 bg-gradient-to-br from-white via-slate-50 to-slate-200 text-slate-900 shadow-[inset_3px_4px_6px_rgba(255,255,255,.9),inset_-4px_-5px_7px_rgba(15,23,42,.18)]`}>
        <span className={`${numberSize} font-black leading-none tracking-tight`}>{number}</span>
        {size === "large" && <span className="absolute bottom-2 text-xs font-black tracking-[.28em] text-slate-500 sm:bottom-3 sm:text-sm">{letter}</span>}
      </div>
    </div>
  );
}

function MiniFloatingBall({ number, index, rolling }) {
  const positions = [[18,22],[42,14],[67,25],[27,51],[55,47],[74,60],[38,72],[61,78],[16,70]];
  const [left, top] = positions[index % positions.length];
  return (
    <motion.div
      className={`absolute grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-gradient-to-br ${COLORS[getLetter(number)]} text-xs font-black text-white shadow-lg`}
      style={{ left: `${left}%`, top: `${top}%` }}
      animate={rolling ? { x: [0,22,-18,9,0], y: [0,-24,19,-10,0], rotate: [0,180,300,360] } : { y: [0,-5,0] }}
      transition={rolling ? { duration: .75, repeat: Infinity, ease: "easeInOut", delay: index * .03 } : { duration: 2.2 + index * .08, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="absolute left-[17%] top-[12%] h-[25%] w-[25%] rounded-full bg-white/65 blur-[1px]" />
      <span className="relative grid h-[68%] w-[68%] place-items-center rounded-full border border-white/75 bg-white/90 text-slate-800 shadow-inner">{number}</span>
    </motion.div>
  );
}

export default function App() {
  const [drawn, setDrawn] = useState([]);
  const [current, setCurrent] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const ambientRef = useRef([]);
  const jazzTimerRef = useRef(null);

  const remaining = useMemo(() => Array.from({ length: TOTAL_BALLS }, (_, i) => i + 1).filter(n => !drawn.includes(n)), [drawn]);
  const displayBalls = useMemo(() => (remaining.length ? remaining : Array.from({ length: 9 }, (_, i) => i + 1)).slice(0, 9), [remaining]);

  function getAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioRef.current) audioRef.current = new AudioCtx();
      if (audioRef.current.state === "suspended") audioRef.current.resume();
      return audioRef.current;
    } catch {
      return null;
    }
  }

  function startAmbient(force = false) {
    if ((!soundOn && !force) || ambientRef.current.length || typeof window === "undefined") return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 2.5);
    master.connect(ctx.destination);
    const jazzChords = [
      [261.63, 329.63, 392, 493.88],
      [220, 261.63, 329.63, 415.3],
      [174.61, 220, 261.63, 329.63],
      [196, 246.94, 293.66, 349.23],
    ];
    const playChord = (chord, startTime) => chord.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = index === 3 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(index === 3 ? 0.09 : 0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 3.8);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(startTime);
      oscillator.stop(startTime + 4);
      ambientRef.current.push(oscillator, gain);
    });
    let chordIndex = 0;
    const playNextChord = () => {
      if (!ambientRef.current.length) return;
      playChord(jazzChords[chordIndex], ctx.currentTime + 0.05);
      chordIndex = (chordIndex + 1) % jazzChords.length;
      jazzTimerRef.current = window.setTimeout(playNextChord, 3600);
    };
    playNextChord();
    ambientRef.current.push(master);
  }

  function stopAmbient() {
    const nodes = ambientRef.current;
    if (!nodes.length) return;
    window.clearTimeout(jazzTimerRef.current);
    jazzTimerRef.current = null;
    const ctx = audioRef.current;
    const master = nodes[nodes.length - 1];
    if (ctx && master?.gain) {
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      window.setTimeout(() => nodes.forEach(node => node.stop?.()), 550);
    }
    ambientRef.current = [];
  }

  function beep() {
    if (!soundOn) return;
    const ctx = getAudioContext();
    if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + .18);
      gain.gain.setValueAtTime(.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .28);
      osc.start(); osc.stop(ctx.currentTime + .28);
  }

  function rollBall() {
    if (rolling || remaining.length === 0) return;
    startAmbient();
    setRolling(true); setCurrent(null);
    timerRef.current = window.setTimeout(() => {
      const next = remaining[Math.floor(Math.random() * remaining.length)];
      setCurrent(next); setDrawn(previous => [next, ...previous]); setRolling(false); beep();
    }, 1600);
  }

  function resetGame() {
    window.clearTimeout(timerRef.current);
    setDrawn([]); setCurrent(null); setRolling(false);
  }

  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
    stopAmbient();
    audioRef.current?.close();
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(99,102,241,.11),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(236,72,153,.09),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(14,165,233,.09),transparent_32%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-xl font-black text-white shadow-lg shadow-indigo-200">B</div>
            <div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Bingo Pop!</h1><p className="text-xs font-medium text-slate-500 sm:text-sm">Roll it. Call it. Win it.</p></div>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50" onClick={() => {
            setSoundOn(value => {
              if (value) stopAmbient();
              else startAmbient(true);
              return !value;
            });
          }} aria-label={soundOn ? "Mute calming music" : "Play calming music"} aria-pressed={soundOn} title={soundOn ? "Mute calming music" : "Play calming music"}>
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </header>

        <div className="grid items-stretch gap-6 lg:grid-cols-[1.12fr_.88fr]">
          <Card className="overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_60px_rgba(15,23,42,.09)]">
            <div className="flex min-h-[610px] flex-col items-center p-5 sm:p-8">
              <div className="mb-5 flex w-full items-center justify-between">
                <div><p className="text-xs font-black uppercase tracking-[.22em] text-red-600">Gumball bingo machine</p><h2 className="mt-1 text-xl font-bold">Ready for the next number?</h2></div>
                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{remaining.length} left</div>
              </div>
              <div className="relative mt-1 h-[390px] w-[300px] sm:h-[400px] sm:w-[350px]">
                <motion.div animate={rolling ? { rotate: [0,2,-2,1,0] } : {}} transition={{ repeat: Infinity, duration: .35 }} className="absolute left-1/2 top-0 h-[285px] w-[285px] -translate-x-1/2 overflow-hidden rounded-[48%] border-[10px] border-white/90 bg-gradient-to-b from-sky-50/90 via-indigo-50/75 to-indigo-100/90 shadow-[inset_0_-25px_50px_rgba(79,70,229,.14),0_24px_45px_rgba(15,23,42,.16)] sm:h-[320px] sm:w-[320px]">
                  <div className="absolute inset-0 rounded-[48%] border-2 border-sky-200/70" />
                  <div className="absolute left-[17%] top-[9%] h-[46%] w-[17%] rotate-[35deg] rounded-full bg-white/75 blur-lg" />
                  <div className="absolute inset-x-[7%] top-0 h-5 rounded-full bg-white/70 blur-[2px]" />
                  {displayBalls.map((n, i) => <MiniFloatingBall key={`${n}-${i}`} number={n} index={i} rolling={rolling} />)}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-indigo-300/35 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-indigo-300/30 to-transparent" />
                </motion.div>
                <div className="absolute bottom-0 left-1/2 h-24 w-56 -translate-x-1/2 rounded-t-[2.5rem] rounded-b-2xl border-t-4 border-red-300 bg-gradient-to-b from-red-500 via-red-600 to-red-900 shadow-[inset_0_8px_12px_rgba(255,255,255,.25),0_18px_25px_rgba(15,23,42,.25)]">
                  <div className="mx-auto mt-3 h-4 w-28 rounded-full bg-red-950/60 shadow-inner" />
                  <div className="absolute left-5 top-10 h-8 w-10 rounded-md border-2 border-yellow-300/80 bg-slate-900 shadow-inner">
                    <span className="mx-auto mt-2 block h-1 w-5 rounded-full bg-yellow-300" />
                  </div>
                  <div className="absolute right-5 top-9 h-11 w-11 rounded-full border-4 border-yellow-300 bg-gradient-to-br from-yellow-100 to-amber-500 shadow-[inset_-3px_-4px_5px_rgba(120,53,15,.35),0_3px_5px_rgba(0,0,0,.25)]">
                    <span className="absolute left-1/2 top-1/2 h-1 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-800" />
                  </div>
                </div>
                <div className="absolute bottom-[-12px] left-1/2 z-10 h-9 w-20 -translate-x-1/2 rounded-b-2xl border-4 border-slate-700 bg-slate-900 shadow-lg">
                  <div className="absolute left-1/2 top-1/2 h-3 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60" />
                </div>
                <AnimatePresence>
                  {current && <motion.div
                    key={`outlet-${current}`}
                    className="absolute bottom-[-50px] left-1/2 z-20 -translate-x-1/2"
                    initial={{ y: -110, scale: .55, opacity: 0, rotate: -100 }}
                    animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 210, damping: 16 }}
                  >
                    <BingoBall number={current} size="small" />
                  </motion.div>}
                </AnimatePresence>
              </div>
              <button onClick={rollBall} disabled={rolling || remaining.length === 0} className="mt-6 flex h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-indigo-600 text-base font-black text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">
                <Sparkles className={`mr-2 h-5 w-5 ${rolling ? "animate-spin" : ""}`} />{rolling ? "Mixing the balls..." : remaining.length === 0 ? "All balls drawn" : "Roll a ball"}
              </button>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="min-h-[300px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-[0_20px_60px_rgba(15,23,42,.16)]">
              <div className="flex min-h-[300px] flex-col items-center justify-center p-7 text-center">
                <p className="mb-5 text-xs font-black uppercase tracking-[.25em] text-indigo-300">Latest ball</p>
                <AnimatePresence mode="wait">{current ? <motion.div key={current} initial={{ y:-120, scale:.3, rotate:-180, opacity:0 }} animate={{ y:0, scale:1, rotate:0, opacity:1 }} exit={{ scale:.5, opacity:0 }} transition={{ type:"spring", stiffness:180, damping:14 }}><BingoBall number={current}/></motion.div> : <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} className="grid h-40 w-40 place-items-center rounded-full border-2 border-dashed border-slate-600 text-sm font-semibold text-slate-400">{rolling ? "Here it comes..." : "Press roll to begin"}</motion.div>}</AnimatePresence>
                {current && <p className="mt-5 text-lg font-black">{getLetter(current)} - {current}</p>}
              </div>
            </Card>
            <Card className="flex-1 rounded-[2rem] bg-white shadow-[0_20px_60px_rgba(15,23,42,.09)]">
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-slate-400">Draw history</p><h3 className="mt-1 text-lg font-bold">Called balls <span className="text-slate-400">({drawn.length})</span></h3></div><button onClick={resetGame} disabled={!drawn.length && !rolling} className="flex items-center rounded-full px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-40"><RotateCcw className="mr-2 h-4 w-4"/>Reset</button></div>
                <div className="max-h-[235px] min-h-[125px] overflow-y-auto pr-1">{drawn.length ? <div className="grid grid-cols-5 gap-3 sm:grid-cols-7 lg:grid-cols-5 xl:grid-cols-7"><AnimatePresence>{drawn.map((number,index) => <motion.div key={number} initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:Math.min(index*.02,.2)}}><BingoBall number={number} size="small"/></motion.div>)}</AnimatePresence></div> : <div className="grid min-h-[125px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm font-medium text-slate-400">Your rolled numbers will appear here.</div>}</div>
              </div>
            </Card>
          </div>
        </div>
        <footer className="pt-7 text-center text-xs font-medium text-slate-400">75-ball gumball bingo · Every number is drawn only once</footer>
      </div>
    </main>
  );
}
