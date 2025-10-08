import { PixQrCode } from "../types/PixQrCode";
import { Refund } from "../types/Refund";
import { User } from "../types/User";
import { Charge } from "../types/Charge";

export interface DatabaseProvider {
  getPixQrCodes(offset: number, limit: number): Paginated<PixQrCode>;
  getPixQrCodeByIdentifier(identifier: string): PixQrCode | null;
  getPixQrCodeByCorrelationID(correlationID: string): PixQrCode | null;
  createPixQrCode(pixQrCode: PixQrCode): void;
  getRefundsByChargeCorrelationID(correlationID: string, limit: number, offset: number): Paginated<Refund> | null;
  createUser(user: Omit<User, 'id'>): void;
  findUserByUsername(username: string): User | null;
  deleteUserByUsername(username: string): void;
  createChargeRefund(chargeRefund: Omit<Refund, 'id'>): void;
  deleteRefundsByID(refund_correlationID: string): void;
  clearTablesforTesting(): void;
  createCharge(charge: Charge): string;
  deleteCharge(id: string): { success: boolean; error?: string };
  getChargeByID(id: string): Charge | null;
  deleteCharge(id: string): { success: boolean; error?: string };
}

export type Paginated<T> = {
  data: T[];
  pageInfo: {
    skip: number;
    limit: number;
    totalCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  }
}