/**
 * preview of patient portal for integration purposes
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, $, ko */
//TRANSLATION INCOMPLETE!! MOJ-3201
YUI.add( 'UserMgmtBinderRemotePatPortalAdmin', function( Y, NAME ) {
    'use strict';

    Y.namespace( 'mojito.binders' )[NAME] = {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an   id   attribute.
         */
        bind: function bind( /*node*/ ) {
            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'patportaladmin' );

            var ifDisp = $( '#display_iframe' ),
                ifCode = $( '#iframe_code' ),
                i18n = Y.doccirrus.i18n;

            function substituteIFrameCode( where, what ) {
                ifCode.text( ifCode.text().replace( where, what, 'g' ) );
            }

            function handleSuccess( body ) {
                var
                    data = body && body.data,
                    pUrl = Y.doccirrus.infras.getPublicURL( '/intime?prac=' ) + data[0].dcCustomerNo + '&tab=login&redirectTo=%252Fintime%252Fpatient%253Ftab%253Dpractices%2526prac%253D' + data[0].dcCustomerNo;

                ifCode.text( ifCode.text() );

                ifDisp.attr( 'src', Y.doccirrus.infras.getPublicURL( '/intime#/frame_link/' ) + data[0].dcCustomerNo );
                // insert url
                ifCode.html( '&lt;iframe src="' + pUrl + '" frameborder=0 scrolling="auto" width="708" height="630"&gt;&lt;/iframe&gt;' );
                substituteIFrameCode( 'KUNDENNR', data[0].dcCustomerNo );
            }

            function handleError( obj, text, err ) {
                Y.log( 'Error loading practice: ' + text + '  ' + err, 'info', NAME );
                Y.doccirrus.utils.informationDialog( true, 'Praxis nicht geladen', 'Fehler' );
            }

            $.ajax( {
                xhrFields: {
                    withCredentials: true
                },
                url: Y.doccirrus.infras.getPrivateURL( '/1/practice' ),
                type: 'get',
                success: handleSuccess,
                error: handleError
            } );

            $( '#if-inputs input' ).on( 'keyup', function() {
                var
                    ifWidth = $( '#ifwidth>input' ).val() || '708',
                    ifHeight = $( '#ifheight>input' ).val() || '630';

                ifDisp.attr( 'width', ifWidth ).attr( 'height', ifHeight );
                substituteIFrameCode( /width="[^"]*"/i, "width=\"" + ifWidth + "\"" );
                substituteIFrameCode( /height="[^"]*"/i, "height=\"" + ifHeight + "\"" );
            } );

            function FormAssignVM() {
                var
                    self = this;

                self.titleHealthI18n = i18n('UserMgmtMojit.remotepatportaladmin.title.HEALTH');
                self.adjustmentsI18n = i18n('UserMgmtMojit.remotepatportaladmin.group.ADJUSTMENTS');
                self.labelWidthI18n = i18n('UserMgmtMojit.remotepatportaladmin.label.WIDTH');
                self.placeholderWidthI18n = i18n('UserMgmtMojit.remotepatportaladmin.placeholder.WIDTH');
                self.labelHeightI18n = i18n('UserMgmtMojit.remotepatportaladmin.label.HEIGHT');
                self.placeholderHeightI18n = i18n('UserMgmtMojit.remotepatportaladmin.placeholder.HEIGHT');
                self.groupHtmlI18n = i18n('UserMgmtMojit.remotepatportaladmin.group.HTML');
            }

            ko.applyBindings( new FormAssignVM(), this.mojitProxy._node._node );

        },
        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        }


    };

}, '0.0.1', {requires: [
    'NavBarHeader',
    'event-mouseenter',
    'mojito-client',
    'dcutils',
    'dcschemaloader',
    'dcvalidations',
    'dcauth']
} );