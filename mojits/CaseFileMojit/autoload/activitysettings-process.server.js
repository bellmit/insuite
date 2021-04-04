/**
 * User: pi
 * Date: 09/02/2015  13:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'activitysettings-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * @class activitysettingsProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'activitysettings' )
                ], forAction: 'write'},
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'activitysettings' )
                ], forAction: 'delete'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
