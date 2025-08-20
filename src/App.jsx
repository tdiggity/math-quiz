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
      <div className="relative bg-white rounded-2xl shadow-xl w-[min(520px,95vw)] p-5">
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
      <div className="col-span-2 flex gap-2">
        <button className="flex-1 rounded-xl border px-4 py-3 text-sm bg-blue-600 text-white hover:bg-blue-700 border-blue-600" onClick={onEnter} aria-label="Enter">Enter</button>
        <button className="flex-1 rounded-xl border px-4 py-3 text-sm" onClick={onSkip} aria-label="Skip">Skip</button>
      </div>
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

// ------------------------------ DEV TESTS (no UI) ---------------------------
function runDevTests() {
  const results = [];
  function ok(cond, msg) { results.push((cond ? "✅ " : "❌ ") + msg); }
  // randomInt bounds
  for (let i = 0; i < 100; i++) {
    const x = randomInt(2, 12);
    if (!(x >= 2 && x <= 12)) ok(false, "randomInt out of bounds");
  }
  ok(true, "randomInt within 2..12");
  // formatTime
  ok(formatTime(0) === "00:00", "formatTime(0) ok");
  ok(formatTime(65) === "01:05", "formatTime(65) ok");
  // additional: verify mm:ss padding
  ok(/^\d{2}:\d{2}$/.test(formatTime(9)), "formatTime pad");
  return results;
}

// ------------------------------ MATH QUIZ APP -------------------------------
function MathQuiz() {
  const ops = ["+", "-", "×"]; // Division removed
  const [a, setA] = useState(() => randomInt(2, 12));
  const [b, setB] = useState(() => randomInt(2, 12));
  const [op, setOp] = useState("×"); // current op for the active question
  const [selectedOps, setSelectedOps] = useState(["+", "-", "×"]); // multi-select pool

  // Per-operation max settings (defaults requested by user)
  const [opMax, setOpMax] = useState({ "+": 100, "-": 100, "×": 12 });

  const [answer, setAnswer] = useState("");
  const [flash, setFlash] = useState(null); // 'red' | 'green' | null

  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [log, setLog] = useState([]);
  const [showLog, setShowLog] = useState(true);
  const [countedThisQuestion, setCountedThisQuestion] = useState(false);
  const [selectAllNext, setSelectAllNext] = useState(false);

  // Modal state for setting per-op max
  const [showMaxModal, setShowMaxModal] = useState(false);
  const [modalOp, setModalOp] = useState(null);
  const [modalValue, setModalValue] = useState(12);

  const inputRef = useRef(null);

  const correct = useMemo(() => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      default: return 0;
    }
  }, [a, b, op]);

  function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function spawnProblem(pool = selectedOps) {
    const usablePool = (pool && pool.length) ? pool : ops; // fallback to all if empty
    const picked = choice(usablePool);
    setOp(picked);

    const maxForOp = Math.max(2, (opMax[picked] || 12));
    let newA = randomInt(2, maxForOp);
    let newB = randomInt(2, maxForOp);
    if (picked === "-") {
      if (newA < newB) [newA, newB] = [newB, newA]; // ensure non-negative
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
      window.requestAnimationFrame(() => { if (inputRef.current) inputRef.current.focus(); });
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
    if (answer === "") return;
    const isCorrect = Number(answer) === correct;

    setLog((L) => [{ text: `${a} ${op} ${b}`, given: String(answer), ok: isCorrect, ts: Date.now() }, ...L].slice(0, 200));

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
        setSelectAllNext(true);
      }, 200);
    }
  }

  function handleSkip() {
    // Log as skipped and count once as an attempt (not correct)
    setLog((L) => [{ text: `${a} ${op} ${b}`, given: "", ok: false, skipped: true, ts: Date.now() }, ...L].slice(0, 200));
    if (!countedThisQuestion) {
      setAttempts((n) => n + 1);
      setCountedThisQuestion(true);
    }
    next();
  }

  // Timers
  useEffect(() => {
    const id = setInterval(() => {
      setTotalSeconds((t) => t + 1);
      setQuestionSeconds((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Keep focus when window re-focuses
  useEffect(() => {
    const onFocus = () => { if (inputRef.current) inputRef.current.focus(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Global keyboard handling
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

  // Hidden dev tests trigger: add ?test=1 to URL to run tests in console
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && /(^|[?&])test=1(&|$)/.test(window.location.search)) {
        console.group("MathQuiz dev tests");
        for (const line of runDevTests()) console.log(line);
        console.groupEnd();
      }
    } catch (e) {
      // no-op
    }
  }, []);

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

  function openMaxModalFor(opSymbol) {
    setModalOp(opSymbol);
    setModalValue(opMax[opSymbol] || 12);
    setShowMaxModal(true);
  }

  function saveMaxForOp() {
    const v = Math.max(2, parseInt(modalValue, 10) || 2);
    setOpMax((prev) => ({ ...prev, [modalOp]: v }));
    setShowMaxModal(false);
  }

  function toggleOp(o) {
    setSelectedOps((prev) => {
      const has = prev.includes(o);
      let next = has ? prev.filter((x) => x !== o) : [...prev, o];
      if (!has) {
        // Just enabled -> open modal to set its max
        openMaxModalFor(o);
      }
      if (next.length === 0) next = [o]; // ensure at least one remains selected
      return next;
    });
    // Generate next problem from the updated pool
    setTimeout(() => next(), 0);
  }

  return (
    <Card title="Math Quiz" flash={flash}>
      <div className="mb-5 text-center">
        <h3 className="font-semibold mb-2">Choose Operations (multiple allowed)</h3>
        {ops.map((o) => (
          <Pill key={o} active={selectedOps.includes(o)} onClick={() => toggleOp(o)}>{o}</Pill>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <div>
          <div className="text-2xl mb-3 text-center" aria-live="polite">
            <span className="font-semibold">{a}</span> {op} <span className="font-semibold">{b}</span> = ?
          </div>

          <div
            className="rounded-2xl border bg-white/80 px-4 py-6 mb-3 text-center font-mono tracking-wider text-5xl md:text-6xl select-none"
            aria-live="polite"
            onClick={() => { if (inputRef.current) inputRef.current.focus(); }}
          >
            {answer === "" ? <span className="text-gray-400">…</span> : answer}
          </div>

          {/* Hidden input (keeps focus, suppresses mobile keyboard UI) */}
          <form onSubmit={(e) => { e.preventDefault(); }} className="flex gap-2 justify-center">
            <input ref={inputRef} type="text" inputMode="none" className="sr-only" tabIndex={-1} aria-hidden="true" />
          </form>
        </div>

        <div className="flex justify-center">
          <Keypad
            onDigit={(d) => insertDigit(d)}
            onBackspace={() => setAnswer((t) => t.slice(0, -1))}
            onEnter={handleCheck}
            onSkip={handleSkip}
          />
        </div>
      </div>

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
                <li
                  key={h.ts + '-' + idx}
                  className={h.skipped ? "text-gray-700" : h.ok ? "text-green-700" : "text-red-700"}
                >
                  {h.skipped ? "⏭️" : h.ok ? "✅" : "❌"} {h.text} → {h.skipped ? "(skipped)" : h.given}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Per-op Max Modal */}
      <Modal open={showMaxModal} onClose={() => setShowMaxModal(false)} title={`Set max number for "${modalOp || ''}"`}>
        <div className="space-y-3">
          <label className="text-sm text-gray-700 flex items-center gap-2">
            Max number
            <input
              type="number"
              min={2}
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              className="w-28 rounded border px-2 py-1 text-sm"
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </label>
          <p className="text-xs text-gray-500">Tip: This sets the max range used when generating problems for this operation.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button className="rounded border px-3 py-1 text-sm" onClick={() => setShowMaxModal(false)}>Cancel</button>
            <button className="rounded border px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700" onClick={saveMaxForOp}>Save</button>
          </div>
        </div>
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

