DROP TYPE IF EXISTS enum_fantasy_league_state CASCADE;
CREATE TYPE enum_fantasy_league_state AS ENUM (
    'preDraft',
    'cancelled',
    'drafting',
    'postDraft',
    'inProgress',
    'finalized'
);
ALTER TABLE "public"."fantasyleague"
ALTER COLUMN "leaguestate" TYPE enum_fantasy_league_state USING leaguestate::enum_fantasy_league_state;