/*global YUI */


YUI.add( 'partner-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );


        function statusCheck( user, partner, callback ) {
            if('LICENSED' ===  partner.status){
                Y.log( 'Trying to update Licensed partner document', 'warn', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 401, { message: 'not allowed' } ) );
            }

            callback( null, partner );
        }
        /**
         * @method defaultPseudonym
         * @public
         *
         * ensure that pseudonym is set for anonymized patient in case anonymize configuration is not set
         *
         * @param {Object} user
         * @param {Object} partner
         * @param {Function} callback
         */
        function defaultPseudonym( user, partner, callback ) {
            if( true ===  partner.anonymizing && (!partner.pseudonym || !partner.pseudonym.length) ){
                partner.pseudonym = [ {pseudonymType: 'patientData', pseudonymIdentifier: 'PatientID'} ];
            }
            callback( null, partner );
        }

        /*  not allowed modify activeActive from UI
         *
         * @param user
         * @param partner
         * @param callback
         */
        function notModifyActiveActive( user, partner, callback ) {
            partner._doc.activeActive = partner.originalData_ && partner.originalData_.activeActive;
            callback( null, partner );
        }


        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,

            pre: [
                {
                    run: [ statusCheck, defaultPseudonym, notModifyActiveActive ],
                    forAction: 'write'
                },
                {
                    run: [ statusCheck ],
                    forAction: 'delete'
                }
            ]
        };

    },
    '0.0.1', {requires: ['dchttps', 'partner-schema']}
);
