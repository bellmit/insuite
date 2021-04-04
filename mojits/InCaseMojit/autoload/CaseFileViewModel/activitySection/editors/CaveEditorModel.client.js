/**
 * User: pi
 * Date: 05/08/16  13:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'CaveEditorModel', function( Y ) {
        /**
         * @module CaveEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' );

        /**
         * @class CaveEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function CaveEditorModel( config ) {
            CaveEditorModel.superclass.constructor.call( this, config );
        }

        CaveEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( ['severity'] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( CaveEditorModel, SimpleActivityEditorModel, {
                initializer: function CaveEditorModel_initializer() {
                    var
                        self = this;
                    self.initCaveEditorModel();

                },
                destructor: function CaveEditorModel_destructor() {
                },
                initCaveEditorModel: function CaveEditorModel_initCaveEditorModel() {
                    var
                        self = this,
                        severityList = [],
                        binder = self.get( 'binder' ),
                        severityMap = binder.getInitialData( 'severityMap' );
                    if( severityMap ) {
                        Object.keys( severityMap ).forEach( function( severity ) {
                            severityList.push( severityMap[severity] );
                        } );
                    }

                    self.severityOptions = ko.observableArray( severityList );
                    self.setSeverity = function( data ) {
                        self.severity( data.severity );
                    };
                    self.textColor = ko.computed( function() {
                        var
                            severity = unwrap( self.severity ),
                            color = '';
                        if( severity && severityMap ) {
                            color = severityMap[severity] && severityMap[severity].color || color;
                        }
                        return color;
                    } );
                }
            }, {
                NAME: 'CaveEditorModel'
            }
        );
        KoViewModel.registerConstructor( CaveEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel'
        ]
    }
)
;
