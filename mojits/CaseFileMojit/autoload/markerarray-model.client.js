/*
 @author: dd
 @date: 2013/02/01
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcmarkerarraymodel', function( Y ) {
        /**
         *
         * @class MarkerArrayModel
         */

        /**
         * An array of MarkerModel. Can auto-load itself with data.
         *
         * @param data {Array} data or falsy (empty), only hits the server when this is empty
         * @param relObs {Object} the observable that we want to update from here, i.e. that is related
         * @param options {Object} page: number, limit: number
         * @constructor
         */
        function MarkerArrayModel( data, relObs, options/*, callback*/ ) {
            options = options || {};
            var
                i18n = Y.doccirrus.i18n,
                DESIGNATION = i18n('IncaseAdminMojit.incase_tab_markers.label.DESIGNATION'),
                MESSGAGE = i18n('IncaseAdminMojit.incase_tab_markers.label.MESSAGE'),
                NOTE = i18n('IncaseAdminMojit.incase_tab_markers.label.NOTE'),
                self = this;

            self._modelName = 'MarkerArrayModel';
            Y.doccirrus.uam.ViewModel.call( self );
            /* ---  Basic data parameters --- */
            // url
            self._dataUrl = '/r/marker';
            self._autoLoad = true;
            self._hasObservableChildren = ko.observable( true );

            // make generic: here we just say what we want to call the update function
            // and later we wire it to the related observable in another model
            //options.selectFldName = '_selectMarker';
            options.containsModelName = 'MarkerModel';

            // _data field will implicitly be added to self model.
            /* ---  KO data observation --- */
            Y.doccirrus.uam.ArrayViewModel.call( self, data, options/*, callback */);

            self.getById = function( id ) {
                return Y.Array.find( self._data(), function( item ) {
                    return item._id === id;
                } );
            };

            self.addDefaultItem = function() {
                Y.doccirrus.jsonrpc.api.marker.create( {
                    data: {
                        icon: 'fa fa-pencil',
                        severity: 'LOW',
                        description: DESIGNATION
                    }
                } ).done( function( response ) {
                    Y.each(response.data, function( id ) {
                        self._data.push( new Y.doccirrus.uam.MarkerModel( {
                            _id: id,
                            icon: 'fa fa-pencil',
                            severity: 'LOW',
                            description: DESIGNATION
                        } ) );
                    });
                } );
            };

            self.removeItem = function( item ) {
                Y.doccirrus.jsonrpc.api.marker.delete({ query: { _id: item._id } }).done( function() {
                    self._data.remove( item );
                } );
            };

            self.removeItemByPriority = function( value ) {
                var removeItems = self._data().filter( function( item ) {
                    return ( item.severity() === value._id );
                } );
                removeItems.forEach( function( item ) {
                    self.removeItem( item );
                } );
            };

            self.confirmRemoveItem = function( item ) {
                Y.doccirrus.utils.confirmDialog(
                    true,
                    MESSGAGE,
                    NOTE,
                    function( confirmed ) {
                        if( confirmed ) {
                            self.removeItem( item );
                        }
                    }
                );
            };

        }

        Y.namespace( 'doccirrus.uam' ).MarkerArrayModel = new MarkerArrayModel();
    },
    '0.0.1', {requires: [
        'oop',
        'dcviewmodel',
        'dcarrayviewmodel',
        'dcmarkericonmodel',
        'dcmarkermodel',
        'dcmarkericonarraymodel'
    ] }
);
