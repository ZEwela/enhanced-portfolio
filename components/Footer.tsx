"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export default function Footer() {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          setSession(data.session);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogin = async () => {
    try {
      const email = prompt("Enter your admin email:");
      if (!email) return;

      // Check if email is in the allowed list
      const res = await fetch("/api/admin/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await res.json();

      if (!result.allowed) {
        alert("Access denied. You're not on the admin list.");
        return;
      }

      setError(null);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      alert("Check your email for the login link.");
    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <footer className="w-full py-4 border-t mt-10 flex justify-between px-6 items-center text-sm text-gray-600 bg-gray-50">
        <p>&copy; {new Date().getFullYear()} Your Site</p>
        <div>Loading...</div>
      </footer>
    );
  }

  return (
    <footer className="w-full py-4 border-t mt-10 flex justify-between px-6 items-center text-sm text-gray-600 bg-gray-50">
      <p>&copy; {new Date().getFullYear()} Your Site</p>
      <div>
        {error && (
          <span className="text-red-500 mr-4 text-xs">Error: {error}</span>
        )}
        {session ? (
          <>
            <span className="mr-4">Logged in as {session.user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-blue-600 hover:underline"
            >
              Log out
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            className="text-blue-600 hover:underline"
          >
            Admin Login
          </button>
        )}
      </div>
    </footer>
  );
}
