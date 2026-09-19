/**
 * Revision day first, then publication day, then a locale-independent slug tie-break.
 * @param {{id: string, data: {date: Date, updated?: Date}}} a
 * @param {{id: string, data: {date: Date, updated?: Date}}} b
 */
export function comparePosts(a, b) {
  return (b.data.updated ?? b.data.date).valueOf() - (a.data.updated ?? a.data.date).valueOf()
    || b.data.date.valueOf() - a.data.date.valueOf()
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
