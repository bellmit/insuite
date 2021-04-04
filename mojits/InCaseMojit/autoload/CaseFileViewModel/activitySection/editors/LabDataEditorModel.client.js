/**
 * User: pi
 * Date: 22/01/16  11:15
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */

'use strict';

YUI.add( 'LabDataEditorModel', function( Y ) {
        /**
         * @module LabDataEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            KoEditableTable = KoComponentManager.registeredComponent( 'KoEditableTable' ),
            i18n = Y.doccirrus.i18n,
            lodash = _;

        function LabTestModel( config ) {
            LabTestModel.superclass.constructor.call( this, config );
        }

        Y.extend( LabTestModel, KoViewModel.getBase(), {
            initializer: function LabDataEditorModel_initializer() {
                var
                    self = this;
                self.initLabTestModel();

            },
            destructor: function LabDataEditorModel_destructor() {
            },
            initLabTestModel: function() {
                var
                    self = this;
                self.headMap = self.get( 'defaultLabTestTypes' ).reduce( function( obj, item ) {
                    var
                        _item = lodash.assign( {}, item );
                    delete _item._id;
                    obj[ _item.head ] = _item;
                    return obj;
                }, {} );
                self.initObservables();
            },
            setDefaultValues: function( data ) {
                this.set( 'data', data );
            },
            initObservables: function() {
                var
                    self = this,
                    headMap = self.headMap;
                self.addDisposable( self.head.subscribe( function( newValue ) {
                    if( newValue && headMap[ newValue ] ) {
                        self.setDefaultValues( headMap[ newValue ] );
                    }
                } ) );
                self.displaySampleTestNotes = ko.computed( {
                    read: function() {
                        var
                            sampleTestNotes = unwrap( self.sampleTestNotes );
                        return sampleTestNotes.join( ', \n' );
                    },
                    write: function( value ) {
                        if( !value ) {
                            self.sampleTestNotes.removeAll();
                        } else {
                            self.sampleTestNotes( [ value ] );
                        }
                    }
                } );
                self.displaySampleResultText = ko.computed( {
                    read: function() {
                        var
                            sampleResultText = unwrap( self.sampleResultText );
                        return sampleResultText.join( ', \n' );
                    },
                    write: function( value ) {
                        if( !value ) {
                            self.sampleResultText.removeAll();
                        } else {
                            self.sampleResultText( [ value ] );
                        }
                    }
                } );
                self.displaySampleResultText.hasError = self.sampleResultText.hasError;
                self.displaySampleResultText.validationMessages = self.sampleResultText.validationMessages;
                self.displaySampleResultText.i18n = self.sampleResultText.i18n;

                self.displaySampleNormalValueText = ko.computed( {
                    read: function() {
                        var
                            sampleNormalValueText = unwrap( self.sampleNormalValueText ),
                            result = sampleNormalValueText.join( ', \n' ),
                            minMax = result.split( '-' ),
                            min,
                            max;
                        if( 1 === sampleNormalValueText.length && minMax && 1 < minMax.length ) {
                            min = parseFloat( (minMax[ 0 ] || '').trim() ) || '';
                            max = parseFloat( (minMax[ 1 ] || '').trim() ) || '';
                            return Y.doccirrus.comctl.numberToLocalString( min, { intWithoutDec: true } ) + '-' + Y.doccirrus.comctl.numberToLocalString( max, { intWithoutDec: true } );
                        } else {
                            return result;
                        }
                    },
                    write: function( value ) {
                        var
                            minMax = value.split( '-' ),
                            min,
                            max,
                            result = value;
                        if( minMax && 1 < minMax.length ) {
                            min = Y.doccirrus.comctl.stringToNumber( minMax[ 0 ] );
                            max = Y.doccirrus.comctl.stringToNumber( minMax[ 1 ] );
                            result = min + '-' + max;
                        }
                        self.sampleNormalValueText( [ result ] );
                    }
                } );

                self.displayTestResultVal = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.testResultVal, { allowEmpty:true, intWithoutDec: true } ) );
                self.displayTestResultVal.hasError = self.testResultVal.hasError;
                self.displayTestResultVal.validationMessages = self.testResultVal.validationMessages;
                self.displayTestResultVal.i18n = self.testResultVal.i18n;
            }
        }, {
            ATTRS: {
                validatable: {
                    value: true,
                    lazyAdd: false
                },
                defaultLabTestTypes: {
                    value: [],
                    lazyAdd: false
                }
            },
            schemaName: 'labtest',
            NAME: 'LabTestModel'
        } );

        /**
         * @class LabDataEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function LabDataEditorModel( config ) {
            LabDataEditorModel.superclass.constructor.call( this, config );
        }

        LabDataEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [
                    'userContent',
                    'labText',
                    'l_extra'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( LabDataEditorModel, SimpleActivityEditorModel, {
                initializer: function LabDataEditorModel_initializer() {
                    var
                        self = this;
                    self.initLabDataEditorModel();
                },
                destructor: function LabDataEditorModel_destructor() {
                },
                /**
                 * Initializes assistive editor model
                 * @method initLabDataEditorModel
                 */
                initLabDataEditorModel: function LabDataEditorModel_initLabDataEditorModel() {
                    var
                        self = this;
                    self.showTable = !peek( self.labText );
                    if( self.showTable ) {
                        self.initTestsEditableTable();
                    }
                },
                getTestsData: function() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        l_extra_temp = currentActivity.l_extra_temp || [],
                        l_extra = peek( self.l_extra );
                    if( currentActivity.isNew() ) {
                        return l_extra_temp;
                    }
                    if( l_extra_temp.length ) {
                        return l_extra_temp;
                    }
                    return l_extra && l_extra.testId && l_extra.testId.map( function( item ) {
                            var
                                result = lodash.assign( {}, item );
                            result._id = '_id';
                            return { data: result };
                        } );
                },
                initTestsEditableTable: function LabDataEditorModel_initTestsEditableTable() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        defaultLabTestTypes = currentActivity.get( 'defaultLabTestTypes' ),
                        testsData = self.getTestsData();

                    self.testsEditableTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        stateId: 'LabDataEditorModel-testsEditableTable',
                        componentConfig: {
                            ViewModel: LabTestModel,
                            defaultViewModelData: {
                                data: {},
                                defaultLabTestTypes: currentActivity.get( 'defaultLabTestTypes' )
                            },
                            data: testsData,
                            columns: [
                                {
                                    forPropertyName: 'head',
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            useSelect2Data: true,
                                            select2Read: function( item ) {
                                                if( !item ) {
                                                    return null;
                                                }
                                                return { id: item, text: item };
                                            },
                                            select2Config: {
                                                query: undefined,
                                                initSelection: undefined,
                                                data: defaultLabTestTypes.map( function( item ) {
                                                    return { id: item.head, text: item.head };
                                                } ),
                                                createSearchChoice: function( item ) {
                                                    return {
                                                        id: item,
                                                        text: item
                                                    };
                                                },
                                                multiple: false
                                            }
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'testLabel'
                                },
                                {
                                    forPropertyName: 'sampleId',
                                    visible: false
                                },
                                {
                                    forPropertyName: 'displayTestResultVal',
                                    label: i18n('labtest-schema.LabTest_T.testResultVal.i18n'),
                                    title: i18n('labtest-schema.LabTest_T.testResultVal.i18n')
                                },
                                {
                                    forPropertyName: 'displaySampleResultText',
                                    label: i18n('labtest-schema.LabTest_T.sampleResultText.i18n'),
                                    title: i18n('labtest-schema.LabTest_T.sampleResultText.i18n')
                                },
                                {
                                    forPropertyName: 'TestResultUnit'
                                },
                                {
                                    forPropertyName: 'displaySampleTestNotes',
                                    label: i18n('labtest-schema.LabTest_T.sampleTestNotes.i18n'),
                                    title: i18n('labtest-schema.LabTest_T.sampleTestNotes.i18n'),
                                    visible: false
                                },
                                {
                                    forPropertyName: 'displaySampleNormalValueText',
                                    label: i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n'),
                                    title: i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n')
                                },
                                {
                                    forPropertyName: 'testResultLimitIndicator',
                                    visible: false
                                },
                                {
                                    forPropertyName: 'deleteButton',
                                    utilityColumn: true,
                                    width: '60px',
                                    css: {
                                        'text-center': 1
                                    },
                                    inputField: {
                                        componentType: 'KoButton',
                                        componentConfig: {
                                            name: 'delete',
                                            title: i18n( 'general.button.DELETE' ),
                                            icon: 'TRASH_O',
                                            disabled: ko.computed( function() {
                                                return unwrap( currentActivity._isModelReadOnly );
                                            } ),
                                            click: function( button, $event, $context ) {
                                                var
                                                    rowModel = $context.$parent.row;
                                                self.testsEditableTable.removeRow( rowModel );
                                            }
                                        }
                                    }
                                }
                            ],
                            isAddRowButtonDisabled: function(){
                                return unwrap( currentActivity._isModelReadOnly );
                            }
                        }
                    } );

                    self.addDisposable( ko.computed( function() {
                        var
                            rows = unwrap( self.testsEditableTable.rows );
                        currentActivity.isTestsDataValid( rows.every( function( rowModel ) {
                            return rowModel.isValid();
                        } ) );
                    } ) );
                    self.addDisposable( ko.computed( function() {
                        var
                            rows = unwrap( self.testsEditableTable.rows ),
                            l_extra = unwrap( self.l_extra ),
                            testsDataLength = unwrap( l_extra && l_extra.testId && l_extra.testId.length || 0 ),
                            isArrayLengthChanged = testsDataLength !== rows.length;
                        currentActivity.l_extra_temp = rows;
                        currentActivity.isTestsDataModified( rows.some( function( rowModel ) {
                            return rowModel.isModified() || rowModel.isNew();
                        } ) || isArrayLengthChanged );
                    } ) );

                    currentActivity.testsData = self.testsEditableTable.rows;

                    self.testsEditableTable.rendered.subscribe( function( val ) {
                        if( true === val ) {
                            KoEditableTable.tableNavigation( document.querySelector( '#testsEditableTable' ) );
                        }
                    } );
                }
            }, {
                NAME: 'LabDataEditorModel'
            }
        );

        KoViewModel.registerConstructor( LabDataEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'KoEditableTable',
            'KoUI-all',
            'SimpleActivityEditorModel',
            'labtest-schema',
            'dc-comctl'
        ]
    }
);
