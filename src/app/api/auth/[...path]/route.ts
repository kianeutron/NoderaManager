import { getDashboardAuth } from "@/shared/auth/dashboard-auth";

type AuthRouteContext = Readonly<{ params: Promise<{ path: string[] }> }>;

export const dynamic = "force-dynamic";

async function isSignUpRequest(context: AuthRouteContext): Promise<boolean> {
  const { path } = await context.params;
  return path[0] === "sign-up";
}

function signUpDisabledResponse(): Response {
  return Response.json({ code: "SIGN_UP_DISABLED" }, { status: 403, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, context: AuthRouteContext): Promise<Response> {
  return getDashboardAuth().handler().GET(request, context);
}

export async function POST(request: Request, context: AuthRouteContext): Promise<Response> {
  if (await isSignUpRequest(context)) return signUpDisabledResponse();
  return getDashboardAuth().handler().POST(request, context);
}

export async function PUT(request: Request, context: AuthRouteContext): Promise<Response> {
  return getDashboardAuth().handler().PUT(request, context);
}

export async function PATCH(request: Request, context: AuthRouteContext): Promise<Response> {
  return getDashboardAuth().handler().PATCH(request, context);
}

export async function DELETE(request: Request, context: AuthRouteContext): Promise<Response> {
  return getDashboardAuth().handler().DELETE(request, context);
}
