/**
 * User: pi
 * Date: 01/12/2014  13:36
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

/**
 *
 * @module DCFsmDefault
 */
YUI.add( 'DCFsmDefault', function( Y/*, NAME*/ ) {

        function saveAttachments( activity, callback ) {
            activity._saveAttachments( callback );
        }

        function doTransition( activity, transition, callback ) {
            activity._doTransition( transition, callback );
        }

        function deleteTransition( activity, del, callback ) {
            if( del ) {
                activity._doTransition( 'delete', callback );
            }
        }

        Y.namespace( 'doccirrus' ).fsm = {
            saveAttachments: function( activity, callback ) {
                saveAttachments( activity, callback );
            },
            doTransition: function( activity, transition, callback ) {
                doTransition( activity, transition, callback );
            },
            deleteTransition: function( activity, del, callback ) {
                deleteTransition( activity, del, callback );
            }
        };

    },
    '0.0.1', { requires: [] }
);
