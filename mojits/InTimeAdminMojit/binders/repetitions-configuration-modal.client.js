/*global YUI, ko, moment*/

'use strict';

YUI.add( 'DcRepetitionsConfigModal', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            TITLE = i18n( 'InTimeAdminMojit.repetitions-configuration-modal.title.MODAL_TITLE' ),
            TAKE = i18n( 'general.button.TAKE' ),
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            peek = ko.utils.peekObservable,
            Disposable = Y.doccirrus.KoViewModel.getDisposable();

        function RepetitionConfigModel( config ) {
            RepetitionConfigModel.superclass.constructor.call( this, config );
        }

        Y.extend( RepetitionConfigModel, Disposable, {
            initializer: function RepetitionConfigModel_initializer( config ) {
                var self = this;

                self.repeating = ko.observable( config.interval || 1 );
                self.period = ko.observable( config.freq );
                self.monthInYear = ko.observable( config.bymonth );
                self.dayInMonth = ko.observable( config.bymonthday );
                self.startDate = ko.observable( config.dtstart && moment( config.dtstart ) );
                self.endDate = ko.observable( config.until && moment( config.until ) );
                self.endDateDisabled = ko.observable();
                self.endEventsCount = ko.observable( config.count );
                self.endCondition = ko.observable( config.endCondition );
                self.periodList = ko.observableArray( Y.doccirrus.schemas.v_repeatedconfig.types.RepType_E.list );

                self.startDate.hasError = ko.computed( function() {
                    var
                        start = ko.unwrap( self.startDate ),
                        end = ko.unwrap( self.endDate );

                    return !start || (end && moment( start ).isAfter( moment( end ) ));
                } );

                self.endDate.hasError = ko.computed( function() {
                    var
                        start = ko.unwrap( self.startDate ),
                        end = ko.unwrap( self.endDate ),
                        endCondition = ko.unwrap( self.endCondition );

                    if( 'BY_ENDDATE' === endCondition ) {
                        return !end || (end && moment( end ).isBefore( moment( start ) ));
                    }
                    return end && moment( end ).isBefore( moment( start ) );
                } );

                self.endCondition.hasError = ko.computed( function() {
                    return !ko.unwrap( self.endCondition );
                } );

                self.endDateTimepickerOptions = {
                    format: ko.observable( TIMESTAMP_FORMAT ),
                    sideBySide: true,
                    widgetPositioning: {
                        horizontal: 'left',
                        vertical: 'bottom'
                    },
                    minDate: new Date()
                };

                self.repeatEachI18n = i18n( 'InTimeAdminMojit.repetitions-configuration-modal.label.REPEAT_EACH' );
                self.inI18n = i18n( 'InTimeAdminMojit.repetitions-configuration-modal.label.IN' );
                self.fromI18n = i18n( 'InTimeAdminMojit.repetitions-configuration-modal.label.FROM' );
                self.tillI18n = i18n( 'InTimeAdminMojit.repetitions-configuration-modal.label.TILL' );
                self.afterI18n = i18n( 'InTimeAdminMojit.repetitions-configuration-modal.label.AFTER' );
                self.onDayI18n = i18n( 'InTimeAdminMojit.repetitions-configuration-modal.label.ON_DAY' );
                self.appointmentI18n = i18n( 'InTimeAdminMojit.repetitions-configuration-modal.label.APPOINTMENT' );
                self.monthList = ko.observableArray( moment.months().map( function( item, index ) {
                    return {val: index + 1, i18n: item};
                } ) );

                self.dayNumberList = ko.computed( function() {
                    var
                        selectedMonth = ko.unwrap( self.monthInYear ) || (moment().month() + 1),
                        i, results = [];

                    for( i = 1; i <= moment( selectedMonth, 'M' ).daysInMonth(); i++ ) {
                        results.push( {val: i, text: i + ''} );
                    }
                    return results;
                } );

                self.addDisposable( ko.computed( function() {
                    var endCondition = ko.unwrap( self.endCondition );

                    if( 'BY_ENDDATE' === endCondition ) {
                        self.endEventsCount( null );
                        self.endDateDisabled( false );
                    }

                    if( 'BY_COUNT' === endCondition ) {
                        self.endEventsCount( peek( self.endEventsCount ) || 1 );
                        self.endDate( null );
                        self.endDateDisabled( true );
                    }
                } ) );

                self.addDisposable( ko.computed( function() {
                    var repetitionPeriod = ko.unwrap( self.period );

                    switch( repetitionPeriod ) {
                        case 'DAILY':
                        case 'WEEKLY':
                            self.dayInMonth( null );
                            self.monthInYear( null );
                            break;
                        case 'MONTHLY':
                            self.dayInMonth( config.bymonthday || moment().date() );
                            self.monthInYear( null );
                            break;
                        case 'YEARLY':
                            self.dayInMonth( config.bymonthday || moment().date() );
                            self.monthInYear( config.bymonth || moment().month() + 1 );
                            break;
                    }
                } ) );

                self._isValid = ko.computed( function() {
                    return !self.startDate.hasError() && !self.endDate.hasError() && !self.endCondition.hasError();
                } );
            },

            toJSON: function() {
                var self = this,
                    dtstartValue = peek( self.startDate ),
                    untilValue = peek( self.endDate ),
                    frequency = peek( self.period );

                if( dtstartValue && 'string' === typeof dtstartValue && '' !== dtstartValue ) {
                    dtstartValue = moment( dtstartValue );
                }
                if( untilValue && 'string' === typeof untilValue && '' !== untilValue ) {
                    untilValue = moment( untilValue );
                }

                return {
                    interval: peek( self.repeating ),
                    endCondition: peek( self.endCondition ),
                    dtstart: dtstartValue && dtstartValue.toISOString ? dtstartValue.startOf( 'day' ).toISOString() : dtstartValue,
                    until: untilValue && untilValue.toISOString ? untilValue.startOf( 'day' ).toISOString() : untilValue,
                    bymonth: peek( self.monthInYear ),
                    bymonthday: peek( self.dayInMonth ),
                    freq: frequency,
                    count: peek( self.endEventsCount )
                };
            }
        } );

        function RepetitionConfigModal() {
        }

        RepetitionConfigModal.prototype.show = function( config, callback ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InTimeAdminMojit/views/repetitions-configuration-modal'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    return new Promise( function( resolve ) {
                        var
                            bodyContent = Y.Node.create( template ),
                            modal,
                            saveBtn,
                            repetitionConfigModel;
                        repetitionConfigModel = new RepetitionConfigModel( config || {} );

                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-ImportCloseTime',
                            bodyContent: bodyContent,
                            title: TITLE,
                            maximizable: false,
                            icon: Y.doccirrus.DCWindow.ICON_INFO,
                            width: 500,
                            height: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minHeight: 200,
                            minWidth: 500,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        label: TAKE,
                                        action: function() {
                                            saveBtn.disable();
                                            callback( repetitionConfigModel.toJSON() );
                                            this.close();
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {
                                    if( repetitionConfigModel && repetitionConfigModel._dispose ) {
                                        repetitionConfigModel._dispose();
                                    }
                                    resolve();
                                }
                            }
                        } );

                        saveBtn = modal.getButton( 'SAVE' ).button;

                        ko.computed( function() {
                            var
                                buttonSave = modal.getButton( 'SAVE' ).button,
                                _isValid = repetitionConfigModel._isValid(),
                                enable = false;

                            if( _isValid ) {
                                enable = true;
                            }

                            if( enable ) {
                                buttonSave.enable();
                            } else {
                                buttonSave.disable();
                            }
                        } );
                        ko.applyBindings( repetitionConfigModel, bodyContent.getDOMNode() );
                    } );
                } ).catch( catchUnhandled );
        };

        Y.namespace( 'doccirrus.modals' ).repetitionConfigModal = new RepetitionConfigModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'v_repeatedconfig-schema',
            'KoViewModel'
        ]
    }
);