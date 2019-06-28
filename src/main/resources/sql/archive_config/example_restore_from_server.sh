#!/bin/sh
# WARNING, this will wipe out your existing postgres cluster (all databases)
# WARNING, this script is only an example of how to create a local download and restore script.
# Replace each step with specifics to your system.
# Replace settings in 'recover.conf' to match your system.

# Remove old backups

# Download backup files
scp -r openforis@collect.earth:~/ceo-pg-bk-sym /mnt/shr/
# scp -r openforis@ceodev.servirglobal.net:~/ceo-pg-bk-sym /mnt/shr/

# If you have rsync you can download only the changes
# To add to git bash on Windows https://blog.tiger-workshop.com/add-rsync-to-git-bash-for-windows/
# rsync -au /mnt/shr/ openforis@collect.earth:~/ceo-pg-bk-sym
# rsync -au /mnt/shr/ openforis@ceodev.servirglobal.net:~/ceo-pg-bk-sym

# Stop the server
sudo systemctl stop postgresql
# Remove old DB
sudo -u postgres rm -r /var/lib/postgresql/11/main
# Re create data folder
sudo -u postgres mkdir /var/lib/postgresql/11/main
sudo chmod go-wrx /var/lib/postgresql/11/main
# Restore the database files from base backup.
sudo tar -xzf /mnt/shr/ceo-pg-bk-sym/base-bk/base.tar.gz -C /var/lib/postgresql/11/main/ --owner=postgres --group=postgres
# Remove any files present in pg_wal/; these came from the file system backup and are old
sudo -u postgres rm /var/lib/postgresql/11/main/pg_wal/*
# Copy recovery.conf to initiate recovery mode
sudo -u postgres cp /mnt/shr/github/collect-earth-online/src/main/resources/sql/archive_config/recovery.conf /var/lib/postgresql/11/main/
# Start the server. The server will go into recovery mode
sudo systemctl start postgresql
