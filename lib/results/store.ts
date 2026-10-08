import "server-only";
// astro_results 읽기·쓰기(서버 전용, service_role). 모든 조회는 user_id로 한 번 더 거른다 —
// RLS를 우회하는 키라서, 코드에서 소유자 확인을 빠뜨리면 남의 결과가 보일 수 있기 때문.
import type { Answers } from "@/lib/astro/answers";
import type { BirthInput, BirthResult } from "@/lib/astro/birth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASTRO_DB } from "@/lib/report/dbData";
import { CONSENT_VERSION } from "./consent";

const TABLE = "astro_results";

export interface StoredResult {
  id: string;
  created_at: string;
  nickname: string;
  first_time: boolean;
  birth_input: BirthInput;
  answers: Answers;
  character: string;
  sun_sign: string;
  accuracy: string;
}

export async function saveResult(args: {
  userId: string;
  nickname: string;
  firstTime: boolean;
  input: BirthInput;
  answers: Answers;
  birth: BirthResult & { resolved: NonNullable<BirthResult["resolved"]> };
}): Promise<string> {
  const { userId, nickname, firstTime, input, answers, birth } = args;
  const { chart, character } = birth.resolved;
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .insert({
      user_id: userId,
      nickname,
      first_time: firstTime,
      birth_input: input,
      birth_local: birth.stored.local,
      time_zone: birth.stored.timeZone,
      birth_utc: birth.stored.utc,
      place_label: input.place.label,
      answers,
      accuracy: birth.accuracy,
      character: character.name,
      competency: character.competency,
      style: character.style,
      sun_sign: chart.planets.sun!.sign,
      engine_version: birth.engineVersion,
      db_version: ASTRO_DB.version,
      consent_version: CONSENT_VERSION,
      consented_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`결과 저장 실패: ${error?.code ?? "no data"}`);
  return data.id as string;
}

export async function listResults(userId: string): Promise<Array<Pick<StoredResult, "id" | "created_at" | "nickname" | "character" | "sun_sign" | "accuracy">>> {
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .select("id, created_at, nickname, character, sun_sign, accuracy")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`결과 목록 실패: ${error.code}`);
  return data ?? [];
}

export async function getResult(userId: string, id: string): Promise<StoredResult | null> {
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .select("id, created_at, nickname, first_time, birth_input, answers, character, sun_sign, accuracy")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`결과 조회 실패: ${error.code}`);
  return (data as StoredResult | null) ?? null;
}

export async function deleteResult(userId: string, id: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from(TABLE).delete().eq("user_id", userId).eq("id", id).select("id");
  if (error) throw new Error(`결과 삭제 실패: ${error.code}`);
  return (data?.length ?? 0) > 0;
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
