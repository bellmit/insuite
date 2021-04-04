/**
 * User: rrrw
 * Date: 17/11/2015  12:16 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/
YUI.add( 'dcactivityutils', function( Y, NAME ) {
        

        Y.log( 'Init Activity Utils' );

        // move this out to the activity-schema perhaps.
        const ACT_TYPE_ASSIGNMENTS = {
            // the first type is the
            // default type and overrides faulty
            // requests in the filterActivity function.
            'contract': ['SCHEIN', 'BGSCHEIN', 'PKVSCHEIN','SZSCHEIN', 'AMTSSCHEIN'],
            'diagnosis': ['DIAGNOSIS'],
            'simple_activity':[
                'HISTORY',
                'EXTERNAL',
                'FINDING',
                'PREVENTION',
                'PROCEDERE',
                'THERAPY',
                'REMINDER',
                'CREDITNOTE',
                'WARNING1',
                'WARNING2',
                'BADDEBT',
                'COMMUNICATION',
                'PROCESS',
                'CONTACT',
                'MEDICATIONPLAN',
                'KBVMEDICATIONPLAN',
                'CAVE',
                'DOCLETTER',
                'PUBPRESCR',
                'PRIVPRESCR',
                'TELECONSULT',
                'FORM',
                'THERAPYSTEP'
            ],
            'labdata': ['LABDATA'],
            'utility': ['KBVUTILITY', 'UTILITY'],
            'treatment': ['TREATMENT'],
            'assistive': ['ASSISTIVE'],
            'medication': ['MEDICATION'],
            'invoice': ['INVOICE'],
            'meddata': Y.doccirrus.schemas.activity.medDataActTypes
        };

        function Utils( apiName ) {
            this.apiName = apiName;
            this.assignment = ACT_TYPE_ASSIGNMENTS[this.apiName];
            if( !this.assignment.length ) {
                throw new Error( 'Unkown Virtual Activity API: ' + apiName );
            }
        }

        Utils.prototype.addActTypeQuery = function( args ) {
            const actTypeQuery = {$in: this.assignment};
            if( args.query.actType ) {
                args.query = {$and: [args.query, {actType: actTypeQuery}]};
            } else {
                args.query.actType = actTypeQuery;
            }
        };

        Utils.prototype.addActTypeBody = function( args ) {
            const actTypePostData = {$in: this.assignment};
            if( args.data.actType ) {
                args.data = {$and: [args.data, {actType: actTypePostData}]};
            } else {
                args.data.actType = actTypePostData;
            }
        };

        Utils.prototype.filterActivity = function filterActivity( args, action ) {
            const
                actType = args.data.actType,
                status = args.data.status,
                fsmName = Y.doccirrus.schemas.activity.getFSMName( actType ),
                isCreatedAllowed = Y.doccirrus.schemas.activity.isFSMAllowingCreatedStatus( fsmName );

            args.model = 'activity';
            switch( action ) {
                case 'get':
                    this.addActTypeQuery( args );
                    break;
                case 'delete':
                    if( Object.keys( args.query ).length ) {
                        // if there is a query add type specification
                        args.query.$or = [
                            {status: 'VALID'},
                            {status: 'CREATED'}
                        ];
                        this.addActTypeQuery( args );
                    }
                    // otherwise, leave it empty and the
                    // the DB Layer will automatically stop
                    // the delete.
                    break;
                case 'post': /*nobreak*/
                case 'upsert':
                case 'put':
                    if( !this.isCorrectActType( actType ) ) {
                        args.data.actType = this.assignment[0];
                    }

                    if( isCreatedAllowed && status === 'CREATED' ) {
                        args.data.status = 'CREATED';
                    } else {
                        args.data.status = 'VALID'; // should be checked in pre-process.
                    }
                    break;
            }

            Y.log( 'Virtual Activity Request converted to activity request.', 'debug', NAME );

        };

        Utils.prototype.isCorrectActType = function isCorrectActType( actType ) {
            return -1 < this.assignment.indexOf( actType );
        };

        Y.namespace( 'doccirrus' ).ActivityUtils = Utils;

    },
    '0.0.1', {
        requires: []
    }
);
