import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/shared/auth/auth";

const handler = toNextJsHandler(auth);

export const dynamic = "force-dynamic";

export const { GET, POST, PUT, PATCH, DELETE } = handler;
