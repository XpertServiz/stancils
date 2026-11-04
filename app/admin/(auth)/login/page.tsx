import type { Metadata } from "next";
import { LoginCard } from "./LoginCard";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default function AdminLogin() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <LoginCard />
    </div>
  );
}
