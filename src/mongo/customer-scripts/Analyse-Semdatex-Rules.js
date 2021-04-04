/**
 * User: rrrw
 * Date: 12/09/2019  12:10
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*eslint-disable*/
/*
Find the Semdatex rules and list them, with folder that they belong to
in sorted order.

Uses well known folder IDs for the top level.

Folders only two levels deep (top level + 1) at the moment and that is what this script shows.  Does not handle a third level.
 */

/*semdatex has 3 top level folders, named below, in these find the next level.*/
var semdatex_folders = db.rules.find({parent:{$in:["000000000000000000000004","000000000000000000000005","000000000000000000000003"]}}).map(a=>a._id.str );
var semdatex_map = {};
db.rules.find({parent:{$in:["000000000000000000000004","000000000000000000000005","000000000000000000000003"]}}).forEach(a=> { semdatex_map[a._id.str] = a.name; } );

/* first check that all is ok */
var check = db.rules.count({parent:{$in:semdatex_folders},"isDirectory" : true});
if( check ) { print(`Warning: unhandled folders beyond second level!`); }

/* now print the list */
db.rules.find({parent:{$in:semdatex_folders}},{parent:1,description:1}).sort({description:1}).forEach(a=> {print(`${a.description} -- ${semdatex_map[a.parent]} -- (${a._id.str})`)})