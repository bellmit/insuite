/**
 * User: pi
 * Date: 17/02/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true, prefer-template: 0 */
/*global YUI, ko  */

'use strict';

YUI.add( 'FormModel', function( Y, NAME ) {
        /**
         * @module FormModel
         */

        var
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            REQUEST_ETS_ARRANGEMENT_CODE = i18n( 'InCaseMojit.ReferralEditorModelJS.button.REQUEST_ETS_ARRANGEMENT_CODE' ),
            REQUEST_IS_PENDING = i18n( 'InCaseMojit.ReferralEditorModelJS.message.REQUEST_IS_PENDING' ),
            ADDITIONAL_ERROR_HINT = i18n( 'InCaseMojit.ReferralEditorModelJS.message.ADDITIONAL_ERROR_HINT' ),
            ADDITIONAL_ERROR_HINT_ALT = i18n( 'InCaseMojit.ReferralEditorModelJS.message.ADDITIONAL_ERROR_HINT_ALT' ),
            PRINT_ON_ERROR = i18n( 'InCaseMojit.ReferralEditorModelJS.message.PRINT_ON_ERROR' ),
            INVALID_ETS_PTV11_REQUEST = i18n( 'InCaseMojit.ReferralEditorModelJS.message.INVALID_ETS_PTV11_REQUEST' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        function handleError( err ) {
            var code = err.code || err.statusCode;
            if( code ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: Y.doccirrus.errorTable.getMessage( {code: code} ) + '\n\n' +
                             ADDITIONAL_ERROR_HINT
                } );
            }
            Y.log( 'error: ' + err.message, 'warn', NAME );
        }

        /**
         * @class FormModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function FormModel( config ) {
            FormModel.superclass.constructor.call( this, config );
        }

        FormModel.ATTRS = {
            whiteList: {
                value: [
                    'medData'
                ],
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( FormModel, FormBasedActivityModel, {

                initializer: function FormModel_initializer() {
                    var
                        self = this;
                    self.initFormModel();
                },
                destructor: function FormModel_destructor() {
                },
                initFormModel: function FormModel_initFormModel() {
                    var self = this;
                    self.requestIsPendingI18n = REQUEST_IS_PENDING;
                    self.additionalErrorHintI18n = ko.computed( function() {
                        var eTSAErrorMessage = self.eTSAErrorMessage();
                        if( eTSAErrorMessage && eTSAErrorMessage.length && eTSAErrorMessage.toString().match( /\(2115\)/ ) ) {
                            return ADDITIONAL_ERROR_HINT_ALT;
                        }
                        return ADDITIONAL_ERROR_HINT;
                    } );
                    self.kvcAccountStatus = ko.observable();
                    self.pendingRequest = ko.observable( false );
                    self.eTSAlertClass = ko.computed( function() {
                        var eTSAErrorMessage = self.eTSAErrorMessage(),
                            eTSArrangementCode = self.eTSArrangementCode();

                        if( eTSAErrorMessage ) {
                            return 'alert alert-warning';
                        } else if( eTSArrangementCode ) {
                            return 'alert alert-success';
                        }

                        return 'alert alert-info';
                    } );


                    if ( 'VALID' === self.status() || 'CREATED' === self.status() ) {
                        self.addDisposable( ko.computed( function() {
                            var eTSArrangementCode = self.eTSArrangementCode(),
                                naehereAngabenZuDenEmpfehlungen = ko.utils.peekObservable( self.naehereAngabenZuDenEmpfehlungen ),
                                timestamp = self.timestamp(),
                                cleanNaehereAngabenZuDenEmpfehlungen, refinedNaehereAngabenZuDenEmpfehlungen;

                            // check if arrangement code is already printed and must be replaced
                            cleanNaehereAngabenZuDenEmpfehlungen = Y.dcforms.mapper.objUtils.cleanArrangementCodeLine( timestamp, naehereAngabenZuDenEmpfehlungen );

                            refinedNaehereAngabenZuDenEmpfehlungen = Y.dcforms.mapper.objUtils.addArrangementCodeToFormFieldValue(
                                timestamp, cleanNaehereAngabenZuDenEmpfehlungen || '', eTSArrangementCode );

                            self.naehereAngabenZuDenEmpfehlungen( refinedNaehereAngabenZuDenEmpfehlungen);
                        } ) );
                    }

                    Y.doccirrus.communication.on( {
                        event: 'eTS-ARRANGEMENT-CODE-DELIVERY',
                        done: function( message ) {
                            var data = message.data && message.data[0];

                            if( data.eTSArrangementCodeDeliveryOriginalMessageId &&
                                data.eTSArrangementCodeDeliveryOriginalMessageId === self.eTSArrangementCodeRequestMessageId() ) {
                                self.isModifiedObserver.setUnModified();
                                self.eTSArrangementCode( data.eTSArrangementCode );
                                self.lastETSArrangementCode = null;
                                self.eTSAErrorMessage( data.eTSAErrorMessage || null );
                                if( data.eTSAErrorMessage && data.eTSAErrorMessage.length ) {
                                    self.naehereAngabenZuDenEmpfehlungen( PRINT_ON_ERROR );
                                }
                                self.pendingRequest( false );
                            } else {
                                Y.log( 'received eTS-ARRANGEMENT-CODE-DELIVERY replyToId message does not match current messageId' );
                            }
                        },
                        handlerId: 'updateGkvTable'
                    } );

                    self.requestArrangementCodeButton = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'requestArrangementCodeButton',
                            title: REQUEST_ETS_ARRANGEMENT_CODE,
                            text: REQUEST_ETS_ARRANGEMENT_CODE,
                            option: 'PRIMARY',
                            disabled: ko.computed( function() {
                                var isPending = self.pendingRequest(),
                                    notEditable = -1 === ['CREATED', 'VALID'].indexOf( self.status() );

                                return isPending || notEditable;
                            } ),
                            click: function() {
                                self.requestArrangementCode();
                            }
                        }
                    } );

                    self.requestArrangementCodeButton.css()['btn-block'] = true;

                    self.isModifiedObserver = new Y.doccirrus.utils.IsModifiedObserver( [
                        self.locationId,
                        self.employeeId,
                        self.ambulantePsychotherapeutischeAkutbehandlung,
                        self.ambulantePsychoTherapie,
                        self.zeitnahErforderlich,
                        self.analytischePsychotherapie,
                        self.tiefenpsychologischFundiertePsychotherapie,
                        self.verhaltenstherapie
                    ] );

                    self.isModifiedObserver.isModified.subscribe( function( val ) {
                        var status = peek( self.status );
                        var eTSArrangementCode = peek( self.eTSArrangementCode );
                        if( eTSArrangementCode && -1 < ['VALID', 'CREATED'].indexOf( status ) && val === true ) {
                            self.lastETSArrangementCode = eTSArrangementCode;
                            self.eTSArrangementCode( null );
                        } else if( self.lastETSArrangementCode && !eTSArrangementCode && -1 < ['VALID', 'CREATED'].indexOf( status ) && val === false ) {
                            self.eTSArrangementCode( self.lastETSArrangementCode );
                            self.lastETSArrangementCode = null;
                        }
                    } );


                    self.addDisposable( ko.computed( function() {
                        var locationId = self.locationId();
                        Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.accountStatus( {
                            locationId: locationId
                        } ) ).then( function( response ) {
                            self.kvcAccountStatus( response.data );
                        } ).catch( function( err ) {
                            Y.log( 'could not get kvcaccount status: ' + err, 'warn', NAME );
                        } );
                    } ) );

                    self.displayETSPanel = ko.computed( function() {
                        var kvcAccountStatus = self.kvcAccountStatus();
                        return kvcAccountStatus && kvcAccountStatus.exists && kvcAccountStatus.certificateStatus === 'VALID';
                    } );

                    self.eTSErrorMessage = ko.computed( function() {
                        var kvcAccountStatus = self.kvcAccountStatus();
                        return kvcAccountStatus && kvcAccountStatus.message || '';
                    } );
                },
                requestArrangementCode: function() {
                    var self = this,
                        locationId = self.locationId(),
                        employeeId = self.employeeId(),
                        ambulantePsychotherapeutischeAkutbehandlung = self.ambulantePsychotherapeutischeAkutbehandlung(),
                        ambulantePsychoTherapie = self.ambulantePsychoTherapie(),
                        zeitnahErforderlich = self.zeitnahErforderlich(),
                        analytischePsychotherapie = self.analytischePsychotherapie(),
                        tiefenpsychologischFundiertePsychotherapie = self.tiefenpsychologischFundiertePsychotherapie(),
                        verhaltenstherapie = self.verhaltenstherapie(),
                        binder = self.get( 'binder' ),
                        location = binder.getInitialData( 'location' ).find( function( location ) {
                            return location._id === locationId;
                        } ),
                        bsnr, lanr, employee;

                    if( (!ambulantePsychotherapeutischeAkutbehandlung && !(ambulantePsychoTherapie && zeitnahErforderlich)) ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'warn',
                            message: INVALID_ETS_PTV11_REQUEST
                        } );
                        return;
                    }

                    bsnr = location && location.commercialNo;
                    if( location && location.employees.length ) {
                        employee = location.employees.find( function( employee ) {
                            return employee._id === employeeId;
                        } );
                        lanr = employee && employee.officialNo;
                    }

                    self.pendingRequest( true );

                    Promise.resolve( Y.doccirrus.jsonrpc.api.activity.requestETSArrangementCode( {
                        formType: 'PTV11',
                        locationId: locationId,
                        bsnr: bsnr,
                        lanr: lanr,
                        ambulantePsychotherapeutischeAkutbehandlung: ambulantePsychotherapeutischeAkutbehandlung,
                        ambulantePsychoTherapie: ambulantePsychoTherapie,
                        zeitnahErforderlich: zeitnahErforderlich,
                        analytischePsychotherapie: analytischePsychotherapie,
                        tiefenpsychologischFundiertePsychotherapie: tiefenpsychologischFundiertePsychotherapie,
                        verhaltenstherapie: verhaltenstherapie
                    } ) ).then( function( response ) {
                        if( response && response.data && response.data.eTSArrangementCodeRequestMessageId ) {
                            // set message id to be checked in sio handler for event "eTS-ARRANGEMENT-CODE-DELIVERY"
                            self.eTSArrangementCodeRequestMessageId( response.data.eTSArrangementCodeRequestMessageId );
                        } else {
                            Y.log( 'could not send message: ' + response, 'debug', NAME );
                            self.pendingRequest( false );
                        }
                    } ).catch( function( err ) {
                        Y.log( 'could not request arrangement code: ' + err, 'warn', NAME );
                        handleError( err );
                        self.naehereAngabenZuDenEmpfehlungen( PRINT_ON_ERROR );
                        self.pendingRequest( false );
                    } );
                },

                /**
                 *  Allow model to accept values set in forms
                 *  @param element
                 */

                _writeBack: function FormModel_writeBack( template, element ) {
                    var
                        self = this,
                        remap = null,
                        unmap = {},
                        schemaMember = element.schemaMember,

                        //  these two forms have some legacy hacks which need to be maintained
                        isBFB39 = ( schemaMember && 'BFB39' === schemaMember.substr( 0, 5 ) ),
                        isBFB25 = ( schemaMember && 'BFB25' === schemaMember.substr( 0, 5 ) ),
                        isSpecialBFB = ( isBFB39 || isBFB25 ),
                        i, k,

                        //  for legacy hack where fields for barcode exist only in the form, not on the activity

                        booleanRadioSets = [
                            'BFB25_Kompaktur',
                            'BFB39_Wiederholungsuntersuchung',
                            'BFB39_Liegt_ein_HPV_HR_Testergebnis_vor',
                            'BFB39_Gyn_OP_Strahlen_oder_Chemotherapie',
                            'BFB39_Gravidität',
                            'BFB39_Path_Gynäkologische_Blutungen',
                            'BFB39_Sonstiger_Ausfluss',
                            'BFB39_IUP',
                            'BFB39_Ovulationshemmer',
                            'BFB39_Sonstige_Hormon_Anwendung',
                            'BFB39_Vulva_Inspektion_auffällig',
                            'BFB39_Portio_und_Vagina_auffällig',
                            'BFB39_Inneres_Genitale_auffällig',
                            'BFB39_Inguinale_Lymphknoten_auffällig',
                            'BFB39_Behandlungsbedürftige_Nebenbefunde',
                            'BFB39_Haut',
                            'BFB39_Mamma_auffällig',
                            'BFB39_Axilläre_Lymphknoten_auffällig',
                            'BFB39_Rektum_Kolon_Blut_oder_Schleim',
                            'BFB39_Neu_aufgetr_Unregelmäßigkeiten',
                            'BFB39_Rektum_Kolon_Tastbefund_auffällig',
                            'BFB39_Stuhltest_zurückgegeben',
                            'BFB39_Stuhltest_positiv'
                        ];

                    if ( !self._isEditable() || !element.schemaMember ) { return; }

                    //  if element is bound to property
                    if ( element.schemaMember && 'function' === typeof self[ element.schemaMember ] ) {
                        self[ element.schemaMember ]( element.unmap() );
                        return;
                    }

                    //  bound indirectly to property
                    switch( element.schemaMember ) {

                        //  KinderKrankengeld_T

                        case 'betreuungNotwendig':
                            self.notwendig( -1 !== element.value.indexOf( '*' ) );
                            break;

                        case 'betreuungNichtNotwendig':
                            self.notwendig( -1 === element.value.indexOf( '*' ) );
                            break;

                        case 'betreuungUnfall':
                            self.unfall( -1 !== element.value.indexOf( '*' ) );
                            break;

                        case 'betreuungKeinUnfall':
                            self.unfall( -1 === element.value.indexOf( '*' ) );
                            break;

                        case 'bb':
                            if ( element.unmap() ) {
                                self.scheinSlipMedicalTreatment( '4' );
                            } else {
                                self.scheinSlipMedicalTreatment( '' );
                            }
                            break;

                        //  BFB61 part C.G Other Mobility checkboxes

                        case 'BFB61_Mobility_Check_Limitation':         //  deliberate fallthrough
                        case 'BFB61_Mobility_Check_Help_Needed':        //  deliberate fallthrough
                        case 'BFB61_Mobility_Check_Infeasible':         //  deliberate fallthrough

                            if ( element.unmap() ) {
                                self.mobilityOtherCheck( element.schemaMember );
                            } else {
                                self.mobilityOtherCheck( self.mobilityOtherCheck().replace( element.schemaMember, '' ) );
                            }
                            break;

                        case 'BFB61_Mobility_String':
                            if ( self.mobilityOtherString ) {
                                self.mobilityOtherString( element.unmap() );
                            } else {
                                //  only FORM type activities have this property as of MOJ-7769
                                Y.log( 'Activity is missing property: mobilityOtherString', 'warn', NAME );
                            }
                            break;

                    }

                    //  LEGACY RADIO BOX HACK FOR BFB 39 AND 25
                    //  Needed for barcodes in old activities

                    if ( schemaMember && isSpecialBFB ) {
                        unmap = template.unmap();

                        //  mix in stored mapData from the formDoc
                        for ( k in template.mapData ) {
                            if ( template.mapData.hasOwnProperty( k ) ) {
                                //  perfer value from form element if it exists
                                if ( !unmap.hasOwnProperty( k ) ) {
                                    unmap[k] = template.mapData[k];
                                }
                            }
                        }

                        //  may be more than one element bound to this schemaMember
                        unmap[ schemaMember ] = element.unmap();

                        remap = {};
                    }

                    //  document.mapData may have been lost, recreate
                    for ( k in unmap ) {
                        if ( unmap.hasOwnProperty( k ) ) {

                            if ( 'BFB39' === k.substr( 0, 5 ) || 'BFB25' === k.substr( 0, 5 ) ) {

                                //  simple values
                                remap[k] = unmap[k];

                                for ( i = 0; i < booleanRadioSets.length; i++ ) {

                                    if ( booleanRadioSets[i] + '_Ja' === k && true === unmap[k] ) {
                                        remap[ booleanRadioSets[i] ] = true;
                                        remap[ booleanRadioSets[i] + '_Ja' ] = true;
                                        remap[ booleanRadioSets[i] + '_Nein' ] = false;
                                    }

                                    if ( booleanRadioSets[i] + '_Nein' === k && true === unmap[k] ) {
                                        remap[ booleanRadioSets[i] ] = false;
                                        remap[ booleanRadioSets[i] + '_Ja' ] = false;
                                        remap[ booleanRadioSets[i] + '_Nein' ] = true;
                                    }
                                }

                            }

                        }
                    }

                    // call AMTS medDataWriteBack
                    Y.dcforms.schema.AMTSFormMapper_T.medDataWriteBack.call(this, template, element);

                    //  special case, this is mysteriously not updating
                    if ( 'BFB39_Sonstige_Hormon_Anwendung_Nein' === schemaMember ) {
                        if ( true === element.unmap() ) {
                            remap.BFB39_Sonstige_Hormon_Anwendung = false;
                            remap.BFB39_Sonstige_Hormon_Anwendung_Ja = false;
                            remap.BFB39_Sonstige_Hormon_Anwendung_Nein = true;
                        }
                    }

                    //  special case, last checkup date should keep the value in the date picker, no special logic
                    if ( remap && remap.hasOwnProperty( 'BFB39_Datum_der_letzten_Untersuchung' ) ) {
                        delete remap.BFB39_Datum_der_letzten_Untersuchung;
                    }

                    if ( !element.page || !element.page.form ) {
                        //  should not happen
                        Y.log( 'Element does not have form, not updating document: ' + element.elemType, 'warn', NAME );
                        return;
                    }

                    function onWriteBack( err ) {
                        if ( err ) {
                            Y.log( 'Problem updating form on value change: ' + JSON.stringify( err ), 'debug', NAME );
                        }
                        Y.log( 'Updated form after value change: ' + JSON.stringify( remap ), 'debug', NAME );
                        template.raise( 'remapBarcode', remap );
                    }

                    if ( remap ) {
                        template.map( remap, false, onWriteBack );
                    } else {
                        if ( element.schemaMember && template.hasBarcode ) {
                            remap = {};
                            remap[ element.schemaMember ] = element.unmap();
                            template.raise( 'remapBarcode', remap );
                        }
                    }
                }
            },
            {
                schemaName: 'v_form',
                NAME: 'FormModel'
            }
        );

        KoViewModel.registerConstructor( FormModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_form-schema',
            'dcformmap-util',
            'dcutils',
            'dcforms-schema-AMTSFormMapper-T'
        ]
    }
)
;