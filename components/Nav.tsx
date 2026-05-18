"use client";

/**
 * Nav — left sidebar navigation.
 *
 * Links available to all authenticated users are defined in navLinks[].
 * Admin-only links (User Admin, Relay Types, Type Templates, Database Admin)
 * are rendered conditionally based on session.user.role.
 *
 * The active link is highlighted by comparing pathname with the href,
 * including sub-routes (pathname.startsWith ensures /devices/[id] stays
 * highlighted when the Dashboard link is active, etc.).
 */

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/reports", label: "Protection Reports" },
  { href: "/ansi-device-numbers", label: "ANSI Codes" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    window.location.href = "/";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = (session?.user as any)?.role === "admin";

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-800 text-white flex flex-col h-full">
      <div className="px-4 py-4 border-b border-slate-700">
        <Image src="/logo.jpg" alt="Contact Energy" width={140} height={56} className="rounded" priority />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-2">Protection DB</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navLinks.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <Link
              href="/users"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith("/users")
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              User Admin
            </Link>
            <Link
              href="/parts"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith("/parts")
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              Relay Types
            </Link>
            <Link
              href="/form-templates"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith("/form-templates")
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              Type Templates
            </Link>
            <Link
              href="/admin/database"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith("/admin/database")
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              Database Admin
            </Link>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700">
        {session?.user && (
          <p className="text-xs text-slate-400 truncate mb-2">{session.user.email}</p>
        )}
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
