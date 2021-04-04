/**
 * User: ma
 * Date: 27/05/14  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'cardreaderconfiguration-process', function( Y, NAME ) {
        const
            mongoose = require( 'mongoose' );

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function setDeviceId( user, cardreader, callback ){
            if( cardreader.isNew && !cardreader.deviceId ){
                cardreader.deviceId = mongoose.Types.ObjectId();
            }
            callback();
        }
        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class ScheduleProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [ setDeviceId ],
                    forAction: 'write'
                }
            ],
            audit: {},
            name: NAME
        };

    },
    '0.0.1', {requires: []} );
