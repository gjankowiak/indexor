#!/bin/bash

set -e
set -x

if [ $HOSTNAME == "nuiton" ];
then
  cp * ../indexor
else
  scp index.html indexor.js main.js nuiton:/var/www/janko.fr/gaspard.static/enseignement/konstanz/utils/indexor/
fi
