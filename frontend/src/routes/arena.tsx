import { createFileRoute } from '@tanstack/react-router';
import { ArenaPage } from '@/components/arena/arena-page';
import { pageMeta } from '@/lib/arena/meta';
export const Route=createFileRoute('/arena')({validateSearch:(search:{puzzle?:unknown;size?:unknown;seed?:unknown})=>({puzzle:search.puzzle==='knapsack'?'knapsack' as const:'queens' as const,size:Math.max(4,Math.min(12,Number(search.size)||8)),seed:Math.max(1,Math.min(999999,Number(search.seed)||19472))}),head:()=>pageMeta('Solver arena','Race exact search, classical heuristics, and simulated annealing on a shared seeded N-Queens or Knapsack puzzle.'),component:Arena});
function Arena(){const {puzzle,size,seed}=Route.useSearch();return <ArenaPage key={`${puzzle}-${size}-${seed}`} puzzle={puzzle} initialSize={size} initialSeed={seed}/>;}
