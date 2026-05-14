import { type Pool } from "pg";
import { pool } from "./db";

export type LockRow = {
  id: number;
  marketing_addr: string;

  task_key: number;
  task_query_id: number;
  task_source_addr: string | null;
  confirmed: boolean;

  mp: string;
  m: number;
  profile_addr: string;

  place_addr: string;
  locked_pos: number;

  place_profile_login: string;
  place_number: number;
  created_at: number;
};

export type NewLock = {
  marketing_addr: string;
  mp: string;
  m: number;
  profile_addr: string;

  task_key: number;
  task_query_id: number;
  task_source_addr: string | null;
  confirmed: boolean;

  place_addr: string;
  locked_pos: number;

  place_profile_login: string;
  place_number: number;
  created_at: number;
};

const lockReturningSql = `
  id,
  marketing_addr,

  task_key,
  task_query_id,
  task_source_addr,
  confirmed,

  mp,
  m,
  profile_addr,

  place_addr,
  locked_pos,

  place_profile_login,
  place_number,
  created_at
`;

class LocksRepository {
  constructor(private readonly client: Pool) {}

  async addLock(data: NewLock): Promise<LockRow> {
    const result = await this.client.query<LockRow>(
      `
      INSERT INTO marketing_locks (
        marketing_addr,
        task_key,
        task_query_id,
        task_source_addr,
        confirmed,
        mp,
        m,
        profile_addr,
        place_addr,
        locked_pos,
        place_profile_login,
        place_number,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12, $13
      )
      RETURNING ${lockReturningSql}
      `,
      [
        data.marketing_addr,
        data.task_key,
        data.task_query_id,
        data.task_source_addr,
        data.confirmed,
        data.mp,
        data.m,
        data.profile_addr,
        data.place_addr,
        data.locked_pos,
        data.place_profile_login,
        data.place_number,
        data.created_at,
      ],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to insert lock");
    }

    return row;
  }

  async updateLockConfirm(
    marketing_addr: string,
    id: number,
  ): Promise<LockRow> {
    const result = await this.client.query<LockRow>(
      `
      UPDATE marketing_locks
      SET confirmed = TRUE
      WHERE marketing_addr = $1
        AND id = $2
      RETURNING ${lockReturningSql}
      `,
      [marketing_addr, id],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error(`Failed to update lock ${id}`);
    }

    return row;
  }

  async getLockByPlaceAddrAndLockedPos(
  marketing_addr: string,
  placeAddr: string,
  lockedPos: number,
  profileAddr: string,
): Promise<LockRow | null> {
  const result = await this.client.query<LockRow>(
    `
    SELECT ${lockReturningSql}
    FROM marketing_locks
    WHERE marketing_addr = $1
      AND place_addr = $2
      AND locked_pos = $3
      AND profile_addr = $4
    LIMIT 1
    `,
    [marketing_addr, placeAddr, lockedPos, profileAddr],
  );

  return result.rows[0] ?? null;
}

  async removeLock(
    marketing_addr: string,
    id: number,
  ): Promise<void> {
    const result = await this.client.query(
      `
      DELETE FROM marketing_locks
      WHERE marketing_addr = $1
        AND id = $2
      RETURNING id
      `,
      [marketing_addr, id],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to remove lock");
    }
  }

}

export const locksRepository = new LocksRepository(pool);