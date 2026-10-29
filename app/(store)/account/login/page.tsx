import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { LoginForm, RegisterForm } from "@/components/store/AuthForms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCustomer()) redirect("/account");
  const sp = await searchParams;
  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-2">
      <LoginForm next={sp.next} />
      <RegisterForm />
    </div>
  );
}
