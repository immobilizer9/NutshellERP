import { redirect } from "next/navigation";

// /users redirects to the canonical /admin/users page
export default function UsersRedirect() {
  redirect("/admin/users");
}
