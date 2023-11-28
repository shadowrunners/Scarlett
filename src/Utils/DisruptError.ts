export class DisruptError extends Error {
	constructor(message: string) {
		super(message);

		this.name = 'DisruptError';
		Error.captureStackTrace(this, this.constructor);
	}
}