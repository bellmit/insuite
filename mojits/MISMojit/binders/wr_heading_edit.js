// Do not define anything here --
//    the first code in the binderp
// MUST be the following line:

/*globals $, ko */
/*exported _fn */

function _fn( Y, NAME ) {
    'use strict';

    var
        myNode,
        setId,
        jq = {}; //  cached jQuery sellectors [object]

    /**
     *  Called after changes to headline saved back to server
     */

    function onSaveSuccess( /* data, text */ ) {
        $( '#myModal' ).modal( 'hide' );
        location.reload();
    }

    /**
     *  Called on error saving headline, subhead
     *
     *  TODO: bring up to date with current REST error reporting
     *
     *  @param err
     */

    function onSaveError( err ) {
        Y.log( 'Could not save headline: ' + err, 'debug', NAME );
        $( '#myModal' ).modal( 'hide' );
    }

    function onSaveClicked( /* e */ ) {
        var
            heading,
            subheading;

        if( $( '#savebtn' ).attr( 'disabled' ) === 'disabled' ) {
            return;
        }

        setId = myNode.one( '.setId' ).get( 'value' );
        heading = myNode.one( '#headline' ).get( 'value' );
        subheading = myNode.one( '#subheadline' ).get( 'value' );

        $.ajax(
            {
                data: { headline: heading, subheadline: subheading },
                type: 'PUT',
                xhrFields: {
                    withCredentials: true
                },
                url: Y.doccirrus.infras.getPrivateURL( '/r/intime/?fields_=headline,subheadline&query=_id,' + setId ),
                success: onSaveSuccess,
                error: onSaveError
            }
        );
    }

    // setup event handlers of this jade snippet
    function setupHandlers( node ) {
        myNode = node;
        jq.btnSave.off('click').on('click', onSaveClicked );
        jq.txtHeadline.off('keyup').on('keyup', onHeadlineKeyUp );
        jq.txtSubhead.off('keyup').on('keyup', onSubheadKeyUp );
        updatePreview();
    }

    function onHeadlineKeyUp() {
        // sanitize input TODO MOJ-106
        if( jq.txtSubhead.val() !== '' ) {
            jq.btnSave.removeAttr( 'disabled' );
        }
        updatePreview();
    }

    function onSubheadKeyUp() {
        // sanitize input, make input little bit shorter TODO MOJ-106
        if( jq.txtHeadline.val() !== '' ) {
            jq.btnSave.removeAttr( 'disabled' );
        }
        updatePreview();
    }

    function updatePreview() {
        jq.divSubheadPreview.html( jq.txtSubhead.val().substring( 0, 60 ) );
        jq.divPreview.html( jq.txtHeadline.val().substring( 0, 32 ) );
    }

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */
        registerNode: function( node ) {
            var
                i18n = Y.doccirrus.i18n;

            jq = {
                'divPreview': $( '#head-preview' ),
                'divSubheadPreview': $( '#subhead-preview' ),
                'txtHeadline': $( '#headline' ),
                'txtSubhead': $( '#subheadline' ),
                'btnSave': $( '#savebtn' )
            };

            function WrHeadingEdit() {
                var
                    self = this;

                self.titleEditHeadLineI18n = i18n('MediaMojit.main.TITLE_EDIT_HEADLINE');
                self.lblPreviewI18n = i18n('MediaMojit.main.LBL_PREVIEW');
                self.btnCancelI18n = i18n('FormEditorMojit.generic.BTN_CANCEL');
                self.btnSaveI18n = i18n('MediaMojit.main.BTN_SAVE');
            }

            setupHandlers( node );
            ko.applyBindings( new WrHeadingEdit(), document.querySelector( '#myModal' ) );

        },
        deregisterNode: function( /* node */ ) {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();

            Y.log('Dismissing headline modal', 'debug', NAME);

        }
    };
}