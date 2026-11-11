export class BoardError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
