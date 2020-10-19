DROP TYPE IF EXISTS enum_fantasy_league_duration CASCADE;
CREATE TYPE enum_fantasy_league_duration AS ENUM ('weekly', 'half-season', 'full-season', 'custom');
ALTER TABLE "public"."fantasyleague"
  ALTER COLUMN leagueduration
    DROP DEFAULT,
  ALTER COLUMN leagueduration
    SET DATA TYPE enum_fantasy_league_duration
    USING leagueduration::enum_fantasy_league_duration,
  ALTER COLUMN leagueduration
    SET DEFAULT 'custom'::enum_fantasy_league_duration;
