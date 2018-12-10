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


def insert_projects():
    conn = None
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        dirname = os.path.dirname(os.path.realpath(__file__)) 
        project_list_json= open(os.path.abspath(os.path.realpath(os.path.join(dirname, jsonpath , 'project-list.json'))), "r").read()
        projectArr = demjson.decode(project_list_json)

        for project in projectArr:
            try:
                if project['id']==460:
                    print("project with project id"+str(project['id']))
                    merge_files(project, project['id'], conn)
                except(Exception, psycopg2.DatabaseError) as error:
                    print("project for loop: "+ str(error))
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print("project outer: "+ str(error))
    finally:
        if conn is not None:
            conn.close()

# builds list of old name to become lon, lat
def csvColRenameList(csvCols):
    renameCol = []
    renameCol.append([csvCols[0], 'lon'])
    renameCol.append([csvCols[1], 'lat'])
    return renameCol

# files should have lat lon in the first 2 columns, returns string
def csvHeaderToCol(csvCols):
    colsStr = ''
    for i, h in enumerate(csvCols):
        if i <=1:
            colsStr += h + ' float,'
        else:
            colsStr += h + ' text,'
    return colsStr[:-1]

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

# returns list
def loadCsvHeaders(csvfile):
    with open(csvfile, 'r') as fin:
        csvin = csv.reader(fin)
        headers = next(csvin, [])
        firstRow = next(csvin, [])
        if headers[0].upper() == 'PLOTID' or headers[0].upper() == 'ID' or (not isFloat(firstRow[0]) or -180.0 > float(firstRow[0]) > 180.0 or
           not isFloat(firstRow[1]) or -90.0 > float(firstRow[1]) > 90.0):
                print("Error with columns in file " + csvfile)
                return []
        else:
            return headers

def merge_files(project, project_id, conn):
    cur = conn.cursor()
    try:
        print("merging external files")
        dirname = os.path.dirname(os.path.realpath(__file__))
        # get current values for tables
        cur.execute("SELECT plots_ext_table, samples_ext_table FROM projects where id = %s" , [project_id])
        row =  cur.fetchone()
        plots_table = row[0]
        samples_table = row[1]
        need_to_update = False
        fileprefix = "project-" +  str(project_id)
        tableprefix = 'project_' +  str(project_id)

        # old files do not have a plotId, all columns are extra
        oldFilename = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath , fileprefix + ".csv")))
        filename = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath , fileprefix + "-plots.csv")))
        
        if project['plotDistribution'] == 'csv' and (os.path.isfile(oldFilename)): 
            csv_headers = loadCsvHeaders(oldFilename)
            if len(csv_headers) > 0:
                plots_table = tableprefix + '_plots_csv'
                need_to_update = 1
                cur.execute("SELECT * FROM create_new_table(%s,%s)", 
                [plots_table, csvHeaderToCol(csv_headers)])
                conn.commit()

                # run sh to upload csv to postgres
                dirname = os.path.dirname(os.path.realpath(__file__))
                shpath = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath)))
                subprocess.run(['bash', 'csv2postgresOld.sh', fileprefix, fileprefix + "-plots"], cwd=shpath, stdout=subprocess.PIPE)

                # add index 
                cur.execute("SELECT * FROM add_index_col(%s)" , [plots_table])
                conn.commit()

                #rename cols
                try:
                    colList = csvColRenameList(csv_headers)
                    if colList[0][0].upper() != colList[0][1].upper():
                        cur.execute("SELECT * FROM rename_col(%s,%s,%s)" , [plots_table, colList[0][0],colList[0][1]])
                        conn.commit()

                    if colList[1][0].upper() != colList[1][1].upper():
                        cur.execute("SELECT * FROM rename_col(%s,%s,%s)" , [plots_table, colList[1][0], colList[1][1]])
                        conn.commit()
                except:
                    pass

                # if column plotid does exist, it is not the same as the newer plotId field
                try:
                    cur.execute("SELECT * FROM rename_col(%s,%s,%s)" , [plots_table, 'plotId', 'plotId2'])
                    conn.commit()
                except:
                    conn.commit()
                    pass
                # no requirements for plotId mean that even if the field exists its not valid.  Add empty column for
                # backwords compatibility
                cur.execute("SELECT * FROM add_plotId_col(%s)" , [plots_table])
                conn.commit()

        elif project['plotDistribution'] == 'csv' and (os.path.isfile(filename)): 
            csv_headers = loadCsvHeaders(filename)
            if len(checkRequiredCols(csv_headers,['plotId'])) > 0:
                plots_table = tableprefix + '_plots_csv'
                need_to_update = 2
                cur.execute("SELECT * FROM create_new_table(%s,%s)", 
                [plots_table, csvHeaderToCol(csv_headers)])
                conn.commit()

                # run sh to upload csv to postgres
                dirname = os.path.dirname(os.path.realpath(__file__))
                shpath = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath)))
                subprocess.run(['bash', 'csv2postgres.sh', fileprefix + "-plots"], cwd=shpath, stdout=subprocess.PIPE)

                # add index 
                cur.execute("SELECT * FROM add_index_col(%s)" , [plots_table])
                conn.commit()

                #rename cols
                try:
                    colList = csvColRenameList(csv_headers)
                    if colList[0][0].upper() != colList[0][1].upper():
                        cur.execute("SELECT * FROM rename_col(%s,%s,%s)" , [plots_table, colList[0][0],colList[0][1]])
                        conn.commit()

                    if colList[1][0].upper() != colList[1][1].upper():
                        cur.execute("SELECT * FROM rename_col(%s,%s,%s)" , [plots_table, colList[1][0], colList[1][1]])
                        conn.commit()
                except:
                    pass
            else:
                print (csv_headers)
        ### Samples
        filename = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath , fileprefix + "-samples.csv")))
        if project['sampleDistribution'] == 'csv' and os.path.isfile(filename): 
            csv_headers = loadCsvHeaders(filename)
            if len(checkRequiredCols(csv_headers, ['plotId', 'sampleId'])) > 0:
                samples_table = 'project_' +  str(project_id) + '_samples_csv'
                need_to_update = 3
                cur.execute("SELECT * FROM create_new_table(%s,%s)", 
                ['project_' +  str(project_id) + '_samples_csv', csvHeaderToCol(csv_headers)])
                conn.commit()

                # run sh to upload csv to postgres
                dirname = os.path.dirname(os.path.realpath(__file__))
                shpath = os.path.abspath(os.path.realpath(os.path.join(dirname, csvpath)))
                subprocess.run(['bash', 'csv2postgres.sh', fileprefix + "-samples"], cwd=shpath, stdout=subprocess.PIPE)

                # add index 
                cur.execute("SELECT * FROM add_index_col(%s)" , [samples_table])

                #rename cols
                try:
                    colList = csvColRenameList(csv_headers)
                    if colList[0][0].upper() != colList[0][1].upper():
                        cur.execute("SELECT * FROM rename_col(%s,%s,%s)" , [samples_table, colList[0][0],colList[0][1]])
                        conn.commit()

                    if colList[1][0].upper() != colList[1][1].upper():
                        cur.execute("SELECT * FROM rename_col(%s,%s,%s)" , [samples_table, colList[1][0], colList[1][1]])
                        conn.commit()
                except:
                    pass


        # add table names to project
        cur.execute("SELECT * FROM update_project_tables(%s,%s,%s)" , [project_id, plots_table, samples_table])
        conn.commit()

        if need_to_update >= 2:
            # clean up project tables
            cur.execute("SELECT * FROM cleanup_project_tables(%s,%s)" , [project_id, project['plotSize']])
            conn.commit()

        if need_to_update == 3:
            # merge files into plots
            cur.execute("SELECT * FROM merge_plot_and_file(%s)" , [project_id])
            conn.commit()
        else:
            # merge files into plots
            cur.execute("SELECT * FROM merge_plots_only(%s)" , [project_id])
            conn.commit()

    except (Exception, psycopg2.DatabaseError) as error:
        print("merge file error: "+ str(error))
        conn.commit()
        cur.close()




if __name__ == '__main__':
    insert_projects()
    print("Done with projects")

