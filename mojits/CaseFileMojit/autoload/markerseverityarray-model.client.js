/*
 @author: dd
 @date: 2013/02/01
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcmarkerseverityarraymodel', function( Y ) {
        /**
         *
         * @class MarkerSeverityArrayModel
         */

        /**
         * An array of MarkerSeverityModel. Can auto-load itself with data.
         *
         * @param data {Array} data or false (empty), only hits the server when this is empty
         * @param relObs {Object} the observable that we want to update from here, i.e. that is related
         * @param options {Object} page: number, limit: number
         * @constructor
         */
        function MarkerSeverityArrayModel( data, relObs, options/*, callback*/ ) {
            options = options || [];
            var
                self = this;

            self._modelName = 'MarkerSeverityArrayModel';
            Y.doccirrus.uam.ViewModel.call( self );
            /* ---  Basic data parameters --- */
            // url
            self._dataUrl = '/1/severity/';
            self._autoLoad = true;
            self._hasObservableChildren = ko.observable( true );

            // make generic: here we just say what we want to call the update function
            // and later we wire it to the related observable in another model
            //options.selectFldName = '_selectMarkerSeverity';
            options.containsModelName = 'MarkerSeverityModel';


            // _data field will implicitly be added to self model.
            /* ---  KO data observation --- */
            Y.doccirrus.uam.ArrayViewModel.call( self, data, options/*, callback*/ );

            self.addDefaultItem = function() {
                var item = new Y.doccirrus.uam.MarkerSeverityModel( { name: '', color: '#000000' } );
                self._data.push( item );
                return item;
            };

            self.removeItem = function( item ) {
                Y.doccirrus.uam.MarkerArrayModel.removeItemByPriority( item );
                self._data.remove( item );
            };

            self.confirmRemoveItem = function(item) {
                Y.doccirrus.utils.confirmDialog(
                    true,
                    'Löschen einer Zuordnung entfernt die entsprechenden Marker, sowie diese bei allen Patienten!',
                    'Hinweis',
                    function( confirmed ) {
                        if( confirmed ) {
                            self.removeItem( item );
                        }
                    }
                );
            };

            /**
             * get an item by severity
             * @param severity {String}
             * @returns {null, Y.doccirrus.uam.MarkerSeverityModel}
             */
            self.getBySeverity = function( severity ) {
                var result = null;
                self._data().forEach( function( item ) {
                    if( item.severity() === severity ) {
                        result = item;
                        return false;
                    }
                } );
                return result;
            };

        }

        Y.namespace( 'doccirrus.uam' ).MarkerSeverityArrayModel = new MarkerSeverityArrayModel();
    },
    '0.0.1', {requires: [
        'dcviewmodel',
        'dcarrayviewmodel',
        'dcmarkerseveritymodel'
    ] }
);
