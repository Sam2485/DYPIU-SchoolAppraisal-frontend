#!/bin/sh
set -eu

: "${VITE_API_BASE_URL:=https://schoolappraisal-backend-919405994318.asia-south1.run.app}"
: "${PORT:=8080}"
export VITE_API_BASE_URL

envsubst '${VITE_API_BASE_URL}' \
  < /opt/app/env-config.template.js \
  > /usr/share/nginx/html/env-config.js

sed -i "s/listen 8080;/listen ${PORT};/" /etc/nginx/conf.d/default.conf
