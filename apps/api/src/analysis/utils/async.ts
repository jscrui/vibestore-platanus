export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const safeConcurrency = Math.max(1, concurrency);
  const results: R[] = new Array(items.length);
  let current = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = current;
      current += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(safeConcurrency, items.length) }, () =>
    worker(),
  );

  await Promise.all(workers);
  return results;
}
