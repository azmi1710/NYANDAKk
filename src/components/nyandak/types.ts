// Tipe data yang dikirim API (tanggal dalam bentuk string ISO)
export interface Me {
  id: string;
  role: "CUSTOMER" | "KURIR" | "ADMIN";
  name: string;
  phone: string;
  village: string | null;
  address: string | null;
  status: string;
  online: boolean;
}

export interface PhotoDTO {
  id: string;
  url: string;
  kind: string;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  code: string;
  type: string;
  status: string;
  statusDetail: string | null;
  customerId: string;
  kurirId: string | null;
  villageFrom: string;
  villageTo: string;
  zone: string;
  items: string;
  budget: number | null;
  note: string | null;
  fare: number;
  fee: number;
  strukStatus: string | null;
  strukNote: string | null;
  cancelReason: string | null;
  penalty: number;
  dispute: boolean;
  disputeNote: string | null;
  broadcastAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string; village: string | null; address: string | null };
  kurir?: { id: string; name: string; phone: string } | null;
  photos: PhotoDTO[];
  _count?: { messages: number };
}

export interface BoardItem {
  id: string;
  code: string;
  type: string;
  villageFrom: string;
  villageTo: string;
  zone: string;
  fare: number;
  fee: number;
  items: string;
  budget: number | null;
  customerName: string;
  broadcastAt: string;
}

export interface MessageDTO {
  id: string;
  orderId: string;
  senderId: string;
  text: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

export interface NotificationDTO {
  id: string;
  title: string;
  body: string;
  orderId: string | null;
  read: boolean;
  createdAt: string;
}

export interface LedgerEntryDTO {
  id: string;
  kurirId: string;
  type: string; // FEE | SETOR
  amount: number;
  settled: boolean;
  orderCode?: string | null;
  createdAt: string;
}

export interface PublicInfo {
  fares: Record<string, number>;
  openHour: number;
  closeHour: number;
  openNow: boolean;
  codLimit: number;
  announcement: string;
  kurirOnline: number;
  orderCount: number;
  zones: Record<string, string[]>;
  villages: string[];
}
