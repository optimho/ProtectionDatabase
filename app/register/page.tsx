"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signUp.email({ name, email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Registration failed");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-full flex">
      {/* Left branding panel */}
      <div className="hidden sm:flex w-64 flex-shrink-0 bg-slate-800 flex-col items-start p-6">
        <div className="bg-white rounded-lg p-3 mb-4">
          <Image src="/logo.jpg" alt="Contact Energy" width={130} height={52} priority />
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Protection DB</p>
        <div className="mt-auto">
          <p className="text-xs text-slate-500">Protection Device Database</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="sm:hidden flex justify-center mb-6">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <Image src="/logo.jpg" alt="Contact Energy" width={120} height={48} priority />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-slate-900">Create account</h1>
              <p className="text-sm text-slate-500 mt-1">Protection Device Database</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
            <p className="mt-4 text-sm text-slate-500 text-center">
              Already have an account?{" "}
              <Link href="/" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
