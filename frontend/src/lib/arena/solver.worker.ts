import { makeTrace, type PuzzleConfig, type SolverId } from './solvers';
self.onmessage=(event:MessageEvent<PuzzleConfig>)=>{try{const traces=(['exact','heuristic','annealing'] as SolverId[]).map(id=>makeTrace(event.data,id));self.postMessage({traces});}catch(error){self.postMessage({error:error instanceof Error?error.message:'Search failed'});}};
