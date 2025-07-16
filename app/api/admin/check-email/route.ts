import { NextResponse } from "next/server";

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((email) =>
      email.trim().toLowerCase()
    )
  : [];

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const isAllowed = email && ADMIN_EMAILS.includes(email.toLowerCase());

    return NextResponse.json({ allowed: isAllowed });
  } catch (error) {
    console.error("Error checking admin email:", error);
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}
