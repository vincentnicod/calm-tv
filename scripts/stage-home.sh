#!/bin/sh
# Build the directory that gets bind-mounted over LG's Home: the launcher page plus an appinfo.json derived
# from this TV's own stock Home (nothing of LG's is shipped in the repo). Safe to re-run while mounted.
L=/media/developer/cleanyourtv
S=$L/home-overlay
mkdir -p $S
cp $L/app/* $S/
node $L/jtool.js stage "$L/backup/home-appinfo.orig.json" "$S/appinfo.json"
