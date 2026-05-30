import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  type Firestore,
} from "firebase/firestore";
import type { Meeting, MeetingInput } from "./types";

export async function createMeeting(
  db: Firestore,
  data: MeetingInput,
): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, "meetings"), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function getMeetings(db: Firestore): Promise<Meeting[]> {
  const q = query(collection(db, "meetings"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Meeting));
}

export async function getMeeting(
  db: Firestore,
  id: string,
): Promise<Meeting | null> {
  const snap = await getDoc(doc(db, "meetings", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Meeting;
}

export async function updateMeeting(
  db: Firestore,
  id: string,
  data: Partial<MeetingInput>,
): Promise<void> {
  await updateDoc(doc(db, "meetings", id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteMeeting(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, "meetings", id));
}
