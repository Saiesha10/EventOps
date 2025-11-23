import { redirect } from "next/navigation";

export default function ProtectedMapLayout({ children }: any) {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("user");
    if (!user) redirect("/login");
  }

  return <>{children}</>;
}
