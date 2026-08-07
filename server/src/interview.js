export const PROBLEMS = [
  { id: "binary_search", title: "Binary Search", difficulty: "Média" },
  { id: "two_sum", title: "Two Sum", difficulty: "Fácil" },
  { id: "merge_sort", title: "Merge Sort", difficulty: "Média" },
  { id: "dfs", title: "Depth-First Search", difficulty: "Média" },
  { id: "bfs", title: "Breadth-First Search", difficulty: "Média" },
  { id: "lru_cache", title: "LRU Cache", difficulty: "Difícil" },
];

const SNIPPETS = {
  python: {
    binary_search: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
    two_sum: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in seen:
            return [seen[diff], i]
        seen[n] = i
    return []`,
    merge_sort: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)`,
    dfs: `def dfs(graph, node, visited):
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)`,
    bfs: `def bfs(graph, start):
    from collections import deque
    queue = deque([start])
    visited = {start}
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)`,
    lru_cache: `class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.order = []
        self.data = {}

    def get(self, key):
        if key not in self.data:
            return -1
        self.order.remove(key)
        self.order.append(key)
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.order.remove(key)
        elif len(self.order) >= self.cap:
            old = self.order.pop(0)
            del self.data[old]
        self.data[key] = value
        self.order.append(key)`,
  },
  javascript: {
    binary_search: `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = (left + right) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
    two_sum: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) return [seen.get(diff), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
    merge_sort: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}`,
    dfs: `function dfs(node, visited = new Set()) {
  visited.add(node);
  for (const neighbor of node.neighbors) {
    if (!visited.has(neighbor)) dfs(neighbor, visited);
  }
}`,
    bfs: `function bfs(start) {
  const queue = [start];
  const visited = new Set([start]);
  while (queue.length) {
    const node = queue.shift();
    for (const neighbor of node.neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
}`,
    lru_cache: `class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.cap) {
      const first = this.map.keys().next().value;
      this.map.delete(first);
    }
  }
}`,
  },
  java: {
    binary_search: `class Solution {
    public int binarySearch(int[] arr, int target) {
        int left = 0, right = arr.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (arr[mid] == target) return mid;
            if (arr[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`,
    two_sum: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (seen.containsKey(diff)) return new int[]{seen.get(diff), i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}`,
    merge_sort: `class Solution {
    public void mergeSort(int[] arr, int lo, int hi) {
        if (lo >= hi) return;
        int mid = lo + (hi - lo) / 2;
        mergeSort(arr, lo, mid);
        mergeSort(arr, mid + 1, hi);
        merge(arr, lo, mid, hi);
    }
}`,
    dfs: `class Solution {
    void dfs(Node node, Set<Node> visited) {
        visited.add(node);
        for (Node n : node.neighbors) {
            if (!visited.contains(n)) dfs(n, visited);
        }
    }
}`,
    bfs: `class Solution {
    void bfs(Node start) {
        Queue<Node> q = new LinkedList<>();
        Set<Node> seen = new HashSet<>();
        q.add(start);
        seen.add(start);
        while (!q.isEmpty()) {
            Node cur = q.poll();
            for (Node n : cur.neighbors) {
                if (!seen.contains(n)) { seen.add(n); q.add(n); }
            }
        }
    }
}`,
    lru_cache: `class LRUCache {
    private int cap;
    private LinkedHashMap<Integer, Integer> map;
    public LRUCache(int capacity) {
        this.cap = capacity;
        this.map = new LinkedHashMap<>();
    }
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        int v = map.remove(key);
        map.put(key, v);
        return v;
    }
    public void put(int key, int value) {
        if (map.containsKey(key)) map.remove(key);
        map.put(key, value);
        if (map.size() > cap) {
            Integer oldest = map.keySet().iterator().next();
            map.remove(oldest);
        }
    }
}`,
  },
};

export function listInterviewProblems() {
  return PROBLEMS;
}

export function interviewSnippet(language, problemId) {
  const lang = SNIPPETS[language];
  if (!lang) throw new Error(`Entrevista indisponível para "${language}".`);
  const problem = PROBLEMS.find((p) => p.id === problemId) || PROBLEMS[0];
  const code = lang[problem.id];
  if (!code) throw new Error("Problema indisponível para essa linguagem.");
  return { code, source: `Entrevista · ${problem.title}`, path: problem.id };
}

export function interviewLanguages() {
  return Object.keys(SNIPPETS);
}