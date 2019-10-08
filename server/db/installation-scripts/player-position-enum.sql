DROP TYPE IF EXISTS enum_player_position CASCADE;
CREATE TYPE enum_player_position AS ENUM ('F', 'M', 'D', 'GK');
ALTER TABLE "public"."fantasyteamplayerproeventmeta" ALTER COLUMN "position" TYPE enum_player_position USING position::enum_player_position;
ALTER TABLE "public"."fantasyteamplayer" ALTER COLUMN "position" TYPE enum_player_position USING position::enum_player_position;
ALTER TABLE "public"."proplayer" ALTER COLUMN "position" TYPE enum_player_position USING position::enum_player_position;