#! /usr/bin/env bash
# NOTE: this file is not in the buildings directory because webpack complains theres no loaders for it
cd buildings

for file in *.svg
do
    echo "Exporting $file"
    inkscape --export-type=png $file --export-overwrite -o $(basename $file .svg).png
done
