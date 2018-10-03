import demjson
import psycopg2
import os
from config import config
params = config()
def insert_users():
    conn = None
    user_id=-1
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE")
        dirname = os.path.dirname(os.path.realpath('__file__'))
        user_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, r'..\json\user-list.json'))), "r").read()
        users = demjson.decode(user_list_json)
        for user in users:
            cur.execute("select * from add_user(%s::text,%s::text)", (user['email'],user['password']))
            user_id = cur.fetchone()[0]
            conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)    
    finally:
        if conn is not None:
            conn.close()
 
if __name__ == '__main__':
    insert_users()
