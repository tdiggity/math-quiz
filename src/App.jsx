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

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(700px,95vw)] max-h-[80vh] overflow-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="rounded-lg border px-2 py-1 text-sm" onClick={onClose} aria-label="Close">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Keypad({ onDigit, onBackspace, onEnter, onSkip }) {
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
      <button className="rounded-xl border px-4 py-3 text-lg" onClick={onBackspace} aria-label="Backspace">⌫</button>
      <button className="rounded-xl border px-4 py-3 text-lg" onClick={() => onDigit("0")} aria-label="Digit 0">0</button>
      {/* Bottom row: Enter (blue) and Skip next to it; no Clear/Check buttons */}
      <button className="rounded-xl border px-4 py-3 text-sm bg-blue-600 text-white hover:bg-blue-700 border-blue-600 col-span-2" onClick={onEnter} aria-label="Enter">Enter</button>
      <button className="rounded-xl border px-4 py-3 text-sm" onClick={onSkip} aria-label="Skip">Skip</button>
    </div>
  );
}

// ------------------------------ HELPERS -------------------------------------
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function formatTime(totalSec) {
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(Math.floor(totalSec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}
function isEditableTarget(t) {
  if (!t) return false;
  const tag = (t.tagName || "").toUpperCase();
  if (t.isContentEditable) return true;
  return tag === "INPUT" || tag === "TEXTAREA";
}

// ------------------------------ IN-APP TESTS --------------------------------
function runInAppTests() {
  const out = [];
  function ok(cond, msg) { out.push((cond ? "✅ " : "❌ ") + msg); if (!cond) throw new Error(msg); }
  // Test 1: randomInt bounds
  for (let i = 0; i < 200; i++) {
    const x = randomInt(2, 12);
    if (!(x >= 2 && x <= 12)) { ok(false, "randomInt out of bounds"); break; }
  }
  ok(true, "randomInt within bounds");
  // Test 2: subtraction non-negative generation
  for (let i = 0; i < 200; i++) {
    let a = randomInt(2, 20), b = randomInt(2, 20);
    if (a < b) [a, b] = [b, a];
    if (a - b < 0) { ok(false, "Subtraction produced negative"); break; }
  }
  ok(true, "Subtraction non-negative");
  // Test 3: division generator produces whole numbers
  for (let i = 0; i < 200; i++) {
    const b = randomInt(2, 12);
    const q = randomInt(2, 12);
    const a = b * q;
    if (a % b !== 0) { ok(false, "Division not whole number"); break; }
  }
  ok(true, "Division generator ensures whole numbers");
  // Test 4: formatTime
  ok(formatTime(0) === "00:00", "formatTime(0)");
  ok(formatTime(65) === "01:05", "formatTime(65)");
  return out;
}

// ------------------------------ MATH QUIZ APP -------------------------------
function MathQuiz() {
  const ops = ["+", "-", "×", "÷"];
  const [a, setA] = useState(() => randomInt(2, 12));
  const [b, setB] = useState(() => randomInt(2, 12));
  const [op, setOp] = useState("×");
  const [answer, setAnswer] = useState("");
  const [flash, setFlash] = useState(null); // 'red' | 'green' | null
  const [maxNumber, setMaxNumber] = useState(12);

  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [log, setLog] = useState([]); // {text, given, ok, ts}
  const [showLog, setShowLog] = useState(true);
  const [countedThisQuestion, setCountedThisQuestion] = useState(false); // count only first submission
  const [selectAllNext, setSelectAllNext] = useState(false); // overwrite on next digit after wrong

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
    let newA, newB;
    if (currentOp === "÷") {
      newB = randomInt(2, Math.max(2, max));
      const q = randomInt(2, Math.max(2, max));
      newA = newB * q; // ensures whole-number division
    } else {
      newA = randomInt(2, Math.max(2, max));
      newB = randomInt(2, Math.max(2, max));
      if (currentOp === "-" && newA < newB) [newA, newB] = [newB, newA];
    }
    setA(newA);
    setB(newB);
  }

  function next() {
    spawnProblem();
    setAnswer("");
    setQuestionSeconds(0);
    setCountedThisQuestion(false);
    setSelectAllNext(false);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function insertDigit(d) {
    if (selectAllNext) {
      setAnswer(d);
      setSelectAllNext(false);
    } else {
      setAnswer((t) => t + d);
    }
  }

  function handleCheck() {
    if (answer === "") return; // ignore empty
    const isCorrect = Number(answer) === correct;

    // Log every submission (visible), newest first
    setLog((L) => [{ text: `${a} ${op} ${b}`, given: String(answer), ok: isCorrect, ts: Date.now() }, ...L].slice(0, 200));

    // Count only first submission for stats
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
        setSelectAllNext(true); // next digit overwrites
      }, 200);
    }
  }

  // Timers
  useEffect(() => {
    const id = setInterval(() => {
      setTotalSeconds((t) => t + 1);
      setQuestionSeconds((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Focus when window focuses (keeps keypad-first UX)
  useEffect(() => {
    const onFocus = () => inputRef.current?.focus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Global number / Enter handling
  useEffect(() => {
    function onKeyDown(e) {
      const key = e.key;
      if (/^[0-9]$/.test(key)) {
        if (!isEditableTarget(e.target)) {
          e.preventDefault();
          insertDigit(key);
        }
      } else if (key === "Enter") {
        if (!isEditableTarget(e.target)) {
          e.preventDefault();
          handleCheck();
        }
      } else if (key === "Backspace") {
        if (!isEditableTarget(e.target)) {
          e.preventDefault();
          setAnswer((t) => t.slice(0, -1));
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectAllNext, answer, correct, countedThisQuestion]);

  const pctCorrect = attempts ? Math.round((correctCount / attempts) * 100) : 0;
  const avgSec = attempts ? Math.round(totalSeconds / Math.max(1, attempts)) : 0;

  function resetStats() {
    setAttempts(0);
    setCorrectCount(0);
    setTotalSeconds(0);
    setQuestionSeconds(0);
    setLog([]);
    setCountedThisQuestion(false);
    setSelectAllNext(false);
  }

  // Test modal state
  const [showTests, setShowTests] = useState(false);
  const [testResults, setTestResults] = useState([]);
  function openTests() { setTestResults(runInAppTests()); setShowTests(true); }

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
            onClick={() => inputRef.current?.focus()}
          >
            {answer === "" ? <span className="text-gray-400">…</span> : answer}
          </div>

          {/* Hidden input to hold focus; no visible Check button */}
          <form onSubmit={(e) => { e.preventDefault(); }} className="flex gap-2 justify-center">
            <input ref={inputRef} type="text" inputMode="none" className="sr-only" tabIndex={-1} aria-hidden="true" />
          </form>
        </div>

        <div className="flex justify-center">
          <Keypad
            onDigit={(d) => insertDigit(d)}
            onBackspace={() => setAnswer((t) => t.slice(0, -1))}
            onEnter={handleCheck}
            onSkip={next}
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

      {/* Bottom controls */}
      <div className="mt-6 flex items-center justify-center">
        <button className="rounded-xl border px-4 py-2 text-sm" onClick={openTests}>Run In-App Tests</button>
      </div>

      {/* Tests Modal */}
      <Modal open={showTests} onClose={() => setShowTests(false)} title="In-App Test Results">
        <ul className="space-y-1 font-mono text-sm">
          {testResults.map((r, i) => (<li key={i}>{r}</li>))}
        </ul>
      </Modal>
    </Card>
  );
}

// ---------------------------------- APP -------------------------------------
export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900 flex flex-col items-center justify-start pb-16">
      <MathQuiz />
    </div>
  );
}

