import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const DISPLAY_TEXT_MAX_LENGTH = 20;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateText(
  text: string,
  maxLength = DISPLAY_TEXT_MAX_LENGTH,
): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
