from fastapi import FastAPI, HTTPException
from ai_referee import generate_commentary
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import json
import time
import dimod
import neal
from qiskit_sudoku_engine import QiskitSudokuQuantumEngine

app = FastAPI()

# CRITICAL: Middleware must be at the very top, immediately after app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/solve/sudoku")
async def race_sudoku_solvers():
    # Initialize the 4x4 Sudoku board
    engine = QiskitSudokuQuantumEngine()
    
    # 1. Run the instant local solvers for the live UI Race
    bf_res = engine.solve_brute_force()
    heur_res = engine.solve_heuristic()
    neal_res = engine.solve_neal_annealing()
    # ... your existing exact, greedy, and neal solver code ...

    # Package the telemetry
    telemetry_data = {
        "exact_search": {"time_ms": bf_res["time_ms"], "solution": bf_res["solution"]},
        "greedy_heuristic": {"time_ms": heur_res["time_ms"], "solution": heur_res["solution"]},
        "quantum_inspired_annealing": {"time_ms": neal_res["time_ms"], "solution": neal_res["solution"], "energy": neal_res.get("energy", 0)}
    }

    # Generate dynamic Qualcomm AI commentary
    ai_commentary = generate_commentary("4x4 Sudoku", telemetry_data)

    return {
        "status": "success",
        "puzzle": "sudoku_4x4",
        "telemetry": telemetry_data,
        "ai_referee_commentary": ai_commentary # Sent directly to React!
    }
    
    # 2. Package the telemetry into JSON for React to consume
    return {
        "status": "success",
        "puzzle": "sudoku_4x4",
        "telemetry": {
            "exact_search": {
                "time_ms": bf_res["time_ms"],
                "solution": bf_res["solution"]
            },
            "greedy_heuristic": {
                "time_ms": heur_res["time_ms"],
                "solution": heur_res["solution"]
            },
            "quantum_inspired_annealing": {
                "time_ms": neal_res["time_ms"],
                "solution": neal_res["solution"],
                "energy": neal_res.get("energy", 0)
            }
        }
    }

class SolveRequest(BaseModel):
    puzzle: str = "queens"
    n: int = 8 
    algo: str
    

# 8-item Knapsack Dataset
KNAPSACK_ITEMS = [
    {"weight": 4, "value": 12},
    {"weight": 7, "value": 18},
    {"weight": 3, "value": 8}, 
    {"weight": 6, "value": 15},
    {"weight": 2, "value": 7}, 
    {"weight": 5, "value": 11},
    {"weight": 4, "value": 10},
    {"weight": 8, "value": 20} 
]

@app.post("/api/solve")
async def solve_puzzle(req: SolveRequest):
    try:
        # --- D-Wave Neal Integration ---
        if req.puzzle == "knapsack" and req.algo == "quantum":
            start_time = time.time()
            
            cqm = dimod.ConstrainedQuadraticModel()
            x = [dimod.Binary(i) for i in range(len(KNAPSACK_ITEMS))]
            
            cqm.set_objective(-sum(KNAPSACK_ITEMS[i]['value'] * x[i] for i in range(len(KNAPSACK_ITEMS))))
            cqm.add_constraint(sum(KNAPSACK_ITEMS[i]['weight'] * x[i] for i in range(len(KNAPSACK_ITEMS))) <= req.n, label='capacity')
            
            bqm, invert = dimod.cqm_to_bqm(cqm, lagrange_multiplier=100)
            sampler = neal.SimulatedAnnealingSampler()
            sampleset = sampler.sample(bqm, num_reads=100)
            best_sample = sampleset.first.sample
            
            board = [int(best_sample[i]) for i in range(len(KNAPSACK_ITEMS))]
            time_ms = int((time.time() - start_time) * 1000)
            
            return {
                "algo": "quantum",
                "capacity": req.n,
                "steps": 100, 
                "time_ms": time_ms,
                "board": board,
                "selection": board
            }

        # --- CLASSICAL ROUTING ---
        if req.puzzle == "queens":
            process = subprocess.run(["./solver", str(req.n), req.algo], capture_output=True, text=True, check=True)
        elif req.puzzle == "knapsack":
            process = subprocess.run(["./knapsack", req.algo, str(req.n)], capture_output=True, text=True, check=True)
        else:
            raise HTTPException(status_code=400, detail="Unknown puzzle")

        data = json.loads(process.stdout)
        if req.puzzle == "knapsack":
            data["board"] = data["selection"] 
        return data

    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="System Overload: Classical Bottleneck Reached")
    except Exception as e:
        print(f"API Error: {str(e)}") 
        raise HTTPException(status_code=500, detail=str(e))