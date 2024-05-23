const UNAUTHORIZED_ERROR = 'Unauthorized: Please sign in again.';

export class UnauthorizedError extends Error {
  constructor() {
    super(UNAUTHORIZED_ERROR);
    this.name = 'UnauthorizedError';
  }
}
