export class InvalidCredentialsError extends Error {
  constructor() {
    super("Identifiants invalides");
    this.name = "InvalidCredentialsError";
  }
}

export class AccountSuspendedError extends Error {
  constructor() {
    super("Ce compte est suspendu");
    this.name = "AccountSuspendedError";
  }
}

export class AccountPendingError extends Error {
  constructor() {
    super("Ce compte est en attente d'activation");
    this.name = "AccountPendingError";
  }
}

export class RefreshTokenInvalidError extends Error {
  constructor() {
    super("Refresh token invalide ou expiré");
    this.name = "RefreshTokenInvalidError";
  }
}
