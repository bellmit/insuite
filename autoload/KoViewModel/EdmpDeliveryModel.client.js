/**
 * User: do
 * Date: 22/08/16  16:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, moment */

YUI.add( 'EdmpDeliveryModel', function( Y, NAME ) {
        'use strict';

        /**
         * @module EdmpDeliveryModel
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n;

        /**
         *
         * @class EdmpDeliveryModel
         * @constructor
         * @extends KoViewModel
         */
        function EdmpDeliveryModel( config ) {
            EdmpDeliveryModel.superclass.constructor.call( this, config );
        }

        EdmpDeliveryModel.ATTRS = {};

        Y.extend( EdmpDeliveryModel, KoViewModel.getBase(), {
            initializer: function EdmpDeliveryModel_initializer( config ) {
                var
                    self = this;

                self.quarterI18n = i18n( 'edmpdelivery-schema.EdmpDelivery_T.quarter.i18n' );
                self.yearI18n = i18n( 'edmpdelivery-schema.EdmpDelivery_T.year.i18n' );
                self.addresseI18n = i18n( 'edmpdelivery-schema.EdmpDelivery_T.addressee.i18n' );
                self.addresseIkI18n = i18n( 'edmpdelivery-schema.EdmpDelivery_T.addresseeIk.i18n' );
                self.encryptedXMLFilesI18n = i18n( 'edmpdelivery-schema.EdmpDelivery_T.encryptedXMLFiles.i18n' );
                self.errorList = Y.doccirrus.schemas.edmpdelivery.types.Errors_E.list;
                self._validatable( true );

                self.displayAddresseeIk = ko.computed( function() {
                    if(self.addresseeIk() === "QDOCU") {
                        return '-';
                    }
                    return Y.doccirrus.edmputils.renderAddresseeIk( {value: self.addresseeIk()} );
                } );

                self.displayAddressee = ko.computed( function() {
                    if(self.addressee() === "QDOCU") {
                        return '-';
                    }
                    return ko.unwrap(self.addressee);
                } );

                self.displayEdmpDeliveryStatus = ko.computed( function() {
                    var translation = '',
                        edmpDeliveryStatus = self.edmpDeliveryStatus();

                    if( !peek( self._id ) ) {
                        return 'noch nicht gespeichert';
                    }

                    Y.doccirrus.schemas.edmpdelivery.types.EdmpDeliveryStatus_E.list.some( function( entry ) {
                        if( entry.val === edmpDeliveryStatus ) {
                            translation = entry.i18n;
                            return true;
                        }
                    } );
                    return translation;
                } );

                self.showCreateEvlCheckOptions = ko.computed( function() {
                    var quarter = self.quarter(),
                        year = self.year(),
                        evlModuleNotAllowedFromDate = moment( 1 + '/' + 2019, 'QYYYY' ),
                        deliveryDate = moment( quarter + '/' + year, 'QYYYY' );

                    return deliveryDate.isBefore( evlModuleNotAllowedFromDate );
                } );

                self.disableEvlSettings = ko.computed( function() {
                    var edmpDeliveryStatus = self.edmpDeliveryStatus();
                    return -1 === ['OPEN', 'PACK_ERR'].indexOf( edmpDeliveryStatus );
                } );
                self.disableEvlEmployeeId = ko.computed( function() {
                    var disableEvlSettings = self.disableEvlSettings(),
                        createEvl = self.createEvl();
                    return disableEvlSettings || !createEvl;
                } );

                self.displayError = ko.computed( function() {
                    var error = self.error(),
                        errMessage,
                        errorDetails = self.errorDetails(),
                        errorList = self.errorList;

                    if( error ) {
                        errMessage = errorList.find( function( err ) {
                            return err.val === error ? err : null;
                        } );
                        return errMessage.i18n;
                    } else if (errorDetails){
                        errMessage = errorDetails;
                        return errMessage;
                    } else {
                        return false;
                    }
                } );

                self.headline = ko.computed( function() {
                    if(unwrap(self.error()) === "1" || unwrap(self.errorDetails)) {
                        return i18n( 'DCWindow.notice.title.error' ) + ' ';
                    } else {
                        return i18n( 'PatientTransferMojit.NewMessage.content' ) + ' ';
                    }
                } );

                self.disableDownloadAll = ko.computed( function() {
                    if(self.addressee() === "QDOCU") {
                        return true;
                    }
                } );

                self.evlEmployeeIdAutoComplete = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var evlEmployeeId = unwrap( self.evlEmployeeId );
                            return evlEmployeeId;
                        },
                        write: function( $event ) {
                            self.evlEmployeeId( $event.val );
                        }
                    } ) ),
                    select2: {
                        allowClear: false,
                        dropdownAutoWidth: true,
                        data: config.employees.map( function( employee ) {
                            return {
                                id: employee._id,
                                text: [employee.firstname, employee.lastname].join( ' ' ),
                                _data: employee
                            };
                        } )
                    }
                };

                self.addDisposable( ko.computed( function() {
                    if( self.disableEvlSettings() ) {
                        return;
                    }

                    var createEvl = self.createEvl(),
                        evlEmployeeId = self.evlEmployeeId();

                    Promise.resolve( Y.doccirrus.jsonrpc.api.edmpdelivery.update( {
                        query: {_id: unwrap( self._id )},
                        data: {
                            createEvl: createEvl,
                            evlEmployeeId: evlEmployeeId
                        },
                        fields: ['createEvl', 'evlEmployeeId']
                    } ) ).then( function( response ) {
                        Y.log( 'updated createEvl and evlEmployeeId:' + response, 'debug', NAME );
                    } ).catch( function( err ) {
                        Y.log( 'could not update createEvl flag and evlEmployeeId: ' + err, 'error', NAME );
                    } );

                } ).extend( {
                    rateLimit: {timeout: 200, method: "notifyWhenChangesStop"}
                } ) );

            },
            getMediaUrl: function( id ) {
                var url = Y.doccirrus.media.getMediaUrl( {_id: id, mime: 'APPLICATION_PDF'} );
                return Y.doccirrus.infras.getPrivateURL( url );
            },
            downloadAll: function() {
                var delay = 100,
                    edmpArchiveDls = document.querySelectorAll( '.edmp-archive-dl' );
                Array.prototype.slice.call( edmpArchiveDls ).forEach( function( el, index ) {
                    setTimeout( function() {
                        el.click();
                    }, delay * index );
                } );
            },
            makeUrl: function( id ) {
                var url = '/download/' + id;
                return Y.doccirrus.infras.getPrivateURL( url );
            },
            displayActType:  function(actType) {
                if(actType === "QDocu") {
                    return i18n( 'activity-schema.Activity_E.QDOCU' );
                }
                return actType;
            },
            save: function() {
                var self = this,
                    data = self.toJSON(),
                    method = data._id ? 'update' : 'create',
                    jqDeferred = Y.doccirrus.jsonrpc.api.edmpdelivery[method]( {
                        query: 'update' === method ? {_id: data._id} : undefined,
                        data: data,
                        fields: 'update' === method ? Object.keys( data ) : undefined
                    } );

                return Promise.resolve( jqDeferred );
            },
            destructor: function EdmpDeliveryModel_destructor() {
            }
        }, {
            schemaName: 'edmpdelivery',
            NAME: 'EdmpDeliveryModel'
        } );
        KoViewModel.registerConstructor( EdmpDeliveryModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'edmpdelivery-schema',
            'casefolder-schema'
        ]
    }
);