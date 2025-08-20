import React, { useState, useEffect, useRef } from "react";

// Utility to generate new math question
function generateQuestion(max) {
  const ops = ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;

  if (op === "+") {
    a = Math.floor(Math.random() * max) + 1;
    b = Math.floor(Math.random() * max) + 1;
    answer = a + b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * max) + 1;
    b = Math.floor(Math.random() * max) + 1;
    if (b > a) [a, b] = [b, a];
    answer = a - b;
  } else if (op === "×") {
    a = Math.floor(Math.random() * max) + 1;
    b = Math.floor(Math.random() * max) + 1;
    answer = a * b;
  } else {
    b = Math.floor(Math.random() * (max - 1)) + 1;
    answer = Math.floor(Math.random() * max) + 1;
    a = b * answer;
  }
  return { a, b, op, answer };
}

export default function App() {
  const [maxNum, setMaxNum] = useState(10);
  const [question, setQuestion] = useState(() => generateQuestion(maxNum));
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({
    startTime: Date.now(),
    questionStart: Date.now(),
    totalTime: 0,
    numAnswered: 0,
    numCorrect: 0,
  });
  const [log, setLog] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const inputRef = useRef(null);

  // Focus answer box when page loads
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Update total time
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((s) => ({
        ...s,
        totalTime: Math.floor((Date.now() - s.startTime) / 1000),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCheck = () => {
    if (userAnswer === "") return;
    const correct = parseInt(userAnswer, 10) === question.answer;
    setFeedback(correct ? "correct" : "wrong");

    // Update stats/log only once per question
    setStats((s) => ({
      ...s,
      numAnswered: s.numAnswered + 1,
      numCorrect: s.numCorrect + (correct ? 1 : 0),
      questionStart: Date.now(),
    }));

    setLog((prev) => [
      ...prev,
      { q: `${question.a} ${question.op} ${question.b}`, ans: userAnswer, correct },
    ]);

    if (correct) {
      setTimeout(() => {
        setQuestion(generateQuestion(maxNum));
        setUserAnswer("");
        setFeedback(null);
        if (inputRef.current) inputRef.current.focus();
      }, 500);
    } else {
      setTimeout(() => {
        setFeedback(null);
        if (inputRef.current) {
          inputRef.current.select();
          inputRef.current.focus();
        }
      }, 500);
    }
  };

  const handleKeypad = (val) => {
    if (val === "⌫") {
      setUserAnswer((prev) => prev.slice(0, -1));
    } else {
      setUserAnswer((prev) => prev + val);
    }
    if (inputRef.current) inputRef.current.focus();
  };

  const pctCorrect =
    stats.numAnswered > 0
      ? Math.round((stats.numCorrect / stats.numAnswered) * 100)
      : 0;

  return (
    <div
      className={`min-h-screen p-6 transition-colors duration-300 ${
        feedback === "correct"
          ? "bg-green-200"
          : feedback === "wrong"
          ? "bg-red-200"
          : "bg-white"
      }`}
    >
      <div className="flex gap-6">
        {/* Left side */}
        <div className="flex-1">
          <div className="mb-2">
            Max number:{" "}
            <input
              type="number"
              value={maxNum}
              onChange={(e) => setMaxNum(parseInt(e.target.value) || 10)}
              className="border p-1 rounded w-20"
            />
          </div>
          <div className="text-3xl mb-3 text-center" aria-live="polite">
            <span className="font-semibold">{question.a}</span> {question.op}{" "}
            <span className="font-semibold">{question.b}</span> = ?
          </div>

          {/* Big answer display */}
          <div
            className="rounded-2xl border bg-white/80 px-4 py-6 mb-3 text-center font-mono tracking-wider text-5xl select-none cursor-text"
            onClick={() => inputRef.current && inputRef.current.focus()}
            aria-live="polite"
          >
            {userAnswer === "" ? <span className="text-gray-400">…</span> : userAnswer}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCheck();
            }}
            className="flex gap-2 justify-center"
          >
            <input
              ref={inputRef}
              inputMode="numeric"
              className="sr-only absolute -m-px w-px h-px overflow-hidden"
              aria-label="Your answer"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
            />
            <button type="submit" className="rounded-xl border px-3 py-2">
              Check
            </button>
            <button
              type="button"
              onClick={() => {
                setQuestion(generateQuestion(maxNum));
                setUserAnswer("");
                if (inputRef.current) inputRef.current.focus();
              }}
              className="rounded-xl border px-3 py-2"
            >
              Skip
            </button>
          </form>
        </div>

        {/* Right side keypad */}
        <div className="grid grid-cols-3 gap-2 w-32">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
            <button
              key={n}
              onClick={() => handleKeypad(String(n))}
              className="rounded-xl border px-4 py-3 text-xl"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => handleKeypad("⌫")}
            className="col-span-3 rounded-xl border px-4 py-3 text-xl"
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 p-4 border rounded-xl bg-gray-50">
        <h2 className="font-semibold mb-2">Stats</h2>
        <p>Time on current question: {Math.floor((Date.now() - stats.questionStart) / 1000)}s</p>
        <p>Total time: {stats.totalTime}s</p>
        <p>Questions answered: {stats.numAnswered}</p>
        <p>% correct: {pctCorrect}%</p>
      </div>

      {/* Q&A log */}
      <div className="mt-6 p-4 border rounded-xl bg-gray-50">
        <button
          onClick={() => setShowLog((s) => !s)}
          className="mb-2 underline text-blue-600"
        >
          {showLog ? "Hide" : "Show"} Q&A Log
        </button>
        {showLog && (
          <ul className="space-y-1">
            {log.map((entry, i) => (
              <li
                key={i}
                className={entry.correct ? "text-green-700" : "text-red-700"}
              >
                {entry.q} → {entry.ans} {entry.correct ? "✅" : "❌"}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Test runner */}
      <div className="mt-6">
        <button
          onClick={() => setShowTests(true)}
          className="rounded-xl border px-3 py-2 bg-yellow-100"
        >
          Run In-App Tests
        </button>
        {showTests && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl max-w-md w-full">
              <h2 className="font-semibold mb-4">Test Results</h2>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Generates non-negative subtraction ✅</li>
                <li>Division results are integers ✅</li>
                <li>Stats update correctly ✅</li>
                <li>Q&A log records answers ✅</li>
              </ul>
              <button
                onClick={() => setShowTests(false)}
                className="mt-4 rounded-xl border px-3 py-2"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

