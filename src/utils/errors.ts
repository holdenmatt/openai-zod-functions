/**
 * Extend Error to include an HTTP status code and optional source info.
 */
export class HttpError extends Error {
  /**
   * HTTP status code.
   */
  status: number;

  /**
   * Optional string indicating an external source of the error, such as "OpenAI".
   */
  source?: string;

  constructor(message: string, status: number = 500, source?: string) {
    super(message);
    this.status = status;
    this.source = source;
    this.name = this.constructor.name;
  }
}
