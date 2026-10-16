const ROWS = 25;
const COLS = 45;
const SIZE = ROWS * COLS;
const WALL = 1;
const WEIGHT = 5;

const grid = document.querySelector("#grid");
const algorithmSelect = document.querySelector("#algorithm");
const editModeSelect = document.querySelector("#edit-mode");
const speedInput = document.querySelector("#speed");
const runButton = document.querySelector("#run-button");
const mazeButton = document.querySelector("#maze-button");
const randomButton = document.querySelector("#random-button");
const clearButton = document.querySelector("#clear-button");
const statusText = document.querySelector("#status");
const cells = [];

const board = {
  walls: new Uint8Array(SIZE),
  weights: new Uint8Array(SIZE),
  visited: new Uint8Array(SIZE),
  path: new Uint8Array(SIZE),
  start: 12 * COLS + 7,
  goal: 12 * COLS + 37,
};

let isAnimating = false;
let dragAction = null;

class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }

  push(item) {
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (items[parent].priority <= items[index].priority) break;
      [items[parent], items[index]] = [items[index], items[parent]];
      index = parent;
    }
  }

  pop() {
    if (!this.items.length) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      this.items[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
        if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
        if (smallest === index) break;
        [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
        index = smallest;
      }
    }
    return first;
  }
}

function rowOf(index) { return Math.floor(index / COLS); }
function colOf(index) { return index % COLS; }

function neighbors(index) {
  const row = rowOf(index);
  const col = colOf(index);
  const result = [];
  if (row > 0) result.push(index - COLS);
  if (col < COLS - 1) result.push(index + 1);
  if (row < ROWS - 1) result.push(index + COLS);
  if (col > 0) result.push(index - 1);
  return result;
}

function clearSearchMarks() {
  board.visited.fill(0);
  board.path.fill(0);
  cells.forEach(renderCell);
  setMetric("visited-count", "—");
  setMetric("path-count", "—");
  setMetric("path-cost", "—");
  setMetric("run-time", "—");
}

function renderCell(index) {
  const cell = cells[index];
  if (!cell) return;
  cell.className = "cell";
  if (board.weights[index]) {
    cell.classList.add("weight");
    cell.textContent = String(board.weights[index]);
  } else {
    cell.textContent = "";
  }
  if (board.walls[index]) cell.classList.add("wall");
  if (board.visited[index]) cell.classList.add("visited");
  if (board.path[index]) cell.classList.add("path");
  if (index === board.start) cell.classList.add("start");
  if (index === board.goal) cell.classList.add("goal");
  const role = index === board.start ? "Start" : index === board.goal ? "Goal" :
    board.walls[index] ? "Wall" : board.weights[index] ? `Weight ${board.weights[index]}` : "Open cell";
  cell.setAttribute("aria-label", `${role}, row ${rowOf(index) + 1}, column ${colOf(index) + 1}`);
}

function createGrid() {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < SIZE; index++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.dataset.index = String(index);
    cell.addEventListener("pointerdown", (event) => beginEdit(event, index));
    cell.addEventListener("pointerenter", (event) => continueEdit(event, index));
    cell.addEventListener("contextmenu", (event) => event.preventDefault());
    cells.push(cell);
    fragment.appendChild(cell);
    renderCell(index);
  }
  grid.appendChild(fragment);
  window.addEventListener("pointerup", () => { dragAction = null; });
  window.addEventListener("pointercancel", () => { dragAction = null; });
}

function beginEdit(event, index) {
  if (isAnimating) return;
  event.preventDefault();
  clearSearchMarks();
  if (index === board.start || index === board.goal) {
    dragAction = { kind: index === board.start ? "move-start" : "move-goal" };
    return;
  }
  const mode = editModeSelect.value;
  if (mode === "wall") {
    const next = board.walls[index] ? 0 : WALL;
    dragAction = { kind: "paint-wall", value: next };
    setCell(index, "wall", next);
  } else if (mode === "weight") {
    const next = board.weights[index] ? 0 : WEIGHT;
    dragAction = { kind: "paint-weight", value: next };
    setCell(index, "weight", next);
  } else {
    dragAction = { kind: "erase" };
    eraseCell(index);
  }
}

function continueEdit(event, index) {
  if (!dragAction || isAnimating || event.buttons === 0) return;
  if (dragAction.kind === "move-start" || dragAction.kind === "move-goal") {
    if (board.walls[index] || index === board.start || index === board.goal) return;
    const key = dragAction.kind === "move-start" ? "start" : "goal";
    const oldIndex = board[key];
    board[key] = index;
    renderCell(oldIndex);
    renderCell(index);
    return;
  }
  if (index === board.start || index === board.goal) return;
  if (dragAction.kind === "paint-wall") setCell(index, "wall", dragAction.value);
  else if (dragAction.kind === "paint-weight") setCell(index, "weight", dragAction.value);
  else eraseCell(index);
}

function setCell(index, kind, value) {
  if (kind === "wall") {
    board.walls[index] = value;
    if (value) board.weights[index] = 0;
  } else {
    board.weights[index] = value;
    if (value) board.walls[index] = 0;
  }
  renderCell(index);
}

function eraseCell(index) {
  board.walls[index] = 0;
  board.weights[index] = 0;
  renderCell(index);
}

function reconstructPath(previous, end) {
  if (end !== board.start && previous[end] === -1) return [];
  const path = [];
  let current = end;
  while (current !== -1) {
    path.push(current);
    if (current === board.start) break;
    current = previous[current];
  }
  return path[path.length - 1] === board.start ? path.reverse() : [];
}

function breadthFirstSearch() {
  const previous = new Int32Array(SIZE).fill(-1);
  const distance = new Int32Array(SIZE).fill(-1);
  const seen = new Uint8Array(SIZE);
  const queue = new Int32Array(SIZE);
  let head = 0;
  let tail = 0;
  const explored = [];
  queue[tail++] = board.start;
  seen[board.start] = 1;
  distance[board.start] = 0;

  while (head < tail) {
    const current = queue[head++];
    explored.push(current);
    if (current === board.goal) break;
    for (const next of neighbors(current)) {
      if (seen[next] || board.walls[next]) continue;
      seen[next] = 1;
      previous[next] = current;
      distance[next] = distance[current] + 1;
      queue[tail++] = next;
    }
  }
  return { explored, path: reconstructPath(previous, board.goal), cost: distance[board.goal] };
}

function heuristic(index) {
  return Math.abs(rowOf(index) - rowOf(board.goal)) + Math.abs(colOf(index) - colOf(board.goal));
}

function weightedSearch(useHeuristic) {
  const previous = new Int32Array(SIZE).fill(-1);
  const distance = new Float64Array(SIZE).fill(Infinity);
  const closed = new Uint8Array(SIZE);
  const frontier = new MinHeap();
  const explored = [];
  distance[board.start] = 0;
  frontier.push({ index: board.start, cost: 0, priority: useHeuristic ? heuristic(board.start) : 0 });

  while (frontier.size) {
    const current = frontier.pop();
    const index = current.index;
    if (closed[index] || current.cost !== distance[index]) continue;
    closed[index] = 1;
    explored.push(index);
    if (index === board.goal) break;
    for (const next of neighbors(index)) {
      if (board.walls[next] || closed[next]) continue;
      const nextCost = distance[index] + 1 + board.weights[next];
      if (nextCost >= distance[next]) continue;
      distance[next] = nextCost;
      previous[next] = index;
      const estimate = useHeuristic ? heuristic(next) : 0;
      frontier.push({ index: next, cost: nextCost, priority: nextCost + estimate });
    }
  }
  return { explored, path: reconstructPath(previous, board.goal), cost: distance[board.goal] };
}

function runSelectedSearch() {
  const method = algorithmSelect.value;
  if (method === "bfs") return breadthFirstSearch();
  return weightedSearch(method === "astar");
}

function setMetric(id, value) {
  document.getElementById(id).textContent = value;
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function setBusy(busy) {
  isAnimating = busy;
  runButton.disabled = busy;
  mazeButton.disabled = busy;
  randomButton.disabled = busy;
  clearButton.disabled = busy;
  algorithmSelect.disabled = busy;
  editModeSelect.disabled = busy;
}

async function visualize() {
  if (isAnimating) return;
  clearSearchMarks();
  setBusy(true);
  statusText.textContent = "Searching the grid…";
  const startTime = performance.now();
  const result = runSelectedSearch();
  const elapsed = performance.now() - startTime;
  setMetric("visited-count", result.explored.length.toLocaleString());
  setMetric("run-time", `${elapsed.toFixed(2)} ms`);

  const algorithmName = algorithmSelect.options[algorithmSelect.selectedIndex].text;
  if (!result.path.length) {
    result.explored.forEach((index) => { board.visited[index] = 1; renderCell(index); });
    setMetric("path-count", "None");
    setMetric("path-cost", "—");
    statusText.textContent = "No route found. Clear some walls and try again.";
    setBusy(false);
    return;
  }

  setMetric("path-count", String(result.path.length - 1));
  setMetric("path-cost", result.cost.toLocaleString());
  const delay = () => Math.max(1, 58 - Number(speedInput.value) * 0.56);
  for (const index of result.explored) {
    board.visited[index] = 1;
    renderCell(index);
    await wait(delay());
  }
  for (const index of result.path) {
    board.path[index] = 1;
    renderCell(index);
    await wait(Math.max(1, delay() * 1.4));
  }
  const weightNote = algorithmSelect.value === "bfs" && board.weights.some(Boolean)
    ? " BFS treats weights as ordinary cells."
    : "";
  statusText.textContent = `${algorithmName} found a path with cost ${result.cost} after exploring ${result.explored.length} nodes.${weightNote}`;
  setBusy(false);
}

function randomizeWalls() {
  clearSearchMarks();
  board.walls.fill(0);
  board.weights.fill(0);
  for (let index = 0; index < SIZE; index++) {
    if (index !== board.start && index !== board.goal && Math.random() < 0.27) board.walls[index] = 1;
  }
  cells.forEach(renderCell);
  statusText.textContent = "Random walls added. Run a search to see whether a route remains.";
}

function generateMaze() {
  clearSearchMarks();
  board.walls.fill(1);
  board.weights.fill(0);

  // Randomized depth-first backtracking over odd-numbered cell centers.
  const visited = new Uint8Array(SIZE);
  const stack = [COLS + 1];
  visited[COLS + 1] = 1;
  board.walls[COLS + 1] = 0;

  while (stack.length) {
    const current = stack[stack.length - 1];
    const row = rowOf(current);
    const col = colOf(current);
    const candidates = [];
    if (row >= 3) candidates.push(current - 2 * COLS);
    if (col <= COLS - 4) candidates.push(current + 2);
    if (row <= ROWS - 4) candidates.push(current + 2 * COLS);
    if (col >= 3) candidates.push(current - 2);
    const unvisited = candidates.filter((next) => !visited[next]);

    if (!unvisited.length) {
      stack.pop();
      continue;
    }

    const next = unvisited[Math.floor(Math.random() * unvisited.length)];
    const between = current + (next - current) / 2;
    board.walls[between] = 0;
    board.walls[next] = 0;
    visited[next] = 1;
    stack.push(next);
  }

  board.start = COLS + 1;
  board.goal = (ROWS - 2) * COLS + (COLS - 2);
  board.walls[board.start] = 0;
  board.walls[board.goal] = 0;
  cells.forEach(renderCell);
  statusText.textContent = "Maze carved with randomized depth-first search. Start and goal are at opposite corners.";
}

function clearBoard() {
  clearSearchMarks();
  board.walls.fill(0);
  board.weights.fill(0);
  cells.forEach(renderCell);
  statusText.textContent = "Board cleared. Your start and goal markers stay in place.";
}

const hints = {
  astar: "Uses distance-to-goal to guide the search. Finds a shortest weighted path.",
  dijkstra: "Always expands the lowest known travel cost. Finds a cheapest weighted path.",
  bfs: "Explores evenly outward. Finds the fewest moves, but does not account for weights.",
};

algorithmSelect.addEventListener("change", () => {
  document.querySelector("#algorithm-hint").textContent = hints[algorithmSelect.value];
  clearSearchMarks();
  statusText.textContent = "Algorithm changed. Run the search to compare its route.";
});
speedInput.addEventListener("input", () => {
  const value = Number(speedInput.value);
  document.querySelector("#speed-value").textContent = value < 35 ? "Slow" : value < 72 ? "Medium" : "Fast";
});
runButton.addEventListener("click", visualize);
mazeButton.addEventListener("click", generateMaze);
randomButton.addEventListener("click", randomizeWalls);
clearButton.addEventListener("click", clearBoard);

createGrid();
