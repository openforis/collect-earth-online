import demjson
import json
import psycopg2
import os
import csv
import subprocess
from config import config
params = config()
paramsElevated = config(section='postgresql-elevated')
jsonpath = r'../../../../target/classes/json'
csvpath = r'../../../../target/classes/csv'
shppath = r'../../../../target/classes/shp'

#jsonpath = r'../json'
def insert_users():
    conn = None
    user_id=-1
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE")
        dirname = os.path.dirname(os.path.realpath(__file__))
        user_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , 'user-list.json'))), "r").read()
        users = demjson.decode(user_list_json)
        for user in users:
            cur.execute("select * from add_user_migration(%s,%s::text,%s::text)", (user['id'],user['email'],user['password']))
            user_id = cur.fetchone()[0]
            conn.commit()
        cur.execute("select * from add_user_migration(%s,%s::text,%s::text)", (user_id + 1, "guest","dkh*&jlkjadfjk&^58342bmdjkjhf(*&0984"))
        cur.execute("SELECT * FROM set_admin()")
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
        dirname = os.path.dirname(os.path.realpath(__file__))
        institution_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , 'institution-list.json'))), "r").read()
        institutions = demjson.decode(institution_list_json)
        print(len(institutions))
        for institution in institutions:
            members=institution['members']
            admins=institution['admins']
            pendingUsers=institution['pending']             
            cur.execute("select * from add_institution_migration(%s,%s::text,%s::text,%s::text,%s::text,%s)", (institution['id'],institution['name'],institution['logo'],institution['description'],institution['url'],institution['archived']))
            conn.commit()
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
            conn.commit()
            for pending in pendingUsers:
                if pending not in members and pending not in admins:
                    user_id=pending
                    role_id=3
                    cur1.execute("select * from add_institution_user(%s,%s,%s)", (institution['id'],user_id,role_id))
            conn.commit()
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
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE imagery RESTART IDENTITY CASCADE")
        dirname = os.path.dirname(os.path.realpath(__file__))
        imagery_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , 'imagery-list.json'))), "r").read()
        imageryArr = demjson.decode(imagery_list_json)
        for imagery in imageryArr:
            if imagery['institution'] > 1: 
                cur.execute("select * from add_institution_imagery_migration(%s,%s,%s::text,%s::text,%s::text,%s::jsonb,%s::jsonb)", 
                    (imagery['id'],imagery['institution'],imagery['visibility'],imagery['title'],
                    imagery['attribution'],json.dumps(imagery['extent']),json.dumps(imagery['sourceConfig'])))
                conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)    
    finally:
        if conn is not None:
            conn.close() 
            
def insert_project_widgets(project_id,dash_id,conn):
    try:
        cur = conn.cursor()
        dirname = os.path.dirname(os.path.realpath(__file__))
        dash_json = open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , 'dash-'+dash_id+'.json'))), "r").read() 
        widget = demjson.decode(dash_json)
        if widget['projectID'] is not None and int(project_id)==int(widget['projectID']) and len(str(widget['widgets']))>2:
            for awidget in widget['widgets']:
                cur.execute("select * from add_project_widget(%s,%s::uuid,%s::jsonb)", 
                    (widget['projectID'],widget['dashboardID'],json.dumps(awidget)))
                conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print("project widgets: "+ str(error))    

def insert_projects():
    conn = None
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE projects RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE project_widgets RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE plots RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE samples RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE sample_values RESTART IDENTITY CASCADE")
        dirname = os.path.dirname(os.path.realpath(__file__)) 
        project_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , 'project-list.json'))), "r").read()
        projectArr = demjson.decode(project_list_json)
        project_dash_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , 'proj.json'))), "r").read()
        dashArr = demjson.decode(project_dash_list_json)
        print(len(projectArr))
        for project in projectArr:
            try:
                if project['id']>630:
                    print("inserting project with project id"+str(project['id']))
                    if project['numPlots'] is None: project['numPlots']=0
                    if project['plotSpacing'] is None: project['plotSpacing']=0
                    if project['plotSize'] is None: project['plotSize']=0
                    if project['samplesPerPlot'] is None: project['samplesPerPlot']=0
                    if project['sampleResolution'] is None: project['sampleResolution']=0

                    cur.execute("select * from create_project_migration(%s,%s,%s::text,%s::text,%s::text,%s::text,"
                    + "ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326),%s::text,%s::text,%s,%s,%s::text,%s,%s::text,"
                    + "%s,%s,%s::jsonb,%s::jsonb)", 
                    (project['id'],project['institution'],project['availability'], 
                    project['name'],project['description'],project['privacyLevel'],project['boundary'],
                    project['baseMapSource'],project['plotDistribution'],project['numPlots'],
                    project['plotSpacing'],project['plotShape'],project['plotSize'],project['sampleDistribution'],
                    project['samplesPerPlot'],project['sampleResolution'],json.dumps(project['sampleValues']),
                    None))
                    
                    project_id = cur.fetchone()[0]
                    conn.commit()   
                    for dash in dashArr:
                        dash_id=dash['dashboard']
                        if dash_id.isnumeric() and int(dash['projectID']) == int(project_id):
                            insert_project_widgets(project_id,dash_id,conn)
                            break

                    insert_plots_samples_by_file(project_id, conn)
                    merge_files(project, project_id, conn)
                    conn.commit()
            except(Exception, psycopg2.DatabaseError) as error:
                print("project for loop: "+ str(error))
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print("project outer: "+ str(error))
    finally:
        if conn is not None:
            conn.close()

def insert_plots_samples_by_file(project_id, mainconn):
    # need elevated permissions to use the copy function inside a querey
    conn = psycopg2.connect(**paramsElevated)
    cur_plot = conn.cursor()
    try:
        print("insert by file")
        dirname = os.path.dirname(os.path.realpath(__file__))
        filename = os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , 'plot-data-'+str(project_id)+'.json')))
        if os.path.isfile(filename):
            cur_plot.execute("select * from add_plots_by_json(%s,%s::text)",(project_id, filename))
            conn.commit()
    except (Exception, psycopg2.DatabaseError) as error:
        print("plot file error: "+ str(error))
        conn.commit()
        cur_plot.close()
        conn.close()
        insert_plots(project_id,mainconn)
    cur_plot.close()
    conn.close()

def insert_plots(project_id,conn):
    print("inserting plot the old way")
    cur_plot = conn.cursor()
    user_plot_id=-1
    dirname = os.path.dirname(os.path.realpath(__file__))
    filename = os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , 'plot-data-'+str(project_id)+'.json')))
    if os.path.isfile(filename):
        plot_list_json= open(filename, "r").read()
        plotArr = demjson.decode(plot_list_json)
        for plot in plotArr:
            try:
                boolean_Flagged=plot['flagged']
                if plot['flagged']==False:
                    plot['flagged']=0
                else:
                    plot['flagged']=1

                cur_plot.execute("select * from create_project_plot(%s,ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))",
                (project_id,plot['center']))

                plot_id = cur_plot.fetchone()[0]
                if plot['user'] is not None:
                    user_plot_id=insert_user_plots(plot_id,plot['user'],boolean_Flagged,conn)
                insert_samples(plot_id,plot['samples'],user_plot_id,conn)
                conn.commit()
            except (Exception, psycopg2.DatabaseError) as error:
                print("plots error: "+ str(error))
    cur_plot.close()

def insert_user_plots(plot_id,user,flagged,conn):
    user_plot_id=-1
    cur_up = conn.cursor()
    cur_user = conn.cursor()
    cur_user.execute("select id from users where email=%s;",(user,))
    rows = cur_user.fetchall()
    if len(rows)>0:
        try:
            cur_up.execute("select * from add_user_plots_migration(%s,%s::text,%s)",(plot_id,user,flagged))
            user_plot_id = cur_up.fetchone()[0]
            conn.commit()
        except (Exception, psycopg2.DatabaseError) as error:
                print("user plots error: "+ str(error))
    cur_up.close()
    cur_user.close()
    return user_plot_id

def insert_samples(plot_id,samples,user_plot_id,conn):
    cur_sample = conn.cursor()
    for sample in samples:
        try:
            cur_sample.execute("select * from create_project_plot_sample(%s,ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))",
             (plot_id,sample['point'] ))

            sample_id = cur_sample.fetchone()[0]
            if user_plot_id != -1 and 'value' in sample:
                insert_sample_values(user_plot_id,sample_id,sample['value'],conn)
            conn.commit()
        except (Exception, psycopg2.DatabaseError) as error:
                print("samples error: "+ str(error))
    cur_sample.close()

def insert_sample_values(user_plot_id,sample_id,sample_value,conn):
    cur_sv = conn.cursor()
    try:
        cur_sv.execute("select * from add_sample_values_migration(%s,%s,%s::jsonb)",(user_plot_id,sample_id,json.dumps(sample_value)))
    except (Exception, psycopg2.DatabaseError) as error:
                print("sample values error: "+ str(error))
    conn.commit()
    cur_sv.close()

def loadCsvHeaders(csvfile):
    cols = ''
    print (csvfile)
    with open(csvfile, 'r') as fin:
        csvin = csv.reader(fin)
        for h in next(csvin, []):
            if h.upper() in ['LAT', 'LON']:
                cols += h + ' float,'
            else:
                cols += h + ' text,'
    return cols[:-1]

def merge_files(project, project_id, conn):
    print("merging external files")
    cur = conn.cursor()
    plots_table = ""
    samples_table = ""
    dirname = os.path.dirname(os.path.realpath(__file__))
    ### Plots
    try:
        fileprefix = "project-" +  str(project_id)
        tableprefix = 'project_' +  str(project_id)
         
        filename = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath , fileprefix + "-plots.csv")))
        if project['plotDistribution'] == 'csv' and (os.path.isfile(filename)): 
            plots_table = tableprefix + '_plots_csv'

            cur.execute("SELECT * FROM create_new_table(%s,%s)", 
            [plots_table, loadCsvHeaders(filename)])
            conn.commit()

            # run sh to upload csv to postgres
            dirname = os.path.dirname(os.path.realpath(__file__))
            shpath = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath)))
            subprocess.run(['bash', 'csv2postgres.sh', fileprefix + "-plots"], cwd=shpath, stdout=subprocess.PIPE)

            # add index 
            cur.execute("SELECT * FROM add_index_col(%s)" , [plots_table])
            conn.commit()

        filename = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath , fileprefix + "-plots.zip")))
        if project['plotDistribution'] == 'shp' and os.path.isfile(filename):
            
            # run sh
            dirname = os.path.dirname(os.path.realpath(__file__))
            shpath = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath)))
            subprocess.run(['bash', 'shp2postgres.sh', fileprefix + "-plots"], cwd=shpath, stdout=subprocess.PIPE)
        
            plots_table = 'project_' +  str(project_id) + '_plots_shp'
        
        ### Samples
        filename = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath , fileprefix + "-samples.csv")))
        if project['sampleDistribution'] == 'csv' and os.path.isfile(filename): 
            
            cur.execute("SELECT * FROM create_new_table(%s,%s)", 
            ['project_' +  str(project_id) + '_samples_csv', loadCsvHeaders(filename)])
            conn.commit()

            # run sh to upload csv to postgres
            dirname = os.path.dirname(os.path.realpath(__file__))
            shpath = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath)))
            subprocess.run(['bash', 'csv2postgres.sh', fileprefix + "-samples"], cwd=shpath, stdout=subprocess.PIPE)

            # add index 
            cur.execute("SELECT * FROM add_index_col(%s)" , ['project_' +  str(project_id) + '_samples_csv'])
            samples_table = 'project_' +  str(project_id) + '_samples_csv'

        filename = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath , fileprefix + "-samples.zip")))
        if project['sampleDistribution'] == 'shp' and os.path.isfile(filename):
            
            # run sh
            dirname = os.path.dirname(os.path.realpath(__file__))
            shpath = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath)))
            subprocess.run(['bash', 'shp2postgres.sh', fileprefix + "-samples"], cwd=shpath, stdout=subprocess.PIPE)

            samples_table = 'project_' +  str(project_id) + '_samples_shp'

        # add table names to project
        cur.execute("SELECT * FROM update_project_tables(%s,%s,%s)" , [project_id, plots_table, samples_table])
        conn.commit()
        # clean up project tables
        cur.execute("SELECT * FROM cleanup_project_tables(%s,%s)" , [project_id, project['plotSize']])
        conn.commit()
        # merge files into plots
        cur.execute("SELECT * FROM merge_plot_and_file(%s)" , [project_id])
        conn.commit()

    except (Exception, psycopg2.DatabaseError) as error:
        print("merge file error: "+ str(error))
        conn.commit()
        cur.close()

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
def update_sequence():
    conn = psycopg2.connect(**params)
    cur = conn.cursor()
    cur.execute("select * from update_sequence('users')")
    cur.execute("select * from update_sequence('institutions')")  
    cur.execute("select * from update_sequence('imagery')")  
    cur.execute("select * from update_sequence('projects')")
    cur.execute("select * from update_sequence('user_plots')")
    cur.execute("select * from update_sequence('sample_values')")
    cur.execute("select * from update_sequence('plots')")



if __name__ == '__main__':
    print("inserting users")
    insert_users()
    print("inserting roles")
    insert_roles()
    print("inserting institutions")
    insert_institutions()
    print("inserting imagery")
    insert_imagery()
    print("inserting projects")
    insert_projects()
    print("Done with projects")
    update_sequence()
    print("Done migration")
