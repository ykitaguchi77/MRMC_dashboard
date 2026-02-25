import { AuthGuard } from "@/components/auth-guard";

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
