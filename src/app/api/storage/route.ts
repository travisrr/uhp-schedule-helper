import { NextResponse } from "next/server";
import {
  clearPersistedState,
  persistAppStatePatch,
  readPersistedState,
} from "@/lib/server/app-storage";
import type { AppDataState } from "@/lib/types";

export async function GET() {
  const state = await readPersistedState();
  return NextResponse.json(state);
}

export async function PUT(request: Request) {
  try {
    const patch = (await request.json()) as Partial<AppDataState>;
    const state = await persistAppStatePatch(patch);
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save app state.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const state = await clearPersistedState();
  return NextResponse.json(state);
}
