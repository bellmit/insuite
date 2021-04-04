/**
 * User: do
 * Date: 17.10.18  17:19
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'InsuranceGroupModel', function( Y, NAME ) {
        /**
         * @module InsuranceGroupModel
         */

        var
            // DCError = Y.doccirrus.commonerrors.DCError,
            unwrap = ko.unwrap,
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class InsuranceGroupModel
         * @constructor
         * @extends KoViewModel
         */
        function InsuranceGroupModel( config ) {
            InsuranceGroupModel.superclass.constructor.call( this, config );
        }

        InsuranceGroupModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( InsuranceGroupModel, KoViewModel.getBase(), {

                initializer: function InsuranceGroupModel_initializer() {
                    var
                        self = this;
                    self.initInsuranceGroupModel();
                },
                destructor: function InsuranceGroupModel_destructor() {
                },
                initInsuranceGroupModel: function InsuranceGroupModel_initInsuranceGroupModel() {
                    var self = this;
                    self.items.disabled = ko.observable( true );
                    self.delayed = ko.observable( false );
                    self.addDisposable( ko.computed( function() {
                        self.delayed();
                        var saveBtnCol = self.getSaveBtnCol(),
                            isValid = self._isValid(),
                            isModified = self.isModified();

                        if( !saveBtnCol ) {
                            return;
                        }
                        saveBtnCol.inputCell.disabled( !isValid || !isModified );
                    } ) );

                    // workaround to get initial state right; find better way. getComponentCell is not working somehow for inputField cells
                    setTimeout( function() {
                        self.delayed( true );
                    }, 10 );
                },
                getSaveBtnCol: function() {
                    var
                        self = this,
                        saveBtnCol,
                        tableInstance = self.initialConfig.getTableInstance();
                    if( !tableInstance ) {
                        return;
                    }
                    unwrap( tableInstance.columns ).forEach( function( col ) {
                        if( col.forPropertyName === 'saveButton' ) {
                            saveBtnCol = col;
                        }
                    } );

                    return saveBtnCol;
                },
                save: function() {
                    var self = this,
                        rawData = self.toJSON();

                    return Promise.resolve( Y.doccirrus.jsonrpc.api.insurancegroup.save( {
                        data: rawData
                    } ) ).then( function( response ) {
                        var data = response && (Array.isArray( response.data ) ? response.data[0] : response.data);
                        if( data ) {
                            self.set( 'dataUnModified', data );
                            self.set( 'data', data );
                        } else {
                            Y.log( 'not data returned from save method', 'warn', NAME );
                        }
                    } );
                },
                remove: function() {
                    var self = this,
                        id = unwrap( self._id );
                    if( !id ) {
                        return Promise.resolve();
                    }
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.insurancegroup.delete( {
                        query: {_id: id}
                    } ) );
                }
            },
            {
                schemaName: 'insurancegroup',
                NAME: 'InsuranceGroupModel'
            }
        );
        KoViewModel.registerConstructor( InsuranceGroupModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'insurancegroup-schema',
            'dccommonerrors'
        ]
    }
);