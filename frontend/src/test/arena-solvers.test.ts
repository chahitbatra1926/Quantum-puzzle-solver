import { describe,it,expect } from 'vitest';
import { conflicts,makeTrace,packStats,seeded, type PuzzleConfig } from '@/lib/arena/solvers';
const config:PuzzleConfig={puzzle:'queens',size:8,seed:19472,capacity:20,temperature:8};
describe('Arena solver correctness',()=>{
 it('recognizes a valid layout and excludes unplaced queens',()=>{expect(conflicts([0,4,7,5,2,6,1,3])).toBe(0);expect(conflicts([-1,-1,0,2])).toBe(0);expect(conflicts([0,1,2,3])).toBe(6);});
 it('uses reproducible random numbers',()=>{const a=seeded(7),b=seeded(7);expect(Array.from({length:20},a)).toEqual(Array.from({length:20},b));});
 it('exact search finds valid boards from 4 through 12 queens',()=>{for(let size=4;size<=12;size++){const trace=makeTrace({...config,size},'exact');expect(trace.solved).toBe(true);expect(conflicts(trace.frames.at(-1)?.candidate??[])).toBe(0);expect(trace.frames.at(-1)?.candidate.length).toBe(size);}});
 it('heuristic and annealing deliver valid solutions for the featured seed',()=>{for(const id of ['heuristic','annealing'] as const){const t=makeTrace(config,id);expect(t.solved).toBe(true);expect(conflicts(t.frames.at(-1)?.candidate??[])).toBe(0);}});
 it('exact Knapsack matches a complete independent enumeration',()=>{const trace=makeTrace({...config,puzzle:'knapsack'},'exact');let best=0;for(let mask=0;mask<256;mask++){const s=packStats(Array.from({length:8},(_,i)=>(mask>>i)&1));if(s.weight<=20)best=Math.max(best,s.value);}expect(trace.frames.at(-1)?.score).toBe(best);expect(trace.exact).toBe(true);});
 it('approximate Knapsack answers remain feasible',()=>{for(const id of ['heuristic','annealing'] as const){const t=makeTrace({...config,puzzle:'knapsack'},id);expect(packStats(t.frames.at(-1)?.candidate??[]).weight).toBeLessThanOrEqual(20);}});
});
