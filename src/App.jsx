import React, { useEffect, useMemo, useRef, useState } from "react";

// ------------------------------- UI PRIMITIVES -------------------------------
function Card({ title, children, flash }) {
  const flashClass =
    flash === "red" ? "bg-red-100" :
    flash === "green" ? "bg-green-100" :
    "bg-white/80";
  return (
    <div className={`rounded-2xl shadow p-5 border border-gray-200 max-w-2xl mx-auto mt-10 transition-colors duration-200 ${flashClass}`}>
      <h2 className="text-xl font-semibold mb-3 text-center">{title}</h2>
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

function Keypad({ onDigit, onBackspace, onClear, onEnter }) {
  const keys = [["7","8","9"],["4","5","6"],["1","2","3"]];
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

// ------------------------------ HIDDEN TESTS --------------------------------
function runInAppTests() {
  const results = [];
  function assert(ok, msg) { if (!ok) throw new Error(msg); }
  function generatePair(op, max) {
    let a = randomInt(2, Math.max(2, max));
    let b = randomInt(2, Math.max(2, max));
    if (op === "-" && a < b) [a, b] = [b, a];
    return { a, b };
  }
  try {
    for (let i=0;i<200;i++){ const x=randomInt(2,12); assert(x>=2&&x<=12,"randomInt out of bounds"); }
    results.push("✅ randomInt within bounds");
    for (let i=0;i<200;i++){ const {a,b}=generatePair("-",20); assert(a-b>=0,"Subtraction produced negative result"); }
    results.push("✅ subtraction non-negative");
    assert(2+3===5,"2+3 should be 5"); assert(6*7===42,"6*7 should be 42");
    results.push("✅ arithmetic sanity checks");
    assert(formatTime(0)==="00:00","formatTime 0");
    assert(formatTime(65)==="01:05","formatTime 65");
    results.push("✅ formatTime works");
    const mockInput={tagName:"input"}, mockTextarea={tagName:"textarea"}, mockDivEditable={tagName:"div",isContentEditable:true}, mockDiv={tagName:"div"};
    assert(isEditableTarget(mockInput)===true,"editable detection (input) failed");
    assert(isEditableTarget(mockTextarea)===true,"editable detection (textarea) failed");
    assert(isEditableTarget(mockDivEditable)===true,"editable detection (contenteditable) failed");
    assert(isEditableTarget(mockDiv)===false,"editable detection (div) should be false");
    results.push("✅ editable-target detection");
  } catch(e){ results.push("❌ "+e.message); }
  return results;
}

// ------------------------------ MATH QUIZ APP -------------------------------
function MathQuiz() {
  const ops = ["+","-","×","÷"];
  const [a, setA] = useState(() => randomInt(2, 12));
  const [b, setB] = useState(() => randomInt(2, 12));
  const [op, setOp] = useState("×");
  const [answer, setAnswer] = useState("");
  const [flash, setFlash] = useState(null); // red | green | null
  const [maxNumber, setMaxNumber] = useState(12);

  // Stats
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);

  // Log
  const [log, setLog] = useState([]); // {text, given, ok, ts}
  const [showLog, setShowLog] = useState(true);
  const [countedThisQuestion, setCountedThisQuestion] = useState(false);

  // Tests modal
  const [showTests, setShowTests] = useState(false);
  const [testResults, setTestResults] = useState([]);

  const inputRef = useRef(null);

  const correct = useMemo(() => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return Math.trunc(a / b);
      default:  return 0;
    }
  }, [a,b,op]);

  function spawnProblem(currentOp = op, max = maxNumber) {
    let newA = randomInt(2, Math.max(2, max));
    let newB = randomInt(2, Math.max(2, max));
    if (currentOp === "-" && newA < newB) [newA, newB] = [newB, newA];
    setA(newA); setB(newB);
  }

  function next() {
    spawnProblem();
    setAnswer("");
    setQuestionSeconds(0);
    setCountedThisQuestion(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function insertDigit(d) {
    const el = inputRef.current;
    if (!el) return setAnswer((t) => t + d);
    el.focus();
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const nextVal = before + d + after;
    setAnswer(nextVal);
    const pos = (before + d).length;
    requestAnimationFrame(() => el.setSelectionRange(pos, pos));
  }

  function handleCheck() {
    const isCorrect = Number(answer) === correct;

    // Log every submission
    const entry = { text: `${a} ${op} ${b}`, given: String(answer || ""), ok: isCorrect, ts: Date.now() };
    setLog((L) => [entry, ...L].slice(0, 200));

    // Count only the first submission
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
        inputRef.current?.focus();
        inputRef.current?.select();
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

  // Focus on page focus
  useEffect(() => {
    inputRef.current?.focus();
    const onFocus = () => inputRef.current?.focus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Global keys
  useEffect(() => {
    function onKeyDown(e) {
      const key = e.key;
      if (/^[0-9]$/.test(key)) {
        if (!isEditableTarget(e.target)) {
          e.preventDefault();
          insertDigit(key);
          inputRef.current?.focus();
        }
      }
      if (key === "Enter") {
        if (!isEditableTarget(e.target)) {
          e.preventDefault();
          handleCheck();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answer, correct, countedThisQuestion]);

  const pctCorrect = attempts ? Math.round((correctCount / attempts) * 100) : 0;
  const avgSec = attempts ? Math.round(totalSeconds / attempts) : 0;

  function resetStats() {
    setAttempts(0); setCorrectCount(0);
    setTotalSeconds(0); setQuestionSeconds(0);
    setCountedThisQuestion(false); setAnswer(""); setLog([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function openTestsModal() {
    const results = runInAppTests();
    setTestResults(results);
    setShowTests(true);
  }

  return (
    <Card title="Math Quiz" flash={flash}>
      {/* Operation picker + Max number */}
      <div className="mb-3 text-center flex flex-wrap justify-center items-center gap-3">
        {["+","-","×","÷"].map((o) => (
          <Pill key={o} active={op === o} onClick={() => { setOp(o); next(); }}>
            {o}
          </Pill>
        ))}
        <span className="flex items-center ml-4 text-sm">
          Max #:
          <input
            type="number"
            value={maxNumber}
            onChange={(e) => setMaxNumber(Math.max(1, Number(e.target.value)))}
            className="ml-2 w-16 rounded border px-2 py-1 text-sm"
            min={1}
          />
        </span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Left: problem + input */}
        <div>
          <div className="text-2xl mb-3 text-center" aria-live="polite">
            <span className="font-semibold">{a}</span> {op} <span className="font-semibold">{b}</span> = ?
          </div>

          {/* Big answer display */}
          <div
            className="rounded-2xl border bg-white/80 px-4 py-6 mb-3 text-center font-mono tracking-wider text-5xl md:text-6xl select-none cursor-text"
            onClick={() => inputRef.current && inputRef.current.focus()}
            aria-live="polite"
          >
            {answer === "" ? <span className="text-gray-400">…</span> : answer}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleCheck(); }}
            className="flex gap-2 justify-center"
          >
            {/* Visually hidden input keeps focus behavior + accessibility */}
            <input
              ref={inputRef}
              inputMode="numeric"
              className="sr-only absolute -m-px w-px h-px overflow-hidden"
              aria-label="Your answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button type="submit" className="rounded-xl border px-3 py-2">Check</button>
            <button type="button" onClick={next} className="rounded-xl border px-3 py-2">Skip</button>
          </form>
        </div>

        {/* Right: keypad */}
        <div className="flex justify-center">
          <Keypad
            onDigit={(d) => insertDigit(d)}
            onBackspace={() => {
              const el = inputRef.current;
              if (!el) return;
              const start = el.selectionStart ?? el.value.length;
              const end = el.selectionEnd ?? el.value.length;
              if (start !== end) {
                const before = el.value.slice(0, start);
                const after = el.value.slice(end);
                const nextVal = before + after;
                setAnswer(nextVal);
                const pos = before.length;
                requestAnimationFrame(() => el.setSelectionRange(pos, pos));
              } else {
                setAnswer((t) => t.slice(0, -1));
              }
              el.focus();
            }}
            onClear={() => { setAnswer(""); inputRef.current?.focus(); }}
            onEnter={() => { handleCheck(); inputRef.current?.focus(); }}
          />
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-6">
        <div className="rounded-2xl border bg-white/75 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Stats</h3>
            <button className="rounded-xl border px-3 py-1 text-sm" onClick={resetStats} aria-label="Reset stats">Reset</button>
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

      {/* Q&A Log */}
      <div className="mt-4">
        <div className="rounded-2xl border bg-white/75 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Question & Answer Log</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 hidden sm:inline">Newest first • capped at 200</span>
              <button
                className="rounded-xl border px-2 py-1 text-xs"
                onClick={() => setShowLog((v) => !v)}
                aria-expanded={showLog}
                aria-controls="qa-log"
              >
                {showLog ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {showLog && (
            <ul id="qa-log" className="space-y-1 max-h-56 overflow-auto text-sm">
              {log.length === 0 && <li className="text-gray-500">No entries yet. Answer a question to populate the log.</li>}
              {log.map((h, idx) => (
                <li key={h.ts + "-" + idx} className={h.ok ? "text-green-700" : "text-red-700"}>
                  {h.ok ? "✅" : "❌"} {h.text} → <span className="font-mono">{h.given}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="mt-6 flex items-center justify-center">
        <button className="rounded-xl border px-4 py-2 text-sm" onClick={openTestsModal}>Run In-App Tests</button>
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

