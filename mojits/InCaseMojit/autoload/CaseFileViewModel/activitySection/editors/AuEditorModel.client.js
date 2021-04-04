/**
 * User: pi
 * Date: 21/01/16  10:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'AuEditorModel', function( Y ) {
        /**
         * @module AuEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n;

        /**
         * @class AuEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function AuEditorModel( config ) {
            AuEditorModel.superclass.constructor.call( this, config );
        }

        AuEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'arbeitsunfall',
                    'folgeBesc',
                    'erstBesch',
                    'durchgangsarzt',
                    'auVon',
                    'auVorraussichtlichBis',
                    'festgestelltAm',
                    'diagnosesAdd',
                    'sonstigerUnf',
                    'bvg',
                    'rehab',
                    'reintegration',
                    'massnahmen',
                    'krankengeld',
                    'endBesch'
                ],
                lazyAdd: false
            }
        };

        Y.extend( AuEditorModel, ActivityEditorModel, {
                initializer: function AuEditorModel_initializer() {
                    var
                        self = this;
                    self.initAuEditorModel();

                },
                destructor: function AuEditorModel_destructor() {
                },
                /**
                 * Initializes assistive editor model
                 * @method initAuEditorModel
                 */
                initAuEditorModel: function AuEditorModel_initAuEditorModel() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );

                    self.bgvI18n = i18n( 'activity-schema.AU_T.bvg.i18n' );
                    self.massnahmenHeadI18n = i18n( 'activity-schema.AU_T.massnahmen.head' );
                    self.krankengeldHeadI18n = i18n( 'activity-schema.AU_T.krankengeld.head' );

                    Y.doccirrus.inCaseUtils.injectPopulatedObjs.call( self,  {
                        dataModel: currentActivity,
                        fields: ['icdsObj']
                    } );

                    self.isNew = ko.computed( function() {
                        return currentActivity.isNew();
                    } );
                    self._bescheid = ko.computed( {
                        read: function() {
                            if( self.folgeBesc() ) {
                                return 'folgeBesc';
                            } else {
                                return 'erstBesch';
                            }
                        },
                        write: function( val ) {
                            if( 'folgeBesc' === val ) {
                                self.erstBesch( false );
                                self.folgeBesc( true );
                            } else if( 'erstBesch' === val ) {
                                self.erstBesch( true );
                                self.folgeBesc( false );
                            } else {
                                self.erstBesch( false );
                                self.folgeBesc( false );
                            }
                        }
                    } );
                    self.folgeBesc.subscribe( function() {
                        // trigger revalidation
                        self.auVon.validate();
                    } );
                    self._displayDiagnoses = ko.computed( function() {
                        var text = '',
                            icds = unwrap( self.icdsObj ),
                            len = icds.length,
                            diagnosisCert,
                            diagnosisSite;
                        icds.forEach( function( icd, index ) {
                            diagnosisCert = Y.doccirrus.kbvcommonutils.mapDiagnosisCert( icd.diagnosisCert );
                            diagnosisSite = icd.diagnosisSite ? icd.diagnosisSite[0] : '';
                            text += icd.code + ' ' + (diagnosisCert ? ( diagnosisCert + ' ') : '') + (diagnosisCert ? ( diagnosisSite + ' ') : '') + (icd.content + ((index === len - 1) ? '' : '\n'));
                        } );
                        return text;
                    } );
                }
            }, {
                NAME: 'AuEditorModel'
            }
        );

        KoViewModel.registerConstructor( AuEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'dckbvutils',
            'inCaseUtils'
        ]
    }
);
