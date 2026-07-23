export type RawStrategicRecord = {
  externalObjectId: string;
  objectType?: string;
  countyFips?: string | null;
  placeGeoid?: string | null;
  countyName?: string | null;
  placeName?: string | null;
  factKind?: string;
  factValue?: string;
  factUnits?: string | null;
  updatedAt?: string | null;
  focusArea?: string | null;
  [key: string]: unknown;
};

export type NormalizedStrategicRecord = {
  externalObjectId: string;
  objectType: string;
  countyFips: string | null;
  placeGeoid: string | null;
  countyName: string | null;
  placeName: string | null;
  factKind: string;
  factValue: string;
  factUnits: string | null;
  focusArea: string | null;
  remoteUpdatedAt: string | null;
  allowedFields: Record<string, unknown>;
  fingerprint: string;
  privacyClassification: string;
  excludedFieldCount: number;
  excludedFields: string[];
  mappingVersion: string;
  privacyAllowlistVersion: string;
};

export type RedDirtConnectionState =
  | "NOT_CONFIGURED"
  | "DISABLED"
  | "CONFIGURED_UNVERIFIED"
  | "DOCUMENTATION_PENDING"
  | "VERIFIED"
  | "DEGRADED"
  | "ERROR";

export type RedDirtErrorCategory =
  | "NOT_CONFIGURED"
  | "DISABLED"
  | "DOCUMENTATION_PENDING"
  | "VALIDATION"
  | "AUTH"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "NETWORK"
  | "UNSUPPORTED";
