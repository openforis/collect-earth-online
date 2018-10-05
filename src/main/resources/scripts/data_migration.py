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
        cur1 = conn.cursor()
        cur.execute("TRUNCATE TABLE institutions RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE institution_users RESTART IDENTITY CASCADE")
        dirname = os.path.dirname(os.path.realpath('__file__'))
        institution_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, r'..\json\institution-list.json'))), "r").read()
        institutions = demjson.decode(institution_list_json)
        for institution in institutions:
            members=institution['members'];
            admins=institution['admins'];
            pendingUsers=institution['pending'];              
            cur.execute("select * from add_institution(%s,%s::text,%s::text,%s::text,%s::text,%s)", (institution['id'],institution['name'],institution['logo'],institution['description'],institution['url'],institution['archived']))
            role_id=-1
            user_id=-1
            for member in members:
                user_id=member                
                if member in admins:
                    role_id=1
                elif member in pendingUsers:
                    role_id=3
                else:
                    role_id=2
                cur1.execute("select * from add_institution_user(%s,%s,%s)", (institution['id'],user_id,role_id))

            for pending in pendingUsers:
                if pending not in members and pending not in admins:
                    user_id=pending
                    role_id=3
                    cur1.execute("select * from add_institution_user(%s,%s,%s)", (institution['id'],user_id,role_id))

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
            cur.execute("select * from add_institution_imagery(%s,%s,%s::text,%s::text,%s::text,%s::jsonb,%s::jsonb)", (imagery['id'],imagery['institution'],imagery['visibility'],imagery['title'],imagery['attribution'],imagery['extent'],json.dumps(imagery['sourceConfig'])))
            imagery_id = cur.fetchone()[0]
            conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)    
    finally:
        if conn is not None:
            conn.close() 
            
def insert_project_widgets():
    conn = None
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE project_widgets RESTART IDENTITY CASCADE")
        dirname = os.path.dirname(os.path.realpath('__file__'))
        project_dash_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, r'..\json\proj.json'))), "r").read()
        dashArr = demjson.decode(project_dash_list_json)
        for dash in dashArr:
            dash_id=dash['dashboard']
            dash_json = open(os.path.abspath(os.path.realpath(os.path.join(dirname, r'..\json\dash-'+dash_id+'.json'))), "r").read() 
            widget = demjson.decode(dash_json)
            cur.execute("select * from add_project_widget(%s,%s::uuid,%s::jsonb)", (widget['projectID'],widget['dashboardID'],json.dumps(widget['widgets'])))
            conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)    
    finally:
        if conn is not None:
            conn.close() 
            
def insert_projects():
    conn = None
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE projects RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE plots RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE samples RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE sample_values RESTART IDENTITY CASCADE")
        dirname = os.path.dirname(os.path.realpath('__file__'))
        project_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, r'..\json\project-list.json'))), "r").read()
        projectArr = demjson.decode(project_list_json)
        for project in projectArr:
            if project['id']!=0:                
                if project['numPlots'] is None:
                    project['numPlots']=0
                if project['plotSpacing'] is None:
                    project['plotSpacing']=0
                if project['plotSize'] is None:
                    project['plotSize']=0
                if project['samplesPerPlot'] is None:
                    project['samplesPerPlot']=0
                if project['sampleResolution'] is None:
                    project['sampleResolution']=0
                cur.execute("select * from create_project(%s,%s,%s::text,%s::text,%s::text,%s::text,ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326),%s::text,%s::text,%s,%s,%s::text,%s,%s::text,%s,%s,%s::jsonb,%s,%s,%s)", (project['id'],project['institution'],project['availability'],project['name'],project['description'],project['privacyLevel'],project['boundary'],project['baseMapSource'],project['plotDistribution'],project['numPlots'],project['plotSpacing'],project['plotShape'],project['plotSize'],project['sampleDistribution'],project['samplesPerPlot'],project['sampleResolution'],json.dumps(project['sampleValues']),None,None,0))
                project_id = cur.fetchone()[0]
                insert_plots(project_id,conn)
                conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)    
    finally:
        if conn is not None:
            conn.close() 

def insert_plots(project_id,conn):
    cur_plot = conn.cursor()
    dirname = os.path.dirname(os.path.realpath('__file__'))
    plot_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, r'..\json\plot-data-'+str(project_id)+'.json'))), "r").read()
    plotArr = demjson.decode(plot_list_json)
    for plot in plotArr:
        boolean_Flagged=plot['flagged']
        if plot['flagged']==False:
            plot['flagged']=0
        else:
            plot['flagged']=1
        cur_plot.execute("select * from create_project_plots(%s,%s,ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))",(project_id,plot['flagged'],plot['center']))
        plot_id = cur_plot.fetchone()[0]
        if plot['user'] is not None:
            user_plot_id=insert_user_plots(plot_id,plot['user'],boolean_Flagged,conn)
            insert_samples(plot_id,plot['samples'],user_plot_id,conn)
        conn.commit()
    cur_plot.close()
    
def insert_user_plots(plot_id,user,flagged,conn):
    user_plot_id=-1
    cur_up = conn.cursor()
    cur_up.execute("select * from add_user_plots(%s,%s::text,%s)",(plot_id,user,flagged))
    user_plot_id = cur_up.fetchone()[0]
    conn.commit()
    cur_up.close()   
    return user_plot_id
    
def insert_samples(plot_id,samples,user_plot_id,conn):
    cur_sample = conn.cursor()
    for sample in samples:
        print(sample)
        cur_sample.execute("select * from create_project_plot_samples(%s,ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))",(plot_id,sample['point']))
        sample_id = cur_sample.fetchone()[0]
        insert_sample_values(user_plot_id,sample_id,sample['value'],conn)
        conn.commit()
    cur_sample.close()    

def insert_sample_values(user_plot_id,sample_id,sample_value,conn):
    cur_sv = conn.cursor()
    cur_sv.execute("select * from add_sample_values(%s,%s,%s::jsonb)",(user_plot_id,sample_id,json.dumps(sample_value)))
    conn.commit()
    cur_sv.close()    
            
def insert_roles():
    conn = None
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE roles RESTART IDENTITY CASCADE")
        cur.execute("INSERT INTO roles VALUES (%s,%s::text)", (1,'admin'))
        cur.execute("INSERT INTO roles VALUES (%s,%s::text)", (2,'member'))
        cur.execute("INSERT INTO roles VALUES (%s,%s::text)", (3,'pending'))
        conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)    
    finally:
        if conn is not None:
            conn.close() 

if __name__ == '__main__':
    insert_users()
    insert_roles()
    insert_institutions()
    insert_imagery()
    insert_project_widgets()
    insert_projects()
    
    