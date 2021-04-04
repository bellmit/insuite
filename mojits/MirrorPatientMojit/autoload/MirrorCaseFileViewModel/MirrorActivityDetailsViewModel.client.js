/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, async, _ */
YUI.add( 'MirrorActivityDetailsViewModel', function( Y, NAME ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,

        KoViewModel = Y.doccirrus.KoViewModel,

        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,

        ActivityActionButtonsViewModel = KoViewModel.getConstructor( 'ActivityActionButtonsViewModel' ),
        ActivityHeadingViewModel = KoViewModel.getConstructor( 'ActivityHeadingViewModel' ),
        ActivitySidebarViewModel = KoViewModel.getConstructor( 'MirrorActivitySidebarViewModel' ),
        ActivityHouseCatalogViewModel = KoViewModel.getConstructor( 'ActivityHouseCatalogViewModel' ),
        ActivityDocTreeViewModel = KoViewModel.getConstructor( 'ActivityDocTreeViewModel' ),

        ActivitySectionDocumentViewModel = KoViewModel.getConstructor( 'ActivitySectionDocumentViewModel' ),
        ActivitySectionPDFViewModel = KoViewModel.getConstructor( 'ActivitySectionPDFViewModel' ),
        ActivitySectionFormViewModel = KoViewModel.getConstructor( 'ActivitySectionFormViewModel' ),
        ActivitySectionFormTreeViewModel = KoViewModel.getConstructor( 'ActivitySectionFormTreeViewModel' ),
        ActivitySectionTableViewModel = KoViewModel.getConstructor( 'ActivitySectionTableViewModel' ),
        ActivitySectionTextViewModel = KoViewModel.getConstructor( 'ActivitySectionTextViewModel' ),

        QuotationTreatmentsHandler = KoViewModel.getConstructor( 'QuotationTreatmentsHandler' );

    /**
     * @constructor
     * @class MirrorActivityDetailsViewModel
     */
    function MirrorActivityDetailsViewModel() {
        MirrorActivityDetailsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( MirrorActivityDetailsViewModel, KoViewModel.getDisposable(), {

        //  form template and mapper should live as long as currentActivity does in the client
        template: null,
        mapper: null,
        isFormLoading: null,
        isFormLoaded: null,

        formDivId: 'divFormsCompose',           //  static,
        patientRegId: '',

        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initMirrorActivityDetailsViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyMirrorActivityDetailsViewModel();
        },
        initMirrorActivityDetailsViewModel: function() {
            var
                self = this;

            //  should be instantiated first, needed by views
            self.initAttachmentsModel();

            self.initActivityNav();
            self.initActivityActionButtonsViewModel();
            self.initActivityHeadingViewModel();
            self.initActivitySidebarViewModel();
            self.initActivitySectionViewModel();
            self.initActivityHouseCatalogViewModel();
            self.initActivityDocTreeViewModel();
            //self.initBeforeUnloadView();
            self.initAdditionalComputeds();
            self.initFormSubscriptions();
            self.initFormAndMapper();

            //self.initHotKeys();
        },
        destroyMirrorActivityDetailsViewModel: function() {
            var
                self = this;

            self.destroyBeforeUnloadView();
            self.destroyActivitySectionViewModel();
            self.destroyActivityActionButtonsViewModel();
            self.destroyActivityHeadingViewModel();
            self.destroyActivitySidebarViewModel();
            self.destroyActivityHouseCatalogViewModel();
            self.destroyActivityDocTreeViewModel();
            self.destroyActivityNav();
            self.destroyQuotationTable();

            self.destroyAttachmentsModel();
            self.destroyHotKeys();

            self.destroyFormSubscriptions();
            self.destroyFormAndMapper();
        },

        hotKeysGroup: null,

        initHotKeys: function() {
            var
                self = this;
            /**
             * addSingleGroup is used, because of MirrorActivityDetailsViewModel can be replaced by another MirrorActivityDetailsViewModel
             *  it means new one will be initialized that old one will be destroyed.
             *  Old MirrorActivityDetailsViewModel can unset hot keys.
             */
            self.shortCutsGroup = Y.doccirrus.HotKeysHandler.addSingleGroup( 'MirrorActivityDetailsViewModel' );

            self.shortCutsGroup
                .on( 'ctrl+s', 'Speichern', function() {
                    var
                        validTransition = Y.doccirrus.inCaseUtils.checkTransition( {
                            currentActivity: peek( self.get( 'currentActivity' ) ),
                            transition: 'validate'
                        } );
                    if( validTransition ) {
                        self.saveAttachmentsAndTransition( {
                            transitionDescription: validTransition
                        } );
                    }
                } )
                .on( 'shift+ctrl+s', 'Speichern+', function() {
                    var
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        validTransition = Y.doccirrus.inCaseUtils.checkTransition( {
                            currentActivity: currentActivity,
                            transition: 'validate'
                        } );

                    if( validTransition ) {
                        self.saveAttachmentsAndTransition( {
                                transitionDescription: validTransition,
                                skipRedirectBack: true
                            } )
                            .then( function() {
                                Y.doccirrus.inCaseUtils.createActivity( {
                                    newActivityConfig: {
                                        timestamp: moment( peek( currentActivity.timestamp ) ).add( 1, 'milliseconds' ).toISOString(),
                                        locationId: peek( currentActivity.locationId ),
                                        employeeId: peek( currentActivity.employeeId )
                                    },
                                    actType: peek( currentActivity.actType )
                                } );
                            } );
                    }
                } )
                .on( 'ctrl+z', 'Zurück', function() {
                    var
                        binder = self.get( 'binder' );

                    binder.navigateToCaseFileBrowser();
                } );
        },
        destroyHotKeys: function() {
            var
                self = this;
            if( self.shortCutsGroup ) {
                self.shortCutsGroup
                    .un( 'ctrl+s' )
                    .un( 'shift+ctrl+s' )
                    .un( 'ctrl+z' );
                self.shortCutsGroup = null;
            }
        },

        /**
         *  Listen for activity / UI events which require changes to form state
         */

        initFormSubscriptions: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = ko.unwrap( binder.currentActivity );

            //  TODO: move to activityDetailsVM

            self.isFormLoaded = ko.observable( false );
            self.isFormLoading = ko.observable( false );

            if ( !currentActivity.formLookupInProgress ) {
                currentActivity.formLookupInProgress = ko.observable( false );
            }

            self.formLookupListener = currentActivity.formLookupInProgress.subscribe( function() {
                if ( false === currentActivity.formLookupInProgress() ) {
                    self.initFormAndMapper();
                } else {
                    self.destroyFormAndMapper();
                }

            } );

            self.activityTransitionedListener = Y.on( 'activityTransitioned', function( evt ) {
                Y.log( 'Updating form with new activity _id', 'debug', NAME );

                if ( !evt.isNew && self.template && self.template.ownerId ) {
                    self.template.ownerId = unwrap( currentActivity._id );
                }
            } );
        },

        destroyFormSubscriptions: function() {
            var self = this;
            self.formLookupListener.dispose();
            self.activityTransitionedListener = null;
        },


        /**
         *  If current activity has a form then load it and set up any mappers needed by current activity type
         *  Note that not all activity types can have forms.
         */

        initFormAndMapper: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = ko.unwrap( binder.currentActivity ),
                currentPatient = ko.unwrap( binder.currentPatient ),
                incaseconfiguration = binder.getInitialData('incaseconfiguration'),

                noVersion = ( !currentActivity.formVersion || !currentActivity.formVersion() || '' === currentActivity.formVersion() ),
                doBFBRedirect = currentActivity._isEditable() && noVersion,
                doBFBHide = currentActivity._isEditable(),

                currentActivityAttachments = self.attachmentsModel,

                formOptions = {
                    'patientRegId': self.patientRegId,
                    'canonicalId': ko.unwrap( currentActivity.formId ) || '',
                    'formVersionId': ko.unwrap( currentActivity.formVersion ) || '',
                    'domId': self.formDivId, ///
                    'il8nDict': {},
                    'doRender': false,
                    'isHidden': true
                },

                mapperContext = {
                    'activity': currentActivity,
                    'patient': currentPatient,
                    'attachments': currentActivityAttachments,
                    'incaseconfiguration': binder.getInitialData( 'incaseconfiguration' ),
                    'locations': binder.getInitialData( 'location' ),
                    'pregnancy': {},

                    //  legacy but still in use for assigning ownership of temporary PDFs
                    'bindCollection': 'activity',
                    'bindId': unwrap( currentActivity._id ) || 'new'
                };

            //  remove any existing form before we get started
            self.destroyFormAndMapper();

            //  not all activity types can have a form, exit if no form possible
            if ( !currentActivity.canHaveForm ) {
                Y.log( 'Current activity type can not have a form: ', unwrap( currentActivity.actType ), 'debug', NAME );
                return;
            }

            if( !currentActivity.formLookupInProgress || currentActivity.formLookupInProgress() ) {
                Y.log( 'form lookup in progress, waiting', 'debug', NAME );
                //self.divId.html(Y.doccirrus.comctl.getThrobber());
                return;
            }

            if( true === self.isFormLoading() ) {
                Y.log( 'form load in progress, not starting another until it completes', 'debug', NAME );
                return;
            }

            //Y.log( 'displaying form: ' + unwrap( currentActivity.actType ) + ' / ' + unwrap( currentActivity.formId ), 'debug', NAME );

            if( !currentActivity.formId || '' === ko.unwrap( currentActivity.formId ) ) {
                // current activity does not have a form, this section should be disabled
                Y.log( 'current activity does not have a form: ' + ko.unwrap( currentActivity._id || 'new activity' ), 'info', NAME );
                self.isFormLoading( false );
                self.isFormLoaded( false );
                return;
            }

            self.isFormLoaded( false );
            self.isFormLoading( true );

            async.series(
                [

                    loadCertNumbers,
                    createTemplate,
                    loadAdditionalContext,
                    setGenderAndLanguage,
                    createMapper
                ],
                onAllDone
            );

            //  1. Load BFB certification status from server
            function loadCertNumbers( itcb ) {
                Y.dcforms.loadCertNumbers( itcb );
            }

            //  2. Create a template object
            function createTemplate( itcb ) {
                function onFormTemplateCreated( err, newFormTemplate ) {
                    var
                        clientBFB = Y.dcforms.clientHasBFB(),
                        i, j, elem;

                    if ( err ) {
                        Y.log( 'Problem creating form template: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    //  BFB settings may require a different form to be loaded at this point
                    if( doBFBRedirect && newFormTemplate.isBFB && !clientBFB ) {

                        if( newFormTemplate.bfbAlternative && '' !== newFormTemplate.bfbAlternative ) {
                            Y.log( 'No BFB certification, loading alternative form', 'info', NAME );
                            formOptions.canonicalId = newFormTemplate.bfbAlternative;
                            formOptions.formVersionId = '';

                            if ( 'UTILITY' === currentActivity.actType() ) {
                                Y.log( 'No clearing content in mask.', 'debug', NAME );
                            } else {
                                // clear user content to set new form name
                                currentActivity.userContent( '' );
                                Y.dcforms.createTemplate( formOptions );
                                return;
                            }

                        }

                    }

                    //  some forms have elements which should be hidden if no KBV/BFB certification is available
                    //  this situation should persist for the lifetime of activities, and in other contexts such
                    //  as the patient portal

                    //if (doBFBHide || (doBFBRedirect && !clientBFB)) {
                    if( doBFBHide && !clientBFB ) {
                        Y.log( 'Hiding non-BFB elements in form', 'info', NAME );

                        for( i = 0; i < newFormTemplate.pages.length; i++ ) {
                            for( j = 0; j < newFormTemplate.pages[i].elements.length; j++ ) {

                                elem = newFormTemplate.pages[i].elements[j];
                                elem.isHiddenBFB = (elem.isBFB && !clientBFB);

                                //if (elem.isHiddenBFB) {
                                //    //console.log('hiding BFB element ' + elem.elemId);
                                //}
                            }
                        }
                    }

                    self.template = newFormTemplate || null;

                    //  this may be different than what was requested due to BFB redirects, missing versions, etc
                    currentActivity.formId( self.template.canonicalId );
                    currentActivity.formVersion( self.template.formVersionId );

                    //  enable or disable extra serialization for backmapping to activity content
                    self.template.backmappingFields = Y.doccirrus.schemas.activity.actTypeHasBackmapping( ko.unwrap( currentActivity.actType ) );
                    itcb( null );
                }

                formOptions.callback = onFormTemplateCreated;
                Y.dcforms.createTemplate( formOptions );
            }

            //  3. Load extra mapper context from dirty objects in the UI
            //  (currently only used for modified linked activities in QUOTATION table tab)
            function loadAdditionalContext( itcb ) {
                var quotationTreatments;

                mapperContext.activity._modifiedLinkedActivities = [];

                if ( 'QUOTATION' === unwrap( currentActivity.actType ) ) {
                    quotationTreatments = binder.getQuotationTreatments();

                    if ( quotationTreatments ) {
                        mapperContext.activity._modifiedLinkedActivities = quotationTreatments.getModifications();
                        //console.log("modified quotation treatments", mapperContext.activity._modifiedLinkedActivities );
                    }

                }

                itcb( null );
            }

            //  4. set gender and language if available
            function setGenderAndLanguage( itcb ) {
                /*  NOTE: not yet automatically setting gender because we do not have forms to support it
                 var
                 talk = ko.unwrap( currentPatient.talk ),
                 gender = 'n';

                 //  set patient gender if known  TODO: move to activity model
                 switch( talk ) {
                 case 'MS': gender = 'f';    break;
                 case 'MR': gender = 'm';    break;
                 }
                 */

                if ( !incaseconfiguration.useFormTranslation ) {
                    //  hard to set to german rather than default to german
                    //  default to german
                    self.template.gender = 'n';
                    Y.dcforms.setUserLang( 'de' );
                    self.template.setUserLang( 'de', itcb );
                    return;
                }

                if ( currentActivity.formGender && ko.unwrap( currentActivity.formGender ) ) {
                    self.template.gender = ko.unwrap( currentActivity.formGender );
                }

                if ( currentActivity.formLang && ko.unwrap( currentActivity.formLang ) ) {
                    Y.dcforms.setUserLang( ko.unwrap( currentActivity.formLang ) );
                    self.template.setUserLang( ko.unwrap( currentActivity.formLang ), itcb );
                    return;
                } else {
                    //  default to german
                    Y.dcforms.setUserLang( 'de' );
                    self.template.setUserLang( 'de', itcb );
                }
            }

            //  5. Create mapper and scale the form to available space
            function createMapper( itcb ) {
                self.template.ownerCollection = 'activity';
                self.template.ownerId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId );

                //  load or map/create form document
                self.template.mapperName = Y.dcforms.getMapperName( self.template.reducedSchema );
                self.template.on( 'mapperinitialized', NAME, onMapperInitialized );
                self.mapper = Y.dcforms.mapper[self.template.mapperName]( self.template, mapperContext );

                //  width of rendering div seems to be unstable
                //self.template.resize( $( '#divFormsRender' ).width(), itcb );

                function onMapperInitialized() {
                    itcb( null );
                }
            }

            //  Finally

            function onAllDone( err ) {
                Y.log( 'form load complete', 'debug', NAME );
                self.isFormLoading( false );

                if( err ) {
                    Y.log( 'Error loading form: ' + JSON.stringify( err ) );
                    return;
                }

                //  listen for media uploads via the form
                //self.template.on('addUserImage', NAME, function( evt ) { self.onFormMediaAttached( evt ); } );
                self.isFormLoaded( true );
            }

        },

        /**
         *  Destroy and unlink any form and mapper (may have KO subscriptions)
         */

        destroyFormAndMapper: function() {
            var self = this;
            if ( self.template ) {
                self.template.destroy();
                self.template = null;
            }

            if ( self.mapper ) {
                self.mapper.destroy();
                self.mapper = null;
            }
        },

        activityActionButtonsViewModel: null,
        initActivityActionButtonsViewModel: function() {
            var
                self = this;

            self.activityActionButtonsViewModel = new ActivityActionButtonsViewModel();
        },
        destroyActivityActionButtonsViewModel: function() {
            var
                self = this;

            if( self.activityActionButtonsViewModel ) {
                self.activityActionButtonsViewModel.destroy();
                self.activityActionButtonsViewModel = null;
            }
        },
        activityHeadingViewModel: null,
        initActivityHeadingViewModel: function() {
            var
                self = this;

            self.activityHeadingViewModel = new ActivityHeadingViewModel();
        },
        destroyActivityHeadingViewModel: function() {
            var
                self = this;

            if( self.activityHeadingViewModel ) {
                self.activityHeadingViewModel.destroy();
                self.activityHeadingViewModel = null;
            }
        },
        /**
         * @property activityNav
         * @type {null|KoNav}
         */
        activityNav: null,
        /**
         * A helper for nav section
         * @property activeActivityNavSection
         * @type {null|ko.computed} return either section name string or null
         */
        activeActivityNavSection: null,
        activityNavActivityTransitionedListener: null,

        initActivityNav: function() {
            var
                self = this,
                activityNav,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                currentActivityId = currentActivity && peek( currentActivity._id ),
                navUrl = '#/activity/' + (currentActivityId ? currentActivityId : 'new') + '/section/';

            if( !self.activityNav ) {
                activityNav = self.activityNav = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        items: [
                            {
                                name: 'textform',
                                text: 'Text',
                                href: navUrl + 'textform'
                            },
                            {
                                name: 'tableform',
                                text: 'Tabelle',
                                href: navUrl + 'tableform'
                            },
                            {
                                name: 'formform',
                                text: 'Formular',
                                href: navUrl + 'formform'
                            },
                            {
                                name: 'formtreeform',
                                text: 'Formular Auswahl',
                                href: navUrl + 'formtreeform'
                            },
                            {
                                name: 'documentform',
                                text: 'Ext. Dokument',
                                href: navUrl + 'documentform'
                            },
                            {
                                name: 'pdfform',
                                text: 'Verlauf',
                                href: navUrl + 'pdfform'
                            }
                        ]
                    }
                } );

                /**
                 * Handle tab config
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        currentActivity = unwrap( binder.currentActivity ),
                        actType = unwrap( currentActivity.actType ),
                        items = unwrap( activityNav.items ),
                        route = unwrap( binder.route );

                    ignoreDependencies( function() {
                        var
                            activityTypeMap = binder.getInitialData( 'activityTypes' ).map,
                            config = activityTypeMap[actType],
                            sectionTabName = route.params.sectionTab,
                            sectionTab = null;

                        // enable all tabs, because previous ones might not be disabled by current config
                        // and also activating disabled is suppressed
                        Y.Array.invoke( items, 'disabled', false );

                        if( !config ) {
                            Y.Array.invoke( items, 'active', false );
                            Y.Array.invoke( items, 'disabled', true );
                            return;
                        }

                        // disable those defined by config
                        config.disabledTabs.forEach( function( tabName ) {
                            var
                                item = activityNav.getItemByName( tabName );

                            if( item ) {
                                item.disabled( true );
                            }
                        } );

                        // activate that one defined by route
                        if( sectionTabName ) {
                            sectionTab = activityNav.getItemByName( sectionTabName );
                        }
                        if( sectionTab && !peek( sectionTab.disabled ) ) {
                            activityNav.activateTab( sectionTab );
                        }
                        // activate that one defined by config
                        else if( config.activeTab && activityNav.getItemByName( config.activeTab ) ) {
                            activityNav.activateTab( config.activeTab );
                        }
                        // or if not defined activate the first not disabled
                        else {
                            items.some( function( item ) {
                                if( !peek( item.disabled ) ) {
                                    activityNav.activateTab( item );
                                    return true;
                                }
                            } );
                        }
                    } );

                } ) );

                self.activeActivityNavSection = ko.computed( function() {
                    var
                        activeTab = unwrap( activityNav.activeTab );

                    if( activeTab ) {
                        return peek( activeTab.name );
                    }
                    else {
                        return null;
                    }
                } );

                //  when an activity is saved for the first time, links in nav must be updated to include
                //  the new activity _id (MOJ-5590)

                self.activityNavActivityTransitionedListener = Y.on( 'activityTransitioned', function( evt ) {
                    Y.log( 'Updating activityNav with new activity _id', 'debug', NAME );

                    if( !evt.isNew ) {
                        return;
                    }

                    var
                        binder = self.get( 'binder' ),
                        currentActivity = unwrap( binder.currentActivity ),
                        items = unwrap( activityNav.items );

                    items.forEach( function( item ) {
                        var href = unwrap( item.href );
                        href = href.replace( '/new/', '/' + unwrap( currentActivity._id ) + '/' );
                        item.href( href );
                    } );

                } );

            }
        },
        destroyActivityNav: function() {
            var
                self = this;

            if( self.activityNav ) {
                self.activityNav.dispose();
                self.activityNav = null;
            }

            if( self.activityNavActivityTransitionedListener ) {
                self.activityNavActivityTransitionedListener.detach();
                self.activityNavActivityTransitionedListener = null;
            }
        },
        activitySidebarViewModel: null,
        initActivitySidebarViewModel: function() {
            var
                self = this;

            self.activitySidebarViewModel = new ActivitySidebarViewModel();
        },
        destroyActivitySidebarViewModel: function() {
            var
                self = this;

            if( self.activitySidebarViewModel ) {
                self.activitySidebarViewModel.destroy();
                self.activitySidebarViewModel = null;
            }
        },
        ctivityHouseCatalogViewModel: null,
        showHouseCatalog: null,
        initActivityHouseCatalogViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                _isEditable = peek( currentActivity._isEditable ),
                isCatalogType = Y.doccirrus.schemas.activity.isCatalogType( peek( currentActivity.actType ) );

            if( !isCatalogType || !_isEditable ) {
                // when actType is changed, MirrorActivityDetailsViewModel should be reinitialized.
                // House catalog is shown only for editable activity.
                return;
            } else {
                self.activityHouseCatalogViewModel = new ActivityHouseCatalogViewModel( {
                    MirrorActivityDetailsViewModel: self
                } );
                self.showHouseCatalog = ko.observable();
                self.activityHouseCatalogViewModel.addDisposable( ko.computed( function() {
                    var
                        showButtons = self.activityHouseCatalogViewModel && unwrap( self.activityHouseCatalogViewModel.showButtons );
                    self.showHouseCatalog( showButtons );
                } ) );
                // destroy model when activity is not editable(e.g. status is changed VALID => APPROVED)
                self.activityHouseCatalogViewModel.addDisposable( ko.computed( function() {
                    var
                        _isEditable = unwrap( currentActivity._isEditable );
                    ignoreDependencies( function() {
                        if( !_isEditable ) {
                            self.destroyActivityHouseCatalogViewModel.call( self );
                        }
                    } );

                } ) );
            }
        },
        destroyActivityHouseCatalogViewModel: function() {
            var
                self = this;

            if( self.activityHouseCatalogViewModel ) {
                self.activityHouseCatalogViewModel.destroy();
                self.activityHouseCatalogViewModel = null;
            }
            if( self.showHouseCatalog ) {
                self.showHouseCatalog( false );
                self.showHouseCatalog = null;
            }
        },
        showDocTree: null,
        activityDocTreeViewModel: null,
        initActivityDocTreeViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                isCatalogType = Y.doccirrus.schemas.activity.isCatalogType( peek( currentActivity.actType ) ),
                _isEditable = peek( currentActivity._isEditable ),
                destroyListener,
                showDocTreeListener,
                currentEditorListener;

            if( isCatalogType || !_isEditable ) {
                // when actType is changed, MirrorActivityDetailsViewModel should be reinitialized.
                // DocTree is shown only for editable activity.
                return;
            } else {
                self.showDocTree = ko.observable();

                currentEditorListener = self.addDisposable( ko.computed( function() {
                    var
                        currentActivitySectionViewModel = unwrap( self.currentActivitySectionViewModel ),
                        currentActivityEditor = currentActivitySectionViewModel && peek( currentActivitySectionViewModel.currentActivityEditor ),
                        hasUserContent = currentActivityEditor && currentActivityEditor.userContent;
                    self.showDocTree( Boolean( hasUserContent ) );
                } ) );

                showDocTreeListener = self.addDisposable( ko.computed( function() {
                    var
                        showDocTree = unwrap( self.showDocTree );

                    ignoreDependencies( function() {
                        var
                            currentActivitySectionViewModel = unwrap( self.currentActivitySectionViewModel ),
                            currentActivityEditor = currentActivitySectionViewModel && peek( currentActivitySectionViewModel.currentActivityEditor );
                        if( showDocTree ) {
                            self.activityDocTreeViewModel = new ActivityDocTreeViewModel( {currentEditor: currentActivityEditor} );
                            self.activityDocTreeViewModel.addDisposable( ko.computed( function() {
                                var
                                    treeModel = self.activityDocTreeViewModel.treeModel();
                                if( !ko.computedContext.isInitial() && !treeModel ) {
                                    self.showDocTree( false );
                                }
                            } ) );
                        } else {
                            self.destroyActivityDocTreeViewModelOnly.call( self );
                        }
                    } );
                } ) );
                // destroy model when activity is not editable(e.g. status is changed VALID => APPROVED)
                destroyListener = self.addDisposable( ko.computed( function() {
                    var
                        _isEditable = unwrap( currentActivity._isEditable );
                    ignoreDependencies( function() {
                        if( !_isEditable ) {
                            if( destroyListener && destroyListener.dispose ) {
                                destroyListener.dispose();
                            }
                            if( currentEditorListener && currentEditorListener.dispose ) {
                                currentEditorListener.dispose();
                            }
                            if( showDocTreeListener && showDocTreeListener.dispose ) {
                                showDocTreeListener.dispose();
                            }
                            self.destroyActivityDocTreeViewModel.call( self );
                        }
                    } );
                } ) );
            }
        },
        destroyActivityDocTreeViewModel: function() {
            var
                self = this;
            self.destroyActivityDocTreeViewModelOnly();
            if( self.showDocTree ) {
                self.showDocTree( false );
                self.showDocTree = null;
            }
        },
        destroyActivityDocTreeViewModelOnly: function() {
            var
                self = this;
            if( self.activityDocTreeViewModel ) {
                self.activityDocTreeViewModel.destroy();
                self.activityDocTreeViewModel = null;
            }
        },
        /**
         * Holds current ActivitySectionViewModel
         * @property currentActivitySectionViewModel
         * @type {null|ko.computed}
         */
        currentActivitySectionViewModel: null,
        initActivitySectionViewModel: function() {
            var
                self = this,
                lastActivityNavSection = null;

            self.currentActivitySectionViewModel = ko.computed( function() {
                var
                    activeActivityNavSection = unwrap( self.activeActivityNavSection );

                return ignoreDependencies( function() {
                    var
                        lastActivitySectionViewModel = peek( self.currentActivitySectionViewModel ),
                        binder = self.get( 'binder' ),
                        currentActivity = peek( binder.currentActivity ),
                        actType = currentActivity && unwrap( currentActivity.actType );

                    if( lastActivityNavSection === activeActivityNavSection ) {
                        return lastActivitySectionViewModel;
                    }

                    if( lastActivitySectionViewModel ) {
                        lastActivitySectionViewModel.destroy();
                    }

                    lastActivityNavSection = activeActivityNavSection;

                    switch( activeActivityNavSection ) {
                        case 'textform':
                            Y.doccirrus.utils.localValueSet( actType + '-ACTIVE-TAB', 'textform' );
                            return new ActivitySectionTextViewModel();
                        case 'tableform':
                            Y.doccirrus.utils.localValueSet( actType + '-ACTIVE-TAB', 'tableform' );
                            return new ActivitySectionTableViewModel();
                        case 'formform':
                            return new ActivitySectionFormViewModel();
                        case 'formtreeform':
                            return new ActivitySectionFormTreeViewModel();
                        case 'documentform':
                            return new ActivitySectionDocumentViewModel();
                        case 'pdfform':
                            return new ActivitySectionPDFViewModel();
                    }

                    return null;
                } );

            } );
        },
        destroyActivitySectionViewModel: function() {
            var
                self = this,
                currentActivitySectionViewModel;

            if( self.currentActivitySectionViewModel ) {
                self.currentActivitySectionViewModel.dispose();
                currentActivitySectionViewModel = peek( self.currentActivitySectionViewModel );
                if( currentActivitySectionViewModel ) {
                    currentActivitySectionViewModel.destroy();
                }
                self.currentActivitySectionViewModel = null;
            }
        },
        showActivityActtypeNeeded: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentActivityActType = unwrap( currentActivity.actType );

            return !currentActivityActType;
        },
        beforeUnloadView: null,
        initBeforeUnloadView: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                router = binder.get( 'router' );

            if( self.beforeUnloadView ) {
                return;
            }

            self.beforeUnloadView = router.on( 'beforeUnloadView', function( yEvent, event ) {
                var
                    currentActivity = peek( binder.currentActivity ),
                    currentActivityId = currentActivity && peek( currentActivity._id ),
                    modifications,
                    isSubRoute,
                    isTypeRouter,
                    isTypeAppHref;

                // no modifications, no further handling
                if( !(currentActivity && currentActivity.isModified()) ) {
                    return;
                }

                isTypeRouter = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.router);

                isSubRoute = ( isTypeRouter &&
                               0 === event.router.route.indexOf( '/activity/' + (currentActivityId ? currentActivityId : 'new') )
                );

                // modifications, but allowed routes
                if( isSubRoute ) {
                    return;
                }

                isTypeAppHref = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.appHref);

                yEvent.halt( true );

                // prevent another dialog for "popstate" - events
                if( Y.doccirrus.DCWindowManager.getById( 'confirmModificationsDialog' ) ) {
                    return;
                }

                // no further handling for other kinds
                if( !(isTypeRouter || isTypeAppHref) ) {
                    return;
                }

                // handle modifications
                modifications = Y.doccirrus.utils.confirmModificationsDialog( {
                    saveButton: peek( currentActivity._isValid )
                } );

                modifications.on( 'discard', function() {
                    if( (currentActivity && currentActivity.isModified()) ) {
                        currentActivity.setNotModified();
                    }
                    if( isTypeRouter ) {
                        event.router.goRoute();
                    }
                    if( isTypeAppHref ) {
                        event.appHref.goHref();
                    }

                } );

                modifications.on( 'save', function() {
                    var
                        validTransition = Y.doccirrus.inCaseUtils.checkTransition( {
                            currentActivity: currentActivity,
                            transition: 'validate'
                        } );
                    if( validTransition ) {
                        self.saveAttachmentsAndTransition( {
                                transitionDescription: validTransition,
                                skipRedirectBack: true
                            } )
                            .then( function() {
                                if( isTypeRouter ) {
                                    event.router.goRoute();
                                }
                                if( isTypeAppHref ) {
                                    event.appHref.goHref();
                                }
                            } );
                    }

                } );

            } );
        },
        destroyBeforeUnloadView: function() {
            var
                self = this;

            if( !self.beforeUnloadView ) {
                return;
            }

            self.beforeUnloadView.detach();
            self.beforeUnloadView = null;

        },
        initAdditionalComputeds: function() {
            var
                self = this;
            self.isActivitySectionFullWidth = ko.computed( function() {
                var
                    showHouseCatalog = unwrap( self.showHouseCatalog ),
                    showDocTree = unwrap( self.showDocTree );
                return !showHouseCatalog && !showDocTree;
            } );
        },
        initializeQuotationTable: function() {
            var
                self = this,
                quotationTreatments = self.get( 'quotationTreatments' );

            if( !quotationTreatments ) {

                quotationTreatments = new QuotationTreatmentsHandler( {
                    binder: self.get( 'binder' ),
                    attachmentsModel: self.attachmentsModel
                } );
                self.set( 'quotationTreatments', quotationTreatments );

            }

        },
        destroyQuotationTable: function() {
            var
                self = this,
                quotationTreatments = self.get( 'quotationTreatments' );

            if( quotationTreatments ) {
                quotationTreatments.destroy();
                self.set( 'quotationTreatments', null );
            }
        },
        /**
         * @property attachmentsModel
         * @type {null|AttachmentsViewModel}
         */
        attachmentsModel: null,
        initAttachmentsModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity );

            if( currentActivity ) {

                self.attachmentsModel = new KoViewModel.createViewModel( {
                    NAME: 'AttachmentsViewModel',
                    config: {data: {}}
                } );

                //  hack to simplify linking to transition buttons
                //  TODO: replace with a computed here
                self.attachmentsModel._binder = self.get( 'binder' );

                self.attachmentsModel.loadFromAttachmentsObj( currentActivity.get( 'attachmentsObj' ) || [] );

            } else {
                Y.log( 'Attempted to initialize attachments but currentActivity not yet ready', 'warn', NAME );
            }

        },
        destroyAttachmentsModel: function() {
            var self = this;
            if( self.attachmentsModel ) {
                self.attachmentsModel.destroy();
                self.attachmentsModel = null;
            }
        },


        /**
         *  Save and attached documents which have been modified, then action a transition
         *
         *  Called by activity action buttons
         *
         *  @param parameters
         *  @return {*}
         */

        saveAttachmentsAndTransition: function( parameters ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( self.get( 'currentActivity' ) ),
                currentPatient = peek( self.get( 'currentPatient' ) ),
                incaseConfig = binder.getInitialData( 'incaseconfiguration' ),
                catalogTextHidden = incaseConfig && incaseConfig.catalogTextHidden || false,
                caseFolders = currentPatient.caseFolderCollection,
                loadAfter = parameters.loadAfter,
                invoiceNo = parameters.invoiceNo,

                dirtyDocuments;

            if (
                'approve' === parameters.transitionDescription.transition &&
                currentActivity.formId &&
                '' !== currentActivity.formId()
            ) {
                //  if approving an activity with a form we must disable the PDF buttons while the PDF regenerates on
                //  server - so add a print job pre-emptively
                binder.currentPdfJobs.push( {
                    'activityId': unwrap( currentActivity._id ),
                    'type': 'approve',
                    'progress': 0
                } );
            }

            if ( currentActivity._isEditable() && self.template && self.template.isValid && !self.template.isValid() ) {
                //  MOJ-8650 Save invalid forms as 'CREATED'
                currentActivity.status( 'INVALID' );
                if ( 'validate' === parameters.transitionDescription.transition ) {
                    Y.log( 'Form is not valid, setting transition to store instead of validate.', 'debug', NAME );
                    //  copy the transition description before changing it, is a reference the the activity schema
                    parameters.transitionDescription = JSON.parse( JSON.stringify( parameters.transitionDescription ) );
                    parameters.transitionDescription.transition = 'store';
                }
            }

            //  if form is busy then disable the button save button until form operation completes, then save
            if ( currentActivity._formBusy && currentActivity._formBusy() > 0 ) {
                return self.saveWhenFormReady( parameters );
            }

            return new Promise( function( resolve, reject ) {
                var
                    actType = peek( currentActivity.actType );

                switch( actType ) {
                    case 'SCHEIN':
                    case 'BGSCHEIN':
                    case 'PKVSCHEIN':
                        resolve( Y.doccirrus.inCaseUtils.checkBLSchein( {
                            activity: currentActivity
                        } )
                            .then( function( shouldChangeCaseFolder ) {
                                if( shouldChangeCaseFolder ) {
                                    Y.once( 'activityTransitioned', function( event ) {
                                        var
                                            patientId = event.data && event.data.patientId,
                                            caseFolderId = event.data && event.data.caseFolderId;
                                        caseFolders.load( {patientId: patientId} )
                                            .then( function() {
                                                binder.navigateToCaseFolder( {
                                                    caseFolderId: caseFolderId
                                                } );
                                            } );
                                    } );
                                }
                            } ) );
                        break;
                    case 'PRESCRBTM':
                        if ( self.getActivitiesWithoutRepetition().length > 2 ) {
                            self.showBtmRestrictionModal().then(function() {
                                resolve();
                            }).catch(function(error) {
                                reject(error);
                            });
                        } else {
                            resolve();
                        }
                        break;
                    default:
                        resolve();
                }
            } )
                .then( function() {
                    var
                        quotationTreatments = self.get( 'quotationTreatments' ),
                        activityActionButtonsViewModel = self.activityActionButtonsViewModel;

                    if( activityActionButtonsViewModel && quotationTreatments && quotationTreatments.hasModifications() ) {
                        return activityActionButtonsViewModel.saveQuotationTreatments();
                    }

                } )
                .then( function() {
                    //  fill form fields embedded in activity content (currently restricted to HISTORY type)
                    if ( 'HISTORY' === unwrap( currentActivity.actType ) ) {
                        self.attachmentsModel.processActivityContentEmbeds( currentActivity );
                    }

                    //  pass all new/modified documents to server for saving
                    dirtyDocuments = self.attachmentsModel.getDirtyDocuments();
                } )
                .then( function() {
                    var
                        //  status before updating activity
                        keepStatus = currentActivity.status();

                    //  force re-save of VALID activity to record new attachments
                    if ( dirtyDocuments.length > 0 && 'VALID' === keepStatus) {
                        if ('validate' === parameters.transitionDescription.transition) {
                            currentActivity.status('CREATED');
                        }
                    }

                    //  force re-save of VALID activity if backmapping must be updated
                    if (-1 !== currentActivity.userContent().indexOf('{') && 'VALID' === keepStatus) {
                        if ('validate' === parameters.transitionDescription.transition) {
                            Y.log( 'Saving otherwise valid activity to update backmapping.', 'debug', NAME );
                            currentActivity.content( currentActivity.content() );
                            currentActivity.status( 'CREATED' );
                        }
                    }

                    //  exception: if form is used in reporting then save the activity in any case (will trigger reporting update)
                    if ( self.template && self.template.useReporting && 'VALID' === currentActivity.status() ) {
                        if (parameters.transitionDescription.newStatus === currentActivity.status() ) {
                            Y.log( 'Saving VALID activity to update form in reporting.', 'debug', NAME );
                            currentActivity.status( 'CREATED' );
                        }
                    }

                    //  note that any dirty / new documents are saved to the server at this point
                    parameters.documents = dirtyDocuments;

                    //  May happen if attached documents have changed without affecting activity
                    if( parameters.transitionDescription.newStatus === currentActivity.status() ) {
                        if ( !self.template || !self.template.useReporting ) {
                            Y.log( 'No change to activity status, no transition needed, new: ' + parameters.transitionDescription.newStatus + ' old: ' + currentActivity.status(), 'debug', NAME );
                            return Promise.resolve( true );
                        }
                    }

                    //  On first save of an activity we must pass _randomId to claim attachments using it
                    if( !currentActivity._id() ) {
                        Y.log( 'Passing temporary _randomId with transition', 'debug', NAME );
                        parameters.transitionDescription.tempId = currentActivity._randomId();
                    }

                    if( invoiceNo ) {
                        currentActivity.invoiceNo = ko.observable( invoiceNo );
                    }

                    //  and carry on with the transition
                    return binder.transitionCurrentActivity( parameters );
                } )
                .then( function( activityData ) {
                    var
                        catalogTextModel = peek( currentActivity.catalogTextModel ),
                        activeTextItem = null,
                        action,
                        data,
                        redirectAfter = loadAfter || ( activityData && activityData.redirectAfter ),
                        formDoc;

                    if( catalogTextModel && !catalogTextHidden ){
                        action = catalogTextModel.isNew() ? 'create' : 'update';
                        data = catalogTextModel.toJSON();
                        activeTextItem = _.find(data.items,{ active: true });
                        if( activeTextItem ) {
                            activeTextItem.text = peek(currentActivity.userContent);
                        }
                        data.fields_ = [ 'items' ];
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.catalogtext[ action ]( {
                            data: data,
                            query: {
                                _id: data._id
                            }
                        } ) )
                            .then( function() {
                                return activityData;
                            } );
                    }

                    if ( activityData && activityData._attachmentsObj && self.attachmentsModel ) {
                        self.attachmentsModel.updateDocumentsFromAttachmentsObj( activityData._attachmentsObj );
                        Y.fire( 'documentsAllSaved', {} );

                        //  form might have been changed by transition, reload stored contents
                        formDoc = self.attachmentsModel.findDocument( 'FORM' );
                        if ( formDoc && self.template && formDoc.formState && 'remap' !== formDoc.formState() ) {
                            if ( self.template ) {
                                self.template.fromDict( formDoc.formState() );
                            }
                        }
                    }

                    //self.reloadActivityTable();

                    if( binder && binder.navigateToActivity && redirectAfter ) {
                        binder.navigateToActivity( { activityId: redirectAfter } );
                    }
                    return activityData;
                })
                .catch( function( error ) {
                    if( error && 'CANCELLED' === error.message ) {
                        Y.log( 'Activity transition has been cancelled by user', 'info', NAME );
                    } else {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        catchUnhandled( error );
                    }
                } );
        }
    }, {
        NAME: 'MirrorActivityDetailsViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            },
            currentPatient: {
                valueFn: function() {
                    return this.get( 'binder' ).currentPatient;
                },
                lazyAdd: false
            },
            currentActivity: {
                valueFn: function() {
                    var
                        binder = this.get( 'binder' );
                    return binder.currentActivity;
                },
                lazyAdd: false
            },
            /**
             * Shared "quotationTreatments" to be initialized by "QuotationTreatmentsTableEditorModel".
             * If unavailable wasn't initialized else use exposed methods and values to handle.
             * @attribute quotationTreatments
             * @default null
             * @type {QuotationTreatmentsHandler}
             * @see ActivityDetailsViewModel.initializeQuotationTable
             */
            quotationTreatments: {
                value: null
            }
        }
    } );

    KoViewModel.registerConstructor( MirrorActivityDetailsViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'KoUI-all',
        'dcutils',
        'inCaseUtils',
        'activity-schema',
        'dcauth',

        'ActivityActionButtonsViewModel',
        'ActivityHeadingViewModel',
        'MirrorActivitySidebarViewModel',
        'ActivityHouseCatalogViewModel',
        'ActivityDocTreeViewModel',
        'AttachmentsViewModel',

        'ActivitySectionDocumentViewModel',
        'ActivitySectionPDFViewModel',
        'ActivitySectionFormViewModel',
        'ActivitySectionFormTreeViewModel',
        'ActivitySectionTableViewModel',
        'ActivitySectionTextViewModel',
        'QuotationTreatmentsHandler'
    ]
} );
