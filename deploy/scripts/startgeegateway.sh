#!/bin/sh
sudo systemctl stop nginx emperor.uwsgi
sudo systemctl enable nginx emperor.uwsgi
sudo systemctl start nginx emperor.uwsgi
