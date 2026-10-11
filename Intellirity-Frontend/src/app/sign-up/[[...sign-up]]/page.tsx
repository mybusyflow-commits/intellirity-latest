import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/site/logo";

/* Rendered on demand only: without Clerk keys this route needs no static HTML. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign up",
  description: "Create an Intellirity account.",
};

export default function SignUpPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 py-16 text-ink">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {/* Appearance is themed with Clerk keys live; defaults until then. */}
        <SignUp />
      </div>
    </div>
  );
}
