import { type Pool } from "pg";
import { pool } from "./db";

export type NewPlace = {
  marketing_addr: string;
  m: number;
  profile_addr: string;
  address: string;
  parent_address: string | null;
  parent_id: number | null;
  mp: string;
  pos: number;
  seq_no: number;
  width: number;
  height: number;
  kind: number;
  place_number: number;
  created_at: number;
  login: string;
  task_key: number;
  task_query_id: number;
  task_source_addr: string | null | undefined;
  inviter_profile_addr: string | null | undefined;
  confirmed: boolean;
};

export type PlaceRow = {
  id: number;
  parent_id: number | null;
  marketing_addr: string;
  m: number;
  mp: string;
  pos: number;
  seq_no: number;
  width: number;
  height: number;
  kind: number;
  addr: string;
  profile_addr: string;
  inviter_profile_addr: string | null;
  parent_addr: string | null;
  place_number: number;
  created_at: number;
  profile_login: string;
  index: string;
};

const placeReturningSql = `
  id,
  parent_id,
  marketing_addr,
  m,
  mp,
  pos,
  seq_no,
  width,
  height,
  kind,
  addr,
  parent_addr,
  profile_addr,
  inviter_profile_addr,
  place_number,
  created_at,
  profile_login,
  index
`;

class PlacesRepository {
  constructor(private readonly client: Pool) {}

  async updateConfirm(id: number): Promise<PlaceRow> {
    const query = `
      UPDATE marketing_places
      SET confirmed = TRUE
      WHERE id = $1
      RETURNING ${placeReturningSql}
    `;

    const result = await this.client.query<PlaceRow>(query, [id]);
    const row = result.rows[0];

    if (!row) {
      throw new Error(`Failed to confirm place ${id}`);
    }

    return row;
  }

  async incrementSeqNo(marketing_addr: string, id: number): Promise<void> {
    await this.client.query(
      `
      UPDATE marketing_places
      SET seq_no = seq_no + 1
      WHERE marketing_addr = $1
        AND id = $2
      `,
      [marketing_addr, id],
    );
  }

  async addPlace(place: NewPlace): Promise<PlaceRow> {
    const indexValue = `${place.login}${place.place_number}`;
    const inviterProfile = place.inviter_profile_addr ?? null;
    const taskSourceAddr = place.task_source_addr ?? null;

    const query = {
      text: `
        INSERT INTO marketing_places (
          marketing_addr,
          m,
          profile_addr,
          addr,
          parent_addr,
          parent_id,
          mp,
          pos,
          seq_no,
          width,
          height,
          kind,
          place_number,
          created_at,
          profile_login,
          index,
          task_key,
          task_query_id,
          task_source_addr,
          inviter_profile_addr,
          confirmed
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21
        )
        RETURNING ${placeReturningSql}
      `,
      values: [
        place.marketing_addr,
        place.m,
        place.profile_addr,
        place.address,
        place.parent_address,
        place.parent_id,
        place.mp,
        place.pos,
        place.seq_no,
        place.width,
        place.height,
        place.kind,
        place.place_number,
        place.created_at,
        place.login,
        indexValue,
        place.task_key,
        place.task_query_id,
        taskSourceAddr,
        inviterProfile,
        place.confirmed,
      ],
    };

    const result = await this.client.query<PlaceRow>(query);
    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to insert place");
    }

    return row;
  }

  async getPlaceByAddress(
  marketing_addr: string,
  addr: string,
): Promise<PlaceRow | null> {
  const query = `
    SELECT
      ${placeReturningSql}
    FROM marketing_places
    WHERE marketing_addr = $1
      AND addr = $2
    LIMIT 1
  `;

  const result = await this.client.query<PlaceRow>(
    query,
    [marketing_addr, addr],
  );

  return result.rows[0] ?? null;
}
}

export const placesRepository = new PlacesRepository(pool);