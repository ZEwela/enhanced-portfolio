// app/api/admin/verify/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Server-side environment variables (no NEXT_PUBLIC_ prefix)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((email) => email.trim())
  : [];

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const isAdmin = user.email ? ADMIN_EMAILS.includes(user.email) : false;

    return NextResponse.json({
      isAdmin,
      user: { email: user.email },
    });
  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
