/**
 * User: do
 * Date: 08.01.21  12:35
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*exported _fn */

/*global ko, moment */
function _fn( Y, NAME ) {
    'use strict';
    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    function makeURL( id ) {
        var url = '/download/' + id;
        return Y.doccirrus.infras.getPrivateURL( url );
    }

    function OkfeExportViewModel() {
        var self = this;
        self.okfeExports = ko.observableArray();
        self.selectedHtml = ko.observable();
        self.dateSelectorSwitchMode = Y.doccirrus.utils.localValueGet( 'dateSelectorSwitchModeOKFE' );
        self.dateSelector = KoComponentManager.createComponent( {
            componentType: 'KoDateRangeSelector',
            componentConfig: {
                switchMode: self.dateSelectorSwitchMode || 'quarter'
            }
        } );
    }

    OkfeExportViewModel.prototype.load = function() {
        var self = this;
        return Promise.resolve( Y.doccirrus.jsonrpc.api.okfe_export.getLastExport() ).then( function( response ) {
            self.okfeExports( response.data.map( function( d ) {
                d.link = makeURL( d.exportZipId );
                d.content = [moment( d.exportDate ).format( 'DD.MM.YYYY HH:mm' ), ': '].join( '' );
                return d;
            } ) );
        } ).catch( function( err ) {
            Y.log( 'could not load okfe exports ' + err, 'error', NAME );
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: err
            } );
        } );
    };

    OkfeExportViewModel.prototype.showHTML = function( htmlFile ) {
        var self = this;
        self.selectedHtml( null );
        Promise.resolve( Y.doccirrus.jsonrpc.api.okfe_export.getHTML( {query: {fileId: htmlFile.fileId}} ) ).then( function( response ) {
            var html = {src: 'data:text/html;base64, ' + response.data, name: htmlFile.fileName};
            self.selectedHtml( html );
        } ).catch( function( err ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: err
            } );
        } );
    };

    OkfeExportViewModel.prototype.exportData = function() {
        var
            self = this,
            timestamp = {
                '$lte': self.dateSelector.endDate(),
                '$gte': self.dateSelector.startDate()
            };
        // save dateSelector mode in localStorage
        Y.doccirrus.utils.localValueSet( 'dateSelectorSwitchModeReceipts', ko.unwrap( self.dateSelector.switchMode ));
        return Promise.resolve( Y.doccirrus.jsonrpc.api.okfe_export.exportXMLs( { data: { timestamp: timestamp}} ) ).then( function() {
            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: "Export gestartet. Bitte warten..."
            } );
        } ).catch( function( err ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: err
            } );
        } );
    };

    return {
        registerNode: function() {
            var model = new OkfeExportViewModel();
            ko.applyBindings( model, document.querySelector( '#okfe_export' ) );
            model.load();
            Y.doccirrus.communication.on( {
                event: 'okfeFormsExportFinished',
                done: function( message ) {
                    model.load();
                    var messageText = message.data && message.data[0] && message.data[0].message;
                    if( messageText ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: messageText
                        } );
                    }
                },
                handlerId: 'updateGkvTable'
            } );
        }
    };
}