/* 2.11.17
RW: checked in script as an example of naming convention.
    Scripts being executed on customer systems via run-batch-remote must be:
     1. well tested
     2. not affect patient data, only settings on the datasafe
*/
/*global db*/
var res1 = db.employees.update({username:"Support","memberOf.group":{$ne:"SUPPORT"}},{$push:{memberOf:{group:"SUPPORT"}} });
print(res1 && res1.nModified);
res1 = db.identities.update({username:"Support","memberOf.group":{$ne:"SUPPORT"}},{$push:{memberOf:{group:"SUPPORT"}} });
print(res1 && res1.nModified);
