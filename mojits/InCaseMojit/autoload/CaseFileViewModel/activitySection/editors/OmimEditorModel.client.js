/**
 * User: do
 * Date: 17/03/17  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery */

'use strict';

YUI.add( 'OmimEditorModel', function( Y/*, NAME*/ ) {
        /**
         * @module OmimEditorModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' ),
            i18n = Y.doccirrus.i18n,
            peek = ko.utils.peekObservable;

        /**
         * @class OmimEditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function OmimEditorModel( config ) {
            OmimEditorModel.superclass.constructor.call( this, config );
        }

        OmimEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'fk5070',
                    'fk5070ValidAt',
                    'fk5071',
                    'fk5071ValidAt',
                    'fk5072',
                    'fk5073'
                ],
                lazyAdd: false
            }
        };

        Y.extend( OmimEditorModel, SubEditorModel, {

                initializer: function Fk4244EditorModel_initializer() {
                    var
                        self = this,
                        replacementValue = '999999';

                    self._fk5070CfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    fk5070 = self.fk5070();

                                if( fk5070 ) {
                                    return {id: fk5070, text: fk5070};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.fk5070( $event.val );
                            }
                        } ) ),
                        placeholder: ko.observable( i18n( 'InCaseMojit.casefile_detail.placeholder.FK5070' ) ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            query: Y.doccirrus.utils.debounceSelect2Query( function( query ) {

                                function done( response ) {
                                    var
                                        results = response && response.data || [];

                                    query.callback( {
                                        results: results.map( function( item ) {
                                            return {id: item.omimG, text: item.omimG, _data: item};
                                        } )
                                    } );
                                }

                                Y.doccirrus.jsonrpc.api.catalog.searchOmimCatalog( {
                                    itemsPerPage: 10,
                                    term: query.term,
                                    type: 'g'
                                } )
                                    .done( done )
                                    .fail( function() {
                                        done();
                                    } );

                            }, 750 )
                        },
                        init: function( element ) {
                            var
                                $element = jQuery( element );

                            $element.on( 'select2-selected', function( $event ) {
                                var
                                    choiceData = $event.choice._data,
                                    isReplacementValue = replacementValue === choiceData.omimG;

                                if( !isReplacementValue && choiceData.genName ) {
                                    self.fk5072( choiceData.genName );
                                }
                                if( isReplacementValue ) {
                                    self.showWarning( '18011' );
                                }
                            } );
                        }
                    };

                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._fk5072CfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    fk5072 = self.fk5072();

                                if( fk5072 ) {
                                    return {id: fk5072, text: fk5072};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.fk5072( $event.val );
                            }
                        } ) ),
                        placeholder: ko.observable( i18n( 'InCaseMojit.casefile_detail.placeholder.FK5072' ) ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            createSearchChoice: function( term ) { return { id: term, text: term }; },
                            query: Y.doccirrus.utils.debounceSelect2Query( function( query ) {

                                function done( response ) {
                                    var
                                        results = response && response.data || [];

                                    if( 0 === results.length ) {
                                        results.push( {genName: query.term} );
                                    }

                                    query.callback( {
                                        results: results.map( function( item ) {
                                            return {id: item.genName, text: item.genName, _data: item};
                                        } )
                                    } );
                                }

                                Y.doccirrus.jsonrpc.api.catalog.searchOmimCatalog( {
                                    itemsPerPage: 10,
                                    term: query.term,
                                    type: 'n'
                                } )
                                    .done( done )
                                    .fail( function() {
                                        done();
                                    } );

                            }, 750 )
                        }
                    };

                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._fk5071CfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    fk5071 = self.fk5071();

                                if( fk5071 ) {
                                    return {id: fk5071, text: fk5071};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.fk5071( $event.val );
                            }
                        } ) ),
                        placeholder: ko.observable( i18n( 'InCaseMojit.casefile_detail.placeholder.FK5071' ) ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            query: Y.doccirrus.utils.debounceSelect2Query( function( query ) {

                                function done( response ) {
                                    var
                                        results = response && response.data || [];

                                    query.callback( {
                                        results: results.map( function( item ) {
                                            return {id: item.omimP, text: item.omimP, _data: item};
                                        } )
                                    } );
                                }

                                Y.doccirrus.jsonrpc.api.catalog.searchOmimCatalog( {
                                    itemsPerPage: 10,
                                    term: query.term,
                                    type: 'p'
                                } )
                                    .done( done )
                                    .fail( function() {
                                        done();
                                    } );

                            }, 750 )
                        },
                        init: function( element ) {
                            var
                                $element = jQuery( element );

                            $element.on( 'select2-selected', function( $event ) {
                                var
                                    choiceData = $event.choice._data,
                                    isReplacementValue = replacementValue === choiceData.omimP;

                                if( replacementValue !== choiceData.omimP && choiceData.desc ) {
                                    self.fk5073( choiceData.desc );
                                }

                                if( isReplacementValue ) {
                                    self.showWarning( '18012' );
                                }
                            } );
                        }
                    };

                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._fk5073CfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    fk5073 = self.fk5073();

                                if( fk5073 ) {
                                    return {id: fk5073, text: fk5073};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.fk5073( $event.val );
                            }
                        } ) ),
                        placeholder: ko.observable( i18n( 'InCaseMojit.casefile_detail.placeholder.FK5073' ) ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            createSearchChoice: function( term ) { return { id: term, text: term }; },
                            query: Y.doccirrus.utils.debounceSelect2Query( function( query ) {

                                function done( response ) {
                                    var
                                        results = response && response.data || [];

                                    if( 0 === results.length ) {
                                        results.push( {desc: query.term} );
                                    }

                                    query.callback( {
                                        results: results.map( function( item ) {
                                            return {id: item.desc, text: item.desc, _data: item};
                                        } )
                                    } );
                                }

                                Y.doccirrus.jsonrpc.api.catalog.searchOmimCatalog( {
                                    itemsPerPage: 10,
                                    term: query.term,
                                    type: 'd'
                                } )
                                    .done( done )
                                    .fail( function() {
                                        done();
                                    } );

                            }, 750 )
                        }
                    };

                    self.addDisposable( ko.computed( function() {
                        var
                            _currentActivity = self.get( 'editorModelParent' ),
                            noOmimGCodeAllowed = _currentActivity && _currentActivity.noOmimGCodeAllowed();

                        if( noOmimGCodeAllowed ) {
                            self.fk5070( '' );
                            self.fk5072( '' );
                        }

                    } ) );

                    self.fk5070ReadOnly = ko.computed( function() {
                        var fieldRo = self.fk5070.readOnly(),
                            _currentActivity = self.get( 'editorModelParent' ),
                            noOmimGCodeAllowed = _currentActivity && _currentActivity.noOmimGCodeAllowed();

                        return noOmimGCodeAllowed || fieldRo;
                    } );

                    self.fk5072ReadOnly = ko.computed( function() {
                        var fieldRo = self.fk5072.readOnly(),
                            fk5070 = self.fk5070(),
                            _currentActivity = self.get( 'editorModelParent' ),
                            noOmimGCodeAllowed = _currentActivity && _currentActivity.noOmimGCodeAllowed(),
                            isReplacementValue = replacementValue === fk5070;

                        return noOmimGCodeAllowed || fieldRo || (fk5070 && !isReplacementValue);
                    } );

                    self.fk5073ReadOnly = ko.computed( function() {
                        var fieldRo = self.fk5073.readOnly(),
                            fk5071 = self.fk5071(),
                            isReplacementValue = replacementValue === fk5071;
                        return fieldRo || (fk5071 && !isReplacementValue);
                    } );

                    self.addDisposable( ko.computed( function() {
                        self.fk5070();
                        self.fk5072.validate();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        self.fk5071();
                        self.fk5073.validate();
                    } ) );

                },
                showWarning: function( code ) {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'editorModelParent' ) ),
                        message = Y.doccirrus.errorTable.getMessages( {code: code} ),
                        messageId = peek( currentActivity._id ) + '_omim_' + code;

                    Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        content: message,
                        messageId: messageId,
                        level: 'WARNING'
                    } );
                },
                destructor: function Fk4244EditorModel_destructor() {
                }

            },
            {
                NAME: 'OmimEditorModel'
            }
        );
        KoViewModel.registerConstructor( OmimEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SubEditorModel',
            'activity-schema',
            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    }
);
