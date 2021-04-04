/* script to correct the treatments between 01.10.20 bis 01.12.20                                                   */
/* that have a Sachkosten description which is different from the treatments description                            */
/* IMPORTANT, always make a backup of activities collection before running this                                     */
/*                                                                                                                  */
/*  dc-mongodump --db 0 --collection activities                                                                     */
/* */

/*global db, print, ISODate
/* */

function fixTreatment( activity ) {
    /*
        Check if this treatment has Sachkosten description which is
        different from it's description
    */
    let
        sachkostenDescr = activity.fk5012Set[0] && activity.fk5012Set[0].fk5011Set && activity.fk5012Set[0].fk5011Set[0] && activity.fk5012Set[0].fk5011Set[0].fk5011,
        treatmentDescription = activity.userContent,
        treatmentExplanations = activity.explanations;

    if( sachkostenDescr && sachkostenDescr !== treatmentDescription ) {
        print( `[x] ${activity._id} activity will be updated` );
        db.activities.update( {_id: activity._id}, {
            $set: {
                "fk5012Set.0.fk5011Set.0.fk5011": treatmentDescription,
                explanations: treatmentExplanations ? `${treatmentExplanations}; ${sachkostenDescr}` : sachkostenDescr
            }
        } );
    }

}

db.activities.find( {
    actType: 'TREATMENT',
    timestamp: {
        $lte: new ISODate( "2020-12-01T22:59:59.999Z" ),
        $gte: new ISODate( "2020-09-30T22:00:00.000Z" )
    },
    fk5012Set: {$ne: [], $exists: true}
} ).forEach( fixTreatment );
