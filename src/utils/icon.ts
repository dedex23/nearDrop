/**
 * Returns true if the icon string is a custom emoji (not a Material icon name).
 * Material icon names are ASCII-only strings like "coffee" or "silverware-fork-knife".
 */
export function isEmoji(icon: string): boolean {
  if (!icon) return false;
  return /[^\u0000-\u007F]/.test(icon);
}
