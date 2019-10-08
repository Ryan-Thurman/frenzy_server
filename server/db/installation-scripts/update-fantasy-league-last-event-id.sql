CREATE OR REPLACE FUNCTION update_fantasy_league_last_event_id() RETURNS trigger AS $update_fantasy_league_last_event_id$
    BEGIN
        UPDATE fantasyleague SET lasteventid = new.id WHERE fantasyleague.id = new.fantasyleagueid;
        RETURN new;
    END;
$update_fantasy_league_last_event_id$ LANGUAGE plpgsql;

CREATE TRIGGER update_fantasy_league_last_event_id AFTER INSERT ON draftevent
    FOR EACH ROW EXECUTE PROCEDURE update_fantasy_league_last_event_id();
