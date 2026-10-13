import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [n, setN] = useState(8);
  const [selectedAlgo, setSelectedAlgo] = useState('quantum');
  const [loading, setLoading] = useState(false);
  const [boardState, setBoardState] = useState(Array(n * n).fill(0));
  const [currentIteration, setCurrentIteration] = useState(0);
  const [executionTime, setExecutionTime] = useState(0); // NEW: Track time in ms
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); 
  
  const animationRef = useRef(null);

  useEffect(() => {
    setBoardState(Array(n * n).fill(0));
    setCurrentIteration(0);
    setExecutionTime(0); // Reset time
    clearInterval(animationRef.current);
    setIsPlaying(false);
    setErrorMsg(null);
  }, [n]);

  const runAndAnimate = async () => {
    setLoading(true);
    setErrorMsg(null);
    clearInterval(animationRef.current);
    setBoardState(Array(n * n).fill(0));
    setCurrentIteration(0);
    setExecutionTime(0);
    setIsPlaying(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n: Number(n), algo: selectedAlgo })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Solver execution failed');
      
      setBoardState(data.board); 
      setCurrentIteration(data.steps);
      setExecutionTime(data.time_ms); // NEW: Save the execution time
      setIsPlaying(false);
      
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setIsPlaying(false);
      setBoardState(Array(n * n).fill(0));
    } finally {
      setLoading(false);
    }
  };

  const algorithms = [
    { id: 'bruteforce', name: 'Classical Brute Force', desc: 'Exponential O(2^N) backtracking', color: 'border-red-500' },
    { id: 'heuristic', name: 'Greedy Heuristic', desc: 'Fast, but traps in local minima', color: 'border-amber-500' },
    { id: 'quantum', name: 'Quantum QUBO (Simulated)', desc: 'Polynomial time simulated annealing', color: 'border-cyan-500' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center font-sans">
      <header className="max-w-6xl w-full text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
          Quantum Puzzle Solver Arena
        </h1>
      </header>
      

      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-12 items-start justify-center">
        
        {/* LEFT COLUMN: The Visual Board */}
        <div className="w-full lg:w-1/2 flex flex-col items-center bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="w-full flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-200">Arena (N={n})</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Size:</label>
              <input
                type="number" min="4" max="32" value={n}
                onChange={(e) => setN(Number(e.target.value))}
                disabled={isPlaying}
                className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-white focus:outline-none"
              />
            </div>
          </div>

          <div
            className="grid bg-slate-950 p-2 rounded-lg border border-slate-800"
            style={{
              gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`,
              width: '100%',
              maxWidth: '450px',
              aspectRatio: '1/1',
              gap: n > 15 ? '0px' : '4px' // Remove gap for large boards
            }}
          >
            {boardState.map((val, idx) => {
              const r = Math.floor(idx / n);
              const c = idx % n;
              const isDark = (r + c) % 2 === 1;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-center transition-all ${
                    val === 1 
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.8)] z-10' 
                      : isDark ? 'bg-slate-800' : 'bg-slate-700'
                  }`}
                  style={{ 
                    fontSize: `calc(300px / ${n})`, // Dynamically shrink the queen emoji
                    borderRadius: n > 15 ? '0px' : '2px'
                  }}
                >
                  {val === 1 ? '♛' : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Algorithm Selection & Controls */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-200 mb-2">Select Approach</h2>
          
          {errorMsg && (
            <div className="mb-2 p-4 bg-red-950/80 border border-red-500 rounded-lg shadow-lg shadow-red-900/20">
              <h3 className="text-red-400 font-bold uppercase tracking-wider text-sm mb-1">🚨 System Overload</h3>
              <p className="text-red-200 text-sm">
                {errorMsg}. Classical bottleneck reached. Switch to Quantum QUBO to bypass.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {algorithms.map((algo) => (
              <div
                key={algo.id}
                onClick={() => !isPlaying && setSelectedAlgo(algo.id)}
                className={`relative p-5 rounded-xl border-l-4 cursor-pointer transition-all ${
                  selectedAlgo === algo.id 
                    ? `bg-slate-800 border-y border-r border-y-slate-700 border-r-slate-700 ${algo.color} shadow-lg scale-[1.02]` 
                    : 'bg-slate-900 border-transparent hover:bg-slate-800 border-y border-r border-y-slate-800 border-r-slate-800 opacity-70 hover:opacity-100'
                } ${isPlaying ? 'pointer-events-none' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{algo.name}</h3>
                    <p className="text-sm text-slate-400">{algo.desc}</p>
                  </div>
                  
                  {/* NEW: Display both Time and Iterations side-by-side */}
                  {selectedAlgo === algo.id && (
                    <div className="flex gap-4 text-right">
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Time</span>
                        <span className="font-mono text-xl font-bold text-cyan-400">
                          {executionTime.toFixed(2)}<span className="text-sm text-cyan-600">ms</span>
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Steps</span>
                        <span className="font-mono text-xl font-bold text-white">
                          {currentIteration.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={runAndAnimate}
            disabled={isPlaying || loading}
            className="mt-4 w-full py-4 rounded-xl text-lg font-bold uppercase tracking-wider transition-all bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]"
          >
            {isPlaying ? 'Computing...' : '▶ Launch Solver'}
          </button>
        </div>
      </div>
    </div>
  );
}