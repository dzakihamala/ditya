import { parseOS, parseBrowser } from "./ua-parser";
import type { Firestore } from "firebase/firestore";
import {
  doc,
  addDoc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export function normalizeName(name: string): string {
  return name.trim().toUpperCase();
}

export function getDeviceInfo() {
  if (typeof navigator === "undefined") {
    return { os: "Unknown", browser: "Unknown" };
  }
  const ua = navigator.userAgent;
  return {
    os: parseOS(ua),
    browser: parseBrowser(ua),
  };
}

export async function createParticipant(
  db: Firestore,
  meetingId: string,
  data: { name: string; displayName: string; deviceInfo: { os: string; browser: string } },
): Promise<string> {
  const ref = await addDoc(collection(db, "meetings", meetingId, "participants"), {
    name: normalizeName(data.name),
    displayName: data.displayName,
    availability: {},
    deviceInfo: data.deviceInfo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getParticipant(
  db: Firestore,
  meetingId: string,
  participantId: string,
): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, "meetings", meetingId, "participants", participantId));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function saveParticipantAvailability(
  db: Firestore,
  meetingId: string,
  participantId: string,
  availability: Record<string, string[]>,
): Promise<void> {
  await updateDoc(doc(db, "meetings", meetingId, "participants", participantId), {
    availability,
    updatedAt: new Date().toISOString(),
  });
}
