#!/bin/sh
sudo systemctl start nginx emperor.uwsgi
sudo systemctl enable nginx emperor.uwsgi
sudo systemctl start nginx emperor.uwsgi
