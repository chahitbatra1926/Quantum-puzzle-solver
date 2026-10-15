import math
import time
import dimod
import neal
import numpy as np
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit.circuit.library import QAOAAnsatz
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.converters import QuadraticProgramToQubo
import warnings
warnings.filterwarnings('ignore', category=Warning)

class QiskitSudokuQuantumEngine:
    def __init__(self, board=None):
        # 4x4 Mini-Sudoku with 11 clues (5 empty cells)
        if board is None:
            self.board = [
                [1, 2, 3, 4],
                [3, 4, 0, 0],
                [2, 0, 4, 1],
                [0, 1, 2, 0]
            ]
            self.n = 4
            self.sub = 2
        else:
            self.board = board
            self.n = len(board)
            self.sub = int(math.sqrt(self.n))

    # --- 1. BRUTE FORCE (Exact Search) ---
    def solve_brute_force(self):
        start_time = time.perf_counter()
        board_copy = [row[:] for row in self.board]

        def is_valid(board, r, c, k):
            for i in range(self.n):
                if board[r][i] == k or board[i][c] == k: return False
            br, bc = (r // self.sub) * self.sub, (c // self.sub) * self.sub
            for i in range(self.sub):
                for j in range(self.sub):
                    if board[br + i][bc + j] == k: return False
            return True

        def backtrack(board):
            for r in range(self.n):
                for c in range(self.n):
                    if board[r][c] == 0:
                        for k in range(1, self.n + 1):
                            if is_valid(board, r, c, k):
                                board[r][c] = k
                                if backtrack(board): return True
                                board[r][c] = 0
                        return False
            return True

        backtrack(board_copy)
        end_time = time.perf_counter()
        
        return {
            "method": "Brute Force",
            "time_ms": (end_time - start_time) * 1000,
            "solution": board_copy
        }

    # --- 2. GREEDY HEURISTIC ---
    def solve_heuristic(self):
        start_time = time.perf_counter()
        board_copy = [row[:] for row in self.board]

        def get_candidates(board, r, c):
            used = set(board[r]) | set(board[i][c] for i in range(self.n))
            br, bc = (r // self.sub) * self.sub, (c // self.sub) * self.sub
            used |= set(board[br+i][bc+j] for i in range(self.sub) for j in range(self.sub))
            return [v for v in range(1, self.n + 1) if v not in used]

        def greedy_search(board):
            min_cands = self.n + 1
            best_cell = None
            cands_for_best = []
            
            for r in range(self.n):
                for c in range(self.n):
                    if board[r][c] == 0:
                        cands = get_candidates(board, r, c)
                        if len(cands) < min_cands:
                            min_cands = len(cands)
                            best_cell = (r, c)
                            cands_for_best = cands
                            
            if best_cell is None: return True
            
            r, c = best_cell
            for k in cands_for_best:
                board[r][c] = k
                if greedy_search(board): return True
                board[r][c] = 0
            return False

        greedy_search(board_copy)
        end_time = time.perf_counter()
        
        return {
            "method": "Greedy Heuristic",
            "time_ms": (end_time - start_time) * 1000,
            "solution": board_copy
        }

    # --- QUBO BUILDER UTILITIES ---
    def _get_qaoa_candidates(self, r, c):
        if self.board[r][c] != 0: return []
        used = set(self.board[r]) | set(self.board[i][c] for i in range(self.n))
        br, bc = (r // self.sub) * self.sub, (c // self.sub) * self.sub
        used |= set(self.board[br+i][bc+j] for i in range(self.sub) for j in range(self.sub))
        return [v for v in range(1, self.n + 1) if v not in used]

    def _build_qubo_model(self):
        qp = QuadraticProgram(name="Sudoku_QAOA_Pruned")
        var_map, rev_var_map, var_counter = {}, {}, 0
        cell_candidates = {}
        
        for r in range(self.n):
            for c in range(self.n):
                if self.board[r][c] == 0:
                    cands = self._get_qaoa_candidates(r, c)
                    cell_candidates[(r, c)] = cands
                    for v in cands:
                        var_name = f"x_{r}_{c}_{v}"
                        qp.binary_var(var_name)
                        var_map[(r, c, v)] = var_name
                        rev_var_map[var_counter] = (r, c, v)
                        var_counter += 1

        P = 10.0
        linear, quadratic = {}, {}

        for (r, c), cands in cell_candidates.items():
            cell_vars = [var_map[(r, c, v)] for v in cands]
            for v_var in cell_vars: linear[v_var] = linear.get(v_var, 0) - P
            for i in range(len(cell_vars)):
                for j in range(i + 1, len(cell_vars)):
                    pair = (cell_vars[i], cell_vars[j])
                    quadratic[pair] = quadratic.get(pair, 0) + 2 * P

        for r in range(self.n):
            for v in range(1, self.n + 1):
                row_vars = [var_map[(r, c, v)] for c in range(self.n) if (r, c, v) in var_map]
                for i in range(len(row_vars)):
                    for j in range(i + 1, len(row_vars)):
                        pair = (row_vars[i], row_vars[j])
                        quadratic[pair] = quadratic.get(pair, 0) + 2 * P

        for c in range(self.n):
            for v in range(1, self.n + 1):
                col_vars = [var_map[(r, c, v)] for r in range(self.n) if (r, c, v) in var_map]
                for i in range(len(col_vars)):
                    for j in range(i + 1, len(col_vars)):
                        pair = (col_vars[i], col_vars[j])
                        quadratic[pair] = quadratic.get(pair, 0) + 2 * P

        qp.minimize(linear=linear, quadratic=quadratic)
        return qp, var_map, rev_var_map

    # --- 3. QUANTUM INSPIRED (D-Wave Neal) ---
    def solve_neal_annealing(self):
        start_time = time.perf_counter()
        
        qp, var_map, rev_var_map = self._build_qubo_model()
        num_qubits = qp.get_num_binary_vars()
        
        if num_qubits == 0:
            return {"method": "D-Wave Neal", "time_ms": 0, "solution": self.board, "energy": 0}

        linear_dict = {qp.variables[idx].name: coef for idx, coef in qp.objective.linear.to_dict().items()}
        quad_dict = {(qp.variables[idx1].name, qp.variables[idx2].name): coef for (idx1, idx2), coef in qp.objective.quadratic.to_dict().items()}
        
        bqm = dimod.BinaryQuadraticModel(linear_dict, quad_dict, qp.objective.constant, dimod.BINARY)
        
        sampler = neal.SimulatedAnnealingSampler()
        sampleset = sampler.sample(bqm, num_reads=10)
        best_sample = sampleset.first.sample
        
        solution_board = [row[:] for row in self.board]
        for var_name, bit_val in best_sample.items():
            if bit_val == 1:
                for (r, c, v), name in var_map.items():
                    if name == var_name:
                        solution_board[r][c] = v
                        
        end_time = time.perf_counter()
        
        return {
            "method": "D-Wave Neal Simulated Annealing",
            "time_ms": (end_time - start_time) * 1000,
            "solution": solution_board,
            "energy": sampleset.first.energy
        }

    # --- 4. IBM QPU CLOUD EXECUTION ---
    def submit_qaoa_to_ibm(self, api_key):
        print("\n--- Initiating IBM QPU Cloud Execution ---")
        service = QiskitRuntimeService(channel="ibm_quantum_platform", token=api_key)
        backend = service.least_busy(operational=True, simulator=False)
        
        qp, var_map, rev_var_map = self._build_qubo_model()
        num_qubits = qp.get_num_binary_vars()
        
        if num_qubits == 0:
            print("Board is already solved or invalid.")
            return

        qubo = QuadraticProgramToQubo().convert(qp)
        qubit_op, offset = qubo.to_ising()
        ansatz = QAOAAnsatz(qubit_op, reps=1)
        bound_circuit = ansatz.assign_parameters([0.5, 0.5]) 
        bound_circuit.measure_all()
        
        pm = generate_preset_pass_manager(optimization_level=1, backend=backend)
        isa_circuit = pm.run(bound_circuit)
        
        sampler = Sampler(mode=backend)
        job = sampler.run([isa_circuit])
        print(f"Job ID: {job.job_id()}")
        return job.job_id()

if __name__ == "__main__":
    # Test block to verify it runs standalone
    engine = QiskitSudokuQuantumEngine()
    print("Testing Neal:", engine.solve_neal_annealing()["time_ms"], "ms")