import { SignInButton } from "@/app/auth/sign-in/SignInButton";
import { describeSignInError } from "@/modules/auth/ui/sign-in-errors";
import { NoderaSignInExperience } from "@/modules/auth/ui/NoderaSignInExperience";

type SignInPageProps = Readonly<{ searchParams: Promise<{ error?: string | string[] }> }>;

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;

  return (
    <NoderaSignInExperience signInAction={<SignInButton initialNotice={describeSignInError(Array.isArray(error) ? error[0] : error)} />} />
  );
}
