from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import time
import dimod
import neal

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class SolveRequest(BaseModel):
    puzzle: str = "queens"
    n: int = 8 
    algo: str

# 8-item Knapsack Dataset (Perfectly matches your UI and C++)
KNAPSACK_ITEMS = [
    {"weight": 4, "value": 12}, # Crystal
    {"weight": 7, "value": 18}, # Core
    {"weight": 3, "value": 8},  # Prism
    {"weight": 6, "value": 15}, # Beacon
    {"weight": 2, "value": 7},  # Chip
    {"weight": 5, "value": 11}, # Alloy
    {"weight": 4, "value": 10}, # Lens
    {"weight": 8, "value": 20}  # Relic
]

@app.post("/api/solve")
async def solve_puzzle(req: SolveRequest):
    try:
        # --- D-Wave Neal Integration ---
        if req.puzzle == "knapsack" and req.algo == "quantum":
            start_time = time.time()
            
            cqm = dimod.ConstrainedQuadraticModel()
            x = [dimod.Binary(i) for i in range(len(KNAPSACK_ITEMS))]
            
            # Objective: Maximize Value 
            cqm.set_objective(-sum(KNAPSACK_ITEMS[i]['value'] * x[i] for i in range(len(KNAPSACK_ITEMS))))
            
            # Constraint: Do not exceed capacity
            cqm.add_constraint(sum(KNAPSACK_ITEMS[i]['weight'] * x[i] for i in range(len(KNAPSACK_ITEMS))) <= req.n, label='capacity')
            
            # Convert to BQM and let Neal solve the matrix
            bqm, invert = dimod.cqm_to_bqm(cqm, lagrange_multiplier=100)
            sampler = neal.SimulatedAnnealingSampler()
            sampleset = sampler.sample(bqm, num_reads=100)
            best_sample = sampleset.first.sample
            
            # Format the output array for Lovable React
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
        print(f"API Error: {str(e)}") # This will show us the exact error in the terminal if it fails again
        raise HTTPException(status_code=500, detail=str(e))