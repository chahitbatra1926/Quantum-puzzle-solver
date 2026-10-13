export type SolverId='exact'|'heuristic'|'annealing';
export type Snapshot={candidate:number[];score:number;iteration:number;temperature:number;elapsed:number};
export type Trace={id:SolverId;frames:Snapshot[];exact:boolean;solved:boolean};
export type PuzzleConfig={puzzle:'queens'|'knapsack';size:number;seed:number;capacity:number;temperature:number};
export const items=[{name:'Crystal',weight:4,value:12},{name:'Core',weight:7,value:18},{name:'Prism',weight:3,value:8},{name:'Beacon',weight:6,value:15},{name:'Chip',weight:2,value:7},{name:'Alloy',weight:5,value:11},{name:'Lens',weight:4,value:10},{name:'Relic',weight:8,value:20}];
export function seeded(seed:number){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
export function conflicts(p:number[]){let total=0;for(let r=0;r<p.length;r++)for(let j=r+1;j<p.length;j++){const a=p[r],b=p[j];if(a===undefined||b===undefined||a<0||b<0)continue;if(a===b||Math.abs(a-b)===j-r)total++;}return total;}
export function conflictingRows(p:number[]){const rows=new Set<number>();for(let r=0;r<p.length;r++)for(let j=r+1;j<p.length;j++){const a=p[r],b=p[j];if(a===undefined||b===undefined||a<0||b<0)continue;if(a===b||Math.abs(a-b)===j-r){rows.add(r);rows.add(j);}}return rows;}
export function packStats(p:number[]){return items.reduce((s,item,i)=>({weight:s.weight+(p[i]?item.weight:0),value:s.value+(p[i]?item.value:0)}),{weight:0,value:0});}
export function makeTrace(config:PuzzleConfig,id:SolverId):Trace{
 const random=seeded(config.seed),start=performance.now();const frames:Snapshot[]=[];let iteration=0;let temperature=config.temperature;const snapshot=(p:number[],score:number)=>{if(frames.length<600)frames.push({candidate:[...p],score,iteration,temperature,elapsed:performance.now()-start});};
 if(config.puzzle==='queens'){
 const n=config.size;let candidate=Array.from({length:n},()=>Math.floor(random()*n));let best=conflicts(candidate);snapshot(candidate,best);
 if(id==='exact'){candidate=Array(n).fill(-1);let found=false;const search=(row:number):boolean=>{if(row===n){found=true;return true;}for(let col=0;col<n;col++){iteration++;candidate[row]=col;if(iteration%Math.max(1,Math.floor(n/2))===0)snapshot(candidate,conflicts(candidate));if(conflicts(candidate)===0&&search(row+1))return true;candidate[row]=-1;if(iteration>200000)return false;}return false;};search(0);snapshot(candidate,conflicts(candidate));return {id,frames,exact:found,solved:found};}
 let bestCandidate=[...candidate];for(iteration=1;iteration<=4000&&best>0;iteration++){
 const neighbor=[...candidate];if(id==='heuristic'){const rows=[...conflictingRows(candidate)];if(!rows.length)break;const row=rows[Math.floor(random()*rows.length)]??0;let score=Infinity;const choices:number[]=[];for(let col=0;col<n;col++){neighbor[row]=col;const s=conflicts(neighbor);if(s<score){score=s;choices.length=0;choices.push(col);}else if(s===score)choices.push(col);}neighbor[row]=choices[Math.floor(random()*choices.length)]??0;candidate=neighbor;if(iteration%100===0)candidate=Array.from({length:n},()=>Math.floor(random()*n));}
 else {const row=Math.floor(random()*n);neighbor[row]=Math.floor(random()*n);const delta=conflicts(neighbor)-conflicts(candidate);if(delta<=0||random()<Math.exp(-delta/Math.max(temperature,.001)))candidate=neighbor;temperature*=.995;}
 const score=conflicts(candidate);if(score<best){best=score;bestCandidate=[...candidate];}if(iteration%8===0||best===0)snapshot(candidate,score);
 }snapshot(bestCandidate,best);return {id,frames,exact:false,solved:best===0};
 }
 const capacity=config.capacity;let bestValue=0,best=Array(items.length).fill(0);const energy=(p:number[])=>{const stats=packStats(p);return -stats.value+100*Math.max(0,stats.weight-capacity);};
 const inspect=(p:number[])=>{const s=packStats(p);if(s.weight<=capacity&&s.value>bestValue){bestValue=s.value;best=[...p];}snapshot(p,bestValue);};
 if(id==='exact'){for(let mask=0;mask<2**items.length;mask++){iteration++;const p=items.map((_,i)=>(mask>>i)&1);if(iteration%2===0)inspect(p);else {const s=packStats(p);if(s.weight<=capacity&&s.value>bestValue){bestValue=s.value;best=[...p];}}}snapshot(best,bestValue);return {id,frames,exact:true,solved:true};}
 let p=Array(items.length).fill(0);inspect(p);
 if(id==='heuristic'){const sorted=items.map((item,i)=>({i,ratio:item.value/item.weight})).sort((a,b)=>b.ratio-a.ratio);for(const {i} of sorted){iteration++;const q=[...p];q[i]=1;if(packStats(q).weight<=capacity)p=q;inspect(p);}for(let i=0;i<items.length;i++)for(let j=0;j<items.length;j++)if(p[i]&&!p[j]){iteration++;const q=[...p];q[i]=0;q[j]=1;if(packStats(q).weight<=capacity&&packStats(q).value>packStats(p).value)p=q;inspect(p);}}
 else for(iteration=1;iteration<=1200;iteration++){const q=[...p];const i=Math.floor(random()*items.length);q[i]=1-q[i];const delta=energy(q)-energy(p);if(delta<=0||random()<Math.exp(-delta/Math.max(temperature,.001)))p=q;temperature*=.995;if(iteration%12===0)inspect(p);}
 snapshot(best,bestValue);return {id,frames,exact:false,solved:true};
}
