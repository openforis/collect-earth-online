import demjson
import json
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
            cur.execute("select * from add_user(%s,%s::text,%s::text)", (user['id'],user['email'],user['password']))
            user_id = cur.fetchone()[0]
            conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)    
    finally:
        if conn is not None:
            conn.close()

def insert_institutions():
    conn = None
    institution_id=-1
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE institutions RESTART IDENTITY CASCADE")
        dirname = os.path.dirname(os.path.realpath('__file__'))
        institution_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, r'..\json\institution-list.json'))), "r").read()
        institutions = demjson.decode(institution_list_json)
        for institution in institutions:
            cur.execute("select * from add_institution(%s,%s::text,%s::text,%s::text,%s::text,%s)", (institution['id'],institution['name'],institution['logo'],institution['description'],institution['url'],institution['archived']))
            institution_id = cur.fetchone()[0]
            conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)    
    finally:
        if conn is not None:
            conn.close() 
            
def insert_imagery():
    conn = None
    imagery_id=-1
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE imagery RESTART IDENTITY CASCADE")
        dirname = os.path.dirname(os.path.realpath('__file__'))
        imagery_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, r'..\json\imagery-list.json'))), "r").read()
        imageryArr = demjson.decode(imagery_list_json)
        for imagery in imageryArr:
            cur.execute("select * from add_institution_imagery(%s,%s,%s::text,%s::text,%s::text,%s::geometry,%s::jsonb)", (imagery['id'],imagery['institution'],imagery['visibility'],imagery['title'],imagery['attribution'],imagery['extent'],json.dumps(imagery['sourceConfig'])))
            imagery_id = cur.fetchone()[0]
            conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)    
    finally:
        if conn is not None:
            conn.close() 

if __name__ == '__main__':
    insert_users()
    insert_institutions()
    insert_imagery()
