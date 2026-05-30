import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const auth = getAdminAuth();
    const listResult = await auth.listUsers();
    const users = listResult.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? "",
      displayName: u.displayName ?? "",
      disabled: u.disabled,
    }));
    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 },
      );
    }
    const auth = getAdminAuth();
    const user = await auth.createUser({ email, password });
    return NextResponse.json({ uid: user.uid, email: user.email }, { status: 201 });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("ALREADY_EXISTS") || message.includes("EXISTS")) {
      return NextResponse.json(
        { error: "Email sudah terdaftar." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    if (!uid) {
      return NextResponse.json(
        { error: "UID wajib disertakan." },
        { status: 400 },
      );
    }
    const auth = getAdminAuth();
    await auth.deleteUser(uid);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
