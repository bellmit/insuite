/**
 * User: pi
 * Date: 11/11/15   14:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DCAppointmentBookingModal', function( Y ) {

        var
            Disposable = Y.doccirrus.KoViewModel.getDisposable();

        function AppointmentBookingModel( config ) {
            AppointmentBookingModel.superclass.constructor.call( this, config );
        }

        Y.extend( AppointmentBookingModel, Disposable, {
            initializer: function AppointmentBookingModel_initializer( config ) {
                var
                    self = this;

                self.initAppointmentBookingModel( config );

            },
            initAppointmentBookingModel: function( config ) {
                var
                    self = this;
                self.details = ko.observable();
                self.info = config.info;
            },
            toJSON: function() {
                var
                    self = this,
                    result = {};
                result.details = ko.utils.peekObservable( self.details );
                return result;
            }
        } );

        function AppointmentBookingModal() {

        }

        AppointmentBookingModal.prototype.showDialog = function( data, callback ) {

            function show() {
                var
                    modal,
                    node = Y.Node.create( '<div></div>' ),
                    appointmentBookingModel = new AppointmentBookingModel( data || {} );

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'appointment_booking_modal',
                    'PatPortalMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: 'Buchungshinweis',
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_SMALL,
                            height: Y.doccirrus.DCWindow.SIZE_SMALL,
                            visible: true,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        label: 'Buchen',
                                        action: function() {
                                            modal.close();
                                            callback( appointmentBookingModel.toJSON() );
                                        }
                                    } )
                                ]
                            }

                        } );
                        modal.set( 'focusOn', [] );
                        ko.applyBindings( appointmentBookingModel, node.getDOMNode().querySelector( '#appointmentBookingModel' ) );
                    }
                );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).appointmentBookingModal = new AppointmentBookingModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'InportModel'
        ]
    }
);
