import { createContext, useContext, useState, type ReactNode } from 'react';
export type RunRecord = { puzzle: string; solver: string; correct: boolean; iterations: number; seed: number };
const ProgressContext = createContext<{ runs: RunRecord[]; addRun: (run: RunRecord) => void }>({ runs: [], addRun: () => {} });
export function ProgressProvider({ children }: { children: ReactNode }) { const [runs,setRuns] = useState<RunRecord[]>([]); return <ProgressContext.Provider value={{ runs, addRun: (run) => setRuns(old => [run,...old]) }}>{children}</ProgressContext.Provider>; }
export const useProgress = () => useContext(ProgressContext);
