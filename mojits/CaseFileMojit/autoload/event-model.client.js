/*
 @author: rw
 @date: 2014/1/28
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'deventmodel', function( Y ) {

        var EventModel;

        EventModel = function EventModel( event ) {
            var
                self = this;
            event = event || {};

            self._modelName = 'EventModel';
            Y.doccirrus.uam.ViewModel.call( self );

            /* ---  Basic data parameters --- */
            // url
            //self._dataUrl = '/r/event';
            self._dataUrl = '/1/calevent';  // hack fix inline with MOJ-1036

            /* ---  KO data observation --- */
            self._id = event._id;

            // this is a populated model, so the sub-objects
            // are not contained in the usual array structure.
            // maybe split out into a location subobject or embedded object?
            //
            self.start = ko.observable( event.start );
            self.end = ko.observable( event.end );
            self.title = ko.observable( event.title );
            self.details = ko.observable( event.details );
            self.eta = ko.observable( event.eta );
            self.pushtime = ko.observable( event.pushtime );
            if( event.calendar ) {
                self.calendarid = ko.observable( event.calendar._id );
                self.calendarname = ko.observable( event.calendar.name );
                if( event.calendar.locationId ) {
                    self.calendarlocationid = ko.observable( event.calendar.locationId._id );
                    self.calendarlocationcity = ko.observable( event.calendar.locationId.city );
                    self.calendarlocationemail = ko.observable( event.calendar.locationId.email );
                    self.calendarlocationhouseno = ko.observable( event.calendar.locationId.houseno );
                    self.calendarlocationname = ko.observable( event.calendar.locationId.name );
                    self.calendarlocationphone = ko.observable( event.calendar.locationId.phone );
                    self.calendarlocationstreet = ko.observable( event.calendar.locationId.street );
                    self.calendarlocationzip = ko.observable( event.calendar.locationId.zip );
                }
            } else {
                self.calendarid = ko.observable();
                self.calendarname = ko.observable();
                self.calendarlocationid = ko.observable();
                self.calendarlocationcity = ko.observable();
                self.calendarlocationemail = ko.observable();
                self.calendarlocationhouseno = ko.observable();
                self.calendarlocationname = ko.observable();
                self.calendarlocationphone = ko.observable();
                self.calendarlocationstreet = ko.observable();
                self.calendarlocationzip = ko.observable();
            }
            self.scheduletype = ko.observable( event.scheduletype );
            self.allDay = ko.observable( event.allDay );
            self.duration = ko.observable( event.duration );
            self.plannedDuration = ko.observable( event.plannedDuration );
            self.patient = ko.observable( event.patient );
            self.scheduled = ko.observable( event.scheduled );

            self._generateDependantModels();

        };

        Y.namespace( 'doccirrus.uam' ).EventModel = EventModel;
    },
    '0.0.1', {requires: [ 'dcviewmodel' ] }
);