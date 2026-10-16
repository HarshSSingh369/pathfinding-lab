# Pathfinding Lab

An interactive pathfinding visualizer built with HTML, CSS, and JavaScript.
Draw walls and weighted cells, then watch Breadth-First Search, Dijkstra's
Algorithm, or A* explore the grid and reconstruct a route.

## Features

- Compare BFS, Dijkstra, and A* on the same 25 × 45 grid.
- Draw or erase walls and weighted cells by dragging across the board.
- Move the start and goal markers by dragging them.
- Generate random walls or clear the board.
- Adjust the animation speed.
- Review explored-node count, path length, path cost, and search time.
- Use a custom binary min-heap for Dijkstra and A* priority queues.
- Responsive layout and reduced-motion styling.
- No build step, package manager, or third-party JavaScript dependency.

## Run locally

You can open `index.html` directly in a modern browser. For a local web server,
open a terminal in the project folder and run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy with GitHub Pages

1. Push the project to a GitHub repository.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.

GitHub Pages will publish the static site and show its URL in the Pages settings.

## Algorithms

### Breadth-First Search (BFS)

BFS uses a first-in-first-out queue and expands in layers. It finds a path with
the fewest moves when each move has equal cost. It intentionally ignores the
extra cost on weighted cells.

### Dijkstra's Algorithm

Dijkstra uses a min-heap to expand the node with the lowest known route cost.
Moving to a normal cell costs 1; moving to a weighted cell costs 6. With
non-negative cell costs, it finds a minimum-cost route.

### A* Search

A* prioritizes `known route cost + Manhattan distance to the goal`. The
Manhattan heuristic is admissible here because every move costs at least 1 and
movement is limited to four directions. A* therefore finds a minimum-cost
route while often exploring fewer cells than Dijkstra.

Walls cannot be crossed. The start and goal markers can be dragged to any open
cell. The search time metric measures the algorithm's synchronous computation;
the subsequent animation is not included.

## Project structure

```text
pathfinding-lab/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Ideas to extend

- Add diagonal movement and compare admissible heuristics.
- Add a maze generator and board import/export.
- Add step-through controls and a frontier visualization.
- Add automated checks for path validity, weights, and unreachable goals.
