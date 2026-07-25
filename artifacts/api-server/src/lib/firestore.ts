import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

function getFirebaseApp() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      "Firebase config missing. Set FIREBASE_API_KEY and FIREBASE_PROJECT_ID env vars.",
    );
  }
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();
export const firestore: Firestore = getFirestore(app);

function withId<T>(docSnap: DocumentSnapshot<DocumentData>): T & { id: string } {
  return { id: docSnap.id, ...(docSnap.data() as T) };
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  platform: string;
  description: string;
  pricePerThousand: number;
  minQuantity: number;
  maxQuantity: number;
  isActive: boolean;
  createdAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  serviceId: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  createdAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalSpent: number;
  totalAdded: number;
  updatedAt: Date;
}

export interface TopupRequest {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: string;
  createdAt: Date;
}

export interface SettingsItem {
  key: string;
  value: string;
  updatedAt: Date;
}

export interface Session {
  sid: string;
  sess: Record<string, unknown>;
  expire: Date;
}

function dateFromFirestore(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return new Date();
}

function timestampFromDate(value: Date | string | number): Timestamp {
  if (value instanceof Date) return Timestamp.fromDate(value);
  return Timestamp.fromDate(new Date(value));
}

export function userFromDoc(docSnap: DocumentSnapshot<DocumentData>): User {
  const data = docSnap.data() as DocumentData;
  return {
    id: docSnap.id,
    email: (data.email as string | null) ?? null,
    firstName: (data.firstName as string | null) ?? null,
    lastName: (data.lastName as string | null) ?? null,
    profileImageUrl: (data.profileImageUrl as string | null) ?? null,
    createdAt: dateFromFirestore(data.createdAt),
    updatedAt: dateFromFirestore(data.updatedAt),
  };
}

export function userToDoc(user: Partial<User>): DocumentData {
  const data: DocumentData = {};
  if (user.email !== undefined) data.email = user.email;
  if (user.firstName !== undefined) data.firstName = user.firstName;
  if (user.lastName !== undefined) data.lastName = user.lastName;
  if (user.profileImageUrl !== undefined) data.profileImageUrl = user.profileImageUrl;
  if (user.createdAt !== undefined) data.createdAt = timestampFromDate(user.createdAt);
  if (user.updatedAt !== undefined) data.updatedAt = timestampFromDate(user.updatedAt);
  return data;
}

export function serviceFromDoc(docSnap: DocumentSnapshot<DocumentData>): Service {
  const data = docSnap.data() as DocumentData;
  return {
    id: docSnap.id,
    name: (data.name as string) ?? "",
    category: (data.category as string) ?? "",
    platform: (data.platform as string) ?? "",
    description: (data.description as string) ?? "",
    pricePerThousand: toNumber(data.pricePerThousand),
    minQuantity: toNumber(data.minQuantity),
    maxQuantity: toNumber(data.maxQuantity),
    isActive: (data.isActive as boolean) ?? true,
    createdAt: dateFromFirestore(data.createdAt),
  };
}

export function serviceToDoc(data: Partial<Service>): DocumentData {
  const docData: DocumentData = {};
  if (data.name !== undefined) docData.name = data.name;
  if (data.category !== undefined) docData.category = data.category;
  if (data.platform !== undefined) docData.platform = data.platform;
  if (data.description !== undefined) docData.description = data.description;
  if (data.pricePerThousand !== undefined) docData.pricePerThousand = data.pricePerThousand;
  if (data.minQuantity !== undefined) docData.minQuantity = data.minQuantity;
  if (data.maxQuantity !== undefined) docData.maxQuantity = data.maxQuantity;
  if (data.isActive !== undefined) docData.isActive = data.isActive;
  if (data.createdAt !== undefined) docData.createdAt = timestampFromDate(data.createdAt);
  return docData;
}

export function orderFromDoc(docSnap: DocumentSnapshot<DocumentData>): Order {
  const data = docSnap.data() as DocumentData;
  return {
    id: docSnap.id,
    userId: (data.userId as string) ?? "",
    serviceId: (data.serviceId as string) ?? "",
    link: (data.link as string) ?? "",
    quantity: toNumber(data.quantity),
    charge: toNumber(data.charge),
    status: (data.status as string) ?? "Pending",
    createdAt: dateFromFirestore(data.createdAt),
  };
}

export function orderToDoc(data: Partial<Order>): DocumentData {
  const docData: DocumentData = {};
  if (data.userId !== undefined) docData.userId = data.userId;
  if (data.serviceId !== undefined) docData.serviceId = data.serviceId;
  if (data.link !== undefined) docData.link = data.link;
  if (data.quantity !== undefined) docData.quantity = data.quantity;
  if (data.charge !== undefined) docData.charge = data.charge;
  if (data.status !== undefined) docData.status = data.status;
  if (data.createdAt !== undefined) docData.createdAt = timestampFromDate(data.createdAt);
  return docData;
}

export function walletFromDoc(docSnap: DocumentSnapshot<DocumentData>): Wallet {
  const data = docSnap.data() as DocumentData;
  return {
    id: docSnap.id,
    userId: docSnap.id,
    balance: toNumber(data.balance),
    totalSpent: toNumber(data.totalSpent),
    totalAdded: toNumber(data.totalAdded),
    updatedAt: dateFromFirestore(data.updatedAt),
  };
}

export function walletToDoc(data: Partial<Wallet>): DocumentData {
  const docData: DocumentData = {};
  if (data.balance !== undefined) docData.balance = data.balance;
  if (data.totalSpent !== undefined) docData.totalSpent = data.totalSpent;
  if (data.totalAdded !== undefined) docData.totalAdded = data.totalAdded;
  if (data.updatedAt !== undefined) docData.updatedAt = timestampFromDate(data.updatedAt);
  return docData;
}

export function topupFromDoc(docSnap: DocumentSnapshot<DocumentData>): TopupRequest {
  const data = docSnap.data() as DocumentData;
  return {
    id: docSnap.id,
    userId: (data.userId as string) ?? "",
    amount: toNumber(data.amount),
    paymentMethod: (data.paymentMethod as string) ?? "",
    transactionId: (data.transactionId as string) ?? "",
    status: (data.status as string) ?? "Pending",
    createdAt: dateFromFirestore(data.createdAt),
  };
}

export function topupToDoc(data: Partial<TopupRequest>): DocumentData {
  const docData: DocumentData = {};
  if (data.userId !== undefined) docData.userId = data.userId;
  if (data.amount !== undefined) docData.amount = data.amount;
  if (data.paymentMethod !== undefined) docData.paymentMethod = data.paymentMethod;
  if (data.transactionId !== undefined) docData.transactionId = data.transactionId;
  if (data.status !== undefined) docData.status = data.status;
  if (data.createdAt !== undefined) docData.createdAt = timestampFromDate(data.createdAt);
  return docData;
}

export function settingsFromDoc(docSnap: DocumentSnapshot<DocumentData>): SettingsItem {
  const data = docSnap.data() as DocumentData;
  return {
    key: docSnap.id,
    value: (data.value as string) ?? "",
    updatedAt: dateFromFirestore(data.updatedAt),
  };
}

export function settingsToDoc(data: Partial<SettingsItem>): DocumentData {
  const docData: DocumentData = {};
  if (data.value !== undefined) docData.value = data.value;
  if (data.updatedAt !== undefined) docData.updatedAt = timestampFromDate(data.updatedAt);
  return docData;
}

export function sessionFromDoc(docSnap: DocumentSnapshot<DocumentData>): Session {
  const data = docSnap.data() as DocumentData;
  return {
    sid: docSnap.id,
    sess: (data.sess as Record<string, unknown>) ?? {},
    expire: dateFromFirestore(data.expire),
  };
}

export function sessionToDoc(data: Partial<Session>): DocumentData {
  const docData: DocumentData = {};
  if (data.sess !== undefined) docData.sess = data.sess;
  if (data.expire !== undefined) docData.expire = timestampFromDate(data.expire);
  return docData;
}

// Users
export async function upsertUser(user: User): Promise<User> {
  const ref = doc(firestore, "users", user.id);
  await setDoc(ref, userToDoc(user), { merge: true });
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const ref = doc(firestore, "users", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return userFromDoc(snap);
}

export async function getAllUsers(): Promise<User[]> {
  const q = query(collection(firestore, "users"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(userFromDoc);
}

// Wallets
export async function getWalletByUserId(userId: string): Promise<Wallet | null> {
  const ref = doc(firestore, "wallets", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return walletFromDoc(snap);
}

export async function getAllWallets(): Promise<Wallet[]> {
  const snap = await getDocs(collection(firestore, "wallets"));
  return snap.docs.map(walletFromDoc);
}

export async function createWallet(wallet: Wallet): Promise<Wallet> {
  const ref = doc(firestore, "wallets", wallet.userId);
  await setDoc(ref, walletToDoc(wallet));
  return wallet;
}

export async function updateWallet(userId: string, data: Partial<Wallet>): Promise<Wallet> {
  const ref = doc(firestore, "wallets", userId);
  await updateDoc(ref, walletToDoc(data));
  const snap = await getDoc(ref);
  return walletFromDoc(snap);
}

export async function ensureWallet(userId: string): Promise<Wallet> {
  const existing = await getWalletByUserId(userId);
  if (existing) return existing;
  const now = new Date();
  return createWallet({
    id: userId,
    userId,
    balance: 0,
    totalSpent: 0,
    totalAdded: 0,
    updatedAt: now,
  });
}

// Counters for numeric IDs
async function getNextId(counterName: string): Promise<number> {
  const counterRef = doc(firestore, "counters", counterName);
  const newId = await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists() ? toNumber(snap.data().value) : 0;
    const next = current + 1;
    transaction.set(counterRef, { value: next });
    return next;
  });
  return newId;
}

export async function idForNewDocument(counterName: string): Promise<string> {
  return String(await getNextId(counterName));
}

// Services
export async function getAllServices(): Promise<Service[]> {
  const q = query(collection(firestore, "services"), orderBy("platform"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map(serviceFromDoc);
}

export async function getActiveServices(): Promise<Service[]> {
  const q = query(
    collection(firestore, "services"),
    where("isActive", "==", true),
    orderBy("platform"),
    orderBy("name"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(serviceFromDoc);
}

export async function getActivePlatforms(): Promise<string[]> {
  const snap = await getDocs(query(collection(firestore, "services"), where("isActive", "==", true)));
  const platforms = new Set<string>();
  snap.docs.forEach((d) => platforms.add(d.data().platform as string));
  return Array.from(platforms).sort();
}

export async function getServicesByPlatform(platform: string): Promise<Service[]> {
  const q = query(
    collection(firestore, "services"),
    where("isActive", "==", true),
    where("platform", "==", platform),
  );
  const snap = await getDocs(q);
  return snap.docs.map(serviceFromDoc);
}

export async function getServiceById(id: string): Promise<Service | null> {
  const ref = doc(firestore, "services", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return serviceFromDoc(snap);
}

export async function createService(data: Omit<Service, "id" | "createdAt">): Promise<Service> {
  const id = await idForNewDocument("services");
  const now = new Date();
  const service: Service = { ...data, id, createdAt: now };
  const ref = doc(firestore, "services", id);
  await setDoc(ref, serviceToDoc(service));
  return service;
}

export async function updateService(id: string, data: Partial<Service>): Promise<Service> {
  const ref = doc(firestore, "services", id);
  await updateDoc(ref, serviceToDoc(data));
  const snap = await getDoc(ref);
  return serviceFromDoc(snap);
}

export async function softDeleteService(id: string): Promise<void> {
  await updateService(id, { isActive: false });
}

// Orders
export async function getOrderById(id: string): Promise<Order | null> {
  const ref = doc(firestore, "orders", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return orderFromDoc(snap);
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  const q = query(
    collection(firestore, "orders"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(orderFromDoc);
}

export async function getOrdersByUserAndStatus(userId: string, status: string | null): Promise<Order[]> {
  let q;
  if (status === "Completed") {
    q = query(
      collection(firestore, "orders"),
      where("userId", "==", userId),
      where("status", "==", "Completed"),
      orderBy("createdAt", "desc"),
    );
  } else if (status === "Pending") {
    q = query(
      collection(firestore, "orders"),
      where("userId", "==", userId),
      where("status", "!=", "Completed"),
      orderBy("status"),
      orderBy("createdAt", "desc"),
    );
  } else {
    q = query(
      collection(firestore, "orders"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map(orderFromDoc);
}

export async function getRecentOrdersByUser(userId: string, limitCount: number): Promise<Order[]> {
  const q = query(
    collection(firestore, "orders"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(orderFromDoc);
}

export async function getAllOrders(status?: string): Promise<Order[]> {
  let q;
  if (status && status !== "all") {
    q = query(
      collection(firestore, "orders"),
      where("status", "==", status),
      orderBy("createdAt", "desc"),
    );
  } else {
    q = query(collection(firestore, "orders"), orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map(orderFromDoc);
}

export async function createOrder(data: Omit<Order, "id" | "createdAt">): Promise<Order> {
  const id = await idForNewDocument("orders");
  const now = new Date();
  const order: Order = { ...data, id, createdAt: now };
  const ref = doc(firestore, "orders", id);
  await setDoc(ref, orderToDoc(order));
  return order;
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<Order> {
  const ref = doc(firestore, "orders", id);
  await updateDoc(ref, orderToDoc(data));
  const snap = await getDoc(ref);
  return orderFromDoc(snap);
}

// Topup requests
export async function getTopupRequestById(id: string): Promise<TopupRequest | null> {
  const ref = doc(firestore, "topupRequests", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return topupFromDoc(snap);
}

export async function getTopupRequestsByUser(userId: string): Promise<TopupRequest[]> {
  const q = query(
    collection(firestore, "topupRequests"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(topupFromDoc);
}

export async function getAllTopupRequests(status?: string): Promise<TopupRequest[]> {
  let q;
  if (status && status !== "all") {
    q = query(
      collection(firestore, "topupRequests"),
      where("status", "==", status),
      orderBy("createdAt", "desc"),
    );
  } else {
    q = query(collection(firestore, "topupRequests"), orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map(topupFromDoc);
}

export async function createTopupRequest(data: Omit<TopupRequest, "id" | "createdAt">): Promise<TopupRequest> {
  const id = await idForNewDocument("topupRequests");
  const now = new Date();
  const topup: TopupRequest = { ...data, id, createdAt: now };
  const ref = doc(firestore, "topupRequests", id);
  await setDoc(ref, topupToDoc(topup));
  return topup;
}

export async function updateTopupRequest(id: string, data: Partial<TopupRequest>): Promise<TopupRequest> {
  const ref = doc(firestore, "topupRequests", id);
  await updateDoc(ref, topupToDoc(data));
  const snap = await getDoc(ref);
  return topupFromDoc(snap);
}

// Settings
export async function getSettings(): Promise<SettingsItem[]> {
  const snap = await getDocs(collection(firestore, "settings"));
  return snap.docs.map(settingsFromDoc);
}

export async function getSetting(key: string): Promise<string> {
  const ref = doc(firestore, "settings", key);
  const snap = await getDoc(ref);
  if (!snap.exists()) return "";
  return settingsFromDoc(snap).value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const ref = doc(firestore, "settings", key);
  await setDoc(
    ref,
    settingsToDoc({ key, value, updatedAt: new Date() }),
    { merge: true },
  );
}

// Sessions
export async function createSession(session: Session): Promise<void> {
  const ref = doc(firestore, "sessions", session.sid);
  await setDoc(ref, sessionToDoc(session));
}

export async function getSession(sid: string): Promise<Session | null> {
  const ref = doc(firestore, "sessions", sid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return sessionFromDoc(snap);
}

export async function updateSession(sid: string, data: Partial<Session>): Promise<void> {
  const ref = doc(firestore, "sessions", sid);
  await updateDoc(ref, sessionToDoc(data));
}

export async function deleteSession(sid: string): Promise<void> {
  const ref = doc(firestore, "sessions", sid);
  await deleteDoc(ref);
}
