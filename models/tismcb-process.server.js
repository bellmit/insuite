/**
 * User: maximilian.kramp
 * Date: 30.09.19  09:51
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'tismcb-process', function( Y, NAME ) {
        /**
         * @module tismcb-process
         */
        const runDb = Y.doccirrus.mongodb.runDb;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function deleteReference( user, tismcb, callback) {
            runDb({
                user,
                model: 'tismcb',
                action: 'mongoUpdate',
                query: {},
                data: { $pull: { tismcbs: tismcb._id } },
                options: { multi: true }
            }, callback);
        }

        /**
         * @class tismcb
         * @namespace doccirrus.schemaprocess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            post: [
                {
                    run: [ deleteReference ] ,
                    forAction: 'delete'
                }
            ],

            name: NAME
        };

    },
    '0.0.1', {
        requires: []
    }
);