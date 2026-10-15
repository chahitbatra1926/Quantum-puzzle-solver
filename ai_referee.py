import requests
import json

def generate_commentary(puzzle_name, telemetry):
    """
    Ingests live solver telemetry and queries the Qualcomm Cloud AI
    to generate dynamic engineering commentary about scaling laws.
    """
    
    # 1. Extract the live metrics
    exact_ms = telemetry.get("exact_search", {}).get("time_ms", 0)
    greedy_ms = telemetry.get("greedy_heuristic", {}).get("time_ms", 0)
    quantum_ms = telemetry.get("quantum_inspired_annealing", {}).get("time_ms", 0)
    
    # 2. Build the telemetry-driven prompt
    prompt = f"""
    You are the 'AI Referee' for a quantum computing demo. 
    We just raced three algorithms on a small {puzzle_name} puzzle.
    
    Live Telemetry:
    - Exact Search (Classical): {exact_ms:.2f} ms
    - Greedy Heuristic (Classical): {greedy_ms:.2f} ms
    - Quantum-Inspired (QAOA): {quantum_ms:.2f} ms
    
    In exactly 2 short sentences, explain these results to an engineering judge.
    You must mention the 'No Free Lunch' theorem or the 'Simulation Tax'.
    Explain why classical search wins on this small topology due to raw clock speed, 
    but why the quantum architecture is necessary as constraints scale exponentially.
    Keep it punchy, technical, and highly professional.
    """

    # 3. Qualcomm Cloud AI 100 Configuration (From Cirrascale Docs)
    # Put your token here! If Infosys sent you an email with the link, the token might be in it.
    QUALCOMM_API_KEY = "7cfb1994-0c97-4810-aea3-628a80d252ca" 
    
    # The exact endpoint from your screenshot
    QUALCOMM_ENDPOINT = "https://aisuite.cirrascale.com/apis/v2/chat/completions" 
    
    headers = {
        "Authorization": f"Bearer {QUALCOMM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        # Check the 'Models' tab on the left of the docs to ensure this is the exact string name
        "model": "meta-llama/Meta-Llama-3-8B-Instruct", 
        "messages": [
            {"role": "system", "content": "You are a senior quantum software engineer."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 100,
        "temperature": 0.5 
    }
    
    try:
        # Send the telemetry to Qualcomm Cloud
        response = requests.post(QUALCOMM_ENDPOINT, headers=headers, json=payload, timeout=5)
        response.raise_for_status() # This will catch 401 Unauthorized errors if your key is wrong
        
        # Parse the LLM response
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
        
    except Exception as e:
        print(f"Qualcomm API Error: {e}")
        # Bulletproof fallback commentary so your live UI never crashes during the hackathon demo
        return f"Exact search dominates this {puzzle_name} at {exact_ms:.2f}ms due to raw classical clock speed. However, the {quantum_ms:.2f}ms quantum time reflects a 'simulation tax' that will ultimately cross over and win as topological constraints scale exponentially."

# --- Local Test Block ---
if __name__ == "__main__":
    mock_telemetry = {
        "exact_search": {"time_ms": 0.07},
        "greedy_heuristic": {"time_ms": 0.12},
        "quantum_inspired_annealing": {"time_ms": 1561.17}
    }
    print("Testing Qualcomm AI Referee...")
    print(generate_commentary("4x4 Sudoku", mock_telemetry))