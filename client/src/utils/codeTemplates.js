// src/utils/codeTemplates.js

const templates = {
  javascript: {
    "Hello World": {
      description: "Simple Hello World program",
      code: `console.log("Hello, World!");`,
    },
    "Function Template": {
      description: "Basic function structure",
      code: `function myFunction(param) {\n  // Your code here\n  return param;\n}\n\nmyFunction("test");`,
    },
    "Array Map": {
      description: "Array map example",
      code: `const numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(num => num * 2);\nconsole.log(doubled);`,
    },
    "Async/Await": {
      description: "Async function template",
      code: `async function fetchData() {\n  try {\n    const response = await fetch('https://api.example.com/data');\n    const data = await response.json();\n    console.log(data);\n  } catch (error) {\n    console.error('Error:', error);\n  }\n}\n\nfetchData();`,
    },
    "Class Template": {
      description: "ES6 class structure",
      code: `class MyClass {\n  constructor(name) {\n    this.name = name;\n  }\n\n  greet() {\n    console.log(\`Hello, \${this.name}!\`);\n  }\n}\n\nconst instance = new MyClass("World");\ninstance.greet();`,
    },
  },
  python: {
    "Hello World": {
      description: "Simple Hello World program",
      code: `print("Hello, World!")`,
    },
    "Function Template": {
      description: "Basic function structure",
      code: `def my_function(param):\n    # Your code here\n    return param\n\nresult = my_function("test")\nprint(result)`,
    },
    "List Comprehension": {
      description: "List comprehension example",
      code: `numbers = [1, 2, 3, 4, 5]\ndoubled = [num * 2 for num in numbers]\nprint(doubled)`,
    },
    "Class Template": {
      description: "Python class structure",
      code: `class MyClass:\n    def __init__(self, name):\n        self.name = name\n    \n    def greet(self):\n        print(f"Hello, {self.name}!")\n\ninstance = MyClass("World")\ninstance.greet()`,
    },
    "File I/O": {
      description: "Read and write files",
      code: `# Write to file\nwith open('file.txt', 'w') as f:\n    f.write("Hello, World!")\n\n# Read from file\nwith open('file.txt', 'r') as f:\n    content = f.read()\n    print(content)`,
    },
  },
  java: {
    "Hello World": {
      description: "Simple Hello World program",
      code: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
    },
    "Class Template": {
      description: "Java class structure",
      code: `public class MyClass {\n    private String name;\n    \n    public MyClass(String name) {\n        this.name = name;\n    }\n    \n    public void greet() {\n        System.out.println("Hello, " + name + "!");\n    }\n    \n    public static void main(String[] args) {\n        MyClass instance = new MyClass("World");\n        instance.greet();\n    }\n}`,
    },
    "ArrayList Example": {
      description: "Working with ArrayList",
      code: `import java.util.ArrayList;\n\npublic class Main {\n    public static void main(String[] args) {\n        ArrayList<Integer> numbers = new ArrayList<>();\n        numbers.add(1);\n        numbers.add(2);\n        numbers.add(3);\n        \n        for (int num : numbers) {\n            System.out.println(num * 2);\n        }\n    }\n}`,
    },
  },
  cpp: {
    "Hello World": {
      description: "Simple Hello World program",
      code: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
    },
    "Function Template": {
      description: "Basic function structure",
      code: `#include <iostream>\n\nint myFunction(int param) {\n    // Your code here\n    return param;\n}\n\nint main() {\n    int result = myFunction(42);\n    std::cout << result << std::endl;\n    return 0;\n}`,
    },
    "Vector Example": {
      description: "Working with vectors",
      code: `#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> numbers = {1, 2, 3, 4, 5};\n    \n    for (int num : numbers) {\n        std::cout << num * 2 << " ";\n    }\n    std::cout << std::endl;\n    return 0;\n}`,
    },
  },
  c: {
    "Hello World": {
      description: "Simple Hello World program",
      code: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`,
    },
    "Function Template": {
      description: "Basic function structure",
      code: `#include <stdio.h>\n\nint myFunction(int param) {\n    // Your code here\n    return param;\n}\n\nint main() {\n    int result = myFunction(42);\n    printf("%d\\n", result);\n    return 0;\n}`,
    },
  },
  go: {
    "Hello World": {
      description: "Simple Hello World program",
      code: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}`,
    },
    "Function Template": {
      description: "Basic function structure",
      code: `package main\n\nimport "fmt"\n\nfunc myFunction(param string) string {\n    // Your code here\n    return param\n}\n\nfunc main() {\n    result := myFunction("test")\n    fmt.Println(result)\n}`,
    },
  },
  rust: {
    "Hello World": {
      description: "Simple Hello World program",
      code: `fn main() {\n    println!("Hello, World!");\n}`,
    },
    "Function Template": {
      description: "Basic function structure",
      code: `fn my_function(param: i32) -> i32 {\n    // Your code here\n    param\n}\n\nfn main() {\n    let result = my_function(42);\n    println!("{}", result);\n}`,
    },
  },
  typescript: {
    "Hello World": {
      description: "Simple Hello World program",
      code: `console.log("Hello, World!");`,
    },
    "Function Template": {
      description: "Basic function with types",
      code: `function myFunction(param: string): string {\n  // Your code here\n  return param;\n}\n\nconst result = myFunction("test");\nconsole.log(result);`,
    },
    "Interface Example": {
      description: "TypeScript interface",
      code: `interface User {\n  name: string;\n  age: number;\n}\n\nfunction greetUser(user: User): void {\n  console.log(\`Hello, \${user.name}!\`);\n}\n\nconst user: User = { name: "Alice", age: 30 };\ngreetUser(user);`,
    },
  },
};

export function getTemplatesForLanguage(language) {
  return templates[language] || {};
}
