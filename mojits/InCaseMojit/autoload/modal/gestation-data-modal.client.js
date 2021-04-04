/*global YUI, ko, moment*/

'use strict';

YUI.add( 'DcGestationDataModal', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            TITLE = i18n( 'InCaseMojit.gestationdata_modal.title.ENTER_VALUE' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            Disposable = Y.doccirrus.KoViewModel.getDisposable();

        /**
         * GestationDataModel model
         * @constructor
         */
        function GestationDataModel() {
            GestationDataModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( GestationDataModel, Disposable, {
            /** @protected */
            initializer: function GestationDataModel_initializer() {
                var self = this,
                    binder = self.get( 'binder' ),
                    dueDateItem = self.get( 'dueDate' ),
                    dayOfLastMenorrhoeaItem = self.get( 'dayOfLastMenorrhoea' ),
                    weekAndDayOfPregnancyItem = self.get( 'weekAndDayOfPregnancy' ),
                    weekAndDayOfPregnancyItemTextValue = weekAndDayOfPregnancyItem && weekAndDayOfPregnancyItem.textValue && weekAndDayOfPregnancyItem.textValue.split( '/' ),
                    now = moment().toISOString(),
                    currentPatient = unwrap( binder.currentPatient ),
                    currentActivity = unwrap( binder.currentActivity ),
                    medData = unwrap( currentPatient.latestMedData ).map( function( item ) {
                        return item.toJSON();
                    } ),
                    cycleLengthData = medData && medData.find( function( item ) {
                            return 'CYCLE_LENGTH' === item.type;
                        } ),
                    lastMenorrhoeaValidation = Y.doccirrus.validations.common.Patient_T_dayOfLastMenorrhoea[0],
                    validationLibrary = Y.doccirrus.validations.common;

                if( 'MEDDATA' === currentActivity.actType() ) {
                    medData = unwrap( currentActivity.medData ).map( function( item ) {
                        return item.toJSON();
                    } );
                    cycleLengthData = medData && medData.find( function( item ) {
                            return 'CYCLE_LENGTH' === item.type;
                        } );
                    now = currentActivity.timestamp();
                }

                if( 'GRAVIDOGRAMMPROCESS' === currentActivity.actType() ) {
                    now = currentActivity.timestamp();
                }

                self.now = now;
                self.cycleLength = ko.observable( ( cycleLengthData && cycleLengthData.value ) || Y.doccirrus.schemas.v_meddata.DEFAULT_CYCLE_LENGTH );
                self.dueDate = ko.observable( dueDateItem && dueDateItem.dateValue && moment( dueDateItem.dateValue ).toISOString() );
                self.entered = ko.observable( false );
                self.timestampDatepickerOptions = {
                    widgetPositioning: {
                        horizontal: 'right',
                        vertical: 'bottom'
                    }
                };

                self.dayOfLastMenorrhoea = ko.observable( dayOfLastMenorrhoeaItem && dayOfLastMenorrhoeaItem.dateValue && moment( dayOfLastMenorrhoeaItem.dateValue ).toISOString() );
                self.dayOfLastMenorrhoea.hasError = ko.computed( function() {
                    var
                        isValid = lastMenorrhoeaValidation.validator( self.dayOfLastMenorrhoea() );
                    return !isValid;
                } );
                self.dayOfLastMenorrhoea.validationMessages = ko.observableArray( [lastMenorrhoeaValidation.msg] );

                self.weekOfPregnancy = ko.observable( weekAndDayOfPregnancyItemTextValue && ( weekAndDayOfPregnancyItemTextValue[0] || 0 ) );
                self.weekOfPregnancy.validationMessages = ko.observableArray( [i18n( 'validations.message.INVALID_VALUE' )] );
                self.weekOfPregnancy.hasError = ko.computed( function() {
                    var
                        isValid = self.weekOfPregnancy() ? validationLibrary._rangeNumber( self.weekOfPregnancy(), 0, 70 ) : true;
                    return !isValid;
                } );

                self.dayOfPregnancy = ko.observable( weekAndDayOfPregnancyItemTextValue && ( weekAndDayOfPregnancyItemTextValue[1] || 0 ) );
                self.dayOfPregnancy.validationMessages = ko.observableArray( [i18n( 'validations.message.INVALID_VALUE' )] );
                self.dayOfPregnancy.hasError = ko.computed( function() {
                    var
                        isValid = self.dayOfPregnancy() ? validationLibrary._rangeNumber( self.dayOfPregnancy(), 0, 6 ) : true;
                    return !isValid;
                } );

                self._isValid = ko.computed( function() {
                    return unwrap( self.entered ) && !unwrap( self.dayOfLastMenorrhoea.hasError ) &&
                           !unwrap( self.dayOfPregnancy.hasError ) && !unwrap( self.weekOfPregnancy.hasError );
                } );

                self.addDisposable( ko.computed( function() {
                    if( self.dayOfLastMenorrhoea() && self.dueDate() ) {
                        self.entered( true );
                    } else {
                        self.entered( false );
                    }
                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        dayOfLastMenorrhoea = self.dayOfLastMenorrhoea(),
                        calculatedDueDate,
                        isInitial = ko.computedContext.isInitial(),
                        calculatedDaysOfPregnancy;

                    if( isInitial ) {
                        return;
                    }
                    if( dayOfLastMenorrhoea ) {
                        calculatedDueDate = Y.doccirrus.schemas.patient.calculateDueDate( {
                            dayOfLastMenorrhoea: dayOfLastMenorrhoea,
                            cycleLength: self.cycleLength()
                        } );
                        calculatedDaysOfPregnancy = Y.doccirrus.schemas.patient.calculateWeekOfGestation( {
                            now: self.now,
                            dayOfLastMenorrhoea: dayOfLastMenorrhoea
                        } );
                        self.dueDate( calculatedDueDate );
                        self.weekOfPregnancy( calculatedDaysOfPregnancy.week );
                        self.dayOfPregnancy( calculatedDaysOfPregnancy.days );
                    }
                } ) );
                self.addDisposable( ko.computed( function() {
                    var
                        dueDate = self.dueDate(),
                        calculatedDayOfLastMenorrhoea,
                        isInitial = ko.computedContext.isInitial(),
                        calculatedDaysOfPregnancy;

                    if( isInitial ) {
                        return;
                    }

                    if( dueDate ) {
                        calculatedDayOfLastMenorrhoea = Y.doccirrus.schemas.patient.calculateDayOfLastMenorrhoea( {
                            dueDate: dueDate,
                            cycleLength: self.cycleLength()
                        } );
                        calculatedDaysOfPregnancy = Y.doccirrus.schemas.patient.calculateWeekOfGestation( {
                            now: self.now,
                            dayOfLastMenorrhoea: calculatedDayOfLastMenorrhoea
                        } );
                        self.weekOfPregnancy( calculatedDaysOfPregnancy.week );
                        self.dayOfPregnancy( calculatedDaysOfPregnancy.days );
                        self.dayOfLastMenorrhoea( calculatedDayOfLastMenorrhoea );
                    }
                } ) );
                self.addDisposable( ko.computed( function() {
                    var
                        weekOfPregnancy = self.weekOfPregnancy(),
                        dayOfPregnancy = self.dayOfPregnancy(),
                        isInitial = ko.computedContext.isInitial(),
                        calculatedDueDate, calculatedDayOfLastMenorrhoea;

                    if( isInitial ) {
                        return;
                    }
                    if( weekOfPregnancy || dayOfPregnancy ) {
                        calculatedDayOfLastMenorrhoea = moment( self.now ).startOf( 'day' ).subtract( ( weekOfPregnancy || 0 ) * 7 + Number( dayOfPregnancy || 0 ), 'days' ).toISOString();
                        calculatedDueDate = Y.doccirrus.schemas.patient.calculateDueDate( {
                            dayOfLastMenorrhoea: calculatedDayOfLastMenorrhoea,
                            cycleLength: self.cycleLength()
                        } );
                        self.dayOfLastMenorrhoea( calculatedDayOfLastMenorrhoea );
                        self.dueDate( calculatedDueDate );
                    }
                } ) );
            },
            /** @protected */
            destructor: function() {
            },
            toJSON: function() {
                var
                    self = this;
                return {
                    dayOfLastMenorrhoea: peek( self.dayOfLastMenorrhoea ),
                    dueDate: peek( self.dueDate ),
                    weekOfPregnancy: peek( self.weekOfPregnancy ),
                    dayOfPregnancy: peek( self.dayOfPregnancy )
                };
            }
        }, {
            NAME: 'GestationDataModel',
            ATTRS: {
                binder: {
                    value: null,
                    lazyAdd: false
                },
                dayOfLastMenorrhoea: {
                    value: null,
                    lazyAdd: false
                },
                dueDate: {
                    value: null,
                    lazyAdd: false
                },
                weekAndDayOfPregnancy: {
                    value: null,
                    lazyAdd: false
                }
            }
        } );

        function GestationDataModal() {
        }

        GestationDataModal.prototype.show = function( config ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InCaseMojit/views/gestation-data-modal'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    return new Promise( function( resolve ) {
                        var
                            bodyContent = Y.Node.create( template ),
                            modal,
                            gestationDataModel;

                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-GestationData',
                            bodyContent: bodyContent,
                            maximizable: false,
                            title: TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_INFO,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            minHeight: 200,
                            minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                            resolve( gestationDataModel.toJSON() );
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    gestationDataModel.destroy();
                                }
                            }
                        } );

                        gestationDataModel = new GestationDataModel( config );
                        gestationDataModel.dayOfLastMenoreaI18n =  i18n('InCaseMojit.gestationdata_modal.label.DAY_OF_LAST_MENSTRUATION');
                        gestationDataModel.dueDateI18n = i18n('InCaseMojit.gestationdata_modal.label.DUE_DATE');
                        gestationDataModel.weekandayOfPregnancyI18n = i18n('InCaseMojit.gestationdata_modal.label.WEEKANDDAY_OF_PREGNANCY');
                        gestationDataModel.periodWeekI18n = i18n( 'InSight2Mojit.timeSelector.period.WEEK' );
                        gestationDataModel.periodDayI18n = i18n( 'InSight2Mojit.timeSelector.period.DAY' );
                        ko.applyBindings( gestationDataModel, bodyContent.getDOMNode() );

                        gestationDataModel.addDisposable( ko.computed( function() {
                            var
                                isModelValid = unwrap( gestationDataModel._isValid() ),
                                okBtn = modal.getButton( 'OK' ).button;
                            if( isModelValid ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) );
                    } );
                } ).catch( catchUnhandled );
        };

        Y.namespace( 'doccirrus.modals' ).gestationDataModal = new GestationDataModal();
    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dccallermodal',
            'KoViewModel',
            'v_meddata-schema'
        ]
    }
);