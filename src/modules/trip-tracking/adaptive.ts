export type MovementMode = "STATIONARY" | "WALKING" | "FAST_MOVING";

export interface LocationObservation {
  latitude: number;
  longitude: number;
  recordedAtMs: number;
  accuracyMeters: number;
  speedMetersPerSecond?: number;
}

export interface AdaptiveTrackingState {
  mode: MovementMode;
  candidateMode?: MovementMode;
  candidateCount: number;
  candidateSinceMs?: number;
  lastObservation?: LocationObservation;
  lastAccepted?: LocationObservation;
}

export interface AdaptiveTrackingDecision {
  accept: boolean;
  mode: MovementMode;
  effectiveSpeedMetersPerSecond: number;
  distanceFromLastAcceptedMeters: number;
  state: AdaptiveTrackingState;
}

const walkingDistanceMeters = 25;
const fastMovingDistanceMeters = 75;
const stationaryMovementMeters = 100;
const stationaryHeartbeatMs = 15 * 60_000;
const walkingHeartbeatMs = 90_000;
const fastMovingHeartbeatMs = 120_000;
const maximumUsefulAccuracyMeters = 75;
const walkingSpeedMetersPerSecond = 0.6;
const fastMovingSpeedMetersPerSecond = 3.5;
const movingConfirmationCount = 3;
const stationaryConfirmationCount = 4;
const movingConfirmationDurationMs = 15_000;
const stationaryConfirmationDurationMs = 120_000;

export function createAdaptiveTrackingState(): AdaptiveTrackingState {
  return { mode: "STATIONARY", candidateCount: 0 };
}

export function evaluateLocationObservation(
  current: AdaptiveTrackingState,
  observation: LocationObservation,
): AdaptiveTrackingDecision {
  if (!isUsableObservation(observation, current.lastObservation)) {
    return decision(false, current, 0, 0);
  }

  const previousObservation = current.lastObservation;
  const effectiveSpeed = calculateEffectiveSpeed(previousObservation, observation);
  const observedMode = classifyMovement(previousObservation, observation, effectiveSpeed);
  const transitioned = transition(current, observedMode, observation.recordedAtMs);
  const distanceFromLastAccepted = current.lastAccepted
    ? distanceMeters(current.lastAccepted, observation)
    : Number.POSITIVE_INFINITY;
  const elapsedSinceAccepted = current.lastAccepted
    ? observation.recordedAtMs - current.lastAccepted.recordedAtMs
    : Number.POSITIVE_INFINITY;
  const modeChanged = transitioned.mode !== current.mode;
  const accept = shouldAccept(
    transitioned.mode,
    distanceFromLastAccepted,
    elapsedSinceAccepted,
    modeChanged,
  );
  const state: AdaptiveTrackingState = {
    ...transitioned,
    lastObservation: observation,
    lastAccepted: accept ? observation : current.lastAccepted,
  };

  return decision(accept, state, effectiveSpeed, distanceFromLastAccepted);
}

export function parseAdaptiveTrackingState(value: unknown): AdaptiveTrackingState {
  if (!isRecord(value) || !isMovementMode(value.mode)) return createAdaptiveTrackingState();
  return {
    mode: value.mode,
    candidateMode: isMovementMode(value.candidateMode) ? value.candidateMode : undefined,
    candidateCount: Number.isSafeInteger(value.candidateCount) && Number(value.candidateCount) >= 0
      ? Number(value.candidateCount)
      : 0,
    candidateSinceMs: finiteNumber(value.candidateSinceMs),
    lastObservation: parseObservation(value.lastObservation),
    lastAccepted: parseObservation(value.lastAccepted),
  };
}

function transition(
  current: AdaptiveTrackingState,
  observedMode: MovementMode,
  recordedAtMs: number,
): AdaptiveTrackingState {
  if (observedMode === current.mode) {
    return { ...current, candidateMode: undefined, candidateCount: 0, candidateSinceMs: undefined };
  }

  const sameCandidate = current.candidateMode === observedMode;
  const candidateCount = sameCandidate ? current.candidateCount + 1 : 1;
  const candidateSinceMs = sameCandidate && current.candidateSinceMs !== undefined
    ? current.candidateSinceMs
    : recordedAtMs;
  const requiredCount = observedMode === "STATIONARY"
    ? stationaryConfirmationCount
    : movingConfirmationCount;
  const requiredDuration = observedMode === "STATIONARY"
    ? stationaryConfirmationDurationMs
    : movingConfirmationDurationMs;

  if (candidateCount >= requiredCount && recordedAtMs - candidateSinceMs >= requiredDuration) {
    return { ...current, mode: observedMode, candidateMode: undefined, candidateCount: 0, candidateSinceMs: undefined };
  }

  return { ...current, candidateMode: observedMode, candidateCount, candidateSinceMs };
}

function classifyMovement(
  previous: LocationObservation | undefined,
  current: LocationObservation,
  effectiveSpeed: number,
): MovementMode {
  if (effectiveSpeed >= fastMovingSpeedMetersPerSecond) return "FAST_MOVING";
  if (effectiveSpeed >= walkingSpeedMetersPerSecond) return "WALKING";
  if (previous) {
    const noiseFloor = Math.max(8, Math.min(30, (previous.accuracyMeters + current.accuracyMeters) / 2));
    if (distanceMeters(previous, current) >= noiseFloor) return "WALKING";
  }
  return "STATIONARY";
}

function calculateEffectiveSpeed(
  previous: LocationObservation | undefined,
  current: LocationObservation,
): number {
  if (current.speedMetersPerSecond !== undefined && current.speedMetersPerSecond >= 0 && current.speedMetersPerSecond <= 80) {
    return current.speedMetersPerSecond;
  }
  if (!previous) return 0;
  const elapsedSeconds = (current.recordedAtMs - previous.recordedAtMs) / 1000;
  if (elapsedSeconds <= 0) return 0;
  const distance = distanceMeters(previous, current);
  const noiseFloor = Math.max(8, Math.min(30, (previous.accuracyMeters + current.accuracyMeters) / 2));
  return distance <= noiseFloor ? 0 : distance / elapsedSeconds;
}

function shouldAccept(
  mode: MovementMode,
  distance: number,
  elapsedMs: number,
  modeChanged: boolean,
): boolean {
  if (!Number.isFinite(distance) || modeChanged) return true;
  if (mode === "WALKING") return distance >= walkingDistanceMeters || elapsedMs >= walkingHeartbeatMs;
  if (mode === "FAST_MOVING") return distance >= fastMovingDistanceMeters || elapsedMs >= fastMovingHeartbeatMs;
  return distance >= stationaryMovementMeters || elapsedMs >= stationaryHeartbeatMs;
}

function isUsableObservation(
  observation: LocationObservation,
  previous: LocationObservation | undefined,
): boolean {
  return Number.isFinite(observation.latitude)
    && observation.latitude >= -90
    && observation.latitude <= 90
    && Number.isFinite(observation.longitude)
    && observation.longitude >= -180
    && observation.longitude <= 180
    && Number.isFinite(observation.recordedAtMs)
    && observation.recordedAtMs > 0
    && Number.isFinite(observation.accuracyMeters)
    && observation.accuracyMeters >= 0
    && observation.accuracyMeters <= maximumUsefulAccuracyMeters
    && (previous === undefined || observation.recordedAtMs > previous.recordedAtMs);
}

function distanceMeters(a: LocationObservation, b: LocationObservation): number {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const latitudeA = radians(a.latitude);
  const latitudeB = radians(b.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function radians(value: number): number {
  return value * Math.PI / 180;
}

function decision(
  accept: boolean,
  state: AdaptiveTrackingState,
  speed: number,
  distance: number,
): AdaptiveTrackingDecision {
  return {
    accept,
    mode: state.mode,
    effectiveSpeedMetersPerSecond: speed,
    distanceFromLastAcceptedMeters: distance,
    state,
  };
}

function parseObservation(value: unknown): LocationObservation | undefined {
  if (!isRecord(value)) return undefined;
  const latitude = finiteNumber(value.latitude);
  const longitude = finiteNumber(value.longitude);
  const recordedAtMs = finiteNumber(value.recordedAtMs);
  const accuracyMeters = finiteNumber(value.accuracyMeters);
  if (latitude === undefined || longitude === undefined || recordedAtMs === undefined || accuracyMeters === undefined) return undefined;
  const observation = {
    latitude,
    longitude,
    recordedAtMs,
    accuracyMeters,
    speedMetersPerSecond: finiteNumber(value.speedMetersPerSecond),
  };
  return isUsableObservation(observation, undefined) ? observation : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMovementMode(value: unknown): value is MovementMode {
  return value === "STATIONARY" || value === "WALKING" || value === "FAST_MOVING";
}

export const adaptiveTrackingThresholds = Object.freeze({
  walkingDistanceMeters,
  fastMovingDistanceMeters,
  stationaryMovementMeters,
  stationaryHeartbeatMs,
  movingConfirmationCount,
  stationaryConfirmationCount,
  movingConfirmationDurationMs,
  stationaryConfirmationDurationMs,
  maximumUsefulAccuracyMeters,
});
