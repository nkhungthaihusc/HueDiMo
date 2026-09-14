"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = require("../config/db");
async function migrate() {
    console.log("Applying database migrations for User Profile & Check-in Leaderboard...");
    try {
        await db_1.pool.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS checkin_count INT DEFAULT 0;

      CREATE TABLE IF NOT EXISTS public.checkins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        place_id TEXT NOT NULL,
        points_earned INT DEFAULT 10,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id);
      CREATE INDEX IF NOT EXISTS idx_checkins_place_id ON public.checkins(place_id);
    `);
        console.log(" Migration successful!");
    }
    catch (err) {
        console.error("Migration failed:", err);
    }
    finally {
        await db_1.pool.end();
    }
}
migrate();
