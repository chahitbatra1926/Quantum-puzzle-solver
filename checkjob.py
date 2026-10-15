from qiskit_ibm_runtime import QiskitRuntimeService

# 1. Authenticate again
API_KEY = ""
service = QiskitRuntimeService(channel="ibm_quantum_platform", token=API_KEY)

# 2. Retrieve your specific job from the cloud using the ID from your screenshot
job = service.job("db7n5reil99s73fog2v0")

# 3. Check its current status
print(f"Current Job Status: {job.status()}")

# 4. If it is done, print the raw quantum measurements
if str(job.status()) == "DONE":
    print("\n--- Final Qubit Measurements ---")
    print(job.result())
else:
    print("Job is still processing or in queue. Try again later.")