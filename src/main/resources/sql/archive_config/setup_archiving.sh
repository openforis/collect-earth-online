#!/bin/sh
# WARNING, this script is specifically for the existing Arch servers running CEO.
# For other systems replace each step with specifics to your system.

# Clear old backups
sudo rm -r /var/lib/postgres/ceo-pg-bk.last
sudo -u postgres mv /var/lib/postgres/ceo-pg-bk /var/lib/postgres/ceo-pg-bk.last
# Make a directory to host backup data, create symbolic link for openforis user
sudo -u postgres mkdir -m 705 -p /var/lib/postgres/ceo-pg-bk/base-bk
ln -s /var/lib/postgres/ceo-pg-bk /home/openforis/ceo-pg-bk-sym
# Add 'include' statement to postgresql.conf
sudo -u postgres sed -i "1s/^/\# Include statements\ninclude 'settings.conf'\n\n/" /var/lib/postgres/data/postgresql.conf
# Copy settings file to postgres directory
sudo -u postgres cp /home/openforis/github/collect-earth-online/src/main/resources/sql/archive_config/settings.conf /var/lib/postgres/data/
# Restart postgresql service to use new settings, wal archiving will be enabled
sudo systemctl restart postgresql
# Begin base backup as user postgres. Note: the directory for the base backup must not exist or be empty.
sudo -u postgres pg_basebackup -D /var/lib/postgres/ceo-pg-bk/base-bk -Ft -Z 9 -h localhost -U postgres
sudo chmod -R o+r /var/lib/postgres/ceo-pg-bk/
