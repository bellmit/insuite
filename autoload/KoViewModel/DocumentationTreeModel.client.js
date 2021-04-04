/*global YUI, ko, $ */

'use strict';

YUI.add( 'DocumentationTreeModel', function( Y ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

    function DocumentationTreeModel( config ) {
        DocumentationTreeModel.superclass.constructor.call( this, config );
    }

    Y.extend( DocumentationTreeModel, KoViewModel.getBase(), {
        initializer: function() {
            var
                self = this,
                tree = self.get( 'data' );

            self.entries = tree.entries || [];
            self.actType = tree.actType;
            self._buttons = ko.observableArray( null );
            self._breadcrumbs = ko.observableArray( null );
            self._breadcrumbString = ko.observable( '' );

            self.navigationI18n = i18n('IncaseAdminMojit.edit_documentation_tree.group.NAVIGATION');
            self.newEntryBelowI18n = i18n('IncaseAdminMojit.edit_documentation_tree.title_attribute.NEW_ENTRY_BELOW');
            self.goLevelUpI18n = i18n('IncaseAdminMojit.edit_documentation_tree.title_attribute.GO_LEVEL_UP');
            self.goToTopLevelI18n = i18n('IncaseAdminMojit.edit_documentation_tree.title_attribute.GO_TO_TOP_LEVEL');
            self.clickTitleI18n = i18n('IncaseAdminMojit.edit_documentation_tree.title_attribute.CLICK');
            self.deleteEntryI18n = i18n('IncaseAdminMojit.edit_documentation_tree.title_attribute.DELETE_ENTRY');
            self.textBlockI18n = i18n('IncaseAdminMojit.edit_documentation_tree.group.TEXT_BLOCK');
            self.entryTextI18n = i18n('IncaseAdminMojit.edit_documentation_tree.placeholder.ENTRY_TEXT');
            self.checkedI18n = i18n('IncaseAdminMojit.edit_documentation_tree.title_attribute.CHECKED');

            //path = array of button indices
            self._path = [];

            self.createButtonAtPath = function( index ) {
                var button = {
                    text: ko.observable( '' ),
                    isDocumentationNode: ko.observable( true ),
                    children: []
                };

                var array = self.getEntriesAtPath();

                if( array === null ) {
                    array = [];
                }

                array.splice( index, 0, button );
                self._buttons( self.getEntriesAtPath() );
            };

            self.removeButtonAtPath = function( index ) {
                self.getEntriesAtPath().splice( index, 1 );
                self._buttons( self.getEntriesAtPath() );
            };

            self.mapEntryToButton = function( entries ) {
                var buttons = [];

                if( entries ) {
                    entries.forEach( function( entry ) {
                        var
                            data = {
                                text: entry.text,
                                isDocumentationNode: entry.isDocumentationNode,
                                children: entry.children
                            };

                        /**
                         * Escaped text to use with title attribute
                         * @property title
                         */
                        data.title = ko.computed( function() {
                            return ko.unwrap( entry.text );
                        } );

                        buttons.push( data );
                    } );

                    return buttons;
                } else {
                    return [];
                }
            };

            self.getBaseButtons = function() {
                self._path = [];
                self._breadcrumbs( [''] );
                self._buttons( self.mapEntryToButton( self.entries ) );
                return self._buttons;
            };

            self.makeObservable = function( entries, cb ) {
                entries.forEach( function( entry ) {
                    entry.text = ko.observable( entry.text );
                    if( entry.isDocumentationNode === 'true' || entry.isDocumentationNode === true ) {
                        entry.isDocumentationNode = ko.observable( true );
                    } else {
                        entry.isDocumentationNode = ko.observable( false );
                    }

                    if( entry.children && entry.children.length > 0 ) {
                        self.makeObservable( entry.children );
                    }
                } );

                if( cb ) {
                    cb();
                }
            };

            self.initiate = function() {
                self.makeObservable( self.entries, self.getBaseButtons );
            };

            self.getEntriesAtPath = function( mode ) {
                var array = self.entries;

                self._path.forEach( function( index ) {

                    if( !array[index].children ) {
                        array[index].children = [];
                    }

                    if( mode === 'document' && array[index].children.length < 1 ) {
                        return [];
                    } else {
                        array = array[index].children;
                    }

                } );

                return array;
            };

            self.makeBreadcrumbString = function() {
                var string = '';

                self._breadcrumbs().forEach( function( breadcrumb ) {
                    if( string === '' ) {
                        string = breadcrumb;
                    } else {
                        string = string + ' > ' + breadcrumb;
                    }
                } );

                self._breadcrumbString( string );
            };

            self.getNextLevelAtIndex = function( index, mode ) {
                var breadcrumb = self._buttons.peek()[index].text();
                breadcrumb.substring( 0, Math.min( 7, breadcrumb.length ) );

                if( mode === 'document' && (!self._buttons.peek()[index].children || self._buttons.peek()[index].children.length < 1) ) {
                    //self._path = [];
                    Y.log('not resetting path','debug');
                } else {
                    self._path.push( index );
                }

                self._buttons( self.mapEntryToButton( self.getEntriesAtPath( mode ) ) );

                if( breadcrumb && breadcrumb.trim().length > 10){
                    breadcrumb = breadcrumb.trim().substring(0, 10) + '...';
                }

                self._breadcrumbs.push( breadcrumb );
                self.makeBreadcrumbString();

                return self._buttons;
            };

            self.getPreviousLevel = function() {
                self._path.pop();
                self._buttons( self.mapEntryToButton( self.getEntriesAtPath() ) );

                self._breadcrumbs.pop();
                self.makeBreadcrumbString();
                return self._buttons;
            };

            self._save = function(callback) {
                var params = self.toJSON(),
                    fields_;

                if( typeof self._id() === "undefined" ) {
                    Y.log( 'Saving documentation tree', 'info', 'documentationtree' );
                    $.ajax( {
                        type: 'POST',
                        xhrFields: { withCredentials: true },
                        url: Y.doccirrus.infras.getPrivateURL( '/1/documentationtree/' ),
                        contentType: 'application/json',
                        data: JSON.stringify( params ),
                        success: function( res ) {
                            self._id(res.data[0]);
                        },
                        error: function( err ) {
                            Y.log( 'ERROR saving documentation tree ' + err, 'error', 'documentationtree' );
                            return;
                        }
                    } ).always(function () {
                        callback();
                    } );
                } else {
                    fields_ = 'actType,entries';
                    params.fields_ = fields_;
                    Y.log( 'Updating documentation tree', 'info', 'documentationtree' );
                    $.ajax( {
                        type: 'PUT',
                        xhrFields: { withCredentials: true },
                        url: Y.doccirrus.infras.getPrivateURL( '/1/documentationtree/'+self._id() ),
                        contentType: 'application/json',
                        data: JSON.stringify( params ),
                        error: function( err ) {
                            Y.log( 'ERROR saving documentation tree ' + err, 'error', 'documentationtree' );
                            return;
                        }
                    } ).always(function () {
                        callback();
                    } );
                }
            };

        },
        toJSON: function() {
            var
                self = this,
                json = DocumentationTreeModel.superclass.toJSON.apply( self, arguments );

            json.entries = ko.toJS( self.entries );
            json.actType = self.actType;
            return json;
        }
    }, {
        schemaName: 'documentationtree',
        NAME: 'DocumentationTreeModel'
    } );

    KoViewModel.registerConstructor( DocumentationTreeModel );

    },
    '0.0.1', {requires: [
        'oop',
        'KoViewModel',
        'documentationtree-schema'
    ]}
);