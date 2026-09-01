import sqlite3
dbs = ["data/bhoomisync_dev.db", "data/test_bhoomisync.db", "../data/test_bhoomisync.db"]
for db in dbs:
    try:
        conn = sqlite3.connect(db)
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(surveys)")
        cols = [r[1] for r in cur.fetchall()]
        if cols and "lifecycle_stage" not in cols and "survey_id" in cols:
            cur.execute("ALTER TABLE surveys ADD COLUMN lifecycle_stage TEXT DEFAULT 'PLANNED'")
            conn.commit()
            print("Migrated:", db)
        elif cols:
            print("Already OK:", db)
        conn.close()
    except Exception as e:
        print("Skip:", db, str(e)[:80])
print("All done.")
