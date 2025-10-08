import { DatabaseProvider, Paginated } from '../types';
import { PixQrCode } from '../../types/PixQrCode';
import { Refund } from '../../types/Refund';
import { Database } from 'bun:sqlite';
import { skip } from 'node:test';
import { totalCompileTime } from 'bun:jsc';
import { User } from '../../types/User';
import { Charge } from '../../types/Charge';

export class BunSqliteProvider implements DatabaseProvider {
  private db: Database;

  constructor() {
    const sqliteFileName = process.env.SQLITE_FILE_NAME || 'woovers.sqlite';

    this.db = new Database(sqliteFileName, { create: true });

    this.db.run(`
        CREATE TABLE IF NOT EXISTS pix_qr_codes
        (
            id
            INTEGER
            PRIMARY
            KEY
            AUTOINCREMENT,
            name
            TEXT,
            correlationID
            TEXT,
            value
            REAL,
            comment
            TEXT,
            identifier
            TEXT,
            paymentLinkID
            TEXT,
            paymentLinkUrl
            TEXT,
            qrCodeImage
            TEXT,
            brCode
            TEXT,
            createdAt
            TEXT,
            updatedAt
            TEXT
        )
    `);

    this.db.run(`
        CREATE TABLE IF NOT EXISTS refunds
        (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          refund_correlationID TEXT UNIQUE, 
          value INTEGER,
          status TEXT,
          endToEndId TEXT,
          time TEXT,
          comment TEXT,
          charge_correlationID TEXT, 
          FOREIGN KEY (charge_correlationID) REFERENCES charges (correlationID)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS users
      (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
      )
    `);

    this.db.run(`
        CREATE TABLE IF NOT EXISTS api_keys
        (
            key
            TEXT
            PRIMARY
            KEY
        )
    `);

    //WIPE THIS TABLE BEFORE MERGING TOO
    this.db.run(`
        CREATE TABLE IF NOT EXISTS charges (
            id TEXT PRIMARY KEY,
            correlationID TEXT NOT NULL,        
            value INTEGER NOT NULL,                
            type TEXT CHECK(type IN ('DYNAMIC', 'OVERDUE')),  
            comment TEXT,                          
            expiresIn INTEGER,                     
            expiresDate TEXT,                      
            customer TEXT,                         
            ensureSameTaxID BOOLEAN DEFAULT 0,     
            daysForDueDate INTEGER,                
            daysAfterDueDate INTEGER,              
            interests TEXT,                        
            fines TEXT,                            
            discountSettings TEXT,                 
            additionalInfo TEXT,                   
            enableCashbackPercentage BOOLEAN DEFAULT 0,
            enableCashbackExclusivePercentage BOOLEAN DEFAULT 0,
            subaccount TEXT,                       
            splits TEXT,                           
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,  
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP   
        )
    `);
  }

  getPixQrCodes(offset: number, limit: number): Paginated<PixQrCode> {
    const pixQrCodeCount = this.db.query("SELECT COUNT(*) as count FROM pix_qr_codes").get() as number;
    const data = this.db.query("SELECT * FROM pix_qr_codes LIMIT $limit OFFSET $offset").all({ $limit: limit, $offset: offset }) as PixQrCode[];

    const totalCount = pixQrCodeCount;
    const hasPreviousPage = offset > 0;
    const hasNextPage = offset + limit < totalCount;
    return {
      data: data,
      pageInfo: {
        skip: offset,
        limit: limit,
        totalCount,
        hasPreviousPage,
        hasNextPage
      }
    };
  }

  getPixQrCodeByIdentifier(identifier: string): PixQrCode | null {
    return this.db.query('SELECT identifier FROM pix_qr_codes WHERE identifier = ?').get(identifier) as PixQrCode | null;
  }

  getPixQrCodeByCorrelationID(correlationID: string): PixQrCode | null {
    const result =  this.db.query('SELECT * FROM pix_qr_codes WHERE correlationID = ?').get(correlationID) as PixQrCode | null;
    return result as PixQrCode | null;
  }

  createPixQrCode(pixQrCode: PixQrCode): void {
    this.db.run(
      'INSERT INTO pix_qr_codes (name, correlationID, value, comment, identifier, paymentLinkID, paymentLinkUrl, qrCodeImage, brCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [pixQrCode.name, pixQrCode.correlationID, pixQrCode.value, pixQrCode.comment ?? "", pixQrCode.identifier, pixQrCode.paymentLinkID, pixQrCode.paymentLinkUrl, pixQrCode.qrCodeImage, pixQrCode.brCode, pixQrCode.createdAt, pixQrCode.updatedAt]
    );
  }

  getRefundsByChargeCorrelationID(correlationID: string, limit: number, offset: number): Paginated<Refund> | null {
  const refundCount = this.db.query("SELECT COUNT(*) as count FROM refunds WHERE charge_correlationID = $correlationID").get({ $correlationID: correlationID }) as { count: number };
  
  const data = this.db.query("SELECT * FROM refunds WHERE charge_correlationID = $correlationID LIMIT $limit OFFSET $offset").all({$correlationID: correlationID, $limit: limit, $offset: offset }) as Refund[];
  
  return {
    data,
    pageInfo: {
      totalCount: refundCount.count,
      limit: limit,
      skip: offset,
      hasPreviousPage: offset > 0,
      hasNextPage: (offset + limit) < refundCount.count
     }
    };
  }

  createChargeRefund(chargeRefund: Refund): void {
    const defaultValue = null;
    this.db.run(
      'INSERT INTO refunds (charge_correlationID, refund_correlationID, endToEndID, time, status, value, comment) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [chargeRefund.charge_correlationID, chargeRefund.refund_correlationID, chargeRefund.endToEndId, chargeRefund.time, chargeRefund.status, chargeRefund.value, chargeRefund.comment ?? defaultValue]
    );
  }

  deleteRefundsByID(refund_correlationID: string): void {
    this.db.query('DELETE FROM refunds WHERE refund_correlationID = ?').run(refund_correlationID);
  }

  createUser(user: User): void {
    this.db.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [user.username, user.password_hash]
    );
  }

  findUserByUsername(username: string): User | null {
    const userCheck = this.db.query('SELECT * FROM users WHERE username = ?').get(username) as User || null;
    return userCheck;
  }

  deleteUserByUsername(username: string): void {
    this.db.query('DELETE FROM users WHERE username = ?').run(username);
  }
  
  clearTablesforTesting(): void {
    this.db.query('DELETE FROM refunds').run();
    this.db.query('DELETE FROM charges').run();
  }

  //REMOVE EVERYTHING AFTER THIS LATER, THIS IS THE CHARGES OPERATIONS
  createCharge(charge: Charge): string {
    this.db.run(
      'INSERT INTO charges (id, correlationID, value, type, comment, expiresIn, expiresDate, customer, ensureSameTaxID, daysForDueDate, daysAfterDueDate, interests, fines, discountSettings, additionalInfo, enableCashbackPercentage, enableCashbackExclusivePercentage, subaccount, splits) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        charge.id,
        charge.correlationID,
        charge.value,
        charge.type,
        charge.comment ?? null,
        charge.expiresIn ?? null,
        charge.expiresDate ?? null,
        JSON.stringify(charge.customer ?? null), 
        charge.ensureSameTaxID ?? null,
        charge.daysForDueDate ?? null,
        charge.daysAfterDueDate ?? null,
        JSON.stringify(charge.interests ?? null), 
        JSON.stringify(charge.fines ?? null), 
        JSON.stringify(charge.discountSettings ?? null), 
        JSON.stringify(charge.additionalInfo ?? null), 
        charge.enableCashbackPercentage ?? null,
        charge.enableCashbackExclusivePercentage ?? null,
        charge.subaccount ?? null,
        JSON.stringify(charge.splits ?? null), 
      ],
    );
    return charge.correlationID!;
  }

  getChargeByID(id: string): Charge | null {
    const result = this.db.query('SELECT * FROM charges WHERE correlationID = ? OR id = ?').get(id, id) as Charge;

    if (!result) {
      return null;
    }

    return {
      ...result,
      customer: typeof result.customer === 'string' ? JSON.parse(result.customer) : result.customer,
      interests: typeof result.interests === 'string' ? JSON.parse(result.interests) : result.interests,
      fines: typeof result.fines === 'string' ? JSON.parse(result.fines) : result.fines,
      discountSettings: typeof result.discountSettings === 'string' ? JSON.parse(result.discountSettings) : result.discountSettings,
      additionalInfo: typeof result.additionalInfo === 'string' ? JSON.parse(result.additionalInfo) : result.additionalInfo,
      splits: typeof result.splits === 'string' ? JSON.parse(result.splits) : result.splits,
    } as Charge;
  }

  deleteCharge(id: string): { success: boolean; error?: string } {
    try {

      const existingCharge = this.getChargeByID(id);

      if (!existingCharge) {
        return {
          success: false,
          error: 'Charge not found'
        };
      }

      const result = this.db.query('DELETE FROM charges WHERE id = ? OR correlationID = ?').run(id, id);

      if (result.changes === 0) {
        return {
          success: false,
          error: 'Failed to delete charge'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting charge:', error);
      return {
        success: false,
        error: 'Database error occurred'
      };
    }
  }
}
