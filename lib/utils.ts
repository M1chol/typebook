import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let lastCharWasSpace = true; // To track context for smart quotes

export function applyCharacterSwaps(input: string): string {
  let result = "";
  let i = 0;
  while (i < input.length) {
    // Em dash
    if (input.substring(i, i + 2) === "--") {
      result += "—";
      i += 2;
      lastCharWasSpace = false;
      continue;
    }

    // Smart quotes
    if (input[i] === '"') {
      if (lastCharWasSpace) {
        result += "“"; // Opening double quote
      } else {
        result += "”"; // Closing double quote
      }
      lastCharWasSpace = false;
      i++;
      continue;
    }

    if (input[i] === "'") {
      if (lastCharWasSpace) {
        result += "‘"; // Opening single quote
      } else {
        result += "’"; // Closing single quote
      }
      lastCharWasSpace = false;
      i++;
      continue;
    }
    
    // Update lastCharWasSpace for context
    lastCharWasSpace = input[i] === " ";

    result += input[i];
    i++;
  }
  return result;
}
