// Tracks the "primary" station for a single chat request — the one whose
// Maps + Waze buttons (and optional focusStationId) are attached to the final
// reply. Rule: first valid result wins, never overwritten. Subsequent tool
// calls do NOT override the primary station — the driver may have asked the
// bot to compare two stations, but the FIRST one mentioned is what we route to.
export class PrimaryStationTracker {
  private primaryStationId: string | null = null;

  record(
    toolName: 'find_stations' | 'get_directions',
    result: unknown,
  ): void {
    if (this.primaryStationId !== null) return; // never overwrite

    if (toolName === 'find_stations') {
      if (!isRecord(result)) return;
      if ('error' in result) return;
      const list = (result as { results?: unknown }).results;
      if (!Array.isArray(list) || list.length === 0) return;
      const first = list[0];
      if (isRecord(first) && typeof first.id === 'string') {
        this.primaryStationId = first.id;
      }
      return;
    }

    if (toolName === 'get_directions') {
      if (!isRecord(result)) return;
      if ('error' in result) return;
      if (typeof result.id === 'string') {
        this.primaryStationId = result.id;
      }
    }
  }

  get(): string | null {
    return this.primaryStationId;
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}
