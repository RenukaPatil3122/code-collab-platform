// src/utils/codeTemplates.js

const templates = {
  javascript: {
    // ── BASICS ──────────────────────────────────────────────────────────
    "Hello World": {
      description: "Simple Hello World program",
      category: "Basics",
      code: `console.log("Hello, World!");`,
    },
    "Function Template": {
      description: "Basic function structure",
      category: "Basics",
      code: `function myFunction(param) {\n  // Your code here\n  return param;\n}\n\nconsole.log(myFunction("test"));`,
    },
    "Class Template": {
      description: "ES6 class structure",
      category: "Basics",
      code: `class MyClass {\n  constructor(name) {\n    this.name = name;\n  }\n\n  greet() {\n    console.log(\`Hello, \${this.name}!\`);\n  }\n}\n\nconst instance = new MyClass("World");\ninstance.greet();`,
    },
    "Async/Await": {
      description: "Async function template",
      category: "Basics",
      code: `async function delay(ms) {\n  return new Promise(resolve => setTimeout(resolve, ms));\n}\n\nasync function main() {\n  try {\n    console.log("Starting...");\n    await delay(100);\n    console.log("Done after delay!");\n    return "success";\n  } catch (error) {\n    console.error("Error:", error);\n  }\n}\n\nmain().then(result => console.log("Result:", result));`,
    },

    // ── DSA ─────────────────────────────────────────────────────────────
    "Linked List": {
      description: "Singly linked list with insert & print",
      category: "DSA",
      code: `class Node {\n  constructor(val) {\n    this.val = val;\n    this.next = null;\n  }\n}\n\nclass LinkedList {\n  constructor() { this.head = null; }\n\n  append(val) {\n    const node = new Node(val);\n    if (!this.head) { this.head = node; return; }\n    let cur = this.head;\n    while (cur.next) cur = cur.next;\n    cur.next = node;\n  }\n\n  print() {\n    const res = [];\n    let cur = this.head;\n    while (cur) { res.push(cur.val); cur = cur.next; }\n    console.log(res.join(" -> "));\n  }\n}\n\nconst list = new LinkedList();\nlist.append(1); list.append(2); list.append(3);\nlist.print(); // 1 -> 2 -> 3`,
    },
    Stack: {
      description: "Stack using array (LIFO)",
      category: "DSA",
      code: `class Stack {\n  constructor() { this.items = []; }\n\n  push(val)  { this.items.push(val); }\n  pop()      { return this.items.pop(); }\n  peek()     { return this.items[this.items.length - 1]; }\n  isEmpty()  { return this.items.length === 0; }\n  size()     { return this.items.length; }\n}\n\nconst stack = new Stack();\nstack.push(1); stack.push(2); stack.push(3);\nconsole.log(stack.peek());  // 3\nconsole.log(stack.pop());   // 3\nconsole.log(stack.size());  // 2`,
    },
    Queue: {
      description: "Queue using array (FIFO)",
      category: "DSA",
      code: `class Queue {\n  constructor() { this.items = []; }\n\n  enqueue(val) { this.items.push(val); }\n  dequeue()    { return this.items.shift(); }\n  front()      { return this.items[0]; }\n  isEmpty()    { return this.items.length === 0; }\n  size()       { return this.items.length; }\n}\n\nconst q = new Queue();\nq.enqueue(1); q.enqueue(2); q.enqueue(3);\nconsole.log(q.front());    // 1\nconsole.log(q.dequeue());  // 1\nconsole.log(q.size());     // 2`,
    },
    "Binary Search Tree": {
      description: "BST with insert and inorder traversal",
      category: "DSA",
      code: `class TreeNode {\n  constructor(val) { this.val = val; this.left = this.right = null; }\n}\n\nclass BST {\n  constructor() { this.root = null; }\n\n  insert(val) {\n    const node = new TreeNode(val);\n    if (!this.root) { this.root = node; return; }\n    let cur = this.root;\n    while (true) {\n      if (val < cur.val) {\n        if (!cur.left) { cur.left = node; return; }\n        cur = cur.left;\n      } else {\n        if (!cur.right) { cur.right = node; return; }\n        cur = cur.right;\n      }\n    }\n  }\n\n  inorder(node = this.root, res = []) {\n    if (!node) return res;\n    this.inorder(node.left, res);\n    res.push(node.val);\n    this.inorder(node.right, res);\n    return res;\n  }\n}\n\nconst bst = new BST();\n[5, 3, 7, 1, 4].forEach(v => bst.insert(v));\nconsole.log(bst.inorder()); // [1, 3, 4, 5, 7]`,
    },
    "Graph (Adjacency List)": {
      description: "Undirected graph with adjacency list",
      category: "DSA",
      code: `class Graph {\n  constructor() { this.adj = new Map(); }\n\n  addVertex(v)    { if (!this.adj.has(v)) this.adj.set(v, []); }\n  addEdge(u, v)   { this.adj.get(u).push(v); this.adj.get(v).push(u); }\n  neighbors(v)    { return this.adj.get(v) || []; }\n}\n\nconst g = new Graph();\n["A","B","C","D"].forEach(v => g.addVertex(v));\ng.addEdge("A","B"); g.addEdge("A","C"); g.addEdge("B","D");\nconsole.log(g.neighbors("A")); // ["B", "C"]`,
    },
    "Hash Map (Manual)": {
      description: "Simple hash map from scratch",
      category: "DSA",
      code: `class HashMap {\n  constructor(size = 53) {\n    this.table = new Array(size);\n    this.size = size;\n  }\n\n  _hash(key) {\n    return [...key].reduce((acc, c) => acc + c.charCodeAt(0), 0) % this.size;\n  }\n\n  set(key, val) {\n    const idx = this._hash(key);\n    if (!this.table[idx]) this.table[idx] = [];\n    this.table[idx].push([key, val]);\n  }\n\n  get(key) {\n    const bucket = this.table[this._hash(key)];\n    return bucket?.find(([k]) => k === key)?.[1];\n  }\n}\n\nconst map = new HashMap();\nmap.set("name", "Alice");\nmap.set("age", "30");\nconsole.log(map.get("name")); // Alice`,
    },

    // ── SORTING ──────────────────────────────────────────────────────────
    "Bubble Sort": {
      description: "Bubble sort O(n²)",
      category: "Sorting",
      code: `function bubbleSort(arr) {\n  const a = [...arr];\n  for (let i = 0; i < a.length; i++)\n    for (let j = 0; j < a.length - i - 1; j++)\n      if (a[j] > a[j+1]) [a[j], a[j+1]] = [a[j+1], a[j]];\n  return a;\n}\n\nconsole.log(bubbleSort([5, 3, 8, 1, 2])); // [1,2,3,5,8]`,
    },
    "Merge Sort": {
      description: "Merge sort O(n log n)",
      category: "Sorting",
      code: `function mergeSort(arr) {\n  if (arr.length <= 1) return arr;\n  const mid = Math.floor(arr.length / 2);\n  const left  = mergeSort(arr.slice(0, mid));\n  const right = mergeSort(arr.slice(mid));\n  return merge(left, right);\n}\n\nfunction merge(l, r) {\n  const res = [];\n  let i = 0, j = 0;\n  while (i < l.length && j < r.length)\n    res.push(l[i] <= r[j] ? l[i++] : r[j++]);\n  return [...res, ...l.slice(i), ...r.slice(j)];\n}\n\nconsole.log(mergeSort([5, 3, 8, 1, 2])); // [1,2,3,5,8]`,
    },
    "Quick Sort": {
      description: "Quick sort O(n log n) average",
      category: "Sorting",
      code: `function quickSort(arr) {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[arr.length - 1];\n  const left  = arr.slice(0, -1).filter(x => x <= pivot);\n  const right = arr.slice(0, -1).filter(x => x > pivot);\n  return [...quickSort(left), pivot, ...quickSort(right)];\n}\n\nconsole.log(quickSort([5, 3, 8, 1, 2])); // [1,2,3,5,8]`,
    },

    // ── SEARCHING ────────────────────────────────────────────────────────
    "Binary Search": {
      description: "Binary search O(log n)",
      category: "Searching",
      code: `function binarySearch(arr, target) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = Math.floor((lo + hi) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}\n\nconst sorted = [1, 3, 5, 7, 9, 11];\nconsole.log(binarySearch(sorted, 7));  // 3\nconsole.log(binarySearch(sorted, 4));  // -1`,
    },
    "BFS (Graph)": {
      description: "Breadth-first search on a graph",
      category: "Searching",
      code: `function bfs(graph, start) {\n  const visited = new Set([start]);\n  const queue   = [start];\n  const order   = [];\n\n  while (queue.length) {\n    const node = queue.shift();\n    order.push(node);\n    for (const neighbor of (graph[node] || []))\n      if (!visited.has(neighbor)) {\n        visited.add(neighbor);\n        queue.push(neighbor);\n      }\n  }\n  return order;\n}\n\nconst graph = { A:["B","C"], B:["D"], C:["D"], D:[] };\nconsole.log(bfs(graph, "A")); // ["A","B","C","D"]`,
    },
    "DFS (Graph)": {
      description: "Depth-first search on a graph",
      category: "Searching",
      code: `function dfs(graph, node, visited = new Set()) {\n  visited.add(node);\n  console.log(node);\n  for (const neighbor of (graph[node] || []))\n    if (!visited.has(neighbor))\n      dfs(graph, neighbor, visited);\n}\n\nconst graph = { A:["B","C"], B:["D"], C:["D"], D:[] };\ndfs(graph, "A"); // A B D C`,
    },

    // ── PATTERNS ─────────────────────────────────────────────────────────
    "Two Pointer": {
      description: "Two pointer pattern for sorted arrays",
      category: "Patterns",
      code: `// Find pair that sums to target\nfunction twoSum(arr, target) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo < hi) {\n    const sum = arr[lo] + arr[hi];\n    if (sum === target) return [lo, hi];\n    sum < target ? lo++ : hi--;\n  }\n  return [];\n}\n\nconsole.log(twoSum([1, 2, 4, 6, 8], 10)); // [1, 4]`,
    },
    "Sliding Window": {
      description: "Max sum of subarray of size k",
      category: "Patterns",
      code: `function maxSubarraySum(arr, k) {\n  if (arr.length < k) return null;\n  let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);\n  let maxSum = windowSum;\n  for (let i = k; i < arr.length; i++) {\n    windowSum += arr[i] - arr[i - k];\n    maxSum = Math.max(maxSum, windowSum);\n  }\n  return maxSum;\n}\n\nconsole.log(maxSubarraySum([2, 1, 5, 1, 3, 2], 3)); // 9`,
    },
    "Memoization / DP": {
      description: "Fibonacci with memoization",
      category: "Patterns",
      code: `function fib(n, memo = {}) {\n  if (n in memo) return memo[n];\n  if (n <= 1) return n;\n  memo[n] = fib(n - 1, memo) + fib(n - 2, memo);\n  return memo[n];\n}\n\nconsole.log(fib(10)); // 55\nconsole.log(fib(40)); // 102334155`,
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  python: {
    // BASICS
    "Hello World": {
      description: "Simple Hello World program",
      category: "Basics",
      code: `print("Hello, World!")`,
    },
    "Function Template": {
      description: "Basic function structure",
      category: "Basics",
      code: `def my_function(param):\n    \"\"\"Docstring here.\"\"\"\n    return param\n\nresult = my_function("test")\nprint(result)`,
    },
    "Class Template": {
      description: "Python class structure",
      category: "Basics",
      code: `class MyClass:\n    def __init__(self, name: str):\n        self.name = name\n\n    def greet(self):\n        print(f"Hello, {self.name}!")\n\nobj = MyClass("World")\nobj.greet()`,
    },
    "List Comprehension": {
      description: "Idiomatic list comprehension",
      category: "Basics",
      code: `numbers = [1, 2, 3, 4, 5]\ndoubled  = [x * 2 for x in numbers]\neven     = [x for x in numbers if x % 2 == 0]\nprint(doubled, even)`,
    },
    "File I/O": {
      description: "Read and write files",
      category: "Basics",
      code: `# Write\nwith open("file.txt", "w") as f:\n    f.write("Hello, World!")\n\n# Read\nwith open("file.txt", "r") as f:\n    content = f.read()\n    print(content)`,
    },

    // DSA
    "Linked List": {
      description: "Singly linked list with insert & traverse",
      category: "DSA",
      code: `class Node:\n    def __init__(self, val):\n        self.val = val\n        self.next = None\n\nclass LinkedList:\n    def __init__(self):\n        self.head = None\n\n    def append(self, val):\n        node = Node(val)\n        if not self.head:\n            self.head = node; return\n        cur = self.head\n        while cur.next: cur = cur.next\n        cur.next = node\n\n    def __str__(self):\n        vals, cur = [], self.head\n        while cur: vals.append(str(cur.val)); cur = cur.next\n        return " -> ".join(vals)\n\nll = LinkedList()\nfor v in [1, 2, 3]: ll.append(v)\nprint(ll)  # 1 -> 2 -> 3`,
    },
    Stack: {
      description: "Stack (LIFO) using list",
      category: "DSA",
      code: `class Stack:\n    def __init__(self): self._items = []\n    def push(self, val): self._items.append(val)\n    def pop(self):       return self._items.pop()\n    def peek(self):      return self._items[-1]\n    def is_empty(self):  return len(self._items) == 0\n    def __len__(self):   return len(self._items)\n\ns = Stack()\ns.push(1); s.push(2); s.push(3)\nprint(s.peek())  # 3\nprint(s.pop())   # 3\nprint(len(s))    # 2`,
    },
    Queue: {
      description: "Queue (FIFO) using deque",
      category: "DSA",
      code: `from collections import deque\n\nclass Queue:\n    def __init__(self): self._q = deque()\n    def enqueue(self, val): self._q.append(val)\n    def dequeue(self):      return self._q.popleft()\n    def front(self):        return self._q[0]\n    def is_empty(self):     return len(self._q) == 0\n\nq = Queue()\nq.enqueue(1); q.enqueue(2); q.enqueue(3)\nprint(q.front())    # 1\nprint(q.dequeue())  # 1`,
    },
    "Binary Search Tree": {
      description: "BST with insert and inorder",
      category: "DSA",
      code: `class TreeNode:\n    def __init__(self, val):\n        self.val = val\n        self.left = self.right = None\n\nclass BST:\n    def __init__(self): self.root = None\n\n    def insert(self, val):\n        node = TreeNode(val)\n        if not self.root: self.root = node; return\n        cur = self.root\n        while True:\n            if val < cur.val:\n                if not cur.left: cur.left = node; return\n                cur = cur.left\n            else:\n                if not cur.right: cur.right = node; return\n                cur = cur.right\n\n    def inorder(self, node=None):\n        node = node if node is not None else self.root\n        return (self.inorder(node.left) + [node.val] +\n                self.inorder(node.right)) if node else []\n\nbst = BST()\nfor v in [5, 3, 7, 1, 4]: bst.insert(v)\nprint(bst.inorder())  # [1, 3, 4, 5, 7]`,
    },

    // SORTING
    "Bubble Sort": {
      description: "Bubble sort O(n²)",
      category: "Sorting",
      code: `def bubble_sort(arr):\n    a = arr[:]\n    n = len(a)\n    for i in range(n):\n        for j in range(n - i - 1):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n    return a\n\nprint(bubble_sort([5, 3, 8, 1, 2]))  # [1, 2, 3, 5, 8]`,
    },
    "Merge Sort": {
      description: "Merge sort O(n log n)",
      category: "Sorting",
      code: `def merge_sort(arr):\n    if len(arr) <= 1: return arr\n    mid = len(arr) // 2\n    left  = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)\n\ndef merge(l, r):\n    res, i, j = [], 0, 0\n    while i < len(l) and j < len(r):\n        if l[i] <= r[j]: res.append(l[i]); i += 1\n        else:            res.append(r[j]); j += 1\n    return res + l[i:] + r[j:]\n\nprint(merge_sort([5, 3, 8, 1, 2]))  # [1, 2, 3, 5, 8]`,
    },
    "Quick Sort": {
      description: "Quick sort O(n log n) average",
      category: "Sorting",
      code: `def quick_sort(arr):\n    if len(arr) <= 1: return arr\n    pivot  = arr[-1]\n    left   = [x for x in arr[:-1] if x <= pivot]\n    right  = [x for x in arr[:-1] if x > pivot]\n    return quick_sort(left) + [pivot] + quick_sort(right)\n\nprint(quick_sort([5, 3, 8, 1, 2]))  # [1, 2, 3, 5, 8]`,
    },

    // SEARCHING
    "Binary Search": {
      description: "Binary search O(log n)",
      category: "Searching",
      code: `def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target: return mid\n        if arr[mid] < target:  lo = mid + 1\n        else:                  hi = mid - 1\n    return -1\n\nsorted_arr = [1, 3, 5, 7, 9, 11]\nprint(binary_search(sorted_arr, 7))   # 3\nprint(binary_search(sorted_arr, 4))   # -1`,
    },
    "BFS (Graph)": {
      description: "Breadth-first search",
      category: "Searching",
      code: `from collections import deque\n\ndef bfs(graph, start):\n    visited = {start}\n    queue   = deque([start])\n    order   = []\n    while queue:\n        node = queue.popleft()\n        order.append(node)\n        for nb in graph.get(node, []):\n            if nb not in visited:\n                visited.add(nb)\n                queue.append(nb)\n    return order\n\ngraph = {"A":["B","C"],"B":["D"],"C":["D"],"D":[]}\nprint(bfs(graph, "A"))  # ['A','B','C','D']`,
    },
    "DFS (Graph)": {
      description: "Depth-first search (recursive)",
      category: "Searching",
      code: `def dfs(graph, node, visited=None):\n    if visited is None: visited = set()\n    visited.add(node)\n    print(node, end=" ")\n    for nb in graph.get(node, []):\n        if nb not in visited:\n            dfs(graph, nb, visited)\n\ngraph = {"A":["B","C"],"B":["D"],"C":["D"],"D":[]}\ndfs(graph, "A")  # A B D C`,
    },

    // PATTERNS
    "Two Pointer": {
      description: "Two pointer – pair sum in sorted array",
      category: "Patterns",
      code: `def two_sum(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo < hi:\n        s = arr[lo] + arr[hi]\n        if s == target: return [lo, hi]\n        if s < target:  lo += 1\n        else:           hi -= 1\n    return []\n\nprint(two_sum([1, 2, 4, 6, 8], 10))  # [1, 4]`,
    },
    "Sliding Window": {
      description: "Max sum subarray of size k",
      category: "Patterns",
      code: `def max_subarray_sum(arr, k):\n    window = sum(arr[:k])\n    best   = window\n    for i in range(k, len(arr)):\n        window += arr[i] - arr[i - k]\n        best = max(best, window)\n    return best\n\nprint(max_subarray_sum([2, 1, 5, 1, 3, 2], 3))  # 9`,
    },
    "Memoization / DP": {
      description: "Fibonacci with memoization",
      category: "Patterns",
      code: `from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n <= 1: return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(10))  # 55\nprint(fib(40))  # 102334155`,
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  java: {
    // BASICS
    "Hello World": {
      description: "Simple Hello World program",
      category: "Basics",
      code: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
    },
    "Class Template": {
      description: "Java class with constructor and method",
      category: "Basics",
      code: `public class MyClass {\n    private String name;\n\n    public MyClass(String name) { this.name = name; }\n\n    public void greet() {\n        System.out.println("Hello, " + name + "!");\n    }\n\n    public static void main(String[] args) {\n        new MyClass("World").greet();\n    }\n}`,
    },
    ArrayList: {
      description: "Working with ArrayList",
      category: "Basics",
      code: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> nums = new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5));\n        nums.forEach(n -> System.out.println(n * 2));\n    }\n}`,
    },

    // DSA
    "Linked List": {
      description: "Singly linked list – insert & print",
      category: "DSA",
      code: `public class LinkedList {\n    static class Node {\n        int val; Node next;\n        Node(int v) { val = v; }\n    }\n    Node head;\n\n    void append(int val) {\n        Node node = new Node(val);\n        if (head == null) { head = node; return; }\n        Node cur = head;\n        while (cur.next != null) cur = cur.next;\n        cur.next = node;\n    }\n\n    void print() {\n        Node cur = head;\n        StringBuilder sb = new StringBuilder();\n        while (cur != null) { sb.append(cur.val).append(" -> "); cur = cur.next; }\n        System.out.println(sb.toString().replaceAll(" -> $", ""));\n    }\n\n    public static void main(String[] args) {\n        LinkedList list = new LinkedList();\n        list.append(1); list.append(2); list.append(3);\n        list.print(); // 1 -> 2 -> 3\n    }\n}`,
    },
    Stack: {
      description: "Stack using Deque",
      category: "DSA",
      code: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Deque<Integer> stack = new ArrayDeque<>();\n        stack.push(1); stack.push(2); stack.push(3);\n        System.out.println(stack.peek());  // 3\n        System.out.println(stack.pop());   // 3\n        System.out.println(stack.size());  // 2\n    }\n}`,
    },
    Queue: {
      description: "Queue using LinkedList",
      category: "DSA",
      code: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Queue<Integer> q = new LinkedList<>();\n        q.offer(1); q.offer(2); q.offer(3);\n        System.out.println(q.peek());   // 1\n        System.out.println(q.poll());   // 1\n        System.out.println(q.size());   // 2\n    }\n}`,
    },
    "Binary Search Tree": {
      description: "BST insert and inorder traversal",
      category: "DSA",
      code: `public class BST {\n    static class Node {\n        int val; Node left, right;\n        Node(int v) { val = v; }\n    }\n    Node root;\n\n    void insert(int val) {\n        Node node = new Node(val);\n        if (root == null) { root = node; return; }\n        Node cur = root;\n        while (true) {\n            if (val < cur.val) {\n                if (cur.left == null) { cur.left = node; return; }\n                cur = cur.left;\n            } else {\n                if (cur.right == null) { cur.right = node; return; }\n                cur = cur.right;\n            }\n        }\n    }\n\n    void inorder(Node n) {\n        if (n == null) return;\n        inorder(n.left);\n        System.out.print(n.val + " ");\n        inorder(n.right);\n    }\n\n    public static void main(String[] args) {\n        BST bst = new BST();\n        for (int v : new int[]{5,3,7,1,4}) bst.insert(v);\n        bst.inorder(bst.root); // 1 3 4 5 7\n    }\n}`,
    },

    // SORTING
    "Merge Sort": {
      description: "Merge sort O(n log n)",
      category: "Sorting",
      code: `import java.util.Arrays;\n\npublic class MergeSort {\n    static int[] mergeSort(int[] arr) {\n        if (arr.length <= 1) return arr;\n        int mid = arr.length / 2;\n        int[] l = mergeSort(Arrays.copyOfRange(arr, 0, mid));\n        int[] r = mergeSort(Arrays.copyOfRange(arr, mid, arr.length));\n        return merge(l, r);\n    }\n\n    static int[] merge(int[] l, int[] r) {\n        int[] res = new int[l.length + r.length];\n        int i = 0, j = 0, k = 0;\n        while (i < l.length && j < r.length)\n            res[k++] = l[i] <= r[j] ? l[i++] : r[j++];\n        while (i < l.length) res[k++] = l[i++];\n        while (j < r.length) res[k++] = r[j++];\n        return res;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(Arrays.toString(mergeSort(new int[]{5,3,8,1,2})));\n        // [1, 2, 3, 5, 8]\n    }\n}`,
    },
    "Quick Sort": {
      description: "Quick sort in-place",
      category: "Sorting",
      code: `import java.util.Arrays;\n\npublic class QuickSort {\n    static void quickSort(int[] a, int lo, int hi) {\n        if (lo >= hi) return;\n        int p = partition(a, lo, hi);\n        quickSort(a, lo, p - 1);\n        quickSort(a, p + 1, hi);\n    }\n\n    static int partition(int[] a, int lo, int hi) {\n        int pivot = a[hi], i = lo - 1;\n        for (int j = lo; j < hi; j++)\n            if (a[j] <= pivot) { i++; int tmp=a[i]; a[i]=a[j]; a[j]=tmp; }\n        int tmp=a[i+1]; a[i+1]=a[hi]; a[hi]=tmp;\n        return i + 1;\n    }\n\n    public static void main(String[] args) {\n        int[] arr = {5, 3, 8, 1, 2};\n        quickSort(arr, 0, arr.length - 1);\n        System.out.println(Arrays.toString(arr)); // [1, 2, 3, 5, 8]\n    }\n}`,
    },

    // SEARCHING
    "Binary Search": {
      description: "Iterative binary search O(log n)",
      category: "Searching",
      code: `public class BinarySearch {\n    static int binarySearch(int[] arr, int target) {\n        int lo = 0, hi = arr.length - 1;\n        while (lo <= hi) {\n            int mid = (lo + hi) / 2;\n            if (arr[mid] == target) return mid;\n            if (arr[mid] < target)  lo = mid + 1;\n            else                    hi = mid - 1;\n        }\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        int[] sorted = {1, 3, 5, 7, 9, 11};\n        System.out.println(binarySearch(sorted, 7));  // 3\n        System.out.println(binarySearch(sorted, 4));  // -1\n    }\n}`,
    },
    "BFS (Graph)": {
      description: "BFS using adjacency list",
      category: "Searching",
      code: `import java.util.*;\n\npublic class BFS {\n    static List<Integer> bfs(Map<Integer,List<Integer>> graph, int start) {\n        Set<Integer> visited = new HashSet<>();\n        Queue<Integer> queue = new LinkedList<>();\n        List<Integer> order = new ArrayList<>();\n        queue.offer(start); visited.add(start);\n        while (!queue.isEmpty()) {\n            int node = queue.poll();\n            order.add(node);\n            for (int nb : graph.getOrDefault(node, Collections.emptyList()))\n                if (!visited.contains(nb)) { visited.add(nb); queue.offer(nb); }\n        }\n        return order;\n    }\n\n    public static void main(String[] args) {\n        Map<Integer,List<Integer>> g = new HashMap<>();\n        g.put(0, Arrays.asList(1,2));\n        g.put(1, Arrays.asList(3));\n        g.put(2, Arrays.asList(3));\n        g.put(3, Collections.emptyList());\n        System.out.println(bfs(g, 0)); // [0, 1, 2, 3]\n    }\n}`,
    },

    // PATTERNS
    "Two Pointer": {
      description: "Two pointer – pair sum",
      category: "Patterns",
      code: `public class TwoPointer {\n    static int[] twoSum(int[] arr, int target) {\n        int lo = 0, hi = arr.length - 1;\n        while (lo < hi) {\n            int sum = arr[lo] + arr[hi];\n            if (sum == target) return new int[]{lo, hi};\n            if (sum < target)  lo++;\n            else               hi--;\n        }\n        return new int[]{};\n    }\n\n    public static void main(String[] args) {\n        System.out.println(java.util.Arrays.toString(\n            twoSum(new int[]{1,2,4,6,8}, 10))); // [1, 4]\n    }\n}`,
    },
    "Sliding Window": {
      description: "Max sum subarray of size k",
      category: "Patterns",
      code: `public class SlidingWindow {\n    static int maxSubarraySum(int[] arr, int k) {\n        int window = 0;\n        for (int i = 0; i < k; i++) window += arr[i];\n        int best = window;\n        for (int i = k; i < arr.length; i++) {\n            window += arr[i] - arr[i - k];\n            best = Math.max(best, window);\n        }\n        return best;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(maxSubarraySum(new int[]{2,1,5,1,3,2}, 3)); // 9\n    }\n}`,
    },
    "Memoization / DP": {
      description: "Fibonacci with memoization",
      category: "Patterns",
      code: `import java.util.*;\n\npublic class Memoization {\n    static Map<Integer,Long> memo = new HashMap<>();\n\n    static long fib(int n) {\n        if (n <= 1) return n;\n        if (memo.containsKey(n)) return memo.get(n);\n        long res = fib(n - 1) + fib(n - 2);\n        memo.put(n, res);\n        return res;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(fib(10)); // 55\n        System.out.println(fib(50)); // 12586269025\n    }\n}`,
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  cpp: {
    // BASICS
    "Hello World": {
      description: "Simple Hello World program",
      category: "Basics",
      code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}`,
    },
    "Function Template": {
      description: "Basic function structure",
      category: "Basics",
      code: `#include <iostream>\nusing namespace std;\n\nint myFunction(int param) {\n    // Your code here\n    return param;\n}\n\nint main() {\n    cout << myFunction(42) << endl;\n    return 0;\n}`,
    },
    "Class Template": {
      description: "C++ class with constructor",
      category: "Basics",
      code: `#include <iostream>\n#include <string>\nusing namespace std;\n\nclass MyClass {\n    string name;\npublic:\n    MyClass(string n) : name(n) {}\n    void greet() { cout << "Hello, " << name << "!" << endl; }\n};\n\nint main() {\n    MyClass obj("World");\n    obj.greet();\n    return 0;\n}`,
    },
    "Vector Example": {
      description: "Working with std::vector",
      category: "Basics",
      code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> nums = {1, 2, 3, 4, 5};\n    for (int n : nums) cout << n * 2 << " ";\n    cout << endl;\n    return 0;\n}`,
    },

    // DSA
    "Linked List": {
      description: "Singly linked list – insert & print",
      category: "DSA",
      code: `#include <iostream>\nusing namespace std;\n\nstruct Node { int val; Node* next; Node(int v): val(v), next(nullptr){} };\n\nclass LinkedList {\n    Node* head;\npublic:\n    LinkedList(): head(nullptr) {}\n\n    void append(int val) {\n        Node* node = new Node(val);\n        if (!head) { head = node; return; }\n        Node* cur = head;\n        while (cur->next) cur = cur->next;\n        cur->next = node;\n    }\n\n    void print() {\n        for (Node* c = head; c; c = c->next)\n            cout << c->val << (c->next ? " -> " : "\\n");\n    }\n};\n\nint main() {\n    LinkedList list;\n    list.append(1); list.append(2); list.append(3);\n    list.print(); // 1 -> 2 -> 3\n}`,
    },
    Stack: {
      description: "Stack using std::stack",
      category: "DSA",
      code: `#include <iostream>\n#include <stack>\nusing namespace std;\n\nint main() {\n    stack<int> s;\n    s.push(1); s.push(2); s.push(3);\n    cout << s.top() << endl;  // 3\n    s.pop();\n    cout << s.size() << endl; // 2\n    return 0;\n}`,
    },
    Queue: {
      description: "Queue using std::queue",
      category: "DSA",
      code: `#include <iostream>\n#include <queue>\nusing namespace std;\n\nint main() {\n    queue<int> q;\n    q.push(1); q.push(2); q.push(3);\n    cout << q.front() << endl;  // 1\n    q.pop();\n    cout << q.size() << endl;   // 2\n    return 0;\n}`,
    },
    "Binary Search Tree": {
      description: "BST insert and inorder traversal",
      category: "DSA",
      code: `#include <iostream>\nusing namespace std;\n\nstruct Node { int val; Node *left, *right; Node(int v): val(v), left(nullptr), right(nullptr){} };\n\nNode* insert(Node* root, int val) {\n    if (!root) return new Node(val);\n    if (val < root->val) root->left  = insert(root->left,  val);\n    else                 root->right = insert(root->right, val);\n    return root;\n}\n\nvoid inorder(Node* n) {\n    if (!n) return;\n    inorder(n->left);\n    cout << n->val << " ";\n    inorder(n->right);\n}\n\nint main() {\n    Node* root = nullptr;\n    for (int v : {5,3,7,1,4}) root = insert(root, v);\n    inorder(root); cout << endl; // 1 3 4 5 7\n}`,
    },

    // SORTING
    "Merge Sort": {
      description: "Merge sort O(n log n)",
      category: "Sorting",
      code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<int> merge(vector<int>& l, vector<int>& r) {\n    vector<int> res;\n    int i=0, j=0;\n    while (i<l.size() && j<r.size())\n        res.push_back(l[i]<=r[j] ? l[i++] : r[j++]);\n    while (i<l.size()) res.push_back(l[i++]);\n    while (j<r.size()) res.push_back(r[j++]);\n    return res;\n}\n\nvector<int> mergeSort(vector<int> arr) {\n    if (arr.size() <= 1) return arr;\n    int mid = arr.size()/2;\n    vector<int> l(arr.begin(), arr.begin()+mid);\n    vector<int> r(arr.begin()+mid, arr.end());\n    l = mergeSort(l); r = mergeSort(r);\n    return merge(l, r);\n}\n\nint main() {\n    vector<int> arr = {5,3,8,1,2};\n    arr = mergeSort(arr);\n    for (int n : arr) cout << n << " "; // 1 2 3 5 8\n}`,
    },
    "Quick Sort": {
      description: "Quick sort in-place",
      category: "Sorting",
      code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint partition(vector<int>& a, int lo, int hi) {\n    int pivot = a[hi], i = lo - 1;\n    for (int j = lo; j < hi; j++)\n        if (a[j] <= pivot) swap(a[++i], a[j]);\n    swap(a[i+1], a[hi]);\n    return i + 1;\n}\n\nvoid quickSort(vector<int>& a, int lo, int hi) {\n    if (lo >= hi) return;\n    int p = partition(a, lo, hi);\n    quickSort(a, lo, p-1);\n    quickSort(a, p+1, hi);\n}\n\nint main() {\n    vector<int> arr = {5,3,8,1,2};\n    quickSort(arr, 0, arr.size()-1);\n    for (int n : arr) cout << n << " "; // 1 2 3 5 8\n}`,
    },

    // SEARCHING
    "Binary Search": {
      description: "Binary search O(log n)",
      category: "Searching",
      code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint binarySearch(vector<int>& arr, int target) {\n    int lo = 0, hi = arr.size() - 1;\n    while (lo <= hi) {\n        int mid = (lo + hi) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target)  lo = mid + 1;\n        else                    hi = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    vector<int> arr = {1,3,5,7,9,11};\n    cout << binarySearch(arr, 7)  << endl;  // 3\n    cout << binarySearch(arr, 4)  << endl;  // -1\n}`,
    },
    "BFS (Graph)": {
      description: "BFS using adjacency list",
      category: "Searching",
      code: `#include <iostream>\n#include <vector>\n#include <queue>\nusing namespace std;\n\nvoid bfs(vector<vector<int>>& graph, int start) {\n    vector<bool> visited(graph.size(), false);\n    queue<int> q;\n    q.push(start); visited[start] = true;\n    while (!q.empty()) {\n        int node = q.front(); q.pop();\n        cout << node << " ";\n        for (int nb : graph[node])\n            if (!visited[nb]) { visited[nb]=true; q.push(nb); }\n    }\n}\n\nint main() {\n    vector<vector<int>> g = {{1,2},{3},{3},{}};\n    bfs(g, 0); // 0 1 2 3\n}`,
    },
    "DFS (Graph)": {
      description: "DFS recursive",
      category: "Searching",
      code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nvoid dfs(vector<vector<int>>& graph, int node, vector<bool>& visited) {\n    visited[node] = true;\n    cout << node << " ";\n    for (int nb : graph[node])\n        if (!visited[nb]) dfs(graph, nb, visited);\n}\n\nint main() {\n    vector<vector<int>> g = {{1,2},{3},{3},{}};\n    vector<bool> visited(g.size(), false);\n    dfs(g, 0, visited); // 0 1 3 2\n}`,
    },

    // PATTERNS
    "Two Pointer": {
      description: "Two pointer – pair sum",
      category: "Patterns",
      code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\npair<int,int> twoSum(vector<int>& arr, int target) {\n    int lo = 0, hi = arr.size() - 1;\n    while (lo < hi) {\n        int sum = arr[lo] + arr[hi];\n        if (sum == target) return {lo, hi};\n        sum < target ? lo++ : hi--;\n    }\n    return {-1, -1};\n}\n\nint main() {\n    vector<int> arr = {1,2,4,6,8};\n    auto [a, b] = twoSum(arr, 10);\n    cout << a << " " << b << endl; // 1 4\n}`,
    },
    "Sliding Window": {
      description: "Max sum subarray of size k",
      category: "Patterns",
      code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint maxSubarraySum(vector<int>& arr, int k) {\n    int window = 0;\n    for (int i = 0; i < k; i++) window += arr[i];\n    int best = window;\n    for (int i = k; i < arr.size(); i++) {\n        window += arr[i] - arr[i-k];\n        best = max(best, window);\n    }\n    return best;\n}\n\nint main() {\n    vector<int> arr = {2,1,5,1,3,2};\n    cout << maxSubarraySum(arr, 3) << endl; // 9\n}`,
    },
    "Memoization / DP": {
      description: "Fibonacci with memoization",
      category: "Patterns",
      code: `#include <iostream>\n#include <unordered_map>\nusing namespace std;\n\nunordered_map<int,long long> memo;\n\nlong long fib(int n) {\n    if (n <= 1) return n;\n    if (memo.count(n)) return memo[n];\n    return memo[n] = fib(n-1) + fib(n-2);\n}\n\nint main() {\n    cout << fib(10) << endl; // 55\n    cout << fib(50) << endl; // 12586269025\n}`,
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // Keep remaining languages with basics (minimal DSA additions)
  typescript: {
    "Hello World": {
      description: "Simple Hello World program",
      category: "Basics",
      code: `console.log("Hello, World!");`,
    },
    "Function Template": {
      description: "Basic function with types",
      category: "Basics",
      code: `function myFunction(param: string): string {\n  return param;\n}\nconsole.log(myFunction("test"));`,
    },
    "Interface Example": {
      description: "TypeScript interface",
      category: "Basics",
      code: `interface User {\n  name: string;\n  age: number;\n}\n\nfunction greetUser(user: User): void {\n  console.log(\`Hello, \${user.name}!\`);\n}\n\ngreetUser({ name: "Alice", age: 30 });`,
    },
    "Generic Function": {
      description: "Generic function template",
      category: "Basics",
      code: `function identity<T>(arg: T): T {\n  return arg;\n}\n\nconsole.log(identity<string>("hello"));\nconsole.log(identity<number>(42));`,
    },
    "Binary Search": {
      description: "Binary search O(log n)",
      category: "Searching",
      code: `function binarySearch(arr: number[], target: number): number {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = Math.floor((lo + hi) / 2);\n    if (arr[mid] === target) return mid;\n    arr[mid] < target ? (lo = mid + 1) : (hi = mid - 1);\n  }\n  return -1;\n}\n\nconsole.log(binarySearch([1,3,5,7,9], 7)); // 3`,
    },
    "Merge Sort": {
      description: "Merge sort with types",
      category: "Sorting",
      code: `function mergeSort(arr: number[]): number[] {\n  if (arr.length <= 1) return arr;\n  const mid = Math.floor(arr.length / 2);\n  const l = mergeSort(arr.slice(0, mid));\n  const r = mergeSort(arr.slice(mid));\n  const res: number[] = [];\n  let i = 0, j = 0;\n  while (i < l.length && j < r.length)\n    res.push(l[i] <= r[j] ? l[i++] : r[j++]);\n  return [...res, ...l.slice(i), ...r.slice(j)];\n}\n\nconsole.log(mergeSort([5,3,8,1,2])); // [1,2,3,5,8]`,
    },
  },

  c: {
    "Hello World": {
      description: "Simple Hello World program",
      category: "Basics",
      code: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`,
    },
    "Function Template": {
      description: "Basic function structure",
      category: "Basics",
      code: `#include <stdio.h>\n\nint myFunction(int param) {\n    return param;\n}\n\nint main() {\n    printf("%d\\n", myFunction(42));\n    return 0;\n}`,
    },
    "Array Operations": {
      description: "Basic array usage",
      category: "Basics",
      code: `#include <stdio.h>\n\nint main() {\n    int arr[] = {5, 3, 8, 1, 2};\n    int n = sizeof(arr)/sizeof(arr[0]);\n    for (int i = 0; i < n; i++)\n        printf("%d ", arr[i]);\n    printf("\\n");\n    return 0;\n}`,
    },
    "Binary Search": {
      description: "Binary search O(log n)",
      category: "Searching",
      code: `#include <stdio.h>\n\nint binarySearch(int arr[], int n, int target) {\n    int lo = 0, hi = n - 1;\n    while (lo <= hi) {\n        int mid = (lo + hi) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target)  lo = mid + 1;\n        else                    hi = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    int arr[] = {1,3,5,7,9,11};\n    printf("%d\\n", binarySearch(arr, 6, 7));  // 3\n    return 0;\n}`,
    },
    "Bubble Sort": {
      description: "Bubble sort O(n²)",
      category: "Sorting",
      code: `#include <stdio.h>\n\nvoid bubbleSort(int a[], int n) {\n    for (int i = 0; i < n-1; i++)\n        for (int j = 0; j < n-i-1; j++)\n            if (a[j] > a[j+1]) { int t=a[j]; a[j]=a[j+1]; a[j+1]=t; }\n}\n\nint main() {\n    int arr[] = {5,3,8,1,2};\n    bubbleSort(arr, 5);\n    for (int i=0; i<5; i++) printf("%d ", arr[i]); // 1 2 3 5 8\n    return 0;\n}`,
    },
    "Linked List": {
      description: "Singly linked list in C",
      category: "DSA",
      code: `#include <stdio.h>\n#include <stdlib.h>\n\nstruct Node { int val; struct Node* next; };\n\nstruct Node* append(struct Node* head, int val) {\n    struct Node* node = malloc(sizeof(struct Node));\n    node->val = val; node->next = NULL;\n    if (!head) return node;\n    struct Node* cur = head;\n    while (cur->next) cur = cur->next;\n    cur->next = node;\n    return head;\n}\n\nvoid printList(struct Node* head) {\n    for (; head; head = head->next)\n        printf("%d%s", head->val, head->next ? " -> " : "\\n");\n}\n\nint main() {\n    struct Node* head = NULL;\n    head = append(head, 1);\n    head = append(head, 2);\n    head = append(head, 3);\n    printList(head); // 1 -> 2 -> 3\n}`,
    },
  },

  go: {
    "Hello World": {
      description: "Simple Hello World program",
      category: "Basics",
      code: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}`,
    },
    "Function Template": {
      description: "Basic function structure",
      category: "Basics",
      code: `package main\n\nimport "fmt"\n\nfunc myFunction(param string) string {\n    return param\n}\n\nfunc main() {\n    fmt.Println(myFunction("test"))\n}`,
    },
    "Struct & Methods": {
      description: "Go struct with method",
      category: "Basics",
      code: `package main\n\nimport "fmt"\n\ntype Person struct {\n    Name string\n    Age  int\n}\n\nfunc (p Person) Greet() string {\n    return fmt.Sprintf("Hi, I'm %s!", p.Name)\n}\n\nfunc main() {\n    p := Person{Name: "Alice", Age: 30}\n    fmt.Println(p.Greet())\n}`,
    },
    "Goroutine + Channel": {
      description: "Concurrency with goroutine",
      category: "Basics",
      code: `package main\n\nimport "fmt"\n\nfunc worker(id int, ch chan<- string) {\n    ch <- fmt.Sprintf("Worker %d done", id)\n}\n\nfunc main() {\n    ch := make(chan string, 3)\n    for i := 1; i <= 3; i++ { go worker(i, ch) }\n    for i := 0; i < 3; i++ { fmt.Println(<-ch) }\n}`,
    },
    "Binary Search": {
      description: "Binary search O(log n)",
      category: "Searching",
      code: `package main\n\nimport "fmt"\n\nfunc binarySearch(arr []int, target int) int {\n    lo, hi := 0, len(arr)-1\n    for lo <= hi {\n        mid := (lo + hi) / 2\n        if arr[mid] == target { return mid }\n        if arr[mid] < target  { lo = mid + 1 } else { hi = mid - 1 }\n    }\n    return -1\n}\n\nfunc main() {\n    arr := []int{1,3,5,7,9,11}\n    fmt.Println(binarySearch(arr, 7))  // 3\n}`,
    },
    "Merge Sort": {
      description: "Merge sort O(n log n)",
      category: "Sorting",
      code: `package main\n\nimport "fmt"\n\nfunc mergeSort(arr []int) []int {\n    if len(arr) <= 1 { return arr }\n    mid := len(arr) / 2\n    l := mergeSort(arr[:mid])\n    r := mergeSort(arr[mid:])\n    return merge(l, r)\n}\n\nfunc merge(l, r []int) []int {\n    res := []int{}\n    i, j := 0, 0\n    for i < len(l) && j < len(r) {\n        if l[i] <= r[j] { res = append(res, l[i]); i++ } else { res = append(res, r[j]); j++ }\n    }\n    return append(append(res, l[i:]...), r[j:]...)\n}\n\nfunc main() {\n    fmt.Println(mergeSort([]int{5,3,8,1,2})) // [1 2 3 5 8]\n}`,
    },
  },

  rust: {
    "Hello World": {
      description: "Simple Hello World program",
      category: "Basics",
      code: `fn main() {\n    println!("Hello, World!");\n}`,
    },
    "Function Template": {
      description: "Basic function structure",
      category: "Basics",
      code: `fn my_function(param: i32) -> i32 {\n    param\n}\n\nfn main() {\n    println!("{}", my_function(42));\n}`,
    },
    "Struct & Impl": {
      description: "Rust struct with methods",
      category: "Basics",
      code: `struct Person {\n    name: String,\n}\n\nimpl Person {\n    fn new(name: &str) -> Self {\n        Person { name: name.to_string() }\n    }\n    fn greet(&self) {\n        println!("Hello, {}!", self.name);\n    }\n}\n\nfn main() {\n    let p = Person::new("Alice");\n    p.greet();\n}`,
    },
    "Enum & Match": {
      description: "Enum with pattern matching",
      category: "Basics",
      code: `enum Direction { North, South, East, West }\n\nfn describe(d: Direction) -> &'static str {\n    match d {\n        Direction::North => "Going North",\n        Direction::South => "Going South",\n        Direction::East  => "Going East",\n        Direction::West  => "Going West",\n    }\n}\n\nfn main() {\n    println!("{}", describe(Direction::North));\n}`,
    },
    "Binary Search": {
      description: "Binary search O(log n)",
      category: "Searching",
      code: `fn binary_search(arr: &[i32], target: i32) -> Option<usize> {\n    let (mut lo, mut hi) = (0, arr.len());\n    while lo < hi {\n        let mid = lo + (hi - lo) / 2;\n        match arr[mid].cmp(&target) {\n            std::cmp::Ordering::Equal => return Some(mid),\n            std::cmp::Ordering::Less  => lo = mid + 1,\n            std::cmp::Ordering::Greater => hi = mid,\n        }\n    }\n    None\n}\n\nfn main() {\n    let arr = [1,3,5,7,9,11];\n    println!("{:?}", binary_search(&arr, 7));  // Some(3)\n    println!("{:?}", binary_search(&arr, 4));  // None\n}`,
    },
    "Merge Sort": {
      description: "Merge sort O(n log n)",
      category: "Sorting",
      code: `fn merge_sort(arr: Vec<i32>) -> Vec<i32> {\n    if arr.len() <= 1 { return arr; }\n    let mid = arr.len() / 2;\n    let l = merge_sort(arr[..mid].to_vec());\n    let r = merge_sort(arr[mid..].to_vec());\n    merge(l, r)\n}\n\nfn merge(l: Vec<i32>, r: Vec<i32>) -> Vec<i32> {\n    let (mut i, mut j) = (0, 0);\n    let mut res = vec![];\n    while i < l.len() && j < r.len() {\n        if l[i] <= r[j] { res.push(l[i]); i += 1; }\n        else             { res.push(r[j]); j += 1; }\n    }\n    res.extend_from_slice(&l[i..]);\n    res.extend_from_slice(&r[j..]);\n    res\n}\n\nfn main() {\n    println!("{:?}", merge_sort(vec![5,3,8,1,2])); // [1,2,3,5,8]\n}`,
    },
  },
};

export function getTemplatesForLanguage(language) {
  return templates[language] || {};
}

export function getCategoriesForLanguage(language) {
  const tmpl = templates[language] || {};
  const cats = new Set(Object.values(tmpl).map((t) => t.category));
  return ["All", ...cats];
}
