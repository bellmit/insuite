/**
 * KAT-214 Fix
 * Mongo CLI script to set all RELEVANT insuranceId from insuranceGLN, in the first 4 insurancestatus objects.
 * unoptimised.
 */
/*global db*/
const _t = {$exists: true};
const _f = {$exists: false};
const _i = "insuranceStatus";
const _iid = "insuranceId";
const _igln = "insuranceGLN";

var qry1 = {};
qry1[`${_i}.0`] = _t;
qry1[`${_i}.0.${_iid}`] = _f;

var qry2 = {};
qry2[`${_i}.1`] = _t;
qry2[`${_i}.1.${_iid}`] = _f;

var qry3 = {};
qry3[`${_i}.2`] = _t;
qry3[`${_i}.2.${_iid}`] = _f;

var qry4 = {};
qry4[`${_i}.3`] = _t;
qry4[`${_i}.3.${_iid}`] = _f;


function fix( patientId, insuranceStatus, idx ) {
    if( insuranceStatus[idx] && insuranceStatus[idx][_igln]) {
        let result = {};
        /*print(`${patientId.str} update insuranceId "${insuranceStatus[idx][_iid]}" <- "${insuranceStatus[idx][_igln]}"`);*/
        result = {patientId:patientId, index:idx, GLN: insuranceStatus[idx][_igln] };
        insuranceStatus[idx][_iid] = insuranceStatus[idx][_igln];
        /*printjson(insuranceStatus);*/
        db.patients.update({_id:patientId},{$set:{insuranceStatus:insuranceStatus}});
        db.KAT214deleteDEC20.insert(result);
    } else {
        /*print('.');*/
    }
}

db.patients.find(qry1).forEach(p=>{
    fix(p._id, p[_i], 0);
});

db.patients.find(qry2).forEach(p=>{
    fix(p._id, p[_i], 1);
});

db.patients.find(qry3).forEach(p=>{
    fix(p._id, p[_i], 2);
});

db.patients.find(qry4).forEach(p=>{
    fix(p._id, p[_i], 3);
});

