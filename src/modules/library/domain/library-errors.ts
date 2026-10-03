import { ApplicationError } from "@/shared/errors/application-error";

/** Library's flavour of the shared application error, kept so adapters can still tell where a failure came from. */
export class LibraryCommandError extends ApplicationError {}
