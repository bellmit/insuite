/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, $ */
YUI.add( 'testDynamsoftTwain-binder-index', function( Y, NAME ) {
    'use strict';

    Y.namespace( "mojito.binders" )[NAME] = {

        init: function( /*mojitProxy*/ ) {
        },

        bind: function( node ) {

            var bindings = {
                scanDisabled: ko.observable( true ),
                scanClick: function() {

                    var dialog = Y.doccirrus.utils.dynamsoft.showScanDialog({ 'saveTo': 'cache' });

                    dialog.on( 'select', function( facade, data ) {
                        data.images.forEach( function( base64 ) {
                            var img = new Image();
                            document.getElementById( 'scannedImages' ).appendChild( img );
                            img.width = '200';
                            img.src = 'data:image/png;base64,' + base64;
                        } );
                    } );

                    dialog.on( 'pdfcreated', function( facade, data ) {
                        var
                            mediaId = data.mediaId || 'INVALID',
                            link = '<a href="' + Y.doccirrus.infras.getPrivateURL(mediaId) + '">(PDF) ' + mediaId + '</a>';
                        $('#scannedPDFs').append(link + '<br/>');
                    } );

                }
            };

            ko.applyBindings( bindings, node.getDOMNode() );

            Y.doccirrus.jsonrpc.api.settings.dynamsoft()
                .then( function( response ) {
                    console.log(response);
                    return response.data || false;
                } )
                .done( function( dynamsoft ) {
                    bindings.scanDisabled( !dynamsoft.useWebTwain );
                } );

        }

    };
}, '3.16.0', {
    requires: [
        'dcutils-dynamsoft',

        'DCWindow'

    ]
} );
