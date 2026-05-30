import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { resolve } from "path";

function getServiceAccount() {
  // Vercel / production: read from environment variables
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  // Local dev: read from JSON file
  const keyPath = resolve(process.cwd(), "firebase-adminsdk.json");
  return JSON.parse(readFileSync(keyPath, "utf-8"));
}

function getAdminApp() {
  if (getApps().length) return getApps()[0]!;

  const serviceAccount = getServiceAccount();

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
