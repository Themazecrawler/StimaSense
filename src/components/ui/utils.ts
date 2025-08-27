export function cn(..._inputs: Array<string | undefined | null | false>) {
  return _inputs.filter(Boolean).join(' ');
}
