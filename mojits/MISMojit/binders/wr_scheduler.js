/**
 * User: ad
 * Date: 05.04.13  10:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, window, alert, $ */

// Do not define anything here --
//    the first code in the binderp
// MUST be the following line:
function _fn( Y, NAME ) {
    'use strict';

    var
        content, //eslint-disable-line no-unused-vars
        jaderef = 'MISMojit',
        node_ref,
        last_no;

    function handleTemplateLoadResponse( err ) {
        if( err ) {
            Y.log( 'ERROR loading pug template: ' + err, 'error', NAME );
            //doMessage( msgDiv, true, err );
        }
        $( '#wno_hidden' ).val( last_no );
        //$( '#scheduler' ).spin( false );
    }

    function schedulerCallback( data ) {
        var
            result;
        Y.log( 'Successful REST load.', 'debug', NAME );
        result = {
            last_no: '',
            data: data
        };

        if ( result.data && Array.isArray( result.data ) && result.data.length > 0 ) {
            if ( result.data[0].number !== 'Termin' ) {
                last_no = result.data[0].number;
            }
        } else {
            last_no = '';
        }
        result.last_no = last_no;
//console.dir(moment);

        result.moment = moment; //eslint-disable-line
        if (result) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'wr_scheduler',
                jaderef,
                result,
                node_ref,
                handleTemplateLoadResponse );
        }
    }

    function handleError( obj, text, err ) {
        console.log( 'ERROR: ' + err ); //eslint-disable-line no-console
        console.log( text + ' --> result of POST call ' ); //eslint-disable-line no-console
    }

    function reloadJadeTemplate() {
        var
            filter = Y.doccirrus.utils.getFilter(),
            url = '/r/calculateschedule/?action=calculateschedule&subaction=PACKED';

        // FUTURE: may be required when latencies are higher
        // also to reduce flicker, set the size of the div to a fixed size...
        // (needed anyway, because you can't scroll on the WR TV set  TODO
        //$( '#scheduler' ).spin();
        last_no = ''.concat($( '#wno_hidden' ).val());
        if( filter && filter.location ) {
            url += '&location=' + filter.location;
        }

        //content = Y.doccirrus.utils.processForm( formDiv );
        //load remaining time & alert info
        $.ajax(
            {
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                url: Y.doccirrus.infras.getPrivateURL( url ),
                success: schedulerCallback,
                error: handleError
            }
        );

    }

    // setup event handlers of this jade snippet
    function setupHandlers( node ) {
        node_ref = node;
        setTimeout( reloadJadeTemplate, 5000 );
    }

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */
        registerNode: function( node ) {
            setupHandlers( node );
        },
        deregisterNode: function( /* node */ ) {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();
        }
    };
}