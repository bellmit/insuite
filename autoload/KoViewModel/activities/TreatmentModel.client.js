/**
 * User: pi
 * Date: 16/12/15  14:05
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment  */

'use strict';

YUI.add( 'TreatmentModel', function( Y, NAME ) {
        /**
         * @module TreatmentModel
         */

        var i18n = Y.doccirrus.i18n,
            GNR_REPLACED_WITH_SUBGOP = i18n( 'InCaseMojit.TreatmentModelJS.GNR_REPLACED_WITH_SUBGOP' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogBasedActivityModel = KoViewModel.getConstructor( 'CatalogBasedActivityModel' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        /**
         * @class TreatmentModel
         * @constructor
         * @extends CatalogBasedActivityModel
         */
        function TreatmentModel( config ) {
            TreatmentModel.superclass.constructor.call( this, config );
        }

        TreatmentModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            fk5008Notes: {
                value: [],
                lazyAdd: false
            },
            relatedDiagnoses: {
                value: null,
                lazyAdd: false
            }
        };

        TreatmentModel.toPrice = Y.doccirrus.schemas.activity.toPrice;

        Y.extend( TreatmentModel, CatalogBasedActivityModel, {

                initializer: function TreatmentModel_initializer() {
                    var
                        self = this;
                    self.initTreatmentModel();
                },
                destructor: function TreatmentModel_destructor() {
                },
                initTreatmentModel: function TreatmentModel_initTreatmentModel() {

                    var
                        self = this,
                        caseFolder = self.get( 'caseFolder' ),
                        relatedDiagnoses = self.get( 'relatedDiagnoses' ),
                        status = peek( self.status );

                    if( self.isNew() && relatedDiagnoses ) {
                        self.setRelatedDiagnoses( relatedDiagnoses );
                    }

                    self.noOmimGCodeAllowed = ko.computed( function() {
                        var code = self.code();

                        return Y.doccirrus.regexp.some( code, [
                            Y.doccirrus.regexp.KP2612
                        ] );
                    } );

                    if( !unwrap( self.fk5042Set ).length ) {
                        self.fk5042Set.push( {} );
                    }

                    if( !unwrap( self.fk5020Set ).length ) {
                        self.fk5020Set.push( {} );
                    }

                    if( !unwrap( self.costType ) ) {
                        self.costType( '' );
                    }

                    self.addDisposable( ko.computed( function() {
                        self.code();
                        self.omimCodes.validate();
                        self.fk5010BatchNumber.validate();
                    } ) );

                    self.addDisposable( self.locationId.subscribe( function( newLocation ) {
                        var code = peek( self.code ),
                            catalogShort = peek( self.catalogShort );

                        if( newLocation && code && catalogShort ) {
                            Y.log( 'Update catalog data for new location', 'debug', NAME );
                            switch( catalogShort ) {
                                case 'UVGOÄ':
                                case 'AMTS':
                                case 'GOÄ':
                                case 'EBM':
                                    CatalogBasedActivityModel.checkCode( {
                                        code: code,
                                        locationId: newLocation,
                                        catalogRef: peek( self.catalogRef )
                                    } )
                                        .done( function( response ) {
                                            var
                                                data = response.data;
                                            var original;
                                            self.catalog( true === data.catalogEntry );
                                            original = data.original && data.original[0];
                                            if( original && data.catalogEntry ) {
                                                self.setActivityData( original );
                                            } else {
                                                self.code( '' );
                                            }
                                        } );
                                    break;
                            }
                        }

                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            hasVat = unwrap( self.hasVat ),
                            invoiceConfig = self.get( 'binder' ).getInitialData( 'invoiceconfiguration' ),
                            addVat = invoiceConfig && invoiceConfig.addVat || false,
                            defaultVat = invoiceConfig && invoiceConfig.vat || 0;
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }
                        if( hasVat && addVat ) {
                            self.vat( defaultVat );
                        } else if( !hasVat ) {
                            self.vat( 0 );
                        }
                    } ).extend( {rateLimit: 0} ) ); //should wait for "if"(view)

                    self.setPriceCalculations();

                    // MOJ-14319: [OK] [CASEFOLDER]
                    if( caseFolder && Y.doccirrus.schemas.patient.isPublicInsurance( {type: caseFolder.type} ) ) {
                        self.initPublic();
                    } else {
                        self.addDisposable( ko.computed( function() {
                            if( -1 === ['CREATED', 'VALID'].indexOf( status ) ) {
                                return;
                            }
                            Y.doccirrus.invoiceutils.calcTreatment( self );
                        } ) );
                    }

                },
                initPublic: function TreatmentModel_initPublic() {
                    var
                        self = this;
                    self.publicBillingFactor = ko.computed( function() {
                        var
                            lastMatch,
                            result,
                            date,
                            timestamp = unwrap( self.timestamp ),
                            invoiceConfig = self.get( 'binder' ).getInitialData( 'invoiceconfiguration' );
                        if( invoiceConfig ) {
                            date = moment( timestamp );
                            invoiceConfig.invoicefactors.some( function( factor ) {
                                var
                                    current = moment( factor.year, 'YYYY' ).quarter( +factor.quarter ).startOf( 'quarter' ).hour( 0 ).minutes( 0 ).seconds( 0 );
                                if( +factor.year === date.year() && +factor.quarter === date.quarter() ) {
                                    result = factor;
                                    return true;
                                } else if( date.isAfter( current ) && (!lastMatch || current.isAfter( lastMatch )) ) {
                                    lastMatch = factor;
                                    return false;
                                }
                                return false;
                            } );
                            return result || lastMatch || null;
                        } else {
                            return null;
                        }
                    } );

                    self.addDisposable( ko.computed( function() {
                        var
                            timestamp = unwrap( self.timestamp ),
                            isInitial = ko.computedContext.isInitial();

                        if( isInitial || !self.isNew() ) {
                            return;
                        }

                        Y.doccirrus.jsonrpc.api.patient.relevantDiagnosesForTreatment( {
                            timestamp: timestamp,
                            patientId: peek( self.patientId ),
                            caseFolderId: peek( self.caseFolderId )
                        } )
                            .done( function( response ) {
                                var
                                    relatedDiagnoses = response.data;
                                if( relatedDiagnoses ) {
                                    self.setRelatedDiagnoses( relatedDiagnoses );
                                }
                            } );
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var code = unwrap( self.code ),
                            u_extra = unwrap( self.u_extra ),
                            status = peek( self.status ),
                            activityData;

                        if( !code || !Y.doccirrus.schemas.catalog.hasSubGop( u_extra ) ||
                            -1 === ['CREATED', 'VALID'].indexOf( status ) ) {
                            return;
                        }

                        activityData = {
                            _id: peek( self._id ) || null,
                            actType: peek( self.actType ),
                            patientId: peek( self.patientId ),
                            locationId: peek( self.locationId ),
                            catalogShort: peek( self.catalogShort ),
                            u_extra: peek( self.u_extra ),
                            billingFactorValue: peek( self.billingFactorValue ),
                            timestamp: peek( self.timestamp )
                        };

                        Promise.resolve( Y.doccirrus.jsonrpc.api.activity.checkSubGop( {
                            activityData: activityData
                        } ) ).then( function( response ) {
                            var newData = response.data && response.data.newData,
                                messageId;
                            if( !newData ) {
                                return;
                            }
                            // sub gop found. replace relevant data
                            Object.keys( newData ).forEach( function( key ) {
                                self[key]( newData[key] );
                            } );

                            messageId = [peek( self._id ) || 'new', 'sub_gop_replaced'].join( '_' );

                            Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: messageId,
                                content: GNR_REPLACED_WITH_SUBGOP,
                                level: 'INFO'
                            } );
                        } ).catch( function( err ) {
                            Y.log( 'could not check subgop err: ' + err, 'error', NAME );
                        } );

                    } ) );
                },
                setRelatedDiagnoses: function TreatmentModel_setDiagnoses( relatedDiagnoses ) {
                    var self = this;
                    if( !self.isNew() ) {
                        return;
                    }
                    if( relatedDiagnoses.anamnestic ) {
                        self.set( 'icdsExtraObj', relatedDiagnoses.anamnestic );
                        self.icdsExtra( relatedDiagnoses.anamnestic.map( function( item ) {
                            return item._id;
                        } ) );
                    }
                    if( relatedDiagnoses.treatmentRelevant ) {
                        self.set( 'icdsObj', relatedDiagnoses.treatmentRelevant );
                        self.icds( relatedDiagnoses.treatmentRelevant.map( function( item ) {
                            return item._id;
                        } ) );
                    }
                },
                setIsAmbulant: function TreatmentModel_setIsAmbulant() {
                    var
                        self = this;

                    self._isAmbulant = Y.doccirrus.uam.ViewModel.createAsync( {
                        cache: self,
                        initialValue: [],
                        jsonrpc: {
                            fn: Y.doccirrus.jsonrpc.api.patient.scheinByTimestamp,
                            params: self.addDisposable( ko.computed( function() {
                                var
                                    patientId = ko.isObservable( self.patientId ) ? self.patientId.peek() : ko.unwrap( self.patientId );
                                return {
                                    patientId: ('string' === typeof patientId ? patientId : patientId._id),
                                    timestamp: self.timestamp()
                                };
                            } ) )
                        },
                        converter: function( response ) {
                            var
                                isAmbulant,
                                data = response.data;
                            if( !data || !data[0] ) {
                                return null;
                            }
                            var scheinIsAmbulant = !( '0103' === data[0].scheinType && (data[0].scheinClinicalTreatmentFrom && data[0].scheinClinicalTreatmentTo) ),
                                treatmentIsAmbulant = !(self.fk5025 && self.fk5025() && self.fk5026 && self.fk5026());

                            isAmbulant = !scheinIsAmbulant || !treatmentIsAmbulant ? false : true;
                            return isAmbulant;
                        }
                    } );
                },
                /**
                 * set billing factor value according to current billing section type
                 * @param u_extra {Object}
                 */
                setBillingFactorValue: function TreatmentModel_setBillingFactorValue( billingFactorValue ) {
                    var
                        self = this,
                        u_extra = peek( self.u_extra ),
                        caseFolder = self.get( 'caseFolder' );
                    // MOJ-14319: [OK] [CASEFOLDER]
                    if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: caseFolder.type} ) ) {
                        if( billingFactorValue ) {
                            self.billingFactorValue( billingFactorValue );
                        }
                        return;
                    }
                    if( !u_extra || !u_extra.rechnungsfaktor || !u_extra.rechnungsfaktor[billingFactorValue] ) {
                        if( !peek( self.billingFactorValue ) ) {
                            self.billingFactorValue( "1" );
                        }
                        return;
                    }
                    self.billingFactorValue( u_extra.rechnungsfaktor[billingFactorValue] );
                },

                setPriceCalculations: function TreatmentModel_setPriceCalculations() {
                    var
                        self = this;

                    self.addDisposable( ko.computed( function() {
                        var
                            catalog = unwrap( self.catalog ),
                            computedInitial = ko.computedContext.isInitial();
                        if( !computedInitial ) {
                            if( !catalog ) {
                                /**
                                 * override unit only
                                 * This can happen ONLY when original code was selected
                                 *  then user selected custom code
                                 */
                                if( self.unit ) {
                                    self.unit( 'Euro' );
                                }
                            }
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            computedInitial = ko.computedContext.isInitial();
                        unwrap( self.catalogShort );
                        if( !computedInitial ) {
                            self.actualPrice( null );
                            self.u_extra( null );
                            self.code( null );
                            self.actualUnit( '' );
                        }
                    } ) );

                    self.addDisposable( self.billingFactorValue.subscribe( function( value ) {
                        var
                            catalogShort = peek( self.catalogShort ),
                            catalog = peek(self.catalog);
                        if( 'UVGOÄ' === catalogShort || 'GebüH' === catalogShort ) {
                            // Does not depend of billingFactorValue
                            return;
                        } if('GOÄ' === catalogShort && 'Punkte' === self.actualUnit() && catalog ){
                            self.price( TreatmentModel.toPrice( self.actualPrice(), value, Y.doccirrus.schemas.activity.goaeInvoiceFactor ) );
                        } else if( 'EBM' === catalogShort && 'Euro' === self.actualUnit() ) {
                            self.price( TreatmentModel.toPrice( self.actualPrice() ) );
                        } else {
                            self.price( TreatmentModel.toPrice( self.actualPrice(), value ) );
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            price = unwrap( self.price ),
                            catalogShort = peek( self.catalogShort ),
                            computedInitial = ko.computedContext.isInitial(),
                            catalog = peek( self.catalog ),
                            billingFactorValue = Number( peek( self.billingFactorValue ) ) || 1;
                        /**
                         * It is not allowed to change price of EBM
                         */
                        if( !computedInitial ) {
                            if( billingFactorValue && !catalog ) {
                                /**
                                 * if price of custom code has been changed
                                 *  billing factor value should be set to 1
                                 *  actualPrice is euro
                                 *  no "Punkte" calculation should be triggered
                                 *  for EBM price:actualPrice === 1:1
                                 */
                                self.actualUnit( 'Euro' );
                                if( 'EBM' === catalogShort ) {
                                    self.actualPrice( price );
                                } else {
                                    self.actualPrice( Y.doccirrus.comctl.dcDiv( price, billingFactorValue ) );
                                }
                            }
                        }
                    } ) );
                    /**
                     * user can not change unit/actualUnit. It is always set by setActivityData
                     * see schemas.activity._setActivityData
                     */
                    self.addDisposable( self.actualUnit.subscribe( function( value ) {
                        if( !value ) {
                            self.unit( value );
                        }
                    } ) );

                    self.addDisposable( self.uvGoaeType.subscribe( self.setUvGoaePrice.bind( self ) ) );

                    /**
                     * user can not change actualPrice. It is always set by setActivityData
                     * see schemas.activity._setActivityData
                     */
                    self.addDisposable( self.actualPrice.subscribe( function( value ) {
                        if( !value ) {
                            self.price( value );
                        }
                    } ) );

                    self.activitiesObj = ko.observableArray( self.get( 'activitiesObj' ) );
                    self.after( 'activitiesObjChange', function( e ) {
                        self.activitiesObj( e.newVal || [] );
                    } );

                    self.addDisposable( ko.computed( function() {
                        var
                            code = peek( self.code ),
                            linkedActivity = peek( self.activitiesObj ),
                            linkedPercentage = unwrap( self.linkedPercentage ) || 0,
                            price;
                        unwrap( self.price ); // recalculate on price change is needed in case of pre-selected linked treatments
                        if( Y.doccirrus.schemas.v_treatment.isLinkedPercentageCode( code ) && !ko.computedContext.isInitial() ) {
                            if( linkedActivity.length ) {
                                if( !linkedPercentage ) {
                                    self.price( 0 );
                                    return;
                                }
                                if( 'Punkte' === linkedActivity[ 0 ].actualUnit ) {
                                    price = TreatmentModel.toPrice( linkedActivity[ 0 ].actualPrice, Y.doccirrus.schemas.activity.goaeInvoiceFactor, linkedPercentage / 100 );
                                } else {
                                    price = TreatmentModel.toPrice( linkedActivity[ 0 ].actualPrice, linkedPercentage / 100 );
                                }
                                self.price( price );
                            } else {
                                self.price( null );
                            }
                        }
                    } ) );
                    self.addDisposable( ko.computed( function() {
                        var
                            code = unwrap( self.code ),
                            linkedActivity = unwrap( self.activitiesObj );

                        if( Y.doccirrus.schemas.v_treatment.isLinkedPercentageCode( code ) && !ko.computedContext.isInitial() ) {
                            if( linkedActivity.length ) {
                                if( !peek( self.linkedPercentage ) ) {
                                    self.linkedPercentage( 25 );
                                }
                            } else {
                                self.linkedPercentage( null );
                            }
                        }
                    } ) );

                    self.addDisposable( self.code.subscribe( function( previousValue ) {
                        var
                            linkedActivity = peek( self.activitiesObj );
                        if( Y.doccirrus.schemas.v_treatment.isLinkedPercentageCode( previousValue ) ) {
                            if( linkedActivity && linkedActivity.length ) {
                                linkedActivity.forEach( function( activity ) {
                                    self._unlinkActivity( activity._id );
                                } );
                            }
                        }
                    }, this, "beforeChange" ) );

                },
                setUvGoaePrice: function TreatmentModel_setUvGoaePrice() {
                    var
                        self = this,
                        price, prices,
                        catalogShort = peek( self.catalogShort ),
                        u_extra = peek( self.u_extra );
                    if( 'UVGOÄ' !== catalogShort || !(u_extra && u_extra.tarifvertrag) ) {
                        return;
                    }
                    prices = u_extra && u_extra.tarifvertrag;
                    price = prices && prices[peek( self.uvGoaeType )];
                    self.actualPrice( TreatmentModel.toPrice( price || 0 ) );
                    self.price( TreatmentModel.toPrice( price || 0 ) );
                },
                getCatalogBaseOptions: function TreatmentModel_getCatalogBaseOptions() {
                    var
                        self = this,
                        options = TreatmentModel.superclass.getCatalogBaseOptions.apply( this, arguments ),
                        caseFolder = self.get( 'caseFolder' ),
                        forInsuranceType = caseFolder && caseFolder.type;
                    if( !forInsuranceType ) {
                        return options;
                    }
                    options.short = Y.doccirrus.schemas.catalog.getShortNameByInsuranceType(
                        Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolder.type || 'ANY'],
                        forInsuranceType
                    );
                    return options;
                },
                addFk5035Set: function TreatmentModel_addFk5035Set() {
                    var
                        self = this;
                    self.fk5035Set.push( {} );
                },
                removeFk5035Set: function TreatmentModel_removeFk5035Set( obj ) {
                    var
                        self = this;
                    self.fk5035Set.remove( obj );
                },
                addFk5036Set: function TreatmentModel_addFk5036Set() {
                    var
                        self = this;
                    self.fk5036Set.push( {} );
                },
                removeFk5036Set: function TreatmentModel_removeFk5036Set( obj ) {
                    var
                        self = this;
                    self.fk5036Set.remove( obj );
                },
                addFk5012Set: function TreatmentModel_addFk5012Set( data ) {
                    var
                        self = this;
                    self.fk5012Set.push( data || {} );
                },
                removeFk5012Set: function TreatmentModel_removeFk5012Set( obj ) {
                    var
                        self = this;
                    self.fk5012Set.remove( obj );
                },
                addIcdsExtra: function TreatmentModel_addIcdsExtra( obj ) {
                    var
                        self = this,
                        icdsExtraObj = self.get( 'icdsExtraObj' );
                    self.icdsExtra.push( obj._id );
                    icdsExtraObj.push( obj );
                    self.set( 'icdsExtraObj', icdsExtraObj );
                },
                removeIcdsExtra: function TreatmentModel_removeIcdsExtra( id ) {
                    var
                        self = this,
                        icdsExtraObj = self.get( 'icdsExtraObj' );
                    self.icdsExtra.remove( id );
                    icdsExtraObj = icdsExtraObj.filter( function( item ) {
                        return item._id !== id;
                    } );
                    self.set( 'icdsExtraObj', icdsExtraObj );
                }
            },
            {
                schemaName: 'v_treatment',
                NAME: 'TreatmentModel'
            }
        );
        KoViewModel.registerConstructor( TreatmentModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedActivityModel',
            'v_treatment-schema',
            'dcinfrastructs',
            'OmimModel',
            'dcinvoiceutils'
        ]
    }
)
;
