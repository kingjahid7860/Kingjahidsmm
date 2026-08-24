import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  runTransaction,
  type Database,
  type DataSnapshot,
  type TransactionResult,
} from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ??
    "https://kingsmm-dab0e-default-rtdb.firebaseio.com",
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
export const rtdb: Database = getDatabase(app);

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function dateFromDb(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return new Date();
}

function toDbDate(value: Date | string | number): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  discountPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  providerId?: string | null;
  apiServiceId: string;
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

export interface ApiProvider {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  isEnabled: boolean;
  markupPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  serviceId: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  externalOrderId?: string | null;
  deliveredQuantity?: number | null;
  refundedAmount?: number;
  lastSyncedAt?: Date | null;
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

function userFromChild(id: string, data: Record<string, unknown>): User {
  return {
    id,
    email: (data.email as string | null) ?? null,
    firstName: (data.firstName as string | null) ?? null,
    lastName: (data.lastName as string | null) ?? null,
    profileImageUrl: (data.profileImageUrl as string | null) ?? null,
    discountPercent: toNumber(data.discountPercent),
    createdAt: dateFromDb(data.createdAt),
    updatedAt: dateFromDb(data.updatedAt),
  };
}

export function userToDoc(user: Partial<User>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (user.email !== undefined) data.email = user.email;
  if (user.firstName !== undefined) data.firstName = user.firstName;
  if (user.lastName !== undefined) data.lastName = user.lastName;
  if (user.profileImageUrl !== undefined) data.profileImageUrl = user.profileImageUrl;
  if (user.discountPercent !== undefined) data.discountPercent = user.discountPercent;
  if (user.createdAt !== undefined) data.createdAt = toDbDate(user.createdAt);
  if (user.updatedAt !== undefined) data.updatedAt = toDbDate(user.updatedAt);
  return data;
}

export function serviceFromChild(id: string, data: Record<string, unknown>): Service {
  return {
    id,
    providerId: data.providerId == null ? null : String(data.providerId),
    apiServiceId: String(data.apiServiceId ?? data.api_service_id ?? ""),
    name: (data.name as string) ?? "",
    category: (data.category as string) ?? "",
    platform: (data.platform as string) ?? "",
    description: (data.description as string) ?? "",
    pricePerThousand: toNumber(data.pricePerThousand),
    minQuantity: toNumber(data.minQuantity),
    maxQuantity: toNumber(data.maxQuantity),
    isActive: (data.isActive as boolean) ?? true,
    createdAt: dateFromDb(data.createdAt),
  };
}

export function serviceToDoc(data: Partial<Service>): Record<string, unknown> {
  const docData: Record<string, unknown> = {};
  if (data.apiServiceId !== undefined) docData.apiServiceId = data.apiServiceId;
  if (data.providerId !== undefined) docData.providerId = data.providerId;
  if (data.name !== undefined) docData.name = data.name;
  if (data.category !== undefined) docData.category = data.category;
  if (data.platform !== undefined) docData.platform = data.platform;
  if (data.description !== undefined) docData.description = data.description;
  if (data.pricePerThousand !== undefined) docData.pricePerThousand = data.pricePerThousand;
  if (data.minQuantity !== undefined) docData.minQuantity = data.minQuantity;
  if (data.maxQuantity !== undefined) docData.maxQuantity = data.maxQuantity;
  if (data.isActive !== undefined) docData.isActive = data.isActive;
  if (data.createdAt !== undefined) docData.createdAt = toDbDate(data.createdAt);
  return docData;
}

export function orderFromChild(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    userId: (data.userId as string) ?? "",
    serviceId: (data.serviceId as string) ?? "",
    link: (data.link as string) ?? "",
    quantity: toNumber(data.quantity),
    charge: toNumber(data.charge),
    status: (data.status as string) ?? "Pending",
    externalOrderId: data.externalOrderId == null ? null : String(data.externalOrderId),
    deliveredQuantity: data.deliveredQuantity == null ? null : toNumber(data.deliveredQuantity),
    refundedAmount: toNumber(data.refundedAmount),
    lastSyncedAt: data.lastSyncedAt == null ? null : dateFromDb(data.lastSyncedAt),
    createdAt: dateFromDb(data.createdAt),
  };
}

export function orderToDoc(data: Partial<Order>): Record<string, unknown> {
  const docData: Record<string, unknown> = {};
  if (data.userId !== undefined) docData.userId = data.userId;
  if (data.serviceId !== undefined) docData.serviceId = data.serviceId;
  if (data.link !== undefined) docData.link = data.link;
  if (data.quantity !== undefined) docData.quantity = data.quantity;
  if (data.charge !== undefined) docData.charge = data.charge;
  if (data.status !== undefined) docData.status = data.status;
  if (data.externalOrderId !== undefined) docData.externalOrderId = data.externalOrderId;
  if (data.deliveredQuantity !== undefined) docData.deliveredQuantity = data.deliveredQuantity;
  if (data.refundedAmount !== undefined) docData.refundedAmount = data.refundedAmount;
  if (data.lastSyncedAt !== undefined) docData.lastSyncedAt = data.lastSyncedAt == null ? null : toDbDate(data.lastSyncedAt);
  if (data.createdAt !== undefined) docData.createdAt = toDbDate(data.createdAt);
  return docData;
}

export function walletFromChild(id: string, data: Record<string, unknown>): Wallet {
  return {
    id,
    userId: id,
    balance: toNumber(data.balance),
    totalSpent: toNumber(data.totalSpent),
    totalAdded: toNumber(data.totalAdded),
    updatedAt: dateFromDb(data.updatedAt),
  };
}

export function walletToDoc(data: Partial<Wallet>): Record<string, unknown> {
  const docData: Record<string, unknown> = {};
  if (data.balance !== undefined) docData.balance = data.balance;
  if (data.totalSpent !== undefined) docData.totalSpent = data.totalSpent;
  if (data.totalAdded !== undefined) docData.totalAdded = data.totalAdded;
  if (data.updatedAt !== undefined) docData.updatedAt = toDbDate(data.updatedAt);
  return docData;
}

export function topupFromChild(id: string, data: Record<string, unknown>): TopupRequest {
  return {
    id,
    userId: (data.userId as string) ?? "",
    amount: toNumber(data.amount),
    paymentMethod: (data.paymentMethod as string) ?? "",
    transactionId: (data.transactionId as string) ?? "",
    status: (data.status as string) ?? "Pending",
    createdAt: dateFromDb(data.createdAt),
  };
}

export function topupToDoc(data: Partial<TopupRequest>): Record<string, unknown> {
  const docData: Record<string, unknown> = {};
  if (data.userId !== undefined) docData.userId = data.userId;
  if (data.amount !== undefined) docData.amount = data.amount;
  if (data.paymentMethod !== undefined) docData.paymentMethod = data.paymentMethod;
  if (data.transactionId !== undefined) docData.transactionId = data.transactionId;
  if (data.status !== undefined) docData.status = data.status;
  if (data.createdAt !== undefined) docData.createdAt = toDbDate(data.createdAt);
  return docData;
}

export function settingsFromChild(key: string, data: Record<string, unknown>): SettingsItem {
  return {
    key,
    value: (data.value as string) ?? "",
    updatedAt: dateFromDb(data.updatedAt),
  };
}

export function settingsToDoc(data: Partial<SettingsItem>): Record<string, unknown> {
  const docData: Record<string, unknown> = {};
  if (data.value !== undefined) docData.value = data.value;
  if (data.updatedAt !== undefined) docData.updatedAt = toDbDate(data.updatedAt);
  return docData;
}

export function sessionFromChild(id: string, data: Record<string, unknown>): Session {
  return {
    sid: id,
    sess: (data.sess as Record<string, unknown>) ?? {},
    expire: dateFromDb(data.expire),
  };
}

export function sessionToDoc(data: Partial<Session>): Record<string, unknown> {
  const docData: Record<string, unknown> = {};
  if (data.sess !== undefined) docData.sess = data.sess;
  if (data.expire !== undefined) docData.expire = toDbDate(data.expire);
  return docData;
}

function snapshotToList<T>(
  snapshot: DataSnapshot,
  mapper: (key: string, val: Record<string, unknown>) => T,
): T[] {
  const list: T[] = [];
  if (!snapshot.exists()) return list;
  snapshot.forEach((child) => {
    const key = child.key;
    if (key) {
      list.push(mapper(key, (child.val() as Record<string, unknown>) ?? {}));
    }
    return false;
  });
  return list;
}

// Users
export async function upsertUser(user: User): Promise<User> {
  await set(ref(rtdb, `users/${user.id}`), userToDoc(user));
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const snapshot = await get(ref(rtdb, `users/${id}`));
  if (!snapshot.exists()) return null;
  return userFromChild(id, snapshot.val() as Record<string, unknown>);
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const path = ref(rtdb, `users/${id}`);
  await update(path, userToDoc({ ...data, updatedAt: new Date() }));
  const snapshot = await get(path);
  if (!snapshot.exists()) throw new Error("User not found");
  return userFromChild(id, snapshot.val() as Record<string, unknown>);
}

export async function getAllUsers(): Promise<User[]> {
  const snapshot = await get(ref(rtdb, "users"));
  const list = snapshotToList(snapshot, userFromChild);
  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Provider connections
function providerFromChild(id: string, data: Record<string, unknown>): ApiProvider {
  return {
    id,
    name: String(data.name ?? ""),
    apiUrl: String(data.apiUrl ?? ""),
    apiKey: String(data.apiKey ?? ""),
    isEnabled: data.isEnabled !== false,
    markupPercent: toNumber(data.markupPercent),
    createdAt: dateFromDb(data.createdAt),
    updatedAt: dateFromDb(data.updatedAt),
  };
}

function providerToDoc(data: Partial<ApiProvider>): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  if (data.name !== undefined) doc.name = data.name;
  if (data.apiUrl !== undefined) doc.apiUrl = data.apiUrl;
  if (data.apiKey !== undefined) doc.apiKey = data.apiKey;
  if (data.isEnabled !== undefined) doc.isEnabled = data.isEnabled;
  if (data.markupPercent !== undefined) doc.markupPercent = data.markupPercent;
  if (data.createdAt !== undefined) doc.createdAt = toDbDate(data.createdAt);
  if (data.updatedAt !== undefined) doc.updatedAt = toDbDate(data.updatedAt);
  return doc;
}

export async function getAllApiProviders(): Promise<ApiProvider[]> {
  const snapshot = await get(ref(rtdb, "apiProviders"));
  return snapshotToList(snapshot, providerFromChild).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getApiProviderById(id: string): Promise<ApiProvider | null> {
  const snapshot = await get(ref(rtdb, `apiProviders/${id}`));
  return snapshot.exists() ? providerFromChild(id, snapshot.val() as Record<string, unknown>) : null;
}

export async function createApiProvider(data: Omit<ApiProvider, "id" | "createdAt" | "updatedAt">): Promise<ApiProvider> {
  const id = await idForNewDocument("apiProviders");
  const now = new Date();
  const provider: ApiProvider = { ...data, id, createdAt: now, updatedAt: now };
  await set(ref(rtdb, `apiProviders/${id}`), providerToDoc(provider));
  return provider;
}

export async function updateApiProvider(id: string, data: Partial<ApiProvider>): Promise<ApiProvider> {
  const path = ref(rtdb, `apiProviders/${id}`);
  await update(path, providerToDoc({ ...data, updatedAt: new Date() }));
  const snapshot = await get(path);
  return providerFromChild(id, snapshot.val() as Record<string, unknown>);
}

export async function deleteApiProvider(id: string): Promise<void> {
  await remove(ref(rtdb, `apiProviders/${id}`));
}

// Wallets
export async function getWalletByUserId(userId: string): Promise<Wallet | null> {
  const snapshot = await get(ref(rtdb, `wallets/${userId}`));
  if (!snapshot.exists()) return null;
  return walletFromChild(userId, snapshot.val() as Record<string, unknown>);
}

export async function getAllWallets(): Promise<Wallet[]> {
  const snapshot = await get(ref(rtdb, "wallets"));
  return snapshotToList(snapshot, walletFromChild);
}

export async function createWallet(wallet: Wallet): Promise<Wallet> {
  await set(ref(rtdb, `wallets/${wallet.userId}`), walletToDoc(wallet));
  return wallet;
}

export async function updateWallet(userId: string, data: Partial<Wallet>): Promise<Wallet> {
  const refPath = ref(rtdb, `wallets/${userId}`);
  await update(refPath, walletToDoc(data));
  const snapshot = await get(refPath);
  return walletFromChild(userId, snapshot.val() as Record<string, unknown>);
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
export async function idForNewDocument(counterName: string): Promise<string> {
  const counterRef = ref(rtdb, `counters/${counterName}`);
  const result: TransactionResult = await runTransaction(counterRef, (current) => {
    if (current === null) return 1;
    return (current as number) + 1;
  });
  const val = result.snapshot.val();
  if (val === null || val === undefined) {
    throw new Error(`Counter transaction failed for ${counterName}`);
  }
  return String(val);
}

// Services
export async function getAllServices(): Promise<Service[]> {
  const snapshot = await get(ref(rtdb, "services"));
  const list = snapshotToList(snapshot, serviceFromChild);
  return list.sort(
    (a, b) => a.platform.localeCompare(b.platform) || a.name.localeCompare(b.name),
  );
}

export async function getActiveServices(): Promise<Service[]> {
  return (await getAllServices()).filter((s) => s.isActive);
}

export async function getActivePlatforms(): Promise<string[]> {
  const platforms = new Set((await getActiveServices()).map((s) => s.platform));
  return Array.from(platforms).sort();
}

export async function getServicesByPlatform(platform: string): Promise<Service[]> {
  return (await getActiveServices()).filter((s) => s.platform === platform);
}

export async function getServiceById(id: string): Promise<Service | null> {
  const snapshot = await get(ref(rtdb, `services/${id}`));
  if (!snapshot.exists()) return null;
  return serviceFromChild(id, snapshot.val() as Record<string, unknown>);
}

export async function createService(data: Omit<Service, "id" | "createdAt">): Promise<Service> {
  const id = await idForNewDocument("services");
  const now = new Date();
  const service: Service = { ...data, id, createdAt: now };
  await set(ref(rtdb, `services/${id}`), serviceToDoc(service));
  return service;
}

export async function updateService(id: string, data: Partial<Service>): Promise<Service> {
  const refPath = ref(rtdb, `services/${id}`);
  await update(refPath, serviceToDoc(data));
  const snapshot = await get(refPath);
  return serviceFromChild(id, snapshot.val() as Record<string, unknown>);
}

export async function softDeleteService(id: string): Promise<void> {
  await update(ref(rtdb, `services/${id}`), { isActive: false });
}

// Orders
export async function getOrderById(id: string): Promise<Order | null> {
  const snapshot = await get(ref(rtdb, `orders/${id}`));
  if (!snapshot.exists()) return null;
  return orderFromChild(id, snapshot.val() as Record<string, unknown>);
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  const snapshot = await get(ref(rtdb, "orders"));
  const list = snapshotToList(snapshot, orderFromChild).filter((o) => o.userId === userId);
  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getOrdersByUserAndStatus(
  userId: string,
  status: string | null,
): Promise<Order[]> {
  const all = await getOrdersByUser(userId);
  if (status === "Completed") return all.filter((o) => o.status === "Completed");
  if (status === "Pending") return all.filter((o) => o.status !== "Completed");
  return all;
}

export async function getRecentOrdersByUser(userId: string, limitCount: number): Promise<Order[]> {
  return (await getOrdersByUser(userId)).slice(0, limitCount);
}

export async function getAllOrders(status?: string): Promise<Order[]> {
  const snapshot = await get(ref(rtdb, "orders"));
  let list = snapshotToList(snapshot, orderFromChild);
  if (status && status !== "all") {
    list = list.filter((o) => o.status === status);
  }
  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createOrder(data: Omit<Order, "id" | "createdAt">): Promise<Order> {
  const id = await idForNewDocument("orders");
  const now = new Date();
  const order: Order = { ...data, id, createdAt: now };
  await set(ref(rtdb, `orders/${id}`), orderToDoc(order));
  return order;
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<Order> {
  const refPath = ref(rtdb, `orders/${id}`);
  await update(refPath, orderToDoc(data));
  const snapshot = await get(refPath);
  return orderFromChild(id, snapshot.val() as Record<string, unknown>);
}

// Topup requests
export async function getTopupRequestById(id: string): Promise<TopupRequest | null> {
  const snapshot = await get(ref(rtdb, `topupRequests/${id}`));
  if (!snapshot.exists()) return null;
  return topupFromChild(id, snapshot.val() as Record<string, unknown>);
}

export async function getTopupRequestsByUser(userId: string): Promise<TopupRequest[]> {
  const snapshot = await get(ref(rtdb, "topupRequests"));
  const list = snapshotToList(snapshot, topupFromChild).filter((t) => t.userId === userId);
  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getAllTopupRequests(status?: string): Promise<TopupRequest[]> {
  const snapshot = await get(ref(rtdb, "topupRequests"));
  let list = snapshotToList(snapshot, topupFromChild);
  if (status && status !== "all") {
    list = list.filter((t) => t.status === status);
  }
  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createTopupRequest(
  data: Omit<TopupRequest, "id" | "createdAt">,
): Promise<TopupRequest> {
  const id = await idForNewDocument("topupRequests");
  const now = new Date();
  const topup: TopupRequest = { ...data, id, createdAt: now };
  await set(ref(rtdb, `topupRequests/${id}`), topupToDoc(topup));
  return topup;
}

export async function updateTopupRequest(
  id: string,
  data: Partial<TopupRequest>,
): Promise<TopupRequest> {
  const refPath = ref(rtdb, `topupRequests/${id}`);
  await update(refPath, topupToDoc(data));
  const snapshot = await get(refPath);
  return topupFromChild(id, snapshot.val() as Record<string, unknown>);
}

// Settings
export async function getSettings(): Promise<SettingsItem[]> {
  const snapshot = await get(ref(rtdb, "settings"));
  return snapshotToList(snapshot, settingsFromChild);
}

export async function getSetting(key: string): Promise<string> {
  const snapshot = await get(ref(rtdb, `settings/${key}`));
  if (!snapshot.exists()) return "";
  return settingsFromChild(key, snapshot.val() as Record<string, unknown>).value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await update(ref(rtdb, `settings/${key}`), settingsToDoc({ key, value, updatedAt: new Date() }));
}

// Sessions
export async function createSession(session: Session): Promise<void> {
  await set(ref(rtdb, `sessions/${session.sid}`), sessionToDoc(session));
}

export async function getSession(sid: string): Promise<Session | null> {
  const snapshot = await get(ref(rtdb, `sessions/${sid}`));
  if (!snapshot.exists()) return null;
  return sessionFromChild(sid, snapshot.val() as Record<string, unknown>);
}

export async function updateSession(sid: string, data: Partial<Session>): Promise<void> {
  await update(ref(rtdb, `sessions/${sid}`), sessionToDoc(data));
}

export async function deleteSession(sid: string): Promise<void> {
  await remove(ref(rtdb, `sessions/${sid}`));
}
