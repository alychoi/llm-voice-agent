import { calls, type Call, type InsertCall } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Call methods
  getCall(id: number): Promise<Call | undefined>;
  getCalls(): Promise<Call[]>;
  getCallByTwilioSid(twilioSid: string): Promise<Call | undefined>;
  createCall(insertCall: InsertCall): Promise<Call>;
  updateCall(id: number, updates: Partial<Call>): Promise<Call>;
  getCallById(id: string): Promise<Call | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getCall(id: number): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call || undefined;
  }

  async getCalls(): Promise<Call[]> {
    return await db.select().from(calls);
  }

  async getCallByTwilioSid(twilioSid: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.twilioCallSid, twilioSid));
    return call || undefined;
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db
      .insert(calls)
      .values(insertCall)
      .returning();
    return call;
  }

  async updateCall(id: number, updates: Partial<Call>): Promise<Call> {
    const [call] = await db
      .update(calls)
      .set(updates)
      .where(eq(calls.id, id))
      .returning();
    return call;
  }

  async getCallById(id: string): Promise<Call | undefined> {
    const [call] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, parseInt(id)));
    return call || undefined;
  }
}

export const storage = new DatabaseStorage();