function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickManyUnique<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];

  const selected = new Set<T>();
  while (selected.size < count && copy.length) {
    const i = randInt(0, copy.length - 1);
    const item = copy[i];
    if (!selected.has(item)) {
      selected.add(item);
      out.push(item);
    }
  }
  return out;
}
