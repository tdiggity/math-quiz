import React, { useEffect, useMemo, useRef, useState } from "react";

// ------------------------------- UI PRIMITIVES -------------------------------
function Card({ title, children, flash }) {
  const flashClass = flash === "red" ? "bg-red-100" : flash === "green" ? "bg-green-100" : "bg-white/80";
  return (
    <div className={`rounded-2xl shadow p-5 border border-gray-200 max-w-2xl mx-auto mt-10 transition-colors duration-200 ${flashClass}`}>
      {title && <h2 className="text-4xl font-bold mb-6 text-center">{title}</h2>}
      <div>{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm mr-2 mb-2 ${active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50 border-gray-300"}`}
    >
      {children}
    </button>
  );
}

function Keypad({ onDigit, onBackspace, onClear, onEnter }) {
  const keys = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
  ];
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
      {keys.flat().map((k) => (
        <button key={k} className="rounded-xl border px-4 py-3 text-lg" onClick={() => onDigit(k)} aria-label={`Digit ${k}`}>
          {k}
        </button>
      ))}
      <button className="rounded-xl border px-4 py-3 text-lg col-span-2" onClick={() => onDigit("0")} aria-label="Digit 0">0</button>
      <button className="rounded-xl border px-4 py-3 text-lg" onClick={onBackspace} aria-label="Backspace">⌫</button>
      <button className="rounded-xl border px-4 py-3 text-sm" onClick={onClear} aria-label="Clear">Clear</button>
      <button className="rounded-xl border px-4 py-3 text-sm col-span-2" onClick={onEnter} aria-label="Enter">Enter</button>
    </div>
  );
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(totalSec) {
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(Math.floor(totalSec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

// ------------------------------ MATH QUIZ APP -------------------------------
function MathQuiz() {
  const ops = ["+", "-", "×", "÷"];
  const [a, setA] = useState(() => randomInt(2, 12));
  const [b, setB] = useState(() => randomInt(2, 12));
  const [op, setOp] = useState("×");
  const [answer, setAnswer] = useState("");
  const [flash, setFlash] = useState(null);
  const [maxNumber, setMaxNumber] = useState(12);

  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [log, setLog] = useState([]);
  const [showLog, setShowLog] = useState(true);
  const [countedThisQuestion, setCountedThisQuestion] = useState(false);

  const inputRef = useRef(null);

  const correct = useMemo(() => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return Math.trunc(a / b);
      default: return 0;
    }
  }, [a, b, op]);

  function spawnProblem(currentOp = op, max = maxNumber) {
    let newA = randomInt(2, Math.max(2, max));
    let newB = randomInt(2, Math.max(2, max));
    if (currentOp === "-" && newA < newB) [newA, newB] = [newB, newA];
    setA(newA);
    setB(newB);
  }

  function next() {
    spawnProblem();
    setAnswer("");
    setQuestionSeconds(0);
    setCountedThisQuestion(false);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        if (inputRef.current) inputRef.current.focus();
      });
    }
  }

  function insertDigit(d) {
    setAnswer((t) => t + d);
  }

  function handleCheck() {
    const isCorrect = Number(answer) === correct;
    const entry = { text: `${a} ${op} ${b}`, given: String(answer || ""), correct, ok: isCorrect, ts: Date.now() };
    setLog((L) => [entry, ...L].slice(0, 200));
    if (!countedThisQuestion) {
      setAttempts((n) => n + 1);
      if (isCorrect) setCorrectCount((n) => n + 1);
      setCountedThisQuestion(true);
    }
    if (isCorrect) {
      setFlash("green");
      setTimeout(() => { setFlash(null); next(); }, 200);
    } else {
      setFlash("red");
      setTimeout(() => {
        setFlash(null);
      }, 200);
    }
  }

  function resetStats() {
    setAttempts(0);
    setCorrectCount(0);
    setTotalSeconds(0);
    setQuestionSeconds(0);
    setLog([]);
  }

  useEffect(() => {
    const id = setInterval(() => {
      setTotalSeconds((t) => t + 1);
      setQuestionSeconds((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const pctCorrect = attempts ? Math.round((correctCount / attempts) * 100) : 0;
  const avgSec = attempts ? Math.round(totalSeconds / attempts) : 0;

  return (
    <Card title="Math Quiz" flash={flash}>
      {/* Operation picker */}
      <div className="mb-5 text-center">
        <h3 className="font-semibold mb-2">Choose Operation</h3>
        {ops.map((o) => (
          <Pill key={o} active={op === o} onClick={() => { setOp(o); next(); }}>{o}</Pill>
        ))}
        <div className="inline-flex items-center ml-4 text-sm">
          <span>Max #:</span>
          <input
            type="number"
            value={maxNumber}
            onChange={(e) => setMaxNumber(Math.max(1, Number(e.target.value)))}
            className="ml-2 w-16 rounded border px-2 py-1 text-sm"
            min={1}
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
      </div>

      {/* Problem area and keypad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <div>
          <div className="text-2xl mb-3 text-center" aria-live="polite">
            <span className="font-semibold">{a}</span> {op} <span className="font-semibold">{b}</span> = ?
          </div>

          <div
            className="rounded-2xl border bg-white/80 px-4 py-6 mb-3 text-center font-mono tracking-wider text-5xl md:text-6xl select-none"
            aria-live="polite"
          >
            {answer === "" ? <span className="text-gray-400">…</span> : answer}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleCheck(); }}
            className="flex gap-2 justify-center"
          >
            {/* Hidden input prevents mobile keyboard */}
            <input ref={inputRef} type="text" inputMode="none" className="sr-only" tabIndex={-1} aria-hidden="true" />
            <button type="submit" className="rounded-xl border px-3 py-2">Check</button>
            <button type="button" onClick={next} className="rounded-xl border px-3 py-2">Skip</button>
          </form>
        </div>

        <div className="flex justify-center">
          <Keypad
            onDigit={(d) => insertDigit(d)}
            onBackspace={() => setAnswer((t) => t.slice(0, -1))}
            onClear={() => setAnswer("")}
            onEnter={handleCheck}
          />
        </div>
      </div>

      {/* Stats and log sections */}
      <div className="mt-6">
        <div className="rounded-2xl border bg-white/75 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Stats</h3>
            <button onClick={resetStats} className="rounded-xl border px-2 py-1 text-xs">Reset Stats</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div><div className="text-xs text-gray-600">Time on question</div><div className="text-lg font-medium">{formatTime(questionSeconds)}</div></div>
            <div><div className="text-xs text-gray-600">Total time</div><div className="text-lg font-medium">{formatTime(totalSeconds)}</div></div>
            <div><div className="text-xs text-gray-600">Avg / question</div><div className="text-lg font-medium">{formatTime(avgSec)}</div></div>
            <div><div className="text-xs text-gray-600">Answered</div><div className="text-lg font-medium">{attempts}</div></div>
            <div><div className="text-xs text-gray-600">% correct</div><div className="text-lg font-medium">{pctCorrect}%</div></div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="rounded-2xl border bg-white/75 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Question & Answer Log</h3>
            <button className="rounded-xl border px-2 py-1 text-xs" onClick={() => setShowLog((v) => !v)}>{showLog ? 'Hide' : 'Show'}</button>
          </div>
          {showLog && (
            <ul className="space-y-1 max-h-56 overflow-auto text-sm">
              {log.length === 0 && <li className="text-gray-500">No entries yet.</li>}
              {log.map((h, idx) => (
                <li key={h.ts + '-' + idx} className={h.ok ? "text-green-700" : "text-red-700"}>{h.ok ? "✅" : "❌"} {h.text} → {h.given}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900 flex flex-col items-center justify-start pb-16">
      <MathQuiz />
    </div>
  );
}

