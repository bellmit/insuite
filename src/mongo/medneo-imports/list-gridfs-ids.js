/**
 * User: rrrw
 * Date: 30/09/2019  17:02
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */
/*eslint-disable*/
db.fs.files.find({},{_id:1}).forEach(a=>{print('\'ObjectId("' + a._id.str + '")\'');})
