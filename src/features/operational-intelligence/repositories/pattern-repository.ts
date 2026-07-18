export type PatternSignalWrite = {
  patternType: string;
  scopeType: string;
  scopeKey: string;
  sampleSize: number;
  confidence: number;
  signalValue: unknown;
  calculationVersion: string;
};

export async function persistPatternSignals(
  _signals: PatternSignalWrite[],
): Promise<{ ok: false; code: "AUTHENTICATION_REQUIRED" }> {
  void _signals;
  return { ok: false, code: "AUTHENTICATION_REQUIRED" };
}
