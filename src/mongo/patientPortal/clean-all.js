/**
 * User: pi
 * Date: 31/05/16  14:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/**
 * Use all section for appropriate servers to clean patient portal data( completely )
 */
/*global db:true */
"use strict";

//-------------- PUC -----------------//

db.patientregs.drop();
db.identities.drop();

//------------------------------------//


//-------------- DCPRC -----------------//

db.contacts.remove({patient: true});

//------------------------------------//


//-------------- PRC/tenant of VPRC -----------------//

db.patients.updateMany({}, {$unset: {
    deviceKey: 1,
    devices: 1,
    createPlanned: 1,
    accessPRC: 1,
    generatedAt: 1,
    pin: 1
}});

//robomongo

db.patients.update({}, {$unset: {
    deviceKey: 1,
    devices: 1,
    createPlanned: 1,
    accessPRC: 1,
    generatedAt: 1,
    pin: 1
}});

//------------------------------------//