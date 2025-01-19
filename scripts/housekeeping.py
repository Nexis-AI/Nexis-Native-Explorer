import psycopg2
import psycopg2.extras

conn = psycopg2.connect(
        host="",
        database="velasity",
        user="velasity",
        password="")

cursor = conn.cursor()

cleanup_query = "DELETE FROM stats WHERE created_at < NOW() - INTERVAL '91 days'"
cursor.execute(cleanup_query)

refresh_stats_stake_query = "REFRESH MATERIALIZED VIEW stats_stake"
cursor.execute(refresh_stats_stake_query)

refresh_stats_performance_query = "REFRESH MATERIALIZED VIEW stats_performance"
cursor.execute(refresh_stats_performance_query)

# refresh_stakers_current_query = "REFRESH MATERIALIZED VIEW stakers_current"
# cursor.execute(refresh_stakers_current_query)

conn.commit()

conn.close()