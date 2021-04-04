/**
 * User: pi
 * Date: 07/03/17  13:30
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */
'use strict';
YUI.add( 'MirrorCalendarModel', function( Y /*, NAME */ ) {

        /**
         * @module MirrorCalendarModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class MirrorCalendarModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */
        function MirrorCalendarModel( config ) {
            MirrorCalendarModel.superclass.constructor.call( this, config );
        }

        MirrorCalendarModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( MirrorCalendarModel, KoViewModel.getBase(), {

            initializer: function MirrorCalendarModel_initializer( config ) {
                var
                    self = this;

                self.initMirrorCalendarModel( config && config.data );
            },
            destructor: function MirrorCalendarModel_destructor() {
            },
            initMirrorCalendarModel: function MirrorCalendarModel_initMirrorCalendarModel() {

            },
            save: function() {
                var
                    self = this,
                    data = self.toJSON();
                self.pending( false );
                return Promise.resolve( Y.doccirrus.jsonrpc.api.role.update( {
                    query: {
                        _id: data._id
                    },
                    data: data
                } ) );
            }
        }, {
            schemaName: 'mirrorcalendar',
            NAME: 'MirrorCalendarModel'
        } );

        KoViewModel.registerConstructor( MirrorCalendarModel );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'mirrorcalendar-schema'
        ]
    }
);