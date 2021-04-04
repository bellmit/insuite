/*
 @author: rw
 @date: 2014/1/28
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dceventarraymodel', function( Y ) {
        /**
         *
         * @class EventArrayModel
         */

        /**
         * An array of events. Can auto-load itself with data.
         * Can work with select boxes.
         * Should also be able to act as data source for a datatable (MOJ-1158)
         *
         * works across models, so you can embed this code in a page with any main view model.
         *
         * @param eventArray {Array} data or undefined (empty)
         * @param relObs {Object} the observable that we want to update from here, i.e. that is related
         * @param options {Object} page: number, limit: number, patientId: string
         * @constructor
         */
        function EventArrayModel( eventArray, relObs, options, callback ) {
            var
                self = this;

            self._modelName = 'EventArrayModel';
            Y.doccirrus.uam.ViewModel.call( self );
            /* ---  Basic data parameters --- */
            // url
            self._dataUrl = '/r/any/?action=calculateschedule&subaction=PAT_EVTS';
            if( options.patientId ) {
                self._dataUrl += '&patient=' + options.patientId;
            }

            self._autoLoad = true;
            self._hasObservableChildren = ko.observable( false );

            options.containsModelName = 'InportModel';

            // here we specify how entries should be displayed -- can be a function or simply a string
            // within the record.
            self._displayEvent = function( item ) {
                return item ?
                    item.lastname + ' ' + item.firstname :
                    '---';
            };

            // _data field will implicitly be added to self model.
            /* ---  KO data observation --- */
            Y.doccirrus.uam.ArrayViewModel.call( self, eventArray, options, callback );

        }

        Y.namespace( 'doccirrus.uam' ).EventArrayModel = EventArrayModel;
    },
    '0.0.1', {requires: [ 'dcarrayviewmodel' ] }
);