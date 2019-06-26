#!/bin/sh
# WARNING, this script is specfically for the existing Arch servers running CEO.
# For other systems replace each step with specifics to your system.

# Add 'include' statement to postgresql.conf
sudo -u postgres sed -i "1s/^/\# Inlcude statements\ninclude 'settings.conf'\n\n/" /var/lib/postgres/data/postgresql.conf
# Copy settings file to postgres directory
sudo -u postgres cp /home/openforis/github/collect-earth-online/src/main/resources/sql/settings.conf /var/lib/postgres/data/
# Restart postgresql service to use new settings, wal archiving will be enabled
sudo systemctl restart postgresql
# Make a directory to host backup data
sudo -u postgres mkdir -p /var/lib/postgres/ceo-pg-bk
# Allows others to see it
sudo chmod o+r /var/lib/postgres/ceo-pg-bk
# Create symbolic link for openforis user
ln -s /var/lib/postgres/ceo-pg-bk /home/openforis/ceo-pg-bk-sym
# Begin base backup as user postgres.  Note: the directory for the base backup must not exist or be empty.
sudo -u postgres pg_basebackup -D /var/lib/postgres/ceo-pg-bk/base-bk -Ft -Z 9 -h localhost -U postgres
