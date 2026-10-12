// @ts-check

/**
 * The `.sql` files in `names` not yet recorded in `applied`, in apply (name) order.
 * @param {Iterable<string>} names
 * @param {Iterable<string>} applied
 * @returns {string[]}
 */
export function pendingMigrations(names, applied) {
  const done = new Set(applied);
  return [...names]
    .filter((name) => name.endsWith(".sql") && !done.has(name))
    .sort((a, b) => a.localeCompare(b));
}
