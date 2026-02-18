// src/utils/interviewProblems.js - COMPLETE WITH ALL LANGUAGES

export const INTERVIEW_PROBLEMS = {
  easy: [
    {
      id: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      description:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
      examples: [
        {
          input: "nums = [2,7,11,15], target = 9",
          output: "[0,1]",
          explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
        },
        {
          input: "nums = [3,2,4], target = 6",
          output: "[1,2]",
        },
      ],
      constraints: [
        "2 <= nums.length <= 104",
        "-109 <= nums[i] <= 109",
        "-109 <= target <= 109",
        "Only one valid answer exists.",
      ],
      starterCode: {
        javascript: `function twoSum(nums, target) {
    // Your code here
    
}

// Test
console.log(twoSum([2,7,11,15], 9)); // Expected: [0,1]`,
        python: `def two_sum(nums, target):
    # Your code here
    pass

# Test
print(two_sum([2,7,11,15], 9))  # Expected: [0,1]`,
        java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] result = sol.twoSum(new int[]{2,7,11,15}, 9);
        System.out.println(java.util.Arrays.toString(result));
    }
}`,
        cpp: `#include <iostream>
#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Your code here
    
}

int main() {
    vector<int> nums = {2,7,11,15};
    vector<int> result = twoSum(nums, 9);
    cout << "[" << result[0] << "," << result[1] << "]" << endl;
    return 0;
}`,
        c: `#include <stdio.h>
#include <stdlib.h>

int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    // Your code here
    
}

int main() {
    int nums[] = {2,7,11,15};
    int returnSize;
    int* result = twoSum(nums, 4, 9, &returnSize);
    printf("[%d,%d]\\n", result[0], result[1]);
    return 0;
}`,
      },
      testCases: [
        { input: "[2,7,11,15], 9", expectedOutput: "[0,1]" },
        { input: "[3,2,4], 6", expectedOutput: "[1,2]" },
        { input: "[3,3], 6", expectedOutput: "[0,1]" },
      ],
    },
    {
      id: "palindrome-number",
      title: "Palindrome Number",
      difficulty: "easy",
      description:
        "Given an integer x, return true if x is a palindrome, and false otherwise. An integer is a palindrome when it reads the same backward as forward.",
      examples: [
        {
          input: "x = 121",
          output: "true",
          explanation:
            "121 reads as 121 from left to right and from right to left.",
        },
        {
          input: "x = -121",
          output: "false",
          explanation:
            "From left to right, it reads -121. From right to left, it becomes 121-.",
        },
      ],
      starterCode: {
        javascript: `function isPalindrome(x) {
    // Your code here
    
}

// Test
console.log(isPalindrome(121));  // Expected: true
console.log(isPalindrome(-121)); // Expected: false`,
        python: `def is_palindrome(x):
    # Your code here
    pass

# Test
print(is_palindrome(121))   # Expected: True
print(is_palindrome(-121))  # Expected: False`,
        java: `class Solution {
    public boolean isPalindrome(int x) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.isPalindrome(121));
        System.out.println(sol.isPalindrome(-121));
    }
}`,
        cpp: `#include <iostream>
using namespace std;

bool isPalindrome(int x) {
    // Your code here
    
}

int main() {
    cout << (isPalindrome(121) ? "true" : "false") << endl;
    cout << (isPalindrome(-121) ? "true" : "false") << endl;
    return 0;
}`,
        c: `#include <stdio.h>
#include <stdbool.h>

bool isPalindrome(int x) {
    // Your code here
    
}

int main() {
    printf("%s\\n", isPalindrome(121) ? "true" : "false");
    printf("%s\\n", isPalindrome(-121) ? "true" : "false");
    return 0;
}`,
      },
      testCases: [
        { input: "121", expectedOutput: "true" },
        { input: "-121", expectedOutput: "false" },
        { input: "10", expectedOutput: "false" },
      ],
    },
    {
      id: "reverse-string",
      title: "Reverse String",
      difficulty: "easy",
      description:
        "Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.",
      examples: [
        {
          input: 's = ["h","e","l","l","o"]',
          output: '["o","l","l","e","h"]',
        },
      ],
      starterCode: {
        javascript: `function reverseString(s) {
    // Your code here
    
}

// Test
let s = ["h","e","l","l","o"];
reverseString(s);
console.log(s); // Expected: ["o","l","l","e","h"]`,
        python: `def reverse_string(s):
    # Your code here
    pass

# Test
s = ["h","e","l","l","o"]
reverse_string(s)
print(s)  # Expected: ["o","l","l","e","h"]`,
        java: `class Solution {
    public void reverseString(char[] s) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        char[] s = {'h','e','l','l','o'};
        sol.reverseString(s);
        System.out.println(java.util.Arrays.toString(s));
    }
}`,
        cpp: `#include <iostream>
#include <vector>
using namespace std;

void reverseString(vector<char>& s) {
    // Your code here
    
}

int main() {
    vector<char> s = {'h','e','l','l','o'};
    reverseString(s);
    for(char c : s) cout << c << " ";
    cout << endl;
    return 0;
}`,
        c: `#include <stdio.h>

void reverseString(char* s, int sSize) {
    // Your code here
    
}

int main() {
    char s[] = {'h','e','l','l','o'};
    reverseString(s, 5);
    for(int i = 0; i < 5; i++) printf("%c ", s[i]);
    printf("\\n");
    return 0;
}`,
      },
      testCases: [
        {
          input: '["h","e","l","l","o"]',
          expectedOutput: '["o","l","l","e","h"]',
        },
        {
          input: '["H","a","n","n","a","h"]',
          expectedOutput: '["h","a","n","n","a","H"]',
        },
      ],
    },
  ],
  medium: [
    {
      id: "group-anagrams",
      title: "Group Anagrams",
      difficulty: "medium",
      description:
        "Given an array of strings strs, group the anagrams together. You can return the answer in any order. An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase.",
      examples: [
        {
          input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
          output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
        },
      ],
      starterCode: {
        javascript: `function groupAnagrams(strs) {
    // Your code here
    
}

// Test
console.log(groupAnagrams(["eat","tea","tan","ate","nat","bat"]));`,
        python: `def group_anagrams(strs):
    # Your code here
    pass

# Test
print(group_anagrams(["eat","tea","tan","ate","nat","bat"]))`,
        java: `import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        String[] strs = {"eat","tea","tan","ate","nat","bat"};
        System.out.println(sol.groupAnagrams(strs));
    }
}`,
        cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

vector<vector<string>> groupAnagrams(vector<string>& strs) {
    // Your code here
    
}

int main() {
    vector<string> strs = {"eat","tea","tan","ate","nat","bat"};
    auto result = groupAnagrams(strs);
    // Print result
    return 0;
}`,
        c: `#include <stdio.h>
#include <string.h>

// Note: C implementation would be more complex
// Consider using a simpler language for this problem

int main() {
    char* strs[] = {"eat","tea","tan","ate","nat","bat"};
    // Your code here
    return 0;
}`,
      },
      testCases: [
        {
          input: '["eat","tea","tan","ate","nat","bat"]',
          expectedOutput: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
        },
      ],
    },
    {
      id: "longest-substring",
      title: "Longest Substring Without Repeating Characters",
      difficulty: "medium",
      description:
        "Given a string s, find the length of the longest substring without repeating characters.",
      examples: [
        {
          input: 's = "abcabcbb"',
          output: "3",
          explanation: 'The answer is "abc", with the length of 3.',
        },
      ],
      starterCode: {
        javascript: `function lengthOfLongestSubstring(s) {
    // Your code here
    
}

// Test
console.log(lengthOfLongestSubstring("abcabcbb")); // Expected: 3`,
        python: `def length_of_longest_substring(s):
    # Your code here
    pass

# Test
print(length_of_longest_substring("abcabcbb"))  # Expected: 3`,
        java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.lengthOfLongestSubstring("abcabcbb"));
    }
}`,
        cpp: `#include <iostream>
#include <string>
using namespace std;

int lengthOfLongestSubstring(string s) {
    // Your code here
    
}

int main() {
    cout << lengthOfLongestSubstring("abcabcbb") << endl;
    return 0;
}`,
        c: `#include <stdio.h>
#include <string.h>

int lengthOfLongestSubstring(char* s) {
    // Your code here
    
}

int main() {
    printf("%d\\n", lengthOfLongestSubstring("abcabcbb"));
    return 0;
}`,
      },
      testCases: [
        { input: '"abcabcbb"', expectedOutput: "3" },
        { input: '"bbbbb"', expectedOutput: "1" },
        { input: '"pwwkew"', expectedOutput: "3" },
      ],
    },
  ],
  hard: [
    {
      id: "median-sorted-arrays",
      title: "Median of Two Sorted Arrays",
      difficulty: "hard",
      description:
        "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
      examples: [
        {
          input: "nums1 = [1,3], nums2 = [2]",
          output: "2.00000",
          explanation: "merged array = [1,2,3] and median is 2.",
        },
      ],
      starterCode: {
        javascript: `function findMedianSortedArrays(nums1, nums2) {
    // Your code here
    
}

// Test
console.log(findMedianSortedArrays([1,3], [2])); // Expected: 2.0`,
        python: `def find_median_sorted_arrays(nums1, nums2):
    # Your code here
    pass

# Test
print(find_median_sorted_arrays([1,3], [2]))  # Expected: 2.0`,
        java: `class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] nums1 = {1,3};
        int[] nums2 = {2};
        System.out.println(sol.findMedianSortedArrays(nums1, nums2));
    }
}`,
        cpp: `#include <iostream>
#include <vector>
using namespace std;

double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
    // Your code here
    
}

int main() {
    vector<int> nums1 = {1,3};
    vector<int> nums2 = {2};
    cout << findMedianSortedArrays(nums1, nums2) << endl;
    return 0;
}`,
        c: `#include <stdio.h>

double findMedianSortedArrays(int* nums1, int nums1Size, int* nums2, int nums2Size) {
    // Your code here
    
}

int main() {
    int nums1[] = {1,3};
    int nums2[] = {2};
    printf("%.5f\\n", findMedianSortedArrays(nums1, 2, nums2, 1));
    return 0;
}`,
      },
      testCases: [
        { input: "[1,3], [2]", expectedOutput: "2.00000" },
        { input: "[1,2], [3,4]", expectedOutput: "2.50000" },
      ],
    },
    {
      id: "trapping-rain-water",
      title: "Trapping Rain Water",
      difficulty: "hard",
      description:
        "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
      examples: [
        {
          input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
          output: "6",
          explanation: "The elevation map traps 6 units of rain water.",
        },
      ],
      starterCode: {
        javascript: `function trap(height) {
    // Your code here
    
}

// Test
console.log(trap([0,1,0,2,1,0,1,3,2,1,2,1])); // Expected: 6`,
        python: `def trap(height):
    # Your code here
    pass

# Test
print(trap([0,1,0,2,1,0,1,3,2,1,2,1]))  # Expected: 6`,
        java: `class Solution {
    public int trap(int[] height) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] height = {0,1,0,2,1,0,1,3,2,1,2,1};
        System.out.println(sol.trap(height));
    }
}`,
        cpp: `#include <iostream>
#include <vector>
using namespace std;

int trap(vector<int>& height) {
    // Your code here
    
}

int main() {
    vector<int> height = {0,1,0,2,1,0,1,3,2,1,2,1};
    cout << trap(height) << endl;
    return 0;
}`,
        c: `#include <stdio.h>

int trap(int* height, int heightSize) {
    // Your code here
    
}

int main() {
    int height[] = {0,1,0,2,1,0,1,3,2,1,2,1};
    printf("%d\\n", trap(height, 12));
    return 0;
}`,
      },
      testCases: [
        { input: "[0,1,0,2,1,0,1,3,2,1,2,1]", expectedOutput: "6" },
        { input: "[4,2,0,3,2,5]", expectedOutput: "9" },
      ],
    },
  ],
};

export function getRandomProblem(difficulty) {
  const problems = INTERVIEW_PROBLEMS[difficulty];
  return problems[Math.floor(Math.random() * problems.length)];
}

export function getAllProblems() {
  return {
    easy: INTERVIEW_PROBLEMS.easy,
    medium: INTERVIEW_PROBLEMS.medium,
    hard: INTERVIEW_PROBLEMS.hard,
  };
}
