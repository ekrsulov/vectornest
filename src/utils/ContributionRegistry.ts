/**
 * Generic base class for contribution registries.
 *
 * Provides the shared register/unregister/getContributions pattern used by
 * defsContributionRegistry, animationContributionRegistry, paintContributionRegistry,
 * definitionTranslationRegistry, and others.
 *
 * Subclasses only need to add domain-specific query/aggregation methods.
 *
 * @template T  Contribution item type — must have an `id: string` field.
 */
export class ContributionRegistry<T extends { id: string }> {
  protected contributions: T[] = [];

  /**
   * Override to customise the deduplication key (default: `item.id`).
   * Useful when uniqueness is determined by a composite key (e.g. pluginId + contribution.id).
   */
  protected getKey(item: T): string {
    return item.id;
  }

  /** Register or replace a contribution. */
  register(item: T): void {
    const key = this.getKey(item);
    const idx = this.contributions.findIndex((c) => this.getKey(c) === key);
    if (idx >= 0) {
      this.contributions[idx] = item;
    } else {
      this.contributions.push(item);
    }
  }

  /** Remove a contribution by its key. */
  unregister(id: string): void {
    this.contributions = this.contributions.filter((c) => this.getKey(c) !== id);
  }

  /** Return a shallow copy of all contributions. */
  getContributions(): T[] {
    return [...this.contributions];
  }
}
