# usage `python3 data_migration.py [optional "loop"] [optional project to resume (must include [loop] or [file] for arg 1)]`
# example `python3 data_migration.py loop`
# example `python2 data_migration.py file 350`
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
                if project["id"] > 659:
                    print("updating project with project id " + str(project["id"]))

                    # merge in external files
                    merge_files(project, project["id"], conn)
            except(Exception, psycopg2.DatabaseError) as error:
                print("project for loop: "+ str(error))
                conn.commit()
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print("project outer: "+ str(error))
    finally:
        if conn is not None:
            conn.close()

def checkRequiredCols(actualCols, reqCols):
    for col in reqCols:
        if not (col.upper() in (acol.upper() for acol in actualCols)):
            return []
    return actualCols

def isFloat(string):
    try:
        float(string)
        return True
    except ValueError:
        return False

def merge_files(project, project_id, conn):
    print("merging external files")
    cur = conn.cursor()
    plots_table = ""
    samples_table = ""
    dirname = os.path.dirname(os.path.realpath(__file__))
    ### Plots
    try:
        # get current values for tables
        cur.execute("SELECT plots_ext_table, samples_ext_table FROM projects where project_uid = %s" , [project_id])
        row =  cur.fetchone()
        if row is None: return
        plots_table = row[0]
        samples_table = row[1]
        need_to_update = 0
        fileprefix = "project-" +  str(project_id)
        tableprefix = "project_" +  str(project_id)

        if project["plotDistribution"] == "shp":
            filename = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath , fileprefix + "-plots.zip")))
            templateFilename = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath , "project-" + str(project["projectTemplate"]) + "-plots.zip")))
            if (not os.path.isfile(filename)) and os.path.isfile(templateFilename):
                print("copying")
                shutil.copy(templateFilename, filename)

                if os.path.isfile(filename):
                    print("shp found")
                    need_to_update = 2
                    plots_table = "project_" +  str(project_id) + "_plots_shp"
                    cur.execute("DROP TABLE IF EXISTS ext_tables." + plots_table)
                    conn.commit()
                    # run sh
                    dirname = os.path.dirname(os.path.realpath(__file__))
                    shpath = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath)))
                    subprocess.run(["bash", "shp2postgres.sh", fileprefix + "-plots"], cwd=shpath, stdout=subprocess.PIPE)


        # ### Samples

        if project["sampleDistribution"] == "shp":
            filename = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath , fileprefix + "-samples.zip")))
            templateFilename = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath , "project-" + str(project["projectTemplate"]) + "-samples.zip")))
            if (not os.path.isfile(filename)) and os.path.isfile(templateFilename):
                shutil.copy(templateFilename, filename)

                if os.path.isfile(filename):
                    print("sample found")
                    need_to_update = 3

                    samples_table = "project_" +  str(project_id) + "_samples_shp"
                    cur.execute("DROP TABLE IF EXISTS ext_tables." + samples_table)
                    conn.commit()
                    # run sh
                    dirname = os.path.dirname(os.path.realpath(__file__))
                    shpath = os.path.abspath(os.path.realpath(os.path.join(dirname, shppath)))
                    subprocess.run(["bash", "shp2postgres.sh", fileprefix + "-samples"], cwd=shpath, stdout=subprocess.PIPE)

        if need_to_update > 0:
            try:
                # add table names to project
                cur.execute("SELECT * FROM update_project_tables(%s, %s, %s)" , [project_id, plots_table, samples_table])
                conn.commit()

                if need_to_update >= 2:
                    # clean up project tables
                    cur.execute("SELECT * FROM cleanup_project_tables(%s, %s)" , [project_id, project["plotSize"]])
                    conn.commit()

                if need_to_update == 3:
                    # merge files into plots and samples
                    cur.execute("SELECT * FROM merge_plot_and_file(%s)" , [project_id])
                    conn.commit()
                else:
                    # merge files into plots
                    cur.execute("SELECT * FROM merge_plots_only(%s)" , [project_id])
                    conn.commit()
            finally:
                pass

    except (Exception, psycopg2.DatabaseError) as error:
        print("merge file error: "+ str(error))
        conn.commit()
        cur.close()


if __name__ == "__main__":
    print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M"))
    csvScripts = os.listdir(csvScriptPath)
    for f in csvScripts:
        if f.endswith(".sh"):
            shutil.copy(csvScriptPath+"/"+f, csvpath)

    shpScripts = os.listdir(shpScriptPath)
    for f in shpScripts:
        if f.endswith(".sh"):
            shutil.copy(shpScriptPath+"/"+f, shppath)

    insert_projects()
    print("Done with projects")
    print("Done migration")
    print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M"))
