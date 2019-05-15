import datetime
import json
import psycopg2
import shutil
import os
import glob
import csv
import re
import subprocess
import sys
from config import config

params = config()

jsonpath = r"../../../../target/classes/json"
csvpath = r"../../../../target/classes/csv"
csvScriptPath = r"../csv"
shppath = r"../../../../target/classes/shp"
shpScriptPath = r"../shp"

def insert_project_widgets(project_id, dash_id, conn):
    try:
        cur = conn.cursor()
        dirname = os.path.dirname(os.path.realpath(__file__))
        dash_json = open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , "dash-" + dash_id + ".json"))), "r")
        widget = json.load(dash_json)
        if widget["projectID"] is not None and int(project_id)==int(widget["projectID"]) and len(str(widget["widgets"]))>2:
            for awidget in widget["widgets"]:
                try:
                    cur.execute("select CAST(jsonb_extract_path_text(widget, 'id') as int), widget_uid from project_widgets where dashboard_id = %s and CAST(jsonb_extract_path_text(widget, 'id') as int) = CAST(jsonb_extract_path_text(%s, 'id') as int)", (widget["dashboardID"], json.dumps(awidget)))
                    rows = cur.fetchall()

                    if len(rows)==0:
                        print("adding single widget")
                        cur.execute("select * from add_project_widget(%s, %s::uuid, %s::jsonb)",
                            (widget["projectID"], widget["dashboardID"], json.dumps(awidget)))
                    else:
                        print(rows)
                except: pass
                conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print("project widgets: "+ str(error))

def insert_projects():
    conn = None
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        dirname = os.path.dirname(os.path.realpath(__file__))
        project_list_json = open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , "project-list.json"))), "r")
        projectArr = json.load(project_list_json)
        project_dash_list_json = open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , "proj.json"))), "r")
        dashArr = json.load(project_dash_list_json)
        print(len(projectArr))
        for project in projectArr:
            try:
                project_id = project["id"]
                if project_id > 0:
                    print(project_id)
                    for dash in dashArr:
                        dash_id = dash["dashboard"]
                        try:
                            if int(dash["projectID"]) == int(project_id):
                                print("inserting dash")
                                insert_project_widgets(project_id,dash_id,conn)
                        except: pass
                    conn.commit()
            except(Exception, psycopg2.DatabaseError) as error:
                print("project for loop: "+ str(error))
                conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print("project outer: "+ str(error))
    finally:
        if conn is not None:
            conn.close()

if __name__ == "__main__":
    print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M"))

    print("inserting widgets")
    insert_projects()
    print("Done with widgets")
    print("Done migration")
    print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M"))
