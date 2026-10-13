#include <iostream>
#include <vector>
#include <cmath>
#include <cstdlib>
#include <ctime>
#include <chrono>
#include <string>

struct SolverResult {
    std::vector<int> board;
    int steps;
    double time_ms;
    int final_energy;
};

// ---------------------------------------------------------
// 1. CLASSICAL BRUTE FORCE (Recursive Backtracking)
// ---------------------------------------------------------
bool is_safe(const std::vector<int>& board, int row, int col, int N, int& steps) {
    steps++;
    for (int c = 0; c < col; ++c) {
        int r = board[c];
        if (r == row || std::abs(r - row) == std::abs(c - col)) return false;
    }
    return true;
}

bool solve_bq_util(std::vector<int>& board, int col, int N, int& steps) {
    if (col >= N) return true;
    for (int i = 0; i < N; ++i) {
        if (is_safe(board, i, col, N, steps)) {
            board[col] = i;
            if (solve_bq_util(board, col + 1, N, steps)) return true;
        }
    }
    return false;
}

SolverResult solve_nqueens_bruteforce(int N) {
    auto start_time = std::chrono::high_resolution_clock::now();
    std::vector<int> col_placements(N, -1);
    int steps = 0;
    
    solve_bq_util(col_placements, 0, N, steps);
    
    std::vector<int> flat_board(N * N, 0);
    for(int c = 0; c < N; ++c) {
        if(col_placements[c] != -1) flat_board[col_placements[c] * N + c] = 1;
    }
    
    auto end_time = std::chrono::high_resolution_clock::now();
    double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
    return {flat_board, steps, elapsed, 0};
}

// ---------------------------------------------------------
// 2. GREEDY HEURISTIC (Min-Conflicts with Random Restarts)
// ---------------------------------------------------------
int get_conflicts(const std::vector<int>& cols, int c, int r, int N) {
    int conflicts = 0;
    for (int i = 0; i < N; ++i) {
        if (i == c) continue;
        if (cols[i] == r || std::abs(cols[i] - r) == std::abs(i - c)) conflicts++;
    }
    return conflicts;
}

SolverResult solve_nqueens_heuristic(int N) {
    auto start_time = std::chrono::high_resolution_clock::now();
    std::vector<int> cols(N);
    int total_steps = 0;

    // Multi-start wrapper to escape deep deadlocks
    while (true) {
        for (int i = 0; i < N; ++i) cols[i] = std::rand() % N;
        int steps = 0;
        int max_steps = 2000;
        bool solved = false;
        
        while (steps < max_steps) {
            steps++;
            total_steps++;
            int max_c = -1, max_conflicts = 0;
            
            for (int i = 0; i < N; ++i) {
                int c_conf = get_conflicts(cols, i, cols[i], N);
                if (c_conf > max_conflicts) { max_conflicts = c_conf; max_c = i; }
            }
            if (max_conflicts == 0) { solved = true; break; }
            
            int min_conflicts_found = N + 1;
            std::vector<int> best_rows;
            
            // Random tie-breaking is mandatory to prevent getting stuck
            for (int r = 0; r < N; ++r) {
                int c_conf = get_conflicts(cols, max_c, r, N);
                if (c_conf < min_conflicts_found) {
                    min_conflicts_found = c_conf;
                    best_rows.clear();
                    best_rows.push_back(r);
                } else if (c_conf == min_conflicts_found) {
                    best_rows.push_back(r);
                }
            }
            cols[max_c] = best_rows[std::rand() % best_rows.size()];
        }
        if (solved) break;
    }

    std::vector<int> flat_board(N * N, 0);
    for(int i = 0; i < N; ++i) flat_board[cols[i] * N + i] = 1;
    
    auto end_time = std::chrono::high_resolution_clock::now();
    double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
    return {flat_board, total_steps, elapsed, 0};
}

// ---------------------------------------------------------
// 3. QUANTUM QUBO (Discrete Quadratic Model Annealing)
// ---------------------------------------------------------
// ---------------------------------------------------------
// 3. QUANTUM QUBO (Discrete Quadratic Model Annealing)
// ---------------------------------------------------------
SolverResult solve_nqueens_qubo(int N) {
    auto start_time = std::chrono::high_resolution_clock::now();
    int K = N * N;
    
    std::vector<std::vector<int>> Q(K, std::vector<int>(K, 0));
    for (int i = 0; i < K; ++i) {
        int r1 = i / N, c1 = i % N;
        for (int j = i + 1; j < K; ++j) {
            int r2 = j / N, c2 = j % N;
            if (c1 == c2) {
                Q[i][j] += 10; Q[j][i] += 10;
            } else if (std::abs(r1 - r2) == std::abs(c1 - c2)) {
                Q[i][j] += 2;  Q[j][i] += 2;
            }
        }
    }

    int total_steps = 0;
    std::vector<int> queens(N); 
    std::vector<int> best_board(K, 0);
    int best_energy = 999999;
    
    while (true) {
        for (int r = 0; r < N; ++r) queens[r] = std::rand() % N;
        
        int current_energy = 0;
        for(int r1 = 0; r1 < N; ++r1) {
            for(int r2 = r1 + 1; r2 < N; ++r2) {
                current_energy += Q[r1 * N + queens[r1]][r2 * N + queens[r2]];
            }
        }
        
        // Increased temp and slower cooling for complex N>10 boards
        double temp = 40.0; 
        double cooling_rate = 0.999;
        int step = 0;
        int max_inner_steps = (N > 12) ? 50000 : 20000;
        
        while (step < max_inner_steps && current_energy > 0) {
            step++;
            total_steps++;
            
            int r = std::rand() % N;
            int old_c = queens[r];
            int new_c = std::rand() % N;
            if (old_c == new_c) continue;
            
            int delta_e = 0;
            int old_i = r * N + old_c, new_i = r * N + new_c;
            
            for(int other_r = 0; other_r < N; ++other_r) {
                if(other_r == r) continue;
                int other_i = other_r * N + queens[other_r];
                delta_e -= Q[old_i][other_i];
                delta_e += Q[new_i][other_i];
            }
            
            if (delta_e <= 0 || ((double)std::rand() / RAND_MAX) < std::exp(-delta_e / temp)) {
                queens[r] = new_c;
                current_energy += delta_e;
            }
            temp *= cooling_rate;
        }
        
        // Track the best state found in case we run out of time
        if (current_energy < best_energy) {
            best_energy = current_energy;
            best_board.assign(K, 0);
            for(int r = 0; r < N; ++r) best_board[r * N + queens[r]] = 1;
        }

        if (current_energy == 0) {
            auto end_time = std::chrono::high_resolution_clock::now();
            double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
            return {best_board, total_steps, elapsed, 0};
        }

        // C++ Fail-Safe: Exit at 4.5 seconds to beat the Python 5-second guillotine
        auto current_time = std::chrono::high_resolution_clock::now();
        if (std::chrono::duration<double, std::milli>(current_time - start_time).count() > 4500) {
            auto end_time = std::chrono::high_resolution_clock::now();
            double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
            return {best_board, total_steps, elapsed, best_energy};
        }
    }
}

// ---------------------------------------------------------
// ENTRY POINT
// ---------------------------------------------------------
int main(int argc, char* argv[]) {
    std::srand(static_cast<unsigned int>(std::time(nullptr)));
    int N = (argc > 1) ? std::atoi(argv[1]) : 8;
    std::string algo = (argc > 2) ? argv[2] : "quantum";

    SolverResult res;
    if (algo == "bruteforce") res = solve_nqueens_bruteforce(N);
    else if (algo == "heuristic") res = solve_nqueens_heuristic(N);
    else res = solve_nqueens_qubo(N);

    std::cout << "{\"n\":" << N << ",\"algo\":\"" << algo 
              << "\",\"steps\":" << res.steps << ",\"time_ms\":" << res.time_ms 
              << ",\"final_energy\":" << res.final_energy << ",\"board\":[";
    for (size_t i = 0; i < res.board.size(); ++i) {
        std::cout << res.board[i] << (i + 1 < res.board.size() ? "," : "");
    }
    std::cout << "]}" << std::endl;
    return 0;
}