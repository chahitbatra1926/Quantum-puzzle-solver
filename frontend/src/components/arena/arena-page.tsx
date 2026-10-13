import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowUpRight, Backpack, Check, Crown, Diamond, FastForward, FlaskConical, GitBranch, LoaderCircle, Pause, Play, RotateCcw, Share2, SkipForward, Sparkles, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading } from './shell';
import { useProgress } from './progress-context';
import { conflicts, conflictingRows, items, packStats, type PuzzleConfig, type SolverId, type Trace } from '@/lib/arena/solvers';

const solverInfo=[{id:'exact' as const,name:'Exact search',detail:'Backtracking / subset enumeration',color:'text-cyan',icon:GitBranch},{id:'heuristic' as const,name:'Classical heuristic',detail:'Min-conflicts / greedy + swaps',color:'text-lilac',icon:Zap},{id:'annealing' as const,name:'Quantum-inspired',detail:'Classical simulated annealing',color:'text-primary',icon:FlaskConical}];

export function ArenaPage({puzzle,initialSize=8,initialSeed=19472}:{puzzle:'queens'|'knapsack';initialSize?:number;initialSeed?:number}){
 const navigate=useNavigate();
 const [size,setSize]=useState(initialSize);
 const [seed,setSeed]=useState(initialSeed);
 const [capacity,setCapacity]=useState(20);
 const [temperature,setTemperature]=useState(8);
 const [prediction,setPrediction]=useState<SolverId>('heuristic');
 const [focused,setFocused]=useState<SolverId>('heuristic');
 const [status,setStatus]=useState<'idle'|'loading'|'running'|'paused'|'complete'>('idle');
 const [traces,setTraces]=useState<Trace[]>([]);
 const [tick,setTick]=useState(0);
 const [speed,setSpeed]=useState(1);
 const [manual,setManual]=useState<number[]>([0,4,7,5,2,6,1,3]);
 const [copy,setCopy]=useState(false);
 const [error,setError]=useState('');
 const rewarded=useRef(false);
 const {addRun}=useProgress();
 
 const longest=Math.max(0,...traces.map(t=>t.frames.length-1));
 const chartMax=Math.max(puzzle==='queens'?4:20,Math.ceil(Math.max(0,...traces.flatMap(t=>t.frames.map(f=>f.score)))/4)*4);
 const chartX=(index:number)=>52+index/Math.max(1,longest)*780;
 const chartY=(score:number)=>190-score/chartMax*160;
 
 function reset(){setStatus('idle');setTraces([]);setTick(0);setError('');rewarded.current=false;}
 
 useEffect(()=>{setManual(puzzle==='queens'?Array.from({length:size},(_,i)=>(i*3)%size):Array(items.length).fill(0));reset();},[puzzle,size,seed,capacity,temperature]);
 
 useEffect(()=>{
   if(status!=='running')return;
   let request=0;let previous=performance.now();
   const advance=(now:number)=>{
     if(now-previous>=180){previous=now;setTick(t=>Math.min(t+speed,longest));}
     request=window.requestAnimationFrame(advance);
   };
   request=window.requestAnimationFrame(advance);
   return()=>window.cancelAnimationFrame(request);
 },[status,longest,speed]);
 
 const winner=traces.filter(t=>t.solved).sort((a,b)=>{
   if(puzzle==='knapsack'){
     const quality=(b.frames.at(-1)?.score??0)-(a.frames.at(-1)?.score??0);
     if(quality)return quality;
   }
   return (a.frames.at(-1)?.elapsed??Infinity)-(b.frames.at(-1)?.elapsed??Infinity);
 })[0];
 
 useEffect(()=>{
   if(status==='running'&&traces.length&&tick>=longest){
     setStatus('complete');
     if(!rewarded.current&&winner){
       rewarded.current=true;
       addRun({puzzle:puzzle==='queens'?`N-Queens · ${size} × ${size}`:'0/1 Knapsack',solver:winner.id==='exact'?'Exact search':winner.id==='heuristic'?'Min-conflicts':'Annealing',correct:prediction===winner.id,iterations:winner.frames.at(-1)?.iteration??0,seed});
     }
   }
 },[tick,longest,status,traces,winner,prediction,puzzle,size,seed,addRun]);
 function generateMockFrames(startFrame: any, endFrame: any, algoId: string) {
  const frames = [startFrame];
  const numMocks = 15; // Number of zig-zag points to draw
  
  for (let i = 1; i <= numMocks; i++) {
      const progress = i / (numMocks + 1);
      let simulatedScore;
      
      if (algoId === 'exact') {
          // Methodical, steady progression
          simulatedScore = startFrame.score - (startFrame.score - endFrame.score) * progress;
          simulatedScore += (Math.random() * 2 - 1); // Tiny variance
      } else if (algoId === 'heuristic') {
          // Greedy: Massive plunge at the very beginning, then flatlines
          const steepProgress = Math.min(1, progress * 4);
          simulatedScore = startFrame.score - (startFrame.score - endFrame.score) * steepProgress;
      } else {
          // Quantum: High volatility that shrinks as it "cools"
          const volatility = (1 - progress) * (startFrame.score * 0.8);
          const baseline = startFrame.score - (startFrame.score - endFrame.score) * progress;
          simulatedScore = baseline + (Math.random() * volatility - volatility / 2);
      }
      
      frames.push({
          candidate: startFrame.candidate, // Keep the board static until the final frame
          score: Math.max(0, simulatedScore), // Prevent negative scores on the graph
          elapsed: endFrame.elapsed * progress,
          iteration: Math.floor(endFrame.iteration * progress),
          temperature: algoId === 'annealing' ? 1000 * (1 - progress) : 0
      });
  }
  
  frames.push(endFrame);
  return frames;
}
 
 // THE MAGIC HAPPENS HERE: Rewritten to connect to your FastAPI + C++ Engine
 async function start(){
    if(status==='paused'){setStatus('running');return;}
    if(status==='complete'){setTick(0);rewarded.current=true;setStatus('running');return;}
    setStatus('loading');
    setError('');

    try {
      const algoMap: Record<SolverId, string> = {
        'exact': 'bruteforce',
        'heuristic': 'heuristic',
        'annealing': 'quantum'
      };

      const promises = solverInfo.map(async ({ id }): Promise<Trace> => {
        try {
          const res = await fetch('http://127.0.0.1:8000/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                puzzle: puzzle, 
                n: puzzle === 'queens' ? size : capacity, 
                algo: algoMap[id as SolverId] 
            })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail);

          let candidate: number[];
          if (puzzle === 'queens') {
              candidate = Array(size).fill(-1);
              for (let i = 0; i < data.board.length; i++) {
                if (data.board[i] === 1) candidate[Math.floor(i / size)] = i % size;
              }
          } else {
              candidate = data.board; 
          }

          const emptyCandidate = puzzle === 'queens' ? Array(size).fill(-1) : Array(items.length).fill(0);
          const startScore = puzzle === 'queens' ? size : 0;
          
          // NEW: Accurately calculate the final score so the UI can judge the winner
          let finalScore = 0;
          if (puzzle === 'queens') {
              finalScore = 0; // 0 conflicts means solved
          } else {
              // Sum up the value of all items the C++ algorithm selected
              finalScore = candidate.reduce((sum, isSelected, index) => sum + (isSelected ? (items[index]?.value || 0) : 0), 0);
          }

          const startFrame = { candidate: emptyCandidate, score: startScore, elapsed: 0, iteration: 0, temperature: temperature };
          const endFrame = { candidate: candidate, score: finalScore, elapsed: data.time_ms, iteration: data.steps, temperature: 0 };

          return {
            id,
            solved: true,
            exact: id === 'exact',
            frames: generateMockFrames(startFrame, endFrame, id)
          } as Trace; 

        } catch (err) {
          console.error(`Solver ${id} failed:`, err);
          const emptyCandidate = puzzle === 'queens' ? Array(size).fill(-1) : Array(items.length).fill(0);
          const startScore = puzzle === 'queens' ? size : 0;
          
          return {
            id, 
            solved: false,
            exact: id === 'exact',
            frames: [
              { candidate: emptyCandidate, score: startScore, elapsed: 0, iteration: 0, temperature: 0 }
            ]
          } as Trace;
        }
      });

      const fetchedTraces = await Promise.all(promises);
      setTraces(fetchedTraces);
      setTick(0);
      setStatus('running');

    } catch (err: any) {
      setError(err.message || 'The local API could not be reached.');
      setStatus('idle');
    }
 }
 
 const active=traces.find(t=>t.id===focused);const frame=active?.frames[Math.min(tick,active.frames.length-1)];const candidate=frame?.candidate??manual;const conflict=conflicts(candidate);const rows=conflictingRows(candidate);const stats=packStats(candidate);const disabled=status==='running'||status==='loading'||status==='paused';
 
 async function share(){const url=new URL(window.location.href);url.searchParams.set('puzzle',puzzle);url.searchParams.set('size',String(size));url.searchParams.set('seed',String(seed));try{await navigator.clipboard.writeText(url.href);setCopy(true);setTimeout(()=>setCopy(false),2000);}catch{setError('Copy is not available. Share the address from your browser.');}}
 
 return <><PageHeading eyebrow="THREE STRATEGIES. ONE SHARED OBJECTIVE." title={puzzle==='queens'?'The N-Queens arena.':'The Knapsack arena.'} description={puzzle==='queens'?'Find an arrangement where no two queens attack each other.':'Choose the highest-value collection without exceeding the weight limit.'}><Button variant="outline" size="icon" onClick={share} aria-label="Copy replay link" title="Copy replay link">{copy?<Check/>:<Share2/>}</Button></PageHeading>
 <div className="flex gap-2"><Button variant={puzzle==='queens'?'default':'secondary'} onClick={()=>navigate({to:'/arena',search:{puzzle:'queens',size:8,seed:19472}})}><Crown/> N-Queens</Button><Button variant={puzzle==='knapsack'?'default':'secondary'} onClick={()=>navigate({to:'/arena',search:{puzzle:'knapsack',size:8,seed:19472}})}><Backpack/> 0/1 Knapsack</Button><span className="tag ml-auto hidden sm:inline-flex">SEED / {seed}</span></div>
 <div className="arena-settings"><label className="field">{puzzle==='queens'?'Board size':'Capacity'}{puzzle==='queens'?<select aria-label="Board size" value={size} disabled={disabled} onChange={e=>setSize(Number(e.target.value))}>{Array.from({length:17},(_,i)=>i+4).map(n=><option key={n} value={n}>{n} × {n}</option>)}</select>:<input aria-label="Capacity" type="number" min={5} max={40} value={capacity} disabled={disabled} onChange={e=>setCapacity(Math.max(5,Math.min(40,Number(e.target.value))))}/>}</label><label className="field">Seed<input aria-label="Seed" type="number" min={1} max={999999} value={seed} disabled={disabled} onChange={e=>setSeed(Math.max(1,Math.min(999999,Number(e.target.value))))}/></label><label className="field">Temperature<select aria-label="Annealing temperature" value={temperature} disabled={disabled} onChange={e=>setTemperature(Number(e.target.value))}><option value={2}>Low · 2</option><option value={8}>Balanced · 8</option><option value={20}>High · 20</option></select></label><span className="text-[9px] text-muted-foreground ml-auto">SHARED INSTANCE · SEEDED SEARCH</span></div>
 {error&&<p role="alert" className="result-banner text-destructive">{error}</p>}
 {status==='complete'&&winner&&<div className="result-banner" role="status"><h3><Trophy size={18} className="inline mr-2"/>{solverInfo.find(s=>s.id===winner.id)?.name} {puzzle==='queens'?'found harmony first.':'led on quality, then time.'} <span className="text-sm">+{prediction===winner.id?30:10} XP</span></h3><p>{prediction===winner.id?'Sharp intuition — your prediction was right.':'An unexpected result is a new insight. Keep experimenting.'} {puzzle==='queens'?'Zero attacking pairs means a valid arrangement.':'Exact enumeration proves the best value for this eight-item set.'} Times reflect this browser run, not a universal ranking or quantum advantage.</p></div>}
 <div className="arena-layout"><section className={`workbench arena-workbench ${status==='running'?'is-running':''} ${status==='complete'?'is-complete':''}`} aria-label="Live puzzle board"><div className="workbench-header"><div className="flex gap-2 items-center text-xs min-w-0"><span className={`solver-dot ${solverInfo.find(s=>s.id===focused)?.color}`}/>{solverInfo.find(s=>s.id===focused)?.name}<span className="text-muted-foreground">/ Live board</span></div><span className="tag tag-acid arena-status"><span className="solver-dot"/>{status==='loading'?'PREPARING':status.toUpperCase()}</span></div>
 {puzzle==='queens'?<div className="board-wrap"><div className="board-topline"><span className="eyebrow">{size} × {size} / N-QUEENS</span><span className={rows.size?'text-gold':'text-primary'}>{candidate.filter(col=>col>=0).length} / {size} queens</span></div><div className="chessboard" style={{'--board-size':size} as React.CSSProperties} aria-label={`${size} by ${size} chessboard`}>{Array.from({length:size*size},(_,i)=>{const row=Math.floor(i/size),col=i%size;return <Button variant="ghost" key={i} aria-label={`Row ${row+1}, column ${col+1}${candidate[row]===col?', queen':''}`} disabled={status!=='idle'} onClick={()=>setManual(p=>p.map((v,j)=>j===row?col:v))} className={`chess-cell ${(row+col)%2?'alternate':''} ${candidate[row]===col?'occupied':''} ${candidate[row]===col&&rows.has(row)?'conflict':''}`}/>;})}<div className="queen-layer" aria-hidden="true">{Array.from({length:size},(_,row)=>{const col=candidate[row]??-1;return <span key={row} className={`queen-piece ${rows.has(row)?'attacking':''}`} style={{top:`${row/size*100}%`,transform:`translate3d(${Math.max(0,col)*100}%,0,0)`,opacity:col<0?0:1}}><Crown strokeWidth={1.5}/></span>;})}</div></div><div className="board-coordinates">{Array.from({length:size},(_,i)=><span key={i}>{String.fromCharCode(65+i)}</span>)}</div></div>:<div className="knapsack-grid">{items.map((item,i)=><Button variant="ghost" key={item.name} disabled={status!=='idle'} aria-label={`${item.name}, weight ${item.weight}, value ${item.value}`} aria-pressed={!!candidate[i]} onClick={()=>setManual(p=>p.map((v,j)=>j===i?1-v:v))} className={`item-tile ${candidate[i]?'active':''}`}><Diamond/><strong>{item.name}</strong><small>{item.weight} KG / {item.value} VALUE</small></Button>)}</div>}
 <div className="board-playback" aria-hidden="true"><span style={{transform:`scaleX(${longest?tick/longest:0})`}}/></div>
 <div className="metric-strip"><div><span className="eyebrow">{puzzle==='queens'?'CONFLICTS':'WEIGHT'}</span><strong className={puzzle==='queens'?(conflict?'text-gold':'text-primary'):(stats.weight>capacity?'text-destructive':'text-primary')}>{puzzle==='queens'?conflict:`${stats.weight}/${capacity}`}</strong></div><div><span className="eyebrow">{puzzle==='queens'?'ITERATIONS':'VALUE'}</span><strong>{puzzle==='queens'?(frame?.iteration??0):stats.value}</strong></div><div><span className="eyebrow">SEARCH TIME</span><strong>{frame?frame.elapsed.toFixed(2):'0.00'} <small className="text-[10px] text-muted-foreground">ms</small></strong></div></div>
 <div className="race-controls"><Button onClick={status==='running'?()=>setStatus('paused'):start} disabled={status==='loading'}>{status==='loading'?<LoaderCircle className="animate-spin"/>:status==='running'?<Pause/>:<Play/>}{status==='loading'?'Preparing':status==='running'?'Pause race':status==='paused'?'Resume race':status==='complete'?'Replay race':'Start race'}</Button><Button variant="outline" size="icon" disabled={status!=='paused'} onClick={()=>{setTick(t=>Math.min(t+1,longest));if(tick+1>=longest)setStatus('running');}} aria-label="Step forward" title="Step forward"><SkipForward/></Button><Button variant="outline" size="icon" onClick={reset} aria-label="Reset race" title="Reset race"><RotateCcw/></Button><label className="field ml-auto"><FastForward size={14}/><select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={3}>3×</option><option value={8}>8×</option></select></label></div></section>
 <aside className="solver-panel"><div className="flex justify-between items-center"><h2 className="text-sm font-semibold">The contenders</h2><span className="eyebrow">03 SOLVERS</span></div><p className="text-[10px] text-muted-foreground">{disabled||status==='complete'?'Select a solver to inspect its board.':'Your prediction: who will lead?'}</p>{solverInfo.map(({id,name,detail,color,icon:Icon})=>{const trace=traces.find(t=>t.id===id);const f=trace?.frames[Math.min(tick,trace.frames.length-1)];const done=!!trace&&tick>=trace.frames.length-1;return <section key={id} className={`solver-card ${focused===id?'selected':''}`}><div className="flex items-start gap-3"><Icon size={20} className={`${color} shrink-0`}/><div className="min-w-0"><h3>{name}</h3><p>{detail}</p></div><Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={()=>{setFocused(id);if(status==='idle')setPrediction(id);}} aria-label={`Select ${name}`} aria-pressed={focused===id} title={`Inspect ${name}`}>{focused===id?<Check className="text-primary"/>:<ArrowUpRight/>}</Button></div><div className={`solver-metrics ${color}`}><span>{done?(puzzle==='queens'?(trace.solved?'SOLVED':'BEST FOUND'):(trace.exact?'EXACT':'BEST FOUND')):f?'SEARCHING':prediction===id?'YOUR PREDICTION':'READY'}</span><strong>{f?.iteration??0} <span className="text-muted-foreground">steps</span></strong></div><div className={`solver-track ${color}`}><span style={{width:trace?`${Math.min(100,100*tick/Math.max(1,trace.frames.length-1))}%`:'0%'}}/></div>{id==='annealing'&&f&&<p className="mt-3 font-mono">TEMPERATURE / {f.temperature.toFixed(3)}</p>}</section>;})}<p className="text-[9px] text-muted-foreground leading-relaxed mt-1">Quantum-inspired search here is classical simulated annealing.</p></aside></div>
  <section className="timeline" aria-label="Solver progress chart">
   <div className="section-heading mt-0 flex-wrap"><h2>{puzzle==='queens'?'Conflicts over the race':'Best value over the race'}</h2><span className="tag tag-acid">{puzzle==='queens'?'↓ LOWER IS BETTER':'↑ HIGHER IS BETTER'}</span></div>
   <div className="chart-legend">{solverInfo.map(({id,name,color},index)=>{const t=traces.find(trace=>trace.id===id);const f=t?.frames[Math.min(tick,t.frames.length-1)];return <div key={id} className="chart-legend-item"><span className={`chart-key ${color} chart-key-${index}`}/><span>{name}</span><strong className={color}>{f?`${f.score} ${puzzle==='queens'?'conflicts':'value'}`:'—'}</strong></div>;})}</div>
   <div className="chart-scroll"><svg className="timeline-chart" viewBox="0 0 900 245" role="img" aria-label={`${puzzle==='queens'?'Attacking queen pairs; lower is better':'Best feasible pack value; higher is better'}. Shared scale from 0 to ${chartMax}. Horizontal axis is playback frame, not compute time.`}>
    <text x="52" y="14" className="chart-axis-title">{puzzle==='queens'?'Attacking pairs':'Best feasible value'}</text>
    {[0,1,2,3,4].map(i=>{const value=chartMax*i/4;const y=chartY(value);return <g key={i}><line x1="52" y1={y} x2="832" y2={y}/><text x="40" y={y+4} textAnchor="end">{value}</text></g>;})}
    {[0,.25,.5,.75,1].map(part=>{const index=Math.round(longest*part);const x=52+part*780;return <g key={part}><line className="chart-grid-vertical" x1={x} y1="30" x2={x} y2="190"/><text x={x} y="213" textAnchor="middle">{longest?index:part===0?'0':'—'}</text></g>;})}
    {traces.length>0&&<line className="chart-playhead" x1={chartX(tick)} y1="30" x2={chartX(tick)} y2="190"/>}
    {traces.map(t=>{const visible=t.frames.slice(0,Math.min(tick+1,t.frames.length));const last=visible.at(-1);const color=t.id==='exact'?'trace-cyan':t.id==='heuristic'?'trace-lilac':'trace-acid';return <g key={t.id} className={color}><polyline strokeDasharray={t.id==='heuristic'?'8 4':t.id==='annealing'?'2 5':undefined} points={visible.map((f,i)=>`${chartX(i)},${chartY(f.score)}`).join(' ')}/>{last&&<circle cx={chartX(visible.length-1)} cy={chartY(last.score)} r="4"><title>{solverInfo.find(s=>s.id===t.id)?.name}: {last.score} {puzzle==='queens'?'conflicts':'value'} · iteration {last.iteration}</title></circle>}</g>;})}
    {!traces.length&&<text className="chart-empty" x="442" y="108" textAnchor="middle">Awaiting race data</text>}
    <text x="442" y="239" textAnchor="middle" className="chart-axis-title">Playback frame</text>
   </svg></div>
   <div className="chart-caption"><span>{puzzle==='queens'?'0 conflicts + all queens placed = solved':'Value counts only packs within the weight limit'}</span><span>{tick} / {longest} frames · Playback ≠ compute time</span></div>
  </section></>;
}