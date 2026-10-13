from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit.circuit.library import QAOAAnsatz
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.converters import QuadraticProgramToQubo

# 1. Authenticate (Make sure to paste your actual API key!)
API_KEY = ""
service = QiskitRuntimeService(channel="ibm_quantum_platform", token=API_KEY)
backend = service.least_busy(operational=True, simulator=False)
print(f"Authenticated. Target QPU: {backend.name}")

# 2. Build the 4x4 N-Queens Matrix (16 Qubits)
print("Building 4x4 N-Queens constraints...")
qp = QuadraticProgram()
n = 4

for i in range(n):
    for j in range(n):
        qp.binary_var(f"x_{i}_{j}")
        
for i in range(n):
    qp.linear_constraint(linear={f"x_{i}_{j}": 1 for j in range(n)}, sense="==", rhs=1, name=f"row_{i}")
    qp.linear_constraint(linear={f"x_{j}_{i}": 1 for j in range(n)}, sense="==", rhs=1, name=f"col_{i}")
    
for d in range(-n+1, n):
    diag1 = {f"x_{i}_{i-d}": 1 for i in range(max(0, d), min(n, n+d))}
    if len(diag1) > 1:
        qp.linear_constraint(linear=diag1, sense="<=", rhs=1, name=f"diag1_{d}")
        
    diag2 = {f"x_{i}_{n-1-i-d}": 1 for i in range(max(0, -d), min(n, n-d))}
    if len(diag2) > 1:
        qp.linear_constraint(linear=diag2, sense="<=", rhs=1, name=f"diag2_{d}")

qubo = QuadraticProgramToQubo().convert(qp)
qubit_op, offset = qubo.to_ising()

# 3. Extract the Raw QAOA Quantum Circuit
print("Generating QAOA Quantum Circuit...")
ansatz = QAOAAnsatz(qubit_op, reps=1)

# Bind arbitrary beta/gamma angles to lock the circuit for execution
bound_circuit = ansatz.assign_parameters([0.5, 0.5]) 
bound_circuit.measure_all() # Add measurement gates to collapse the qubits

# 4. Transpile specifically for the physical QPU (Fixes the topology errors)
print(f"Transpiling circuit for {backend.name}'s heavy-hex layout...")
pm = generate_preset_pass_manager(optimization_level=1, backend=backend)
isa_circuit = pm.run(bound_circuit)

# 5. Submit directly to SamplerV2
print("Submitting transpiled N-Queens circuit to IBM Cloud Queue...")
sampler = Sampler(mode=backend)

# Send the physical circuit to the hardware
job = sampler.run([isa_circuit])

print(f"\n--- SUCCESS: JOB QUEUED ---")
print(f"Job ID: {job.job_id()}")
print("Go check your IBM Quantum Dashboard. A real QPU is processing your N-Queens circuit!")