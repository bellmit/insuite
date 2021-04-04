/**
 * User: pi
 * Date: 18/01/16  13:50
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $ */

'use strict';

YUI.add( 'UtilityEditorModel', function( Y ) {
        /**
         * @module UtilityEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogBasedEditorModel = KoViewModel.getConstructor( 'CatalogBasedEditorModel' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            UT_ITEM = i18n( 'InCaseMojit.activity_model_clientJS.placeholder.UT_ITEM' );

        /**
         * @class UtilityEditorModel
         * @constructor
         * @extends CatalogBasedEditorModel
         */
        function UtilityEditorModel( config ) {
            UtilityEditorModel.superclass.constructor.call( this, config );
        }

        UtilityEditorModel.ATTRS = {
            whiteList: {
                value: CatalogBasedEditorModel.ATTRS.whiteList.value.concat( [
                    'userContent',
                    'subType',
                    'comment',
                    'u_extra',
                    'utRemedy1Name',
                    'utRemedy1Item',
                    'utRemedy1ItemPrice',
                    'utRemedy1Explanation',
                    'utRemedy1Seasons',
                    'utRemedy1PerWeek',
                    'utRemedy2Name',
                    'utRemedy2Item',
                    'utRemedy2ItemPrice',
                    'utRemedy2Explanation',
                    'utRemedy2Seasons',
                    'utRemedy2PerWeek',
                    'utPrescriptionType',
                    'utNoNormalCase',
                    'utHomeVisit',
                    'utGroupTherapy',
                    'utTherapyReport',
                    'utUnfall',
                    'utBvg',
                    'utLatestStartOfTreatment',
                    'utMedicalJustification',
                    'utTherapyGoals',
                    'utDiagnosisName',
                    'utVocalTherapy',
                    'utSpeakTherapy',
                    'utSpeechTherapy',
                    'utDurationOfSeason',
                    'utNeuroFinding',
                    'utAudioDiagDate',
                    'utAudioDiagReact',
                    'utAudioDiagCond',
                    'utAudioDiagOwn',
                    'utLupenlaryngoskopie',
                    'utLupenstroboskopieRight',
                    'utLupenstroboskopieLeft',
                    'utAmplitudeRight',
                    'utAmplitudeLeft',
                    'utRandkantenverschiebungRight',
                    'utRandkantenverschiebungLeft',
                    'utRegular',
                    'utGlottisschluss',
                    'utEarDrumFindingRight',
                    'utEarDrumFindingLeft'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( UtilityEditorModel, CatalogBasedEditorModel, {
                initializer: function UtilityEditorModel_initializer() {
                    var
                        self = this;
                    self.initUtilityEditorModel();
                },
                destructor: function UtilityEditorModel_destructor() {
                },
                initUtilityEditorModel: function UtilityEditorModel_initUtilityEditorModel() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );

                    //  Do not update
                    Y.doccirrus.inCaseUtils.injectPopulatedObjs.call( self, {
                        dataModel: currentActivity,
                        fields: ['icdsObj']
                    } );

                    self._displayUtIcd = ko.computed( function() {
                        var icds = unwrap( self.icdsObj ) || [];
                        if( icds && icds.length ) {
                            return ko.unwrap( icds[0].code );
                        } else {
                            return '';
                        }
                    } );
                    self._remedyList = ko.observable( [] );

                    self._displayRemedyOptionsText = function( item ) {
                        return (item.short ? item.short + ' ' : '') + (item.name || '');
                    };

                    self._sessionAdvices = ko.observable( '' );
                    self._perWeekAdvices = ko.observable( '' );
                    self._pescriptionAdvices = ko.observable( '' );
                    self._hasPrescriptionAdvices = ko.computed( function() {
                        var
                            advices = unwrap( self._pescriptionAdvices );
                        return Boolean( advices );
                    } );
                    self._select2utRemedy1Item = self.getUtRemendyItemAutoComplete( '1' );
                    self._select2utRemedy2Item = self.getUtRemendyItemAutoComplete( '2' );

                    self.addDisposable( ko.computed( function() {
                        var
                            u_extra = unwrap( self.u_extra ),
                            presc,
                            prescType = peek( self.utPrescriptionType );
                        self._pescriptionAdvices( '' );
                        self._sessionAdvices( '' );
                        self._perWeekAdvices( '' );

                        if( !u_extra ) {
                            return;
                        }

                        if( !ko.computedContext.isInitial() ) {
                            self._checkRemedyDiagnosis();
                        }

                        if( u_extra.remedies ) {
                            self._remedyList( u_extra.remedies );
                        }

                        if( u_extra.prescriptionAdvice && u_extra.prescriptionAdvice.length ) {
                            self._pescriptionAdvices( u_extra.prescriptionAdvice.join( '<br>' ) );
                        }

                        presc = self.findPrescriptionType( 'FF' );
                        if( presc && presc.advice && presc.advice.length ) {
                            self._perWeekAdvices( presc.advice.join( ', ' ) );
                        }

                        if( 'FIRST' === prescType ) {
                            presc = self.findPrescriptionType( 'E' );
                            if( presc ) {
                                self.setSessionAdvices( presc );
                            }
                        } else if( 'FOLLOWING' === prescType ) {
                            presc = self.findPrescriptionType( 'F' );
                            if( presc ) {
                                self.setSessionAdvices( presc );
                            }
                        }

                    } ) );

                    self._utRemedy1ItemReadOnly = ko.computed( self.getUtRemedyItemReadOnly( '1' ) );
                    self._utRemedy1DisplayPrice = ko.computed( self.getUtRemedyPriceDisplay( '1' ) );
                    self._utRemedy2ItemReadOnly = ko.computed( self.getUtRemedyItemReadOnly( '2' ) );
                    self._utRemedy2DisplayPrice = ko.computed( self.getUtRemedyPriceDisplay( '2' ) );

                    self.addDisposable( self.utRemedy1Name.subscribe( function( val ) {
                        self._changedRemedy( 1, val );
                    } ) );

                    self.addDisposable( self.utRemedy2Name.subscribe( function( val ) {
                        self._changedRemedy( 2, val );
                    } ) );

                    self._displayPossibleDiagnoses = ko.computed( function() {
                        var
                            u_extra = unwrap( self.u_extra ),
                            str = '',
                            diagnoses;
                        if( u_extra && u_extra.diagnoses && u_extra.diagnoses.length ) {
                            diagnoses = u_extra.diagnoses;
                            diagnoses.forEach( function( diagnosis ) {
                                str += diagnosis.code + ' ' + diagnosis.title + '\n';
                            } );
                        }
                        return str;
                    } );

                    self.addDisposable( self.icdsObj.subscribe( function() {
                        self._checkRemedyDiagnosis();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            prescriptionType = 'FIRST' === unwrap( self.utPrescriptionType ) ? 'E' : 'F',
                            presc = self.findPrescriptionType( prescriptionType );
                        self.setSessionAdvices( presc );
                    } ) );

                    self.addDisposable( self.catalogShort.subscribe( function() {
                        self._resetForm();
                    } ) );
                },
                _resetForm: function UtilityEditorModel__resetForm() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    currentActivity.resetForm();
                    self._remedyList( [] );
                    self._pescriptionAdvices( '' );
                    self._sessionAdvices( '' );
                    self._perWeekAdvices( '' );
                },
                _setLogoInfo: function UtilityEditorModel__setLogoInfo( u_extra ) {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    currentActivity._setLogoInfo( u_extra );

                },
                _changedRemedy: function UtilityEditorModel__changedRemedy( number, val ) {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    $( '#utRemedyItemAutoComplete' + number ).select2( 'open' );
                    currentActivity.changedRemedy( number, val );
                },
                _checkRemedyDiagnosis: function UtilityEditorModel__checkRemedyDiagnosis() {
                    var
                        self = this,
                        rangeIcd = /([A-Z])\d\d-[A-Z]\d\d/,
                        match,
                        icds = unwrap( self.icdsObj ),
                        utIcd = icds && icds[0],
                        utIcdCode = utIcd && utIcd.code,
                        utIcdContent = utIcd && utIcd.content,
                        u_extra = peek( self.u_extra ),
                        valid,
                        diagnoses = u_extra && u_extra.diagnoses;
                    if( !utIcd || !diagnoses || !diagnoses.length ) {
                        self.utDiagnosisName( '' );
                        return;
                    }

                    valid = diagnoses.some( function( diagnosis ) {
                        match = rangeIcd.exec( diagnosis.code );
                        if( match && match[1] === utIcdCode[0] ) {
                            self.utDiagnosisName( utIcdCode + ' ' + utIcdContent );
                            return true;
                        } else if( diagnosis.code === utIcdCode ) {
                            self.utDiagnosisName( diagnosis.code + ' ' + diagnosis.title );
                            return true;
                        }
                        return false;
                    } );

                    if( self._messageId ) {
                        Y.doccirrus.DCSystemMessages.removeMessage( self._messageId );
                        delete self._messageId;
                    }

                    if( valid ) {
                        return;
                    }
                    self.utDiagnosisName( utIcdCode + ' ' + utIcdContent );

                    self._messageId = self._id + 'invalid-diagnosis';
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        content: 'Die ausgewählte Diagnose passt nicht zum Indikationsschlüssel!',
                        level: 'WARNING',
                        messageId: self._messageId
                    } );

                },
                getUtRemedyPriceDisplay: function UtilityEditorModel_getUtRemedyPriceDisplay( type ) {
                    var
                        self = this,
                        priceAttr = 'utRemedy' + type + 'ItemPrice',
                        utPrice = self[priceAttr];

                    return {
                        read: function() {
                            var
                                price = unwrap( utPrice );
                            price = Y.doccirrus.comctl.numberToLocalString( price );
                            return price;
                        },
                        write: function( val ) {
                            val = Y.doccirrus.comctl.localStringToNumber( val );
                            utPrice( val );
                        }
                    };
                },
                _getPriceFromCatalogEntry: function UtilityEditorModel__getPriceFromCatalogEntry( entry ) {
                    var
                        self = this,
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        data = entry && entry._data,
                        publicInsurance = currentPatient && currentPatient.getPublicInsurance(),
                        priceKeys = [
                            {key: 'AOK', groupId: '01'},
                            {key: 'LKK', groupId: '02'},
                            {key: 'IKK', groupId: '03'},
                            {key: 'BKK', groupId: '04'},
                            {key: 'Knappschaft', groupId: '05'},
                            {key: 'vdek', groupId: '11'}
                        ],
                        prices, price, priceKey, costCarrierBillingGroup;

                    if( !publicInsurance || !data || !data.prices ) {
                        return null;
                    }

                    costCarrierBillingGroup = peek( publicInsurance.costCarrierBillingGroup );
                    prices = data.prices['72']; // at the moment only kv berlin is supported

                    priceKeys.some( function( o ) {
                        if( o.groupId === costCarrierBillingGroup ) {
                            priceKey = o.key;
                            return true;
                        }
                    } );

                    price = priceKey && prices && prices[priceKey];

                    if( !price ) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            content: 'Es wurde kein Preis für die Kostenträgergruppe des Patienten gefunden!',
                            level: 'WARNING'
                        } );
                    }

                    return price;
                },
                setSessionAdvices: function UtilityEditorModel_setSessionAdvices( presc ) {
                    var
                        self = this;
                    self._sessionAdvices( '' );
                    if( presc && presc.advice && presc.advice.length ) {
                        self._sessionAdvices( presc.advice.join( ', ' ) );
                    }
                },
                findPrescriptionType: function UtilityEditorModel_findPrescriptionType( type ) {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    return currentActivity.findPrescriptionType( type );
                },
                _getShortByRemedyName: function UtilityEditorModel__getShortByRemedyName( name ) {
                    var
                        self = this,
                        u_extra = unwrap( self.u_extra ),
                        short = null;

                    if( name && u_extra && Array.isArray( u_extra.remedies ) ) {
                        u_extra.remedies.some( function( remedy ) {
                            if( remedy.name === name ) {
                                short = remedy.short;
                                return true;
                            }
                        } );
                    }
                    return short;
                },
                getUtRemendyItemAutoComplete: function UtilityEditorModel_getUtRemendyItemAutoComplete( type ) {
                    var
                        self = this,
                        itemAttr = 'utRemedy' + type + 'Item',
                        nameAttr = 'utRemedy' + type + 'Name',
                        priceAttr = 'utRemedy' + type + 'ItemPrice',
                        utItem = self[itemAttr],
                        utName = self[nameAttr],
                        utPrice = self[priceAttr];
                    return {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    id = unwrap( utItem );
                                if( !id ) {
                                    return;
                                }
                                return {id: id, text: id};
                            },
                            write: function( $event ) {
                                var data = $event && $event.added || {};
                                utPrice( self._getPriceFromCatalogEntry( data ) );
                                if( data._data && data._data.groupTherapy ) {
                                    self.utGroupTherapy( true );
                                }
                                utItem( $event.val );
                            }
                        } ) ),
                        select2: {
                            placeholder: type + '. ' + UT_ITEM,
                            allowClear: true,
                            query: function( query ) {

                                var short = self._getShortByRemedyName( utName() );

                                if( !short ) {
                                    return query.callback( {results: []} );
                                }

                                Y.doccirrus.jsonrpc.api.catalog.utItemSearch( {
                                    short: peek( self.catalogShort ),
                                    group: short,
                                    term: query.term
                                } ).done( function( results ) {
                                    var data = results.data || [];
                                    query.callback( {
                                        results: data.map( function( entry ) {
                                            return {
                                                id: entry.name,
                                                text: entry.name,
                                                _data: entry
                                            };
                                        } )
                                    } );
                                } );
                            },
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            }

                        }
                    };
                },
                getUtRemedyItemReadOnly: function UtilityEditorModel_getUtRemedyItemReadOnly( type ) {
                    var
                        self = this,
                        itemAttr = 'utRemedy' + type + 'Item',
                        nameAttr = 'utRemedy' + type + 'Name',
                        utItem = self[itemAttr],
                        utName = self[nameAttr];
                    return function() {
                        var
                            utRemedy1Name = unwrap( utName ),
                            utRemedy1ItemReadOnly = utItem.readOnly();
                        return utRemedy1ItemReadOnly || !Boolean( utRemedy1Name );
                    };
                }

            }, {
                NAME: 'UtilityEditorModel'
            }
        );

        KoViewModel.registerConstructor( UtilityEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedEditorModel',
            'dc-comctl',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'inCaseUtils'
        ]
    }
);
