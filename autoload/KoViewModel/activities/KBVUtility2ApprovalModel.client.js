/**
 * User: do
 * Date: 13/07/16  09:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'KBVUtility2ApprovalModel', function( Y/*, NAME */ ) {
        /**
         * @module KBVUtility2ApprovalModel
         */
        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' );

        /**
         * @class KBVUtility2ApprovalModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function KBVUtility2ApprovalModel( config ) {
            KBVUtility2ApprovalModel.superclass.constructor.call( this, config );
        }

        KBVUtility2ApprovalModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            sdhm: {
                value: false,
                lazyAdd: false
            },
            ignoreModificationsOn: {
                value: [
                    'editor',
                    'u_extra',
                    'attachedMedia',
                    'content',
                    'userContent',
                    'status',
                    'catalogRef',
                    'utIcdRef',
                    'utSecondIcdRef'
                ],
                cloneDefaultValue: true,
                lazyAdd: false
            }
        };

        Y.extend( KBVUtility2ApprovalModel, SimpleActivityModel, {

                initializer: function KBVUtility2ApprovalModel_initializer() {
                    var self = this,
                        binder = self.get( 'binder' );


                    self.addDisposable( ko.computed( function() {
                        var currentPatient = unwrap( binder.currentPatient ),
                            currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                            currentCaseFolderType = currentCaseFolder && currentCaseFolder.type;

                        if( self.isNew() && currentCaseFolderType && !peek( self.insuranceId ) && currentPatient ) {
                            unwrap( currentPatient.insuranceStatus ).some( function( insurance ) {
                                if( unwrap( insurance.type ) === currentCaseFolderType ) {
                                    self.insuranceId( unwrap( insurance.insuranceId ) );
                                    return true;
                                }
                            } );
                        }

                    } ) );

                },
                destructor: function KBVUtility2ApprovalModel_destructor() {
                }
            },
            {
                schemaName: 'v_kbvutility2approval',
                NAME: 'KBVUtility2ApprovalModel'
            }
        );

        KoViewModel.registerConstructor( KBVUtility2ApprovalModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dcregexp',
            'FormBasedActivityModel',
            'activity-api'
        ]
    }
);