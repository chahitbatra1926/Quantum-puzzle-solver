#include <iostream>
#include <vector>
#include <cmath>
#include <algorithm>
#include <chrono>
#include <random>

using namespace std;
using namespace std::chrono;

struct Item {
    int index;
    double weight;
    double value;
    double ratio;
};

// Global variables for telemetry
long long total_steps = 0;

// 1. Classical Brute Force (Exact Search)
// Evaluates all 2^N possible combinations using bitmasking.
vector<int> solve_bruteforce(const vector<Item>& items, double capacity) {
    int n = items.size();
    long long max_combinations = 1LL << n;
    
    double best_value = 0;
    vector<int> best_selection(n, 0);

    for (long long mask = 0; mask < max_combinations; ++mask) {
        total_steps++; // Increment step for every combination checked
        
        double current_weight = 0;
        double current_value = 0;
        vector<int> current_selection(n, 0);

        for (int i = 0; i < n; ++i) {
            if (mask & (1LL << i)) {
                current_weight += items[i].weight;
                current_value += items[i].value;
                current_selection[i] = 1;
            }
        }

        if (current_weight <= capacity && current_value > best_value) {
            best_value = current_value;
            best_selection = current_selection;
        }
    }
    return best_selection;
}

// 2. Greedy Heuristic
// Sorts items by value-to-weight ratio and picks the best until full.
vector<int> solve_heuristic(vector<Item> items, double capacity) {
    int n = items.size();
    vector<int> selection(n, 0);
    
    // Sort by highest value-to-weight ratio
    sort(items.begin(), items.end(), [](const Item& a, const Item& b) {
        return a.ratio > b.ratio;
    });

    double current_weight = 0;
    
    for (int i = 0; i < n; ++i) {
        total_steps++; // Increment step for every item evaluated
        
        if (current_weight + items[i].weight <= capacity) {
            current_weight += items[i].weight;
            selection[items[i].index] = 1; // Map back to original index
        }
    }
    return selection;
}

// 3. Quantum-Inspired Simulated Annealing (QUBO approach)
// Maps the constraints to an energy function and minimizes it via thermodynamics.
vector<int> solve_qubo_annealing(const vector<Item>& items, double capacity) {
    int n = items.size();
    vector<int> current_state(n, 0);
    vector<int> best_state = current_state;
    
    double best_energy = 1e9;
    double penalty_factor = 1000.0; // Massive penalty for exceeding capacity
    
    double temperature = 1000.0;
    double cooling_rate = 0.999;
    
    mt19937 rng(42); // Fixed seed for reproducible hackathon demos
    uniform_real_distribution<double> prob(0.0, 1.0);
    uniform_int_distribution<int> random_bit(0, n - 1);

    // Energy calculation lambda
    auto calculate_energy = [&](const vector<int>& state) {
        double total_val = 0;
        double total_wt = 0;
        for (int i = 0; i < n; ++i) {
            if (state[i]) {
                total_val += items[i].value;
                total_wt += items[i].weight;
            }
        }
        // Energy = -Value + Penalty(if weight > capacity)
        double energy = -total_val;
        if (total_wt > capacity) {
            energy += penalty_factor * (total_wt - capacity); 
        }
        return energy;
    };

    double current_energy = calculate_energy(current_state);

    while (temperature > 0.01) {
        total_steps++;
        
        // Flip one random item (0 to 1, or 1 to 0)
        int flip_idx = random_bit(rng);
        vector<int> new_state = current_state;
        new_state[flip_idx] = 1 - new_state[flip_idx];
        
        double new_energy = calculate_energy(new_state);
        
        // Accept if better, or accept worse state based on thermodynamic probability
        if (new_energy < current_energy || prob(rng) < exp((current_energy - new_energy) / temperature)) {
            current_state = new_state;
            current_energy = new_energy;
            
            if (current_energy < best_energy) {
                best_energy = current_energy;
                best_state = current_state;
            }
        }
        temperature *= cooling_rate;
    }
    
    // Ensure the final best state doesn't violate hard constraints (cleanup step)
    double final_wt = 0;
    for(int i=0; i<n; i++) if(best_state[i]) final_wt += items[i].weight;
    while(final_wt > capacity) {
        // Randomly drop an item to force validity if trapped in a local minimum
        int drop = random_bit(rng);
        if(best_state[drop]) {
            best_state[drop] = 0;
            final_wt -= items[drop].weight;
        }
    }

    return best_state;
}
int main(int argc, char* argv[]) {
    // 1. Check if Python sent the right arguments
    if (argc < 3) {
        cout << "{\"error\": \"Missing arguments. Usage: ./knapsack <algo> <capacity>\"}" << endl;
        return 1;
    }

    string algo = argv[1];
    double capacity = stod(argv[2]);

    // 2. Define a standard set of 8 items to match the frontend demo
    // 2. Define a standard set of 8 items to match the frontend demo EXACTLY
    vector<Item> items = {
        {0, 4.0, 12.0, 12.0/4.0}, // Crystal
        {1, 7.0, 18.0, 18.0/7.0}, // Core
        {2, 3.0, 8.0,  8.0/3.0},  // Prism
        {3, 6.0, 15.0, 15.0/6.0}, // Beacon
        {4, 2.0, 7.0,  7.0/2.0},  // Chip
        {5, 5.0, 11.0, 11.0/5.0}, // Alloy
        {6, 4.0, 10.0, 10.0/4.0}, // Lens
        {7, 8.0, 20.0, 20.0/8.0}  // Relic
    };

    vector<int> result;
    total_steps = 0; // Reset global telemetry

    // 3. Start the timer
    auto start_time = high_resolution_clock::now();

    // 4. Route to the correct solver
    if (algo == "bruteforce") {
        result = solve_bruteforce(items, capacity);
    } else if (algo == "heuristic") {
        result = solve_heuristic(items, capacity);
    } else if (algo == "quantum") {
        result = solve_qubo_annealing(items, capacity);
    } else {
        cout << "{\"error\": \"Unknown algorithm\"}" << endl;
        return 1;
    }

    // 5. Stop the timer
    auto end_time = high_resolution_clock::now();
    double time_ms = duration<double, std::milli>(end_time - start_time).count();

    // 6. Output the JSON payload for Python to read
    cout << "{";
    cout << "\"algo\": \"" << algo << "\", ";
    cout << "\"capacity\": " << capacity << ", ";
    cout << "\"steps\": " << total_steps << ", ";
    cout << "\"time_ms\": " << time_ms << ", ";
    cout << "\"selection\": [";
    for (size_t i = 0; i < result.size(); ++i) {
        cout << result[i] << (i == result.size() - 1 ? "" : ",");
    }
    cout << "]}" << endl;

    return 0;
}