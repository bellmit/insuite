/**
 * User: do
 * Date: 06.09.18  11:16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, ObjectId, ISODate */

const s = ( str, len ) => {
    let maxStr = '';
    for( let i = 0; i < len; i++ ) {
        maxStr += ' ';
    }
    return (maxStr + str).slice( -len );
};

const printTable = ( data, rows ) => {
    print( rows.map( row => s( row[0], row[1] ) ).join( ' | ' ) );
    data.forEach( dr => {
        print( rows.map( row => s( dr[row[0]] || '-', row[1] ) ).join( ' | ' ) );
    } );
};

/**
 * @function getScheinContextFor
 * @description Helpful get quick overview of bunch of otherwise unrelated activities to detect missing scheins.
 * Specify list of activity ids (actIds) that will be grouped by caseFolder and listed in schein context like this:
 *
 * Patient: 5b361f50fa5f* 340cdb0d8a98 / CaseFolder: 5b911dfd390fe1327aaffc81
 *                      _id |               locationId |               employeeId |    actType |   status |                                          timestamp |   code
 * 5b911f9eaad924328daa6e80 | 000000000000000000000001 | 5ad4ba6d79c4786b2116ff54 |  TREATMENT |    VALID |           Thu Sep 06 2018 14:37:48 GMT+0200 (CEST) |  34233
 * 5b911e0b7e75053280c4bbe1 | 000000000000000000000001 | 5ad4ba6d79c4786b2116ff54 |     SCHEIN |    VALID |           Thu Sep 06 2018 00:00:00 GMT+0200 (CEST) |      -
 *
 * Patient: 5b361f23fa5f340cdb07f496 / CaseFolder: 5b911f587e75053280c4bc42
 *                      _id |               locationId |               employeeId |    actType |   status |                                          timestamp |   code
 * 5b911f747e75053280c4bc4e | 000000000000000000000001 | 5ad4ba6d79c4786b2116ff54 |  TREATMENT |    VALID |           Thu Sep 06 2018 14:37:04 GMT+0200 (CEST) |  18212
 * 5b911f747e75053280c4bc4d | 000000000000000000000001 | 5ad4ba6d79c4786b2116ff54 |  TREATMENT |    VALID |           Thu Sep 06 2018 14:37:04 GMT+0200 (CEST) |  18220
 * 5b911f6e7e75053280c4bc43 | 000000000000000000000001 | 5ad4ba6d79c4786b2116ff54 |     SCHEIN |    VALID |           Thu Sep 06 2018 00:00:00 GMT+0200 (CEST) |      -
 * ...
 */
const getScheinContextFor = ( actIds ) => {
    const groupedByCaseFolder = db.activities.aggregate( [
        {$match: {_id: {$in: actIds}}},
        {
            $group: {
                _id: '$caseFolderId',
                patientId: {
                    $first: '$patientId'
                },
                activityIds: {
                    $addToSet: '$_id'
                }
            }
        }, {
            $project: {
                _id: 0,
                caseFolderId: '$_id',
                patientId: '$patientId',
                activityIds: '$activityIds'
            }
        }
    ] ).toArray();

    groupedByCaseFolder.forEach( caseFolderGroup => {
        print( `Patient: ${caseFolderGroup.patientId} / CaseFolder: ${caseFolderGroup.caseFolderId}` );

        const activities = db.activities.find( {
            $or: [
                {
                    actType: {$in: ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN']},
                    caseFolderId: caseFolderGroup.caseFolderId
                }, {
                    _id: {$in: caseFolderGroup.activityIds}
                }
            ]
        } ).sort( {timestamp: -1} ).toArray();

        printTable( activities, [['_id', 24], ['locationId', 24], ['employeeId', 24], ['actType', 10], ['status', 8], ['timestamp', 50], ['code', 6]] );
        print( '' );
    } );
};

const getEndOfQuarter = ( q, y ) => {
    let endQ, endDay;
    switch( q ) {
        case 1:
            endQ = '03';
            endDay = '30';
            break;
        case 2:
            endQ = '06';
            endDay = '31';
            break;

        case 3:
            endQ = '09';
            endDay = '30';
            break;

        case 4:
            endQ = '12';
            endDay = '31';
            break;
        default:
            throw Error( `unknown quarter ${q}` );
    }
    return ISODate( `${y}-${endQ}-${endDay}T23:59:00.000Z` );
};

const getInvoiceLogIds = ( invoiceLogId ) => {
    const result = [];
    db.invoiceentries.find( {invoiceLogId, type: 'schein'} ).forEach( ie => {
        result.push( ObjectId( ie.data._id ) );
        ie.data.treatments.forEach( t => result.push( ObjectId( t._id ) ) );
    } );
    return result;
};

const getPrice = ( match ) => {
    return db.activities.aggregate( [
        {
            $match: match
        },
        {
            $group: {
                _id: null,
                price: {
                    $sum: '$price'
                }
            }
        }
    ] ).toArray();
};

