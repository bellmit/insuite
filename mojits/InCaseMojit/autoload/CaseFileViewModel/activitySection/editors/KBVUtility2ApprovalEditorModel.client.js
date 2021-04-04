/**
 * User: do
 * Date: 13/07/16  09:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */

'use strict';

YUI.add( 'KBVUtility2ApprovalEditorModel', function( Y, NAME ) {
        /**
         * @module KBVUtility2ApprovalEditorModel
         */

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            KBVUtility2EditorModel = KoViewModel.getConstructor( 'KBVUtility2EditorModel' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        /**
         * @class KBVUtility2ApprovalEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function KBVUtility2ApprovalEditorModel( config ) {
            KBVUtility2ApprovalEditorModel.superclass.constructor.call( this, config );
        }

        KBVUtility2ApprovalEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [
                    'patientId',
                    'locationId',
                    'userContent',
                    'approvalValidTo',
                    'unlimitedApproval',
                    'insuranceId',
                    'ut2Chapter',
                    'utIcdCode',
                    'utIcdText',
                    'utSecondIcdCode',
                    'utSecondIcdText',
                    'ut2DiagnosisGroupCode',
                    'ut2DiagnosisGroupName',
                    'ut2Remedy1List',
                    'ut2Remedy2List',
                    'u_extra'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( KBVUtility2ApprovalEditorModel, SimpleActivityEditorModel, {
                initializer: function KBVUtility2ApprovalEditorModel_initializer() {
                    var
                        self = this;
                    self.initKBVUtility2ApprovalEditorModel();
                },
                destructor: function KBVUtility2ApprovalEditorModel_destructor() {
                },
                initKBVUtility2ApprovalEditorModel: function KBVUtility2ApprovalEditorModel_initKBVUtility2ApprovalEditorModel() {
                    var self = this,
                        binder = self.get( 'binder' );
                    self.placeholderDiagnosisI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.DIAGNOSIS' );
                    self.diagnosisByIndicationI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.DIAGNOSIS_BY_INDICATION' );
                    self.secondaryDiagnosisI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.SECONDARY_DIAGNOSIS' );
                    self.locationKV = ko.computed( function() {
                        var locationId = unwrap( self.locationId );
                        var location = (binder.getInitialData( 'location' ) || []).find( function( location ) {
                            return location._id === locationId;
                        } );
                        return location && location.kv;
                    } );

                    self.initValidTo();
                    self.initInsuranceId();
                    self.initDiagnosisCodes();
                    self.initDiagnosisGroup();
                    self.initRemedies();

                },
                initValidTo: function() {
                    var self = this;

                    self.unlimitedApproval.subscribe( function( val ) {
                        if( val ) {
                            self.approvalValidTo( null );
                        }
                    } );

                    self.approvalValidToReadOnly = ko.computed( function() {
                        return unwrap( self.unlimitedApproval ) || unwrap( self.approvalValidTo.readOnly );
                    } );

                },
                initInsuranceId: function() {

                },
                initDiagnosisCodes: function() {
                    var self = this,
                        binder = self.get( 'binder' ),
                        currentPatient = peek( binder.currentPatient );

                    self.utIcdCodeIsNew = false;
                    self.utSecondIcdCodeIsNew = false;
                    self.hasIcd2Need = false;
                    self.agreementCandidatesDisplay = '';

                    self.icdCode1CatalogSelect2 = KBVUtility2EditorModel.createUtilityIcdCodeAutoComplete( {
                        activity: self,
                        field: self.utIcdCode,
                        fieldText: self.utIcdText,
                        fieldRef: ko.observable(),
                        queryFn: KBVUtility2EditorModel.byCatalogQueryFn,
                        getCatalogCodeSearchParams: function() {
                            return {
                                itemsPerPage: 20,
                                query: {
                                    patientId: peek( self.patientId ),
                                    term: ''
                                }
                            };
                        }
                    } );

                    self.icdCode2CatalogSelect2 = KBVUtility2EditorModel.createUtilityIcdCodeAutoComplete( {
                        activity: self,
                        field: self.utSecondIcdCode,
                        fieldText: self.utSecondIcdText,
                        fieldRef: ko.observable(),
                        queryFn: KBVUtility2EditorModel.byCatalogQueryFn,
                        getCatalogCodeSearchParams: function() {
                            return {
                                itemsPerPage: 20,
                                query: {
                                    patientAge: peek( currentPatient.age ),
                                    diagnosisGroupCode: peek( self.ut2DiagnosisGroupCode ),
                                    kv: peek( self.locationKV ),
                                    patientId: peek( self.patientId ),
                                    icdCode: peek( self.utIcdCode ),
                                    term: ''
                                }
                            };
                        }
                    } );
                },
                initDiagnosisGroup: function() {
                    var self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = unwrap( binder.currentActivity ),
                        sdhm = currentActivity.get( 'sdhm' ) || [];

                    self.hasDiagnosisGroupNeed = false;
                    self.agreementCandidatesDisplay = '';

                    self.displayDiagnosisGroup = ko.computed( function() {
                        var elements = [self.ut2DiagnosisGroupCode(), self.ut2DiagnosisGroupName()].filter( Boolean );
                        if( !elements.length ) {
                            return unwrap( self.ut2DiagnosisGroupName.i18n );
                        }
                        return elements.filter( Boolean ).join( ' ' );
                    } );

                    self.diagnosisGroupSelect = KoComponentManager.createComponent( {
                        componentType: 'KoTableSelect',
                        componentConfig: {
                            options: ko.computed( function() {

                                return sdhm.map( function( entry ) {
                                    return JSON.parse( JSON.stringify( entry ) );
                                } );
                            } ),
                            multi: false,
                            val: ko.computed( {
                                read: function() {
                                    return self.ut2DiagnosisGroupCode();
                                },
                                write: function( entry ) {
                                    var ut2Chapter = peek( self.ut2Chapter ),
                                        chapterCode = !ut2Chapter && entry && entry.kapitel && KBVUtility2EditorModel.getChapterCodeByTitle( entry.kapitel );

                                    if( chapterCode ) {
                                        self.ut2Chapter( chapterCode );
                                    }
                                    self.ut2DiagnosisGroupCode( entry && entry.diagnosegruppe_value );
                                    self.ut2DiagnosisGroupName( entry && entry.diagnosegruppe_name );
                                    self.u_extra( entry );
                                }
                            } ),
                            optionsName: 'kbvutility-diagnosisgroup',
                            optionsValue: 'diagnosegruppe_value',
                            displayComponent: false,
                            editMode: !peek( self.ut2DiagnosisGroupCode ),
                            optionsColumns: [
                                {title: 'Code', propertyName: 'diagnosegruppe_value'},
                                {title: 'Name', propertyName: 'diagnosegruppe_name'},
                                {title: 'Hinweise', propertyName: 'hinweis_liste'}
                            ]
                        }
                    } );
                },
                initRemedies: function() {
                    var self = this,
                        binder = self.get( 'binder' ),
                        currentPatient = peek( binder.currentPatient ),
                        patientAge = currentPatient && peek( currentPatient.age ),
                        hasAge = _.isFinite( patientAge ),
                        currentActivity = unwrap( binder.currentActivity );

                    // get standardizedCombination if selected for alternate view
                    self.standardizedCombination = ko.computed( function() {
                        return unwrap( self.ut2Remedy1List ).find( function( entry ) {
                            return peek( entry.type ) === 'STANDARDIZED_COMBINATIONS_OF_REMEDIES';
                        } );
                    } );

                    self.addDisposable( ko.computed( function() {
                        var standardizedCombination = self.standardizedCombination(),
                            ut2Remedy1List = unwrap( self.ut2Remedy1List ),
                            ut2Remedy2List = unwrap( self.ut2Remedy2List ),
                            remedyNames;
                        if( standardizedCombination ) {
                            remedyNames = ut2Remedy1List.concat( ut2Remedy2List ).map( function( entry ) {
                                if( peek( entry.type ) === 'STANDARDIZED_COMBINATIONS_OF_REMEDIES' ) {
                                    return;
                                }
                                return peek( entry.name );
                            } ).filter( Boolean );

                            standardizedCombination.text( remedyNames.join( ';' ) );
                        }
                    } ) );

                    self.remedySelect = KoComponentManager.createComponent( {
                        componentType: 'KoTableSelect',
                        componentConfig: {
                            options: ko.computed( function() {
                                var u_extra = unwrap( self.u_extra ),
                                    options = [],
                                    heilmittelverordnung = u_extra && u_extra.heilmittelverordnung,
                                    vorrangiges_heilmittel_liste = heilmittelverordnung && heilmittelverordnung.vorrangiges_heilmittel_liste || [],
                                    ergaenzendes_heilmittel_liste = heilmittelverordnung && heilmittelverordnung.ergaenzendes_heilmittel_liste || [],
                                    standardisierte_heilmittel_kombination = heilmittelverordnung && heilmittelverordnung.standardisierte_heilmittel_kombination || [];

                                if( vorrangiges_heilmittel_liste.length ) {
                                    options.push( {type: 'heading', text: 'Vorrangiges Heilmittel'} );
                                }

                                vorrangiges_heilmittel_liste.filter( function( entry ) {
                                    var
                                        validPatientAge = true;

                                    if( hasAge && entry.mindestalter_jahre ) {
                                        validPatientAge = patientAge > entry.mindestalter_jahre;
                                    }

                                    if( hasAge && validPatientAge && entry.hoechstalter_jahre ) {
                                        validPatientAge = patientAge < entry.hoechstalter_jahre;
                                    }

                                    return validPatientAge;
                                } ).forEach( function( entry ) {
                                    entry.remedyType = 'PRIMARY_REMEDY';
                                    options.push( entry );
                                } );

                                if( ergaenzendes_heilmittel_liste.length ) {
                                    options.push( {type: 'heading', text: 'Ergänzendes Heilmittel'} );
                                }

                                ergaenzendes_heilmittel_liste.forEach( function( entry ) {
                                    entry.remedyType = 'COMPLEMENTARY_REMEDY';
                                    options.push( entry );
                                } );

                                if( standardisierte_heilmittel_kombination.length ) {
                                    options.push( {type: 'heading', text: 'Standardisierte Heilmittelkombinationen'} );
                                }

                                standardisierte_heilmittel_kombination.forEach( function( entry ) {
                                    entry.remedyType = 'STANDARDIZED_COMBINATIONS_OF_REMEDIES';
                                    options.push( entry );
                                } );

                                return options;
                            } ),
                            multi: true,
                            val: ko.computed( {
                                read: function() {
                                    var remedyList = self.ut2Remedy1List().concat( self.ut2Remedy2List() );
                                    return remedyList.map( function( utRemedy ) {
                                        return unwrap( utRemedy.name );
                                    } );
                                },
                                write: function( selectedEntries ) {
                                    var ut2Remedy1List = unwrap( self.ut2Remedy1List ),
                                        ut2Remedy2List = unwrap( self.ut2Remedy2List ),
                                        newUt2Remedy1List = [],
                                        newUt2Remedy2List = [];

                                    selectedEntries.filter( Boolean ).forEach( function( entry ) {
                                        var alreadySelected;
                                        switch( entry.remedyType ) {
                                            case 'PRIMARY_REMEDY':
                                            case 'STANDARDIZED_COMBINATIONS_OF_REMEDIES':
                                                alreadySelected = ut2Remedy1List.find( function( utRemedyEntry ) {
                                                    return unwrap( utRemedyEntry.name ) === entry.name;
                                                } );
                                                if( alreadySelected ) {
                                                    newUt2Remedy1List.push( alreadySelected );
                                                } else {
                                                    newUt2Remedy1List.push( {
                                                        name: entry.name,
                                                        type: entry.remedyType,
                                                        requiredConductionSymptom: entry.erforderliche_leitsymptomatik,
                                                        massage: entry.massagetechnik
                                                    } );
                                                }
                                                break;
                                            case 'COMPLEMENTARY_REMEDY':
                                                alreadySelected = ut2Remedy2List.find( function( utRemedyEntry ) {
                                                    return unwrap( utRemedyEntry.name ) === entry.name;
                                                } );
                                                if( alreadySelected ) {
                                                    newUt2Remedy2List.push( alreadySelected );
                                                } else {
                                                    newUt2Remedy2List.push( {
                                                        name: entry.name,
                                                        type: entry.remedyType,
                                                        requiredConductionSymptom: entry.erforderliche_leitsymptomatik,
                                                        massage: entry.massagetechnik
                                                    } );
                                                }
                                                break;
                                            default:
                                                Y.log( 'could not map selected remedy entry of type: ' + entry.remedyType, 'warn', NAME );
                                                return;
                                        }

                                    } );

                                    currentActivity.ut2Remedy1List( newUt2Remedy1List );
                                    currentActivity.ut2Remedy2List( newUt2Remedy2List );
                                }
                            } ),
                            editMode: false,
                            optionsName: 'kbvutility-heilmittel',
                            optionsValue: 'name',
                            displayComponent: false,
                            optionsColumns: [
                                {title: 'Name', propertyName: 'name'},
                                {title: 'Erforderliche Leitsymptomatik', propertyName: 'erforderliche_leitsymptomatik'}
                            ]
                        }
                    } );

                }
            }, {
                NAME: 'KBVUtility2ApprovalEditorModel'
            }
        );

        /**
         * @class KBVUtility2ApprovalConformModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function KBVUtility2ApprovalConformModel( config ) {
            KBVUtility2ApprovalConformModel.superclass.constructor.call( this, config );
        }

        KBVUtility2ApprovalConformModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( KBVUtility2ApprovalConformModel, KoViewModel.getBase(), {
                initializer: function KBVUtility2ApprovalConformModel_initializer() {
                    var self = this;

                    self.confirmIcd1 = ko.observable( Boolean( peek( self.utIcdCode ) ) );
                    self.confirmIcd2 = ko.observable( Boolean( peek( self.utSecondIcdCode ) ) );
                    self.confirmIcdDisabled = ko.computed( function() {
                        var length = [self.confirmIcd1, self.confirmIcd2].map( unwrap ).filter( Boolean ).length;
                        return length <= 1;
                    } );

                    self.displayDiagnosisGroup = ko.computed( function() {
                        var elements = [self.ut2DiagnosisGroupCode(), self.ut2DiagnosisGroupName()].filter( Boolean );
                        if( !elements.length ) {
                            return unwrap( self.ut2DiagnosisGroupName.i18n );
                        }
                        return elements.filter( Boolean ).join( ' ' );
                    } );

                    self.standardizedCombination = ko.computed( function() {
                        return unwrap( self.ut2Remedy1List ).find( function( entry ) {
                            return peek( entry.type ) === 'STANDARDIZED_COMBINATIONS_OF_REMEDIES';
                        } );
                    } );

                    self.unlimitedApproval.subscribe( function( val ) {
                        if( val ) {
                            self.approvalValidTo( null );
                        }
                    } );

                    self.approvalValidToReadOnly = ko.computed( function() {
                        return unwrap( self.unlimitedApproval ) || unwrap( self.approvalValidTo.readOnly );
                    } );

                },
                destructor: function KBVUtility2ApprovalConformModel_destructor() {
                }
            },
            {
                schemaName: 'v_kbvutility2approval',
                NAME: 'KBVUtility2ApprovalConformModel'
            }
        );

        KBVUtility2ApprovalEditorModel.showModal = function( config ) {
            return Promise.all( [
                Y.doccirrus.jsonrpc.api.jade.renderFile( {path: 'InCaseMojit/views/CaseFileViewModel/activitySection/editors/KBVUtility2/approvalConfirm'} )
            ] ).then( function( response ) {
                return {template: response[0].data};
            } ).then( function( data ) {
                var
                    template = data.template,
                    modal,
                    bodyContent = Y.Node.create( template ),
                    viewModel = new KBVUtility2ApprovalConformModel( {
                        data: config.data
                    } );

                return new Promise( function( resolve, reject ) {
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-KBVUtility2ApprovalEditorModel',
                        bodyContent: bodyContent,
                        title: 'Genehmigung erstellen',
                        icon: Y.doccirrus.DCWindow.ICON_INFO,
                        height: "90%",
                        width: "90%",
                        centered: true,
                        focusOn: [],
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    label: i18n( 'general.button.SAVE' ),
                                    isDefault: true,
                                    action: function() {
                                        var approvalData = viewModel.toJSON();
                                        if( !peek( viewModel.confirmIcd1 ) ) {
                                            approvalData.utIcdCode = null;
                                            approvalData.utIcdText = null;
                                            approvalData.utIcdRef = null;
                                        }

                                        if( !peek( viewModel.confirmIcd2 ) ) {
                                            approvalData.utSecondIcdCode = null;
                                            approvalData.utSecondIcdText = null;
                                            approvalData.utSecondIcdRef = null;
                                        }

                                        modal.close();

                                        Promise.resolve( Y.doccirrus.jsonrpc.api.activity.create( {
                                            data: approvalData
                                        } ) )
                                            .then( resolve )
                                            .catch( reject );
                                    }
                                } )
                            ]
                        }
                    } );

                    viewModel.addDisposable( ko.computed( function() {
                        var
                            isModelValid = viewModel.isValid(),
                            okBtn = modal.getButton( 'SAVE' ).button;
                        if( isModelValid ) {
                            okBtn.enable();
                        } else {
                            okBtn.disable();
                        }
                    } ) );

                    ko.applyBindings( viewModel, bodyContent.getDOMNode() );
                } );

            } );
        };

        KoViewModel.registerConstructor( KBVUtility2ApprovalEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dc-comctl',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'inCaseUtils',
            'DCSystemMessages',
            'KoTableSelect',
            'v_kbvutility2approval-schema',
            'KBVUtility2EditorModel'
        ]
    }
);
