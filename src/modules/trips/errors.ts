export class OfflineMutationError extends Error {
  constructor() {
    super("Trip changes are unavailable while offline");
    this.name = "OfflineMutationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to change this trip") {
    super(message);
    this.name = "AuthorizationError";
  }
}
