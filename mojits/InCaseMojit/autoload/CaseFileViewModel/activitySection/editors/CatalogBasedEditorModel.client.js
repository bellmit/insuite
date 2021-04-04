/**
 * User: pi
 * Date: 16/12/15  14:20
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $ */

'use strict';

YUI.add( 'CatalogBasedEditorModel', function( Y, NAME  ) {
        /**
         * @module CatalogBasedEditorModel
         */

        var

            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            CATALOG_TEXT_PLACEHOLDER = i18n( 'InCaseMojit.casefile_detail.placeholder.CATALOG_TEXT' ),
            peek = ko.utils.peekObservable;

        /**
         * @abstract
         * @class CatalogBasedEditorModel
         * @constructor
         * @extend ActivityEditorModel
         */
        function CatalogBasedEditorModel( config ) {
            CatalogBasedEditorModel.superclass.constructor.call( this, config );
        }

        CatalogBasedEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'modifyHomeCat',
                    'catalog',
                    'catalogShort',
                    'catalogRef',
                    'locationId',
                    'code',
                    'actType',
                    'u_extra'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( CatalogBasedEditorModel, KoViewModel.getConstructor( 'ActivityEditorModel' ), {
                initializer: function CatalogBasedEditorModel_initializer() {
                    var
                        self = this;
                    self.initCatalogBasedEditorModel();
                },
                destructor: function CatalogBasedEditorModel_destructor() {
                    var
                        self = this;
                    if( self.setActivityDataEventListener ) {
                        self.setActivityDataEventListener.detach();
                    }
                },
                initCatalogBasedEditorModel: function CatalogBasedEditorModel_initCatalogBasedEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        incaseConfig = binder.getInitialData( 'incaseconfiguration' ),
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        restrictSaveInHouseCatalog = incaseConfig && incaseConfig.restrictSaveInHouseCatalog || false,
                        isUserAdmin = true,
                        actType = peek( currentActivity.actType ),
                        catalogShort = unwrap( self.catalogShort ),
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        currentCaseFolderType = currentPatient.caseFolderCollection.getActiveTab().type,
                        currentCaseFolderAdditionalType = currentPatient.caseFolderCollection.getActiveTab().additionalType,
                        catalogs,
                        tessKat,
                        vvgCatalog;
                    if( restrictSaveInHouseCatalog ){
                        isUserAdmin = Y.doccirrus.auth.isAdmin();
                    }

                    self.isUserAdmin = isUserAdmin;

                    self.catalogTextHidden = incaseConfig && incaseConfig.catalogTextHidden || false;

                    self.isModified = ko.computed( function() {
                        return currentActivity.isModified();
                    } );
                    self.canModifyHomeCatalog = ko.observable( false === unwrap( self.catalog ) && unwrap( self.code ) && isUserAdmin );

                    self.addDisposable( self.canModifyHomeCatalog.subscribe( function( newValue ) {
                        if( !newValue ) {
                            self.modifyHomeCat( false );
                        }
                    } ) );

                    if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                        //move TESS-KAT to first position to make default when creating diagnose
                        catalogs = currentActivity.getCatalogs();
                        tessKat = catalogs.find( function( catalog ) {
                            return catalog.short === "TESS-KAT";
                        } );
                        if( tessKat ) {
                            catalogs.splice( catalogs.indexOf( tessKat ), 1 );
                            catalogs.unshift( tessKat );
                        }
                        vvgCatalog = catalogs.find( function( catalog ) {
                            return catalog.short === "ARZT_KVG_VVG";
                        } );

                        if( currentCaseFolderType === 'PRIVATE_CH_VVG' && peek(self.actType) !== 'DIAGNOSIS' ) {
                            catalogs = vvgCatalog ? [vvgCatalog] : [];
                        }
                        self._catalogBase = catalogs;
                    } else {
                        catalogs = currentActivity.getCatalogs();
                        if( Array.isArray(catalogs) ) {
                            // the AMTS catalog is only included in the special case of an AMTS casefolder (selfpayer + subType 'AMTS')
                            catalogs = catalogs.filter( function( catalog ) {
                                if (self.actType() !== 'TREATMENT') {
                                    return true;
                                }

                                if( currentCaseFolderType === 'SELFPAYER' && currentCaseFolderAdditionalType === 'AMTS' ) {
                                    return catalog.short === 'AMTS';
                                }

                                return catalog.short !== 'AMTS';
                            } );
                        }

                        self._catalogBase = catalogs;
                    }

                    self.catalogShort.subscribe(function( value ) {
                        if (!catalogShort || !unwrap(currentActivity.code) ) {
                            catalogShort = value;
                            return;
                        }
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: i18n('InCaseMojit.text.changeDescription'),
                            window: {
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                this.close();
                                                self.onCatalogItemSelected( {
                                                    catalogEntry: true,
                                                    code: null
                                                } );
                                            }
                                        } )
                                    ]
                                }
                            }
                        } );
                    });
                    /**
                     * Always contains up-to-date catalog filename
                     * @method _catalogFileF
                     * @type {ko.computed}
                     * @return {String}
                     */
                    self._catalogFile = ko.computed( function() {
                        var catalogShort = unwrap( self.catalogShort ),
                            found = Y.Array.find( self._catalogBase, function( catalog ) {
                                return catalogShort === catalog.short;
                            } );
                        return found ? found.filename : '';
                    } );

                    self.initialCodeValue = peek( self.code );

                    self.initSelect2Code();

                    self._catalogShortVisible = function( shortName ) {
                        return self.addDisposable( ko.computed( function() {
                            var catalogShort = unwrap( self.catalogShort );
                            if( Array.isArray( shortName ) ) {
                                return -1 !== shortName.indexOf( catalogShort );
                            }
                            return catalogShort === shortName;
                        } ) );
                    };

                    self.addDisposable( ko.computed( function() {
                        var
                            code = unwrap( self.code ),
                            catalogShort = peek( self.catalogShort ),
                            catalog = unwrap( self.catalog ),
                            isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

                        if( !ko.computedContext.isInitial() ) {
                            self.canModifyHomeCatalog( (!catalog || 'GebüH' === catalogShort || isSwiss ) && code && isUserAdmin );
                        }

                    } ).extend( {rateLimit: 30} ) );

                    if( 'TREATMENT' === actType || 'DIAGNOSIS' === actType ) {
                        self.initCatalogTextButtons();
                    }
                },
                /**
                 * This function can be defined into subclass
                 * @returns {Object}
                 */
                getCodeSearchParams: function() {
                    var
                        self = this,
                        catalogFile = unwrap( self._catalogFile ),
                        catalogShort = unwrap( self.catalogShort ),
                        locationId = unwrap( self.locationId ),
                        tags = unwrap( self.selectedCatalogTags ) || [],
                        actType = peek( self.actType );
                    if( catalogFile ) {
                        return {
                            itemsPerPage: 20,
                            query: {
                                term: '',
                                catalogs: [
                                    {filename: catalogFile, short: catalogShort}
                                ],
                                locationId: locationId,
                                tags: tags
                            },
                            data: {
                                _includeCatalogText: 'TREATMENT' === actType || 'DIAGNOSIS' === actType
                            }
                        };
                    } else {
                        return null;
                    }
                },
                initSelect2Code: function() {
                    var
                        self = this;
                    /**
                     * EventTarget for backwards compatibility
                     * @property _createActivityCodeAutoCompleteEvents
                     * @type {Y.EventTarget}
                     */
                    self._createActivityCodeAutoCompleteEvents = new Y.EventTarget();
                    /**
                     * @event catalogItemSelected
                     * @description Fires when a catalog item has been selected.
                     * @param {Event} event The Event
                     * @param {Object} event.catalogItem The selected catalog item
                     * @type Event.Custom
                     */
                    self._createActivityCodeAutoCompleteEvents.publish( 'catalogItemSelected', {preventable: false} );

                    /**
                     * @event customItemSelected
                     * @description Fires when a custom item has been selected.
                     * @param {Event} event The Event
                     * @type Event.Custom
                     */
                    self._createActivityCodeAutoCompleteEvents.publish( 'customItemSelected', {preventable: false} );

                    /**
                     * @property select2Code
                     * @type {Object} a select2 binder config
                     */
                    self.select2Code = Y.doccirrus.uam.utils.createActivityCodeAutoComplete( {
                        activity: self,
                        field: self.code,
                        eventTarget: self._createActivityCodeAutoCompleteEvents,
                        getCatalogCodeSearchParams: self.getCodeSearchParams.bind( self )
                    } );

                    self._createActivityCodeAutoCompleteEvents.on( 'catalogItemSelected', function( yEvent ) {
                        var
                            data = yEvent.catalogItem;
                        self.onCatalogItemSelected( data || {} );
                    } );

                    self._createActivityCodeAutoCompleteEvents.on( 'customItemSelected', function( yEvent ) {
                        var
                            data = yEvent.customItem;
                        self.onCustomCatalogItemSelected( data || {} );
                    } );

                },
                setActivityData: function( data ) {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    currentActivity.setActivityData( data );
                },
                onCatalogItemSelected: function( data ) {
                    var
                        self = this;
                    self.catalog( true === data.catalogEntry );
                    self.catalogRef( peek( self._catalogFile ) );
                    self.setActivityData( data );

                    self.showCustomCodeWarning();
                },
                onCustomCatalogItemSelected: function( data ) {
                    var
                        self = this,
                        catalogShort = peek( self.catalogShort ),
                        code = data.text,

                        catalogs = {
                            'EBM': 'Leistungsziffer',
                            'GOÄ': 'Leistungsziffer',
                            'UVGOÄ': 'Leistungsziffer',
                            'GebüH': 'Leistungsziffer',
                            'ICD-10': 'ICD-Code',
                            'HMV': 'Hilfsmittel'
                        },
                        warningText = catalogs[catalogShort] + ' ' + code + ' ist nicht im ' + catalogShort + ' enthalten.';
                    self.catalog( false );

                    if( ko.isObservable( self.u_extra ) ) {
                        self.u_extra( null );
                    }
                    if( self.unit ) {
                        self.unit( 'Euro' );
                    }
                    self.showCustomCodeWarning( catalogs[catalogShort], warningText );
                },
                showCustomCodeWarning: function( show, text ) {
                    var
                        mid = 'customCodeWarning';
                    Y.doccirrus.DCSystemMessages.removeMessage( mid );
                    if( show ) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: mid,
                            content: text,
                            level: 'WARNING'
                        } );
                    }
                },
                initCatalogTextButtons: function() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    self.catalogTexts = ko.observableArray();

                    self.activateCatalogTextItem = function( model ) {
                        var
                            status = !peek( model.active );
                        peek( self.catalogTexts ).forEach( function( catalogTextModel ) {
                            if( catalogTextModel !== model ) {
                                catalogTextModel.active( false );
                                catalogTextModel.usedInUserContent( false );
                            }
                        } );
                        model.active( status );
                        if( status ) {
                            self.userContent( peek( model.text ) );
                            model.usedInUserContent( false );
                        } else {
                            model.usedInUserContent( true );
                        }
                    };
                    self.originalCatalogText = ko.observable( '' );
                    self.originalCatalogPlaceholder = ko.observable( CATALOG_TEXT_PLACEHOLDER );

                    self.setActivityDataEventListener = currentActivity.events.on( 'setActivityData', function( yEvent ) {
                        var
                            data = yEvent.activityData;
                        self.originalCatalogText( data.title );
                    } );

                    self._createActivityCodeAutoCompleteEvents.on( 'customItemSelected', function() {
                        self.originalCatalogText( '' );
                    } );

                    if( !self.catalogTextHidden ) {
                        self.addDisposable( ko.computed( function() {
                            var
                                catalogTextModel = unwrap( currentActivity.catalogTextModel ),
                                items = peek( catalogTextModel.items ),
                                userContent = peek( self.userContent ),
                                code = peek( self.code ),
                                catalogTextItem = items && items[ 0 ],
                                isInitial = ko.computedContext.isInitial();
                            self.catalogTexts( items );
                            if( !isInitial ) {
                                if( catalogTextItem && code ) {
                                    if( !peek( catalogTextItem.text ) ) {
                                        catalogTextItem.text( userContent );
                                    }
                                    if( !peek( catalogTextItem.active ) ) {
                                        self.activateCatalogTextItem( catalogTextItem );
                                    }
                                }
                            }
                        } ) );
                    }
                }
            }, {
                NAME: 'CatalogBasedEditorModel'
            }
        );
        KoViewModel.registerConstructor( CatalogBasedEditorModel );

        /**
         * @abstract
         * @class CatalogTagEditorModel
         * @constructor
         * @extend CatalogBasedEditorModel
         */
        function CatalogTagEditorModel( config ) {
            CatalogTagEditorModel.superclass.constructor.call( this, config );
        }

        CatalogTagEditorModel.ATTRS = CatalogBasedEditorModel.ATTRS;

        Y.extend( CatalogTagEditorModel, CatalogBasedEditorModel, {
                initializer: function CatalogTagEditorModel_initializer() {
                    var
                        self = this;
                    self.initCatalogTagEditorModel();
                },
                destructor: function CatalogTagEditorModel_destructor() {
                },
                initCatalogTagEditorModel: function CatalogTagEditorModel_initCatalogTagEditorModel() {
                    var

                        self = this;
                    self.initSelect2Tag();
                },
                initSelect2Tag: function() {
                    var
                        self = this;

                    self.selectedCatalogTags = ko.observableArray( [] );
                    self.select2tags = new Y.doccirrus.uam.utils.CatalogUsageTagList( {
                        dataArray: self.selectedCatalogTags,
                        catalogShort: self.catalogShort,
                        useCache: true,
                        exactMatch: true,
                        placeholder: i18n( 'InCaseMojit.casefile_detail.placeholder.TAG_FILTER' )
                    } );
                    //tagsLocalStorage = Y.doccirrus.utils.localValueGet( 'tags_' );
                    //if( tagsLocalStorage ) {
                    //    self.selectedCatalogTags( JSON.parse( tagsLocalStorage ) );
                    //}
                    self.select2tags.onDataLoad = function( availableTags ) {
                        /**
                         * Preselect tags.
                         */
                        var
                            tagsFromLS = Y.doccirrus.utils.localValueGet( 'tags_' ),
                            filteredTags = [];
                        if( tagsFromLS && availableTags && 0 < availableTags.length ) {
                            tagsFromLS = JSON.parse( tagsFromLS );
                            availableTags.some( function( tagObj ) {
                                if( -1 !== tagsFromLS.indexOf( tagObj.id ) ) {
                                    filteredTags.push( tagObj.id );
                                }
                                if( filteredTags.length === tagsFromLS.length ) {
                                    return true;
                                }
                                return false;
                            } );
                        }
                        self.selectedCatalogTags( filteredTags );
                    };
                    self.addDisposable( self.selectedCatalogTags.subscribe( function( newTags ) {
                        Y.doccirrus.utils.localValueSet( 'tags_', JSON.stringify( newTags ) );
                    } ) );
                },

                //  Events to manage interaction with DocTreeViewModel (shares a column, toggled), MOJ-8340

                /**
                 *  Show docTree / text bausteine
                 * @param {Object}  vm  ViewModel, should be self, have element name matching vm property
                 * @param {Object}  evt DOM event
                 */
                onDocTreeFocus: function( vm, evt ) {
                    var self = this;
                    self.updateDocTree( true, vm[ evt.target.name ] );
                },

                /**
                 *  When clicking out of textarea with doctree, hide it
                 *  @param vm
                 *  @param evt
                 */

                onDocTreeBlur: function( vm, evt ) {
                    var self = this;

                    if ( evt.relatedTarget && $( evt.relatedTarget ).hasClass( 'text-tree-element' ) ) {
                        //  leave it
                        return;
                    }
                    //  hide text bausteine
                    self.updateDocTree( false, null );
                },

                /**
                 *  Set documentation tree viewmodel visibility and target
                 *
                 *  @param  {Boolean}  showDocTree
                 *  @param  {Object}   target       Observable with caretPosition
                 */

                updateDocTree: function( showDocTree, target ) {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        caseFileVM = ko.unwrap( binder.currentView ),
                        activityDetailsVM = ko.unwrap( caseFileVM.activityDetailsViewModel );

                    activityDetailsVM.showDocTree( showDocTree );

                    if ( activityDetailsVM.activityDocTreeViewModel ) {
                        activityDetailsVM.activityDocTreeViewModel.setTarget( target );
                    }
                },
                showCatalogViewer: function() {
                    var self = this,
                        code = unwrap( self.code ),
                        catalogShort = unwrap( self.catalogShort );

                    if( !catalogShort ) {
                        Y.log( 'could not show catalog viewer: activity has no catalogShort', 'error', NAME );
                        return;
                    }

                    Y.doccirrus.catalogViewer.create( {
                        initialSelection: code,
                        catalogShort: catalogShort,
                        modalChooser: true,
                        allowCatalogChange: false
                    } ).then( function( entry ) {
                        if( entry && entry.seq ) {
                            entry.catalogEntry = true;
                            self._createActivityCodeAutoCompleteEvents.fire( 'catalogItemSelected', {
                                catalogItem: entry
                            } );
                        }
                    } ).catch( function( err ) {
                        Y.log( 'could not pick catalog entry via catalogViewer: ' + err, 'error', NAME );
                    } );
                }


            }, {
                NAME: 'CatalogTagEditorModel'
            }
        );
        KoViewModel.registerConstructor( CatalogTagEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'catalogViewer'

        ]
    }
);
