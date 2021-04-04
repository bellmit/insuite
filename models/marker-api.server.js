/*global YUI */

YUI.add( 'marker-api', function( Y, NAME ) {

    const {formatPromiseResult} = require( 'dc-core' ).utils,
        ObjectId = require( 'mongoose' ).Types.ObjectId,
        template = [
            {
                "icon": "fa fa-cutlery",
                "severity": "LOW",
                "description": "Diabetiker",
                "_id": ObjectId( "000000000000000000000011" )
            },
            {
                "icon": "fa fa-asterisk",
                "severity": "LOW",
                "description": "Allergie",
                "_id": ObjectId( "000000000000000000000012" )
            },
            {
                "icon": "fa fa-heart",
                "severity": "LOW",
                "description": "Blutdruck",
                "_id": ObjectId( "000000000000000000000013" )
            },
            {
                "icon": "fa fa-tint",
                "severity": "LOW",
                "description": "Bluter",
                "_id": ObjectId( "000000000000000000000014" )
            },
            {
                "icon": "fa fa-star",
                "severity": "LOW",
                "description": "Adipös",
                "_id": ObjectId( "000000000000000000000015" )
            },
            {
                "icon": "fa fa-eye-slash",
                "severity": "LOW",
                "description": "Sehbehindert",
                "_id": ObjectId( "000000000000000000000016" )
            },
            {
                "icon": "fa fa-dot-circle-o",
                "severity": "LOW",
                "description": "Schwanger, nur Frauen",
                "_id": ObjectId( "000000000000000000000017" )
            },
            {
                "icon": "fa fa-fire",
                "severity": "LOW",
                "description": "Infektiös",
                "_id": ObjectId( "000000000000000000000018" )
            },
            {
                "icon": "fa fa-flag",
                "severity": "LOW",
                "description": "Vorsorge/Impfung möglich",
                "_id": ObjectId( "000000000000000000000019" )
            },
            {
                "icon": "fa fa-glass",
                "severity": "LOW",
                "description": "Alkoholiker",
                "_id": ObjectId( "00000000000000000000001a" )
            },
            {
                "icon": "fa fa-flash",
                "severity": "LOW",
                "description": "Drogen",
                "_id": ObjectId( "00000000000000000000001b" )
            },
            {
                "icon": "fa fa-cloud",
                "severity": "LOW",
                "description": "Gesundheitsportal",
                "_id": ObjectId( "00000000000000000000001c" )
            },
            {
                "icon": "fa fa-deafness",
                "severity": "LOW",
                "description": "Ohr",
                "_id": ObjectId( "00000000000000000000001d" )
            },
            {
                "icon": "fa fa-fire",
                "severity": "LOW",
                "description": "Raucher",
                "_id": ObjectId( "00000000000000000000001e" )
            },
            {
                "icon": "fa fa-fire",
                "severity": "LOW",
                "description": "Gelegenheitsraucher",
                "_id": ObjectId( "00000000000000000000001f" )
            },
            {
                "icon": "fa fa-glass",
                "severity": "LOW",
                "description": "Gelegenheitsalkoholiker",
                "_id": ObjectId( "000000000000000000000020" )
            }
        ];

    /**
     * Checks if marker collection is empty, if yes, then insert template markers documents
     * @param {Object} user
     * @returns {Promise<void>}
     */
    async function checkMarkersCollection( user ) {
        let [err, result] = await formatPromiseResult(
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'marker',
                action: 'count',
                migrate: true
            } )
        );
        if( err ) {
            Y.log( `checkMarkersCollection. Error while counting markers in tenant ${user.tenantId}: ${err.stack || err}`, 'warn', NAME );
        }
        if( 0 >= result ) {
            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'marker',
                    action: 'mongoInsertMany',
                    data: template,
                    migrate: true
                } )
            );

            if( err ) {
                Y.log( `checkMarkersCollection. Error while inserting default markers in tenant ${user.tenantId}: ${err.stack || err}`, 'warn', NAME );
            }
            Y.log( `checkMarkersCollection. Default markers were successfully inserted into ${user.tenantId} db.`, 'info', NAME );
        }
    }

    /**
     * Executes checkMarkersCollection function for each tenant on start of system
     *
     * @param {Function} callback
     * @returns {Promise<void>}
     */
    async function runOnStart( callback ) {
        Y.log( 'Entering Y.doccirrus.api.marker.runOnStart', 'info', NAME );

        await Y.doccirrus.utils.iterateTenants( checkMarkersCollection );

        Y.log( 'Exiting Y.doccirrus.api.marker.runOnStart', 'info', NAME );
        callback();
    }

    Y.namespace( 'doccirrus.api' ).marker = {

        name: NAME,
        runOnStart,
        checkMarkersCollection
    };
}, '0.0.1', {
    requires: [
        'marker-schema'
    ]
} );