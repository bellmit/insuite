/**
 * User: dcdev
 * Date: 12/3/19  12:48 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'AMTSScheinModel', function( Y ) {
        /**
         * @module AMTSScheinModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap;

        /**
         * @abstract
         * @class AMTSScheinModel
         * @constructor
         * @extends ScheinModel
         */
        function AMTSScheinModel( config ) {
            AMTSScheinModel.superclass.constructor.call( this, config );
        }

        AMTSScheinModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( AMTSScheinModel, KoViewModel.getConstructor( 'ScheinModel' ), {

                initializer: function AMTSScheinModel_initializer() {
                    var
                        self = this;
                    self.initAMTSScheinModel();
                },
                destructor: function AMTSScheinModel_destructor() {
                },
                initAMTSScheinModel: function AMTSScheinModel_initAMTSScheinModel() {
                },
                isValid: function() {
                    var
                        amtsStatus = unwrap( this.amtsStatus ),
                        _isValid = unwrap( this._isValid );

                    return _isValid && amtsStatus >= 1700; // 1700 CASECLOSED
                },
                isModified: function() {
                    /**
                     * Return false as all operations inside sol save everything to contract
                     */
                    return false;
                }
            },
            {
                schemaName: 'v_amts_schein',
                NAME: 'AMTSScheinModel'
            }
        );
        KoViewModel.registerConstructor( AMTSScheinModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ScheinModel',
            'v_amts_schein-schema'
        ]
    }
)
;