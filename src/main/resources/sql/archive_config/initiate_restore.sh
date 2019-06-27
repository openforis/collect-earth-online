#!/bin/sh
# WARNING, this script is specifically for the existing Arch servers running CEO.
# For other systems replace each step with specifics to your system.

# Stop the server
sudo systemctl stop postgresql
# Move the cluster data directory to a temporary location.
sudo -u postgres rm -r /var/lib/postgres/data.tmp
sudo -u postgres mv /var/lib/postgres/data /var/lib/postgres/data.tmp
# Re create data folder
sudo -u postgres mkdir /var/lib/postgres/data
sudo chmod go-wrx /var/lib/postgres/data
# Restore the database files from base backup.
sudo tar -xzf /var/lib/postgres/ceo-pg-bk/base-bk/base.tar.gz -C /var/lib/postgres/data/ --owner=postgres --group=postgres
# Remove any files present in pg_wal/; these came from the file system backup and are old
sudo -u postgres rm /var/lib/postgres/data/pg_wal/*
# Copy recovery.conf to initiate recovery mode
sudo -u postgres cp /home/openforis/github/collect-earth-online/src/main/resources/sql/archive_config/recovery.conf /var/lib/postgres/data/
# Start the server. The server will go into recovery mode
sudo systemctl start postgresql
