import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, Backpack, Crown, Shield, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Achievements, PageHeading } from '@/components/arena/shell';
import { useProgress } from '@/components/arena/progress-context';
import { pageMeta } from '@/lib/arena/meta';
import queensArt from '@/assets/queens-arena.jpg';
import knapsackArt from '@/assets/knapsack.jpg';
export const Route=createFileRoute('/profile')({head:()=>pageMeta('Explorer profile','Explore your session XP curve, prediction accuracy, puzzle activity, and experiment journal in Qubit Arena.'),component:Profile});
function Profile(){
 const {runs}=useProgress();
 const [filter,setFilter]=useState<'all'|'queens'|'knapsack'>('all');
 const correct=runs.filter(r=>r.correct).length;
 const earned=runs.reduce((sum,r)=>sum+(r.correct?30:10),0);
 const xp=420+earned;
 const accuracy=runs.length?Math.round(correct/runs.length*100):0;
 const filtered=runs.filter(r=>filter==='all'||(r.puzzle.startsWith('N-Queens')?'queens':'knapsack')===filter);
 const chronological=[...filtered].reverse();
 let total=0;
 const points=[0,...chronological.map(r=>{total+=r.correct?30:10;return total;})];
 const maxXp=Math.max(40,Math.ceil(total/40)*40);
 const x=(i:number)=>48+i/Math.max(1,points.length-1)*520;
 const y=(value:number)=>170-value/maxXp*140;
 const curve=points.map((value,i)=>`${x(i)},${y(value)}`).join(' ');
 const puzzleRows=[{id:'queens' as const,name:'N-Queens',subtitle:'Find harmony on the board',image:queensArt,Icon:Crown,color:'text-lilac'},{id:'knapsack' as const,name:'0/1 Knapsack',subtitle:'Make every choice count',image:knapsackArt,Icon:Backpack,color:'text-cyan'}];
 return <>
  <PageHeading eyebrow="EXPLORER DOSSIER / 004" title="Your explorer profile." description="Demo explorer · Progress lasts for this session"><Button asChild variant="outline"><Link to="/arena" search={{puzzle:'queens',size:8,seed:19472}}>New experiment <ArrowUpRight/></Link></Button></PageHeading>
  <section className="profile-identity" aria-label="Explorer identity">
   <div className="profile-insignia"><Shield strokeWidth={1}/><span>A</span></div>
   <div className="profile-name"><span className="eyebrow">QUBIT ARENA / EXPLORER</span><h2>Alex Morgan<span className="text-primary">.</span></h2><span className="tag tag-acid"><span className="live-dot"/>CURIOUS MIND</span></div>
   <div className="profile-rank"><span className="eyebrow">DEMO LEVEL</span><strong>04</strong><span className="text-muted-foreground text-xs">Every run, a new perspective.</span></div>
  </section>
  <div className="profile-stats dossier-stats">{[{value:String(xp),label:'TOTAL XP',detail:`420 demo XP + ${earned} earned`,color:'text-primary'},{value:String(runs.length).padStart(2,'0'),label:'SESSION EXPERIMENTS',detail:'Completed arena races',color:'text-foreground'},{value:runs.length?`${accuracy}%`:'—',label:'PREDICTION ACCURACY',detail:`${correct} correct predictions`,color:'text-lilac'},{value:`${new Set(runs.map(r=>r.puzzle.startsWith('N-Queens')?'queens':'knapsack')).size} / 2`,label:'PUZZLES EXPLORED',detail:'N-Queens · Knapsack',color:'text-cyan'}].map(s=><div key={s.label} className="profile-stat"><span className="eyebrow">{s.label}</span><strong className={s.color}>{s.value}</strong><small>{s.detail}</small></div>)}</div>
  <div className="profile-analytics">
   <section className="profile-growth" aria-label="Session XP growth"><div className="profile-section-title"><div><span className="eyebrow">01 / MOMENTUM</span><h2>Your XP trajectory</h2></div><div className="profile-earned"><strong>+{total}</strong><span>SESSION XP</span></div></div>
    <div className="profile-filter" role="group" aria-label="Filter profile activity">{[{id:'all' as const,label:'All puzzles'},{id:'queens' as const,label:'N-Queens'},{id:'knapsack' as const,label:'Knapsack'}].map(f=><Button size="sm" variant={filter===f.id?'secondary':'ghost'} aria-pressed={filter===f.id} key={f.id} onClick={()=>setFilter(f.id)}>{f.label}</Button>)}</div>
    <svg className="profile-xp-chart" viewBox="0 0 600 220" role="img" aria-label={`Cumulative earned XP over ${filtered.length} completed experiments: ${total} XP. Excludes 420 demo XP.`}>
     {[0,1,2,3,4].map(i=>{const value=maxXp*i/4;return <g key={i}><line x1="48" x2="568" y1={y(value)} y2={y(value)}/><text x="35" y={y(value)+4} textAnchor="end">{value}</text></g>;})}
     <text x="48" y="15" className="profile-axis-title">Earned XP</text>
     {filtered.length>0&&<><polygon className="profile-chart-fill" points={`48,170 ${curve} ${x(points.length-1)},170`}/><polyline points={curve}/>{points.map((value,i)=><circle key={i} cx={x(i)} cy={y(value)} r="4"><title>{i===0?'Session start':`Experiment ${i}`}: {value} earned XP</title></circle>)}</>}
     {!filtered.length&&<text x="308" y="98" textAnchor="middle" className="profile-chart-empty">Your next breakthrough starts here.</text>}
     <text x="48" y="194" textAnchor="middle">0</text><text x="568" y="194" textAnchor="middle">{filtered.length||'—'}</text><text x="308" y="215" textAnchor="middle" className="profile-axis-title">Completed experiments</text>
    </svg><div className="profile-chart-foot"><span><span className="solver-dot text-primary"/>Cumulative earned XP</span><span>+30 correct · +10 new insight</span></div>
   </section>
   <section className="profile-accuracy" aria-label="Prediction results"><div className="profile-section-title"><div><span className="eyebrow">02 / INTUITION</span><h2>Prediction signal</h2></div><Target className="text-lilac" size={20}/></div>
    <div className="accuracy-dial"><svg viewBox="0 0 200 200" role="img" aria-label={runs.length?`${accuracy} percent correct predictions, ${correct} of ${runs.length}`:'No predictions completed this session'}><circle className="dial-track" cx="100" cy="100" r="78"/><circle className="dial-progress" cx="100" cy="100" r="78" pathLength="100" strokeDasharray={`${accuracy} 100`} transform="rotate(-90 100 100)"/>{Array.from({length:40},(_,i)=><line className="dial-tick" key={i} x1="100" y1="6" x2="100" y2={i%5===0?'14':'10'} transform={`rotate(${i*9} 100 100)`}/>)}</svg><div><strong>{runs.length?`${accuracy}%`:'—'}</strong><span>{runs.length?'ACCURACY':'NO RUNS YET'}</span></div></div>
    <div className="accuracy-key"><span><i className="solver-dot text-lilac"/>Correct<strong>{correct}</strong></span><span><i className="solver-dot text-muted-foreground"/>New insights<strong>{runs.length-correct}</strong></span></div>
   </section>
  </div>
  <section className="profile-puzzles" aria-label="Puzzle activity"><div className="section-heading"><h2>Your exploration map</h2><span className="eyebrow">02 WORLDS</span></div><div className="exploration-grid">{puzzleRows.map(({id,name,subtitle,image,Icon,color})=>{const count=runs.filter(r=>(r.puzzle.startsWith('N-Queens')?'queens':'knapsack')===id).length;return <Link key={id} className="exploration-item" to="/arena" search={{puzzle:id,size:8,seed:19472}}><img src={image} alt={id==='queens'?'Sculptural queens on a futuristic chessboard':'Collectible crystals and objects for the Knapsack puzzle'}/><div><span className={`flex items-center gap-2 ${color}`}><Icon size={15}/><span className="eyebrow">{count?'EXPLORED':'UNEXPLORED'}</span></span><h3>{name}</h3><p>{subtitle}</p><span className="exploration-count">{count} {count===1?'experiment':'experiments'} <ArrowUpRight size={16}/></span></div></Link>;})}</div></section>
  <div className="section-heading"><h2>Your next milestones</h2><span className="eyebrow">BADGE COLLECTION PREVIEW</span></div><Achievements expanded/>
  <div className="section-heading mt-10"><h2>Experiment journal</h2><span className="eyebrow">{String(filtered.length).padStart(2,'0')} RECORDS</span></div>
  {filtered.length?<div className="profile-journal-scroll"><table className="activity-table"><thead><tr><th>PUZZLE</th><th>LEADING SOLVER</th><th>PREDICTION</th><th>XP</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={i}><td>{r.puzzle}</td><td>{r.solver}</td><td className={r.correct?'text-primary':'text-muted-foreground'}>{r.correct?'Correct':'New insight'}</td><td className="text-primary">+{r.correct?30:10}</td></tr>)}</tbody></table></div>:<div className="profile-journal-empty"><Zap className="text-primary" size={26}/><div><h3>{runs.length?'No experiments for this puzzle yet.':'Your first experiment is waiting.'}</h3><p className="subcopy">A new question. A fresh perspective.</p></div><Button asChild variant="outline"><Link to="/arena" search={{puzzle:filter==='knapsack'?'knapsack':'queens',size:8,seed:19472}}>Enter the arena <ArrowUpRight/></Link></Button></div>}
 </>;
}
