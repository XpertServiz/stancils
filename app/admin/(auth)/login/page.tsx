import type { Metadata } from "next";
import { LoginCard } from "./LoginCard";
import { AdminFrame } from "@/components/admin/AdminFrame";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default function AdminLogin() {
  return (
    <AdminFrame><div className="grid min-h-screen place-items-center bg-bg px-4"><LoginCard /></div></AdminFrame>
  );
}
