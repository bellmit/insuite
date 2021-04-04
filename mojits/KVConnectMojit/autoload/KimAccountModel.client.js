/**
 * User: florian
 * Date: 17.12.20  17:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, nomen:true*/
/*global YUI ko*/

'use strict';

YUI.add( 'KimAccountModel', function( Y, NAME ) {

        /**
         * @module KimAccountModel
         */

        var
            peek = ko.utils.peekObservable,
            KoViewModel = Y.doccirrus.KoViewModel;

        function KimAccountModel( config ) {
            KimAccountModel.superclass.constructor.call( this, config );
        }

        KimAccountModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( KimAccountModel, KoViewModel.getBase(), {
                initializer: function KimAccountModel_initializer() {
                    var
                        self = this;
                    Y.log( 'KimAccountModel_initalizer ' + self, 'info', NAME );
                },
                /**
                 * Makes the api-call to remove KIM account from the database collection.
                 * @returns Promise
                 */
                removeAccountFromCollection: function() {
                    var self = this,
                        kimUsername = peek( self.kimUsername );
                    if( !kimUsername ) {
                        return Promise.resolve();
                    }
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.kimaccount.deleteKimAccount( {
                        query: {
                            kimUsername: kimUsername
                        }
                    } ) );
                },
                destructor: function KvcAccountModel_destructor() {
                    var
                        self = this;
                    Y.log( 'KimAccountModel_destructor ' + self, 'info', NAME );
                }
            },
            {
                schemaName: 'kimaccount',
                NAME: 'KimAccountModel'
            } );

        KoViewModel.registerConstructor( KimAccountModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'kimaccount-schema'
        ]
    }
);