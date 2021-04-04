/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, moment, _, jQuery, $ */
'use strict';
YUI.add( 'ActivityDetailsViewModel', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,

        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        auth = Y.doccirrus.auth,

        KoViewModel = Y.doccirrus.KoViewModel,

        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,

        ActivityActionButtonsViewModel = KoViewModel.getConstructor( 'ActivityActionButtonsViewModel' ),
        ActivityHeadingViewModel = KoViewModel.getConstructor( 'ActivityHeadingViewModel' ),

        MirrorActivitySidebarViewModel = KoViewModel.getConstructor( 'MirrorActivitySidebarViewModel' ),
        ActivitySidebarViewModel = KoViewModel.getConstructor( 'ActivitySidebarViewModel' ),

        ActivityHouseCatalogViewModel = KoViewModel.getConstructor( 'ActivityHouseCatalogViewModel' ),
        ActivityDocTreeViewModel = KoViewModel.getConstructor( 'ActivityDocTreeViewModel' ),

        ActivitySectionDocumentViewModel = KoViewModel.getConstructor( 'ActivitySectionDocumentViewModel' ),
        ActivitySectionPDFViewModel = KoViewModel.getConstructor( 'ActivitySectionPDFViewModel' ),
        ActivitySectionFormViewModel = KoViewModel.getConstructor( 'ActivitySectionFormViewModel' ),
        ActivitySectionFormTreeViewModel = KoViewModel.getConstructor( 'ActivitySectionFormTreeViewModel' ),
        ActivitySectionTableViewModel = KoViewModel.getConstructor( 'ActivitySectionTableViewModel' ),
        ActivitySectionTextViewModel = KoViewModel.getConstructor( 'ActivitySectionTextViewModel' ),
        ActivitySectionDynamicTabViewModel = KoViewModel.getConstructor( 'ActivitySectionDynamicTabViewModel' ),

        QuotationTreatmentsHandler = KoViewModel.getConstructor( 'QuotationTreatmentsHandler' );

    /**
     * @constructor
     * @class ActivityDetailsViewModel
     */
    function ActivityDetailsViewModel() {
        ActivityDetailsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityDetailsViewModel, KoViewModel.getDisposable(), {

        //  form template and mapper should live as long as currentActivity does in the client
        template: null,
        mapper: null,
        mapperContext: null,
        isFormLoading: null,
        isFormLoaded: null,

        formDivId: 'divFormsCompose',           //  static,
        patientRegId: '',
        /**
         * @property isFrameView
         * @type {boolean|ko.observable}
         * @default false
         */
        isFrameView: false,

        /** @protected */
        initializer: function() {
            var
                self = this;
            self.initActivityDetailsViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyActivityDetailsViewModel();
        },
        notifyActivityDetailsViewModel: function() {
            var
                $activityDetailsContent = document.getElementById( "activityDetailsContent" );

            if ( $activityDetailsContent ) {
                $activityDetailsContent.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
            }
        },
        initActivityDetailsViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            self.isFrameView = unwrap( binder.isFrameView );

            //  should be instantiated first, needed by views
            self.initAttachmentsModel();

            self.showDocTree = ko.observable( false );
            self.hasDocTree = ko.observable( false );

            self.initActivityNav();
            self.initActivitySectionViewModel();
            self.initActivityActionButtonsViewModel();
            self.initActivityHeadingViewModel();
            self.initActivitySidebarViewModel();
            self.initActivityHouseCatalogViewModel();
            self.initActivityDocTreeViewModel();
            self.initBeforeUnloadView();
            self.initAdditionalComputeds();
            self.initFormSubscriptions();
            self.initFormAndMapper();
            self.initHotKeys();

            self.initScrollMargin();

            self.warnSelectMSGI18n = i18n( 'InCaseMojit.ActivityDetailsVM.warn.SELECT_MSG' );
        },
        initScrollMargin: function() {
            jQuery( window ).on( 'scroll.ActivityDetailsViewModel',  _.debounce(function() {
                var jqDiv = jQuery( '#activityDetailsContent' );
                if ( !jqDiv || !jqDiv.offset() ) { return; }

                var
                    activityDetailsOffsetTop = jqDiv.offset().top,
                    activityDetailsHeight = jqDiv.innerHeight(),
                    maxScroll = activityDetailsHeight,
                    currentMargin = jQuery( window ).scrollTop() - activityDetailsOffsetTop + 8,
                    scrollItems = jQuery( '.scrollMarginItem' ),
                    $navBarHeader = $('#NavBarHeader'),
                    $patientInfoHeader = $('.activityPatientInfoViewModel').find('.panel-heading'),
                    $caseFolders =  $('.activityCaseFoldersViewModeldiv');

                if (!$navBarHeader.hasClass('NavBarHeader-fixedNot')) {
                    currentMargin += $navBarHeader.height();
                }

                if ( $patientInfoHeader.hasClass('affix-enabled') && $patientInfoHeader.hasClass('affix') ) {
                    currentMargin += $patientInfoHeader.height();
                }

                if ( $caseFolders.hasClass('affix-enabled') && $caseFolders.hasClass('affix') ) {
                    currentMargin += $caseFolders.height();
                }

                if( 1000 > jQuery(window).width() ) {
                    return;
                }
                if( 0 > currentMargin ) {
                    currentMargin = 0;
                }
                scrollItems.each( function() {
                    var
                        item = jQuery( this ),
                        itemHeight = item.innerHeight(),
                        itemMaxScroll = maxScroll - itemHeight;
                    if( itemHeight > activityDetailsHeight ){
                        return;
                    }
                    item.animate( {
                        marginTop:  currentMargin < itemMaxScroll ? currentMargin : itemMaxScroll
                    }, 200);
                } );
            }, 50) );

        },
        destroyScrollMargin: function() {
            jQuery( window ).off( 'scroll.ActivityDetailsViewModel' );
        },
        destroyActivityDetailsViewModel: function() {
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
            self.destroyScrollMargin();
        },

        hotKeysGroup: null,

        initHotKeys: function() {
            var
                self = this;
            /**
             * addSingleGroup is used, because of ActivityDetailsViewModel can be replaced by another ActivityDetailsViewModel
             *  it means new one will be initialized that old one will be destroyed.
             *  Old ActivityDetailsViewModel can unset hot keys.
             */
            self.shortCutsGroup = Y.doccirrus.HotKeysHandler.addSingleGroup( 'ActivityDetailsViewModel' );

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
                incaseconfiguration = binder.getInitialData('incaseconfiguration'),

                noVersion = ( !currentActivity.formVersion || !currentActivity.formVersion() || '' === currentActivity.formVersion() ),
                doBFBRedirect = currentActivity._isEditable() && noVersion,
                doBFBHide = currentActivity._isEditable(),

                currentActivityAttachments = self.attachmentsModel,

                formOptions = {
                    'patientRegId': self.patientRegId,
                    //'canonicalId': ko.unwrap( currentActivity.formId || '' ),
                    //'formVersionId': ko.unwrap( currentActivity.formVersion || '' ),
                    'domId': self.formDivId, ///
                    'il8nDict': {},
                    'doRender': false,
                    'isHidden': true,
                    'userLang': ko.unwrap( currentActivity.formLang || 'de' ),
                    'gender': ko.unwrap( currentActivity.formGender || 'n' )
                },

                mapperContext;

            //  remove any existing form before we get started
            self.destroyFormAndMapper();

            //  not all activity types can have a form, exit if no form possible
            if ( !currentActivity.canHaveForm ) {
                Y.log( 'Current activity type can not have a form: ', unwrap( currentActivity.actType ), 'info', NAME );
                return;
            }

            if( !currentActivity.formLookupInProgress || currentActivity.formLookupInProgress() ) {
                Y.log( 'form lookup in progress, waiting', 'info', NAME );
                //self.divId.html(Y.doccirrus.comctl.getThrobber());
                return;
            }

            if( true === self.isFormLoading() ) {
                Y.log( 'form load in progress, not starting another until it completes', 'info', NAME );
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

            Y.dcforms.runInSeries(
                [
                    loadCertNumbers,
                    createTemplate,
                    initMapperContext,
                    loadAdditionalContext,
                    loadSchein,
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
                function onFormTemplateLoaded( err ) {
                    var
                        clientBFB = Y.dcforms.clientHasBFB(),
                        i, j, elem;

                    //  race between form loading and navigating away
                    if ( !self.template || 'function' !== typeof self.isFormLoading ) { return; }

                    self.isFormLoading( false );
                    if ( err ) {
                        Y.log( 'Problem creating form template: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    //  BFB settings may require a different form to be loaded at this point
                    if( doBFBRedirect && self.template.isBFB && !clientBFB ) {

                        if( self.template.bfbAlternative && '' !== self.template.bfbAlternative ) {
                            Y.log( 'No BFB certification, loading alternative form', 'info', NAME );
                            formOptions.canonicalId = self.template.bfbAlternative;
                            formOptions.formVersionId = '';

                            if ( 'UTILITY' === currentActivity.actType() ) {
                                Y.log( 'No clearing content in mask.', 'debug', NAME );
                            } else {
                                // clear user content to set new form name
                                currentActivity.userContent( '' );
                                self.isFormLoading( true );
                                self.template.load( self.template.bfbAlternative, '', onFormTemplateLoaded );
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

                        for( i = 0; i < self.template.pages.length; i++ ) {
                            for( j = 0; j < self.template.pages[i].elements.length; j++ ) {

                                elem = self.template.pages[i].elements[j];
                                elem.isHiddenBFB = (elem.isBFB && !clientBFB);

                                //if (elem.isHiddenBFB) {
                                //    //console.log('hiding BFB element ' + elem.elemId);
                                //}
                            }
                        }
                    }

                    //  this may be different than what was requested due to BFB redirects, missing versions, etc
                    if ( currentActivity._isEditable() ) {
                        currentActivity.formId( self.template.canonicalId );
                        if (
                            self.template.formVersionId &&
                            '' !== self.template.formVersionId &&
                            self.template.formVersionId !== unwrap( currentActivity.formVersion )
                        ) {
                            Y.log( 'Setting missing form version Id: ' + self.template.formVersionId, 'debug', NAME );
                            currentActivity.formVersion( self.template.formVersionId );
                        }
                    }

                    //  EXTMOJ-858 set subtype from template when activity is created
                    if (
                        ( 'CREATED' === currentActivity.status() && currentActivity.subType ) &&
                        ( self.template.shortName && '' !== self.template.shortName ) &&
                        ( !currentActivity.subType() || '' === currentActivity.subType )
                    ) {
                        currentActivity.subType( self.template.shortName );
                    }

                    //  check for validation state of form after changes MOJ-11933
                    self.template.on( 'valueChanged', NAME, function( el ) { self.onFormValueChanged( el ); } );
                    self.activityActionButtonsViewModel.isFormValid( self.template.isValid() );

                    //  enable or disable extra serialization for backmapping to activity content
                    self.template.backmappingFields = Y.doccirrus.schemas.activity.actTypeHasBackmapping( ko.unwrap( currentActivity.actType ) );
                    itcb( null );
                }

                function onFormTemplateCreated( err, newFormTemplate ) {
                    if ( err ) {
                        Y.log( 'Could not create empty form template: ' + JSON.stringify( err ), 'error', NAME );
                        return itcb( err );
                    }
                    self.template = newFormTemplate;
                    self.template.load( ko.unwrap( currentActivity.formId || '' ), ko.unwrap( currentActivity.formVersion || '' ), onFormTemplateLoaded );
                }

                formOptions.callback = onFormTemplateCreated;
                Y.dcforms.createTemplate( formOptions );
            }

            //  X. Create form mapper context
            function initMapperContext( itcb ) {
                Y.doccirrus.forms.mappinghelper.createActivityMapperContext( binder, currentActivityAttachments, onContextCreated );
                function onContextCreated( err, newContext ) {
                    if ( err ) { return  itcb( err ); }

                    //  race between form loading and navigating away
                    if ( 'function' !== typeof self.isFormLoading ) { return; }

                    mapperContext = newContext;
                    self.mapperContext = newContext;
                    itcb( null );
                }
            }

            //  3. Load extra mapper context from dirty objects in the UI
            //  (currently only used for modified linked activities in QUOTATION table tab)
            function loadAdditionalContext( itcb ) {
                var
                    actType = unwrap( currentActivity.actType ),
                    quotationTreatments;

                mapperContext.activity._modifiedLinkedActivities = [];

                if ( 'QUOTATION' === actType ) {
                    quotationTreatments = binder.getQuotationTreatments();

                    if ( quotationTreatments ) {
                        mapperContext.activity._modifiedLinkedActivities = quotationTreatments.getModifications();
                        //console.log("modified quotation treatments", mapperContext.activity._modifiedLinkedActivities );
                    }
                }

                itcb( null );
            }

            //  4.  Load schein for invoices, MOJ-9048
            function loadSchein( itcb ) {
                if ( 'INVOICEREF' !== ko.unwrap( currentActivity.actType ) || 'INVOICE' !== ko.unwrap( currentActivity.actType ) ) { return itcb( null ); }

                Y.doccirrus.jsonrpc.api.patient
                    .lastSchein( {
                        'query': {
                            //'actType': actType,
                            'patientId': ko.unwrap( currentActivity.patientId ),
                            'caseFolderId': ko.unwrap( currentActivity.caseFolderId ),
                            'locationId': ko.unwrap( currentActivity.locationId ),
                            'timestamp': ko.unwrap( currentActivity.timestamp )
                        }
                    } )
                    .then( onScheinLoaded )
                    .fail( onScheinErr );

                function onScheinLoaded( result ) {
                    mapperContext.lastSchein = ( result && result.data && result.data[0] ) ? result.data[0] : null;
                    itcb( null );
                }

                function onScheinErr( err ) {
                    Y.log( 'Problem loading schein for invoice: ' + JSON.stringify( err ), 'warn', NAME );
                    //  continue in any case, there may not be a schein
                    itcb( null );
                }
            }

            //  5. set gender and language if available
            function setGenderAndLanguage( itcb ) {
                //  race between form loading and navigating away
                if ( !self.template || 'function' !== typeof self.isFormLoading ) { return; }

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

            //  6. Create mapper and scale the form to available space
            function createMapper( itcb ) {
                //  race between form loading and navigating away
                if ( !self.template || 'function' !== typeof self.isFormLoading ) { return; }

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
                //  race between form loading and navigating away
                if ( 'function' !== typeof self.isFormLoading ) { return; }

                Y.log( 'form load complete', 'debug', NAME );
                self.isFormLoading( false );

                if( err ) {
                    Y.log( 'Error loading form: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                //  listen for media uploads via the form
                //self.template.on('addUserImage', NAME, function( evt ) { self.onFormMediaAttached( evt ); } );
                self.isFormLoaded( true );
            }

        },

        /**
         *  Raised when the user changes the value of a form element, used to update button bar
         *
         *  @param  {Object}    el      A form element
         */

        onFormValueChanged: function( /* el */ ) {
            var self = this;
            self.activityActionButtonsViewModel.isFormValid( self.template.isValid() );
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
                navUrl = '#/activity/' + (currentActivityId ? currentActivityId : 'new') + '/section/',
                firstTimeOpened = true,
                activityTabsConfiguration = binder.getInitialData( 'activitytabsconfiguration' ),
                isSolsSupported = auth.isSolsSupported(),
                items = [
                    {
                        name: 'textform',
                        text: i18n( 'InCaseMojit.ActivityDetailsVM.tabs.TEXT' ),
                        href: navUrl + 'textform'
                    },
                    {
                        name: 'tableform',
                        text: i18n( 'InCaseMojit.ActivityDetailsVM.tabs.TABLE' ),
                        href: navUrl + 'tableform'
                    },
                    {
                        name: 'formform',
                        text: i18n( 'InCaseMojit.ActivityDetailsVM.tabs.FORM' ),
                        href: navUrl + 'formform'
                    },
                    {
                        name: 'formtreeform',
                        text: i18n( 'InCaseMojit.ActivityDetailsVM.tabs.CHOOSE_FORM' ),
                        href: navUrl + 'formtreeform'
                    },
                    {
                        name: 'documentform',
                        text: i18n( 'InCaseMojit.ActivityDetailsVM.tabs.DOCUMENTS' ),
                        href: navUrl + 'documentform'
                    },
                    {
                        name: 'pdfform',
                        text: i18n( 'InCaseMojit.ActivityDetailsVM.tabs.EXPORT' ),
                        href: navUrl + 'pdfform'
                    }
                ],
                index,
                tabsToHide;

            if ( window.location.href.indexOf('hideTabs') !== -1 ) {
                index = window.location.href.indexOf('hideTabs') + 'hideTabs='.length;
                tabsToHide = window.location.href.substring(index).split(',');

                items = items.filter( function (item) {
                   return tabsToHide.indexOf( item.name ) === -1;
                });
            }

            /**
             * Add DynamicTabs to the current tabs array
             */
            if ( isSolsSupported && activityTabsConfiguration && activityTabsConfiguration.length > 0) {
                _.each(activityTabsConfiguration, function(item) {
                    var isActivityCompatible = item.tabActiveActTypes.some(function(actType) {
                        return actType === currentActivity.actType();
                    });

                    if ( isActivityCompatible ) {
                        /**
                         * If the config contains tabs to be hidden,
                         * try to find them and remove them from the items array
                         */
                        if ( Array.isArray( item.hiddenTabs ) && item.hiddenTabs.length ) {
                            item.hiddenTabs.forEach( function( tabName ) {

                                items.forEach( function( itemsTab, index ) {
                                    if ( itemsTab.name === tabName ) {
                                        items.splice( index, 1 );
                                    }
                                } );
                            } );
                        }

                        items.push({
                            name: item.tabName,
                            text: item.tabTitle[ Y.doccirrus.i18n.language ],
                            href: navUrl + item.tabName,
                            targetUrl: item.targetUrl,
                            disabled: true
                        });

                        self.activeDynamicTabs.push(item);
                    }
                });
            }

            if( !self.activityNav ) {
                activityNav = self.activityNav = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        items: items
                    }
                } );

                /**
                 * Handle tab config
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        currentActivity = unwrap( binder.currentActivity ),
                        actType = unwrap( currentActivity.actType ),
                        isValid = peek( currentActivity._isValid ),
                        activeDynamicTabs = peek( self.activeDynamicTabs ),
                        items = unwrap( activityNav.items ),
                        route = unwrap( binder.route ),
                        currentPatient = unwrap(binder.currentPatient),
                        caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        country = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[(caseFolder || {}).type || 'ANY'];

                    ignoreDependencies( function() {
                        var
                            activityTypeMap =  Y.doccirrus.schemas.activity.getActTypeClientConfig( country ),
                            config = activityTypeMap[actType],
                            disabledTabs,
                            sectionTabName = route.params.sectionTab,
                            sectionTab = null,
                            localStorageData = Y.doccirrus.utils.localValueGet( 'activityOpenTab' ),
                            savedActivities,
                            savedActType,
                            navigateItem,
                            itemText,
                            dynamicActiveTab;

                        // enable all tabs, because previous ones might not be disabled by current config
                        // and also activating disabled is suppressed
                        if( currentActivity.status() === 'LOCKED' ){
                            Y.Array.invoke( items, 'disabled', true );
                            itemText = activityNav.getItemByName( 'textform' );
                            if( itemText ) {
                                itemText.active( true );
                                itemText.disabled( false );
                            }
                        } else {
                            Y.Array.invoke( items, 'disabled', false );

                            if( !config ) {
                                Y.Array.invoke( items, 'active', false );
                                Y.Array.invoke( items, 'disabled', true );
                                return;
                            }

                            // disable form tabs for received DOCLETTERs...
                            if( actType === 'DOCLETTER' && ['RECEIVED', 'RECEIVED_AND_READ']
                                .indexOf( peek( currentActivity.kimState ) ) !== -1 ) {
                                disabledTabs = config.disabledTabs.concat( ['formform', 'formtreeform'] );
                                // ...and change tab to textform
                                navigateItem = activityNav.getItemByName( 'textform' );
                                activityNav.activateTab( navigateItem );
                            } else {
                                disabledTabs = config.disabledTabs;
                            }

                            // disable those defined by config
                            disabledTabs.forEach( function( tabName ) {
                                var
                                    item = activityNav.getItemByName( tabName );

                                if( item ) {
                                    item.disabled( true );
                                }
                            } );

                            // Disable DynamicTabs
                            if ( !isValid && activeDynamicTabs && activeDynamicTabs.length > 0 ) {
                                activeDynamicTabs.forEach(function(activityTab) {
                                    var
                                        item = activityNav.getItemByName( activityTab.tabName );

                                    if( item ) {
                                        item.disabled( true );
                                    }
                                });
                            }
                        }

                        if( localStorageData ) {
                            savedActivities = JSON.parse( localStorageData );
                            savedActType = savedActivities[actType];
                        }

                        // activate that one defined by route
                        if ( sectionTabName ) {
                            sectionTab = activityNav.getItemByName( sectionTabName );
                        }

                        // Find the any dynamicTab compatible with current actType which is set as activeTab
                        dynamicActiveTab = _.find(activityTabsConfiguration, function(item) {
                            var isActivityCompatible = item.tabActiveActTypes.some(function(actType) {
                                return actType === currentActivity.actType();
                            });

                            return isActivityCompatible && item.activeTab;
                        });


                        if ( firstTimeOpened && currentActivity.pressButton() ) {
                            navigateItem = activityNav.getItemByName( 'documentform' );
                            activityNav.activateTab( navigateItem );
                        } else if ( firstTimeOpened && savedActType && activityNav.getItemByName( savedActType ) ) {
                            navigateItem = activityNav.getItemByName( savedActType );
                            activityNav.activateTab( navigateItem );
                        }
                        else if ( sectionTab && !peek( sectionTab.disabled ) ) {
                            activityNav.activateTab( sectionTab );
                        }
                        // activate the first activitytabsconfiguration with activeTab flag as true
                        else if ( dynamicActiveTab ) {
                            activityNav.activateTab( dynamicActiveTab.tabName );
                        }
                        // activate that one defined by config r custom logic on activity model
                        else if ( config.activeTab && activityNav.getItemByName( config.activeTab ) ) {
                            if ( currentActivity.initialTab ) {
                                activityNav.activateTab( currentActivity.initialTab() );
                            } else {
                                activityNav.activateTab( config.activeTab );
                            }
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
                        firstTimeOpened = false;
                    } );

                } ) );

                // Toggle DynamicTabs disabled attr based on currentActivity validity
                self.addDisposable(ko.computed( function() {
                    var
                        isValid = unwrap( currentActivity._isValid ),
                        activeDynamicTabs = peek( self.activeDynamicTabs );

                    activeDynamicTabs.forEach(function(activityTab) {
                        var
                            item = activityNav.getItemByName( activityTab.tabName );

                        if ( item ) {
                            item.disabled( !isValid );
                        }
                    });
                }));

                self.addDisposable(ko.computed( function() {
                    var
                        localStorageData = Y.doccirrus.utils.localValueGet( 'activityOpenTab' ),
                        activeTab = unwrap( activityNav.activeTab ),
                        actType = unwrap( currentActivity.actType ),
                        setData;
                    if ( localStorageData ) {
                        setData = JSON.parse( localStorageData );
                    } else {
                        setData = {};
                    }

                    if( activeTab ) {
                        setData[actType] = activeTab.name();
                        Y.doccirrus.utils.localValueSet( 'activityOpenTab', JSON.stringify( setData ) );
                    }
                }));

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
        activitySidebarTemplateToUse: null,
        initActivitySidebarViewModel: function () {
            var
                self = this,
                binder = self.get('binder'),
                currentActivity = peek(binder.currentActivity);

            if (peek(currentActivity.mirrorActivityId)) {
                self.activitySidebarViewModel = new MirrorActivitySidebarViewModel();
                self.activitySidebarTemplateToUse = 'mirrorActivitySidebarViewModel';
            } else {
                self.activitySidebarViewModel = new ActivitySidebarViewModel();
                self.activitySidebarTemplateToUse = 'activitySidebarViewModel';
            }
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
                // when actType is changed, activityDetailsViewModel should be reinitialized.
                // House catalog is shown only for editable activity.
                return;
            }

            self.activityHouseCatalogViewModel = new ActivityHouseCatalogViewModel( {
                activityDetailsViewModel: self
            } );
            self.showHouseCatalog = ko.observable();
            self.activityHouseCatalogViewModel.addDisposable( ko.computed( function() {
                var
                    showButtons = self.activityHouseCatalogViewModel && unwrap( self.activityHouseCatalogViewModel.showButtons ),
                    activityDetailsVM = KoViewModel.getViewModel( 'ActivityDetailsViewModel' ),
                    currentActivitySectionViewModel = unwrap( activityDetailsVM && activityDetailsVM.currentActivitySectionViewModel ),
                    correctSection = currentActivitySectionViewModel && 'ActivitySectionTableViewModel' !== currentActivitySectionViewModel.name;

                //  Hide house catalog when doctree is visible (when text areas have focus)
                if ( self.showDocTree() && self.hasDocTree() ) {
                    self.showHouseCatalog( false );
                    return;
                }

                self.showHouseCatalog( showButtons && correctSection );
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
        showDocTree: null,      //  observable, true if doc tree should be shown
        hasDocTree: null,       //  observable, true if doc tree should be shown and exists
        activityDocTreeViewModel: null,
        hasFormOrUserContent: null,
        initActivityDocTreeViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity );

            self._currentEditorListener = ko.computed( function() {
                var
                    currentActivitySectionViewModel = unwrap( self.currentActivitySectionViewModel ),
                    currentActivityEditor = currentActivitySectionViewModel && peek( currentActivitySectionViewModel.currentActivityEditor ),
                    hasUserContent = Boolean( currentActivityEditor && currentActivityEditor.userContent ),
                    actType = ko.unwrap( currentActivity.actType ),
                    hasFormVM = Boolean( currentActivitySectionViewModel && 'ActivitySectionFormViewModel' === currentActivitySectionViewModel.name ),
                    hasDocTreeVM = Boolean( self.activityDocTreeViewModel ),
                    hasMarkdownEditor = Boolean( currentActivityEditor && currentActivityEditor.showMarkdownEditor && currentActivityEditor.showMarkdownEditor() ),
                    isDocTreeType = Y.doccirrus.schemas.activity.actTypeHasDocTree( actType ),
                    isCatalogType = Y.doccirrus.schemas.activity.isCatalogType( actType ),
                    _isEditable = currentActivity._isEditable();

                //  check/set the appropriate edit target for documentation tree
                if ( hasDocTreeVM ) {
                    if ( hasFormVM ) {
                        //  form text inputs receive documentation tree / Textbausteine snippets
                        self.activityDocTreeViewModel.setTarget( null );
                    }

                    if ( hasMarkdownEditor ) {
                        //  markdown editor receives documentation tree / Textbausteine snippets
                        self.activityDocTreeViewModel.targetType = 'contentEditable';
                    } else {
                        //  userContent observable receives documentation tree / Textbausteine snippets
                        if ( hasUserContent ) {
                            self.activityDocTreeViewModel.setTarget( currentActivityEditor.userContent );
                        }
                    }
                }

                if ( isCatalogType || !_isEditable || !isDocTreeType ) {
                    // when actType is changed, activityDetailsViewModel should be reinitialized.
                    // DocTree is shown only for editable activity.
                    return self.showDocTree( false );
                }

                self.hasFormOrUserContent = hasUserContent || hasFormVM;

                //  documentation tree is shown for text inputs and editable forms
                self.showDocTree( self.hasFormOrUserContent );
            } );

            self._showDocTreeListener = ko.computed( function() {
                var
                    showDocTree = self.showDocTree();

                ignoreDependencies( function() {
                    var
                        currentActivitySectionViewModel = unwrap( self.currentActivitySectionViewModel ),
                        currentActivityEditor = currentActivitySectionViewModel && peek( currentActivitySectionViewModel.currentActivityEditor );

                    if( showDocTree ) {
                        self.activityDocTreeViewModel = new ActivityDocTreeViewModel( { currentEditor: currentActivityEditor } );
                        self.activityDocTreeViewModel.addDisposable( ko.computed( function() {
                            var
                                treeModel = self.activityDocTreeViewModel.treeModel();

                            self.hasDocTree( ( treeModel && treeModel.entries && treeModel.entries.length !== 0 ) );

                            if( !ko.computedContext.isInitial() && !treeModel ) {
                                Y.log( 'Could not find documentation tree for current activity.', 'warn', NAME );
                                //self.showDocTree( false );
                            }
                        } ) );

                    } else {
                        self.destroyActivityDocTreeViewModelOnly.call( self );
                    }
                } );
            } );

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
                        lastActivitySectionViewModel = peek( self.currentActivitySectionViewModel );

                    if( lastActivityNavSection === activeActivityNavSection ) {
                        return lastActivitySectionViewModel;
                    }

                    if( lastActivitySectionViewModel ) {
                        lastActivitySectionViewModel.destroy();
                    }

                    //  close any open form editors on change of tab, MOJ-9952
                    if ( self.template && self.template.selectedElement && 'formform' !== activeActivityNavSection ) {
                        self.template.setSelected( null, null );
                    }

                    lastActivityNavSection = activeActivityNavSection;

                    switch( activeActivityNavSection ) {
                        case 'textform':
                            redrawDocTree();
                            return new ActivitySectionTextViewModel();
                        case 'tableform':
                            return new ActivitySectionTableViewModel();
                        case 'formform':
                            redrawDocTree();
                            return new ActivitySectionFormViewModel();
                        case 'formtreeform':
                            redrawDocTree();
                            return new ActivitySectionFormTreeViewModel();
                        case 'documentform':
                            return new ActivitySectionDocumentViewModel();
                        case 'pdfform':
                            return new ActivitySectionPDFViewModel();
                        default:
                            if ( activeActivityNavSection.startsWith('dynamic-') ) {
                                return new ActivitySectionDynamicTabViewModel({
                                    tabName: activeActivityNavSection,
                                    targetUrl: unwrap( self.activityNav.activeTab ).initialConfig.targetUrl
                                });
                            }
                    }

                    return null;
                } );

                function redrawDocTree() {
                    self.showDocTree( false );
                    self.showDocTree( self.hasFormOrUserContent );
                }

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
                currentActivity = unwrap( binder.currentActivity ) || null,
                currentActivityActType = currentActivity && currentActivity.actType ? unwrap( currentActivity.actType ) : null;

            return !currentActivityActType;
        },
        beforeUnloadView: null,

        /**
         *

         */

        initBeforeUnloadView: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                router = binder.get( 'router' );

            if( self.beforeUnloadView ) {
                return;
            }

            self.beforeUnloadView = router.on( 'beforeUnloadView', function __ActivityDetailsVM_beforeUnloadView( yEvent, event ) {

                var
                    currentActivity = peek( binder.currentActivity ),
                    currentPatient = peek( self.get( 'currentPatient' ) ),
                    currentActivityId = currentActivity && peek( currentActivity._id ),
                    currentActivityActType = currentActivity && peek( currentActivity.actType ),
                    currentActivityStatus = currentActivity && peek( currentActivity.status ),
                    docsNeedSave = (self.activityActionButtonsViewModel && self.activityActionButtonsViewModel.documentNeedsSave()),
                    isAboutToNavigateToNewActivity = binder.get( 'isAboutToNavigateToNewActivity' ),
                    modifications,
                    isSubRoute,
                    isTypeRouter,
                    isTypeAppHref,
                    caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                    isImportedCaseFolder = caseFolder && caseFolder.imported,
                    isImported = Boolean( currentActivityStatus === 'IMPORTED' || isImportedCaseFolder );

                // no further modifications
                if( isImported ) {
                    return;
                }

                // no modifications, no further handling
                if( !(currentActivity && currentActivity.isModified()) || peek( currentActivity.mirrorActivityId ) ) {
                    if ( !docsNeedSave ) {
                        return;
                    }
                }

                //  save is currently underway MOJ-11181
                if ( currentActivity && currentActivity.inTransition() ) {
                    return;
                }

                isTypeRouter = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.router);

                isSubRoute = ( isTypeRouter &&
                               0 === event.router.route.indexOf( '/activity/' + (currentActivityId ? currentActivityId : 'new') )
                );

                // modifications, but allowed routes
                if( isSubRoute && !isAboutToNavigateToNewActivity ) {
                    return;
                }

                // reject case of not having actType, e.g. choose new from menu and after fill in an "actyType"
                if( isAboutToNavigateToNewActivity && !currentActivityActType ) {
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

                modifications.on( 'cancel', function() {
                    binder.set( 'newActivityConfig', null );
                } );

                modifications.on( 'discard', function() {
                    if( (currentActivity && currentActivity.isModified()) ) {
                        currentActivity.setNotModified();
                    }
                    if ( self.activityActionButtonsViewModel && self.activityActionButtonsViewModel.documentNeedsSave ) {
                        self.activityActionButtonsViewModel.documentNeedsSave( false );
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
                        transitionDescription = Y.doccirrus.schemas.activity.getTransitionDescription( 'validate' ),
                        validTransition;
                    transitionDescription.currentActivity = currentActivity;
                    validTransition = Y.doccirrus.inCaseUtils.checkTransition( transitionDescription );
                    if( validTransition || docsNeedSave ) {

                        //  special case for medication plan tables
                        if ( 'MEDICATIONPLAN' === currentActivityActType ) {
                            return saveMedicationPlan();
                        }

                        self.saveAttachmentsAndTransition( {
                                transitionDescription: transitionDescription,
                                skipRedirectBack: true
                            } )
                            .then( function() {
                                //  mark attachments as clean
                                if( docsNeedSave ) {
                                    self.activityActionButtonsViewModel.documentNeedsSave( false );
                                }

                                if( isTypeRouter ) {
                                    event.router.goRoute();
                                }
                                if( isTypeAppHref ) {
                                    event.appHref.goHref();
                                }
                            } )
                            .catch( function ( err ) {
                                Y.log( 'Error during transition: ' + JSON.stringify( err ), 'warn', NAME );
                            } );
                    }

                } );

                /**
                 *  Medication plan is a special case, has its own save method
                 *  Duplicative of code in ActivityActionButtonsViewModel, should probably be restructured
                 */

                function saveMedicationPlan() {
                    var
                        currentActivitySectionViewModel = peek( self && self.currentActivitySectionViewModel ),
                        medicationPlanEditor = currentActivitySectionViewModel && peek( currentActivitySectionViewModel.currentActivityEditor ),
                        data,
                        medications = [];

                    if( medicationPlanEditor ) {
                        data = medicationPlanEditor.medicationTable && peek( medicationPlanEditor.medicationTable.rows ) || [];
                        data.forEach( function( viewModel ) {
                            if( viewModel.isModified() || viewModel.isNew() ) {
                                medications.push( viewModel.toJSON() );
                            }
                        } );

                        Y.doccirrus.jsonrpc.api.activity.saveMedicationPlan( {
                            data: {
                                medicationPlan: currentActivity.toJSON(),
                                medications: medications
                            }
                        } )
                            .done( function(){
                                currentActivity.setNotModified();
                                binder.navigateToCaseFileBrowser({
                                    refreshCaseFolder: true
                                });
                            })
                            .fail( function( error ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } );
                    }
                }

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
                    hasDocTree = unwrap( self.hasDocTree ),
                    isFrameView = unwrap( self.isFrameView );
                return (!showHouseCatalog && !hasDocTree) || isFrameView;
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
         * @type {null|Object}
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

        reloadActivityTable: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentView = unwrap( binder.currentView );

            if ( currentView && currentView.activitiesTable ) {
                currentView.activitiesTable.reload();
            }
        },

        /**
         *  Raised by child views when user action would change activity to a different type
         *  prompts user for confirmation as chaging act type may result in loss of entered data
         *
         *  DEPERECATED: May be needed for persisting some form values, to be removed after testing MOJ-6589
         *
         *  @param  newActType          {String}
         *  @param  onActTypeChanged    {Function}  Called if user approves act type change
         */

        changeActType: function( newActType, onActTypeChanged ) {
            //  not showing duplicative dialog, MOJ-6589
            Y.log( 'Not showing duplicative dialog', 'debug', NAME );
            Y.doccirrus.inCaseUtils.createActivity( { actType: newActType } );
            onActTypeChanged();
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
                    actType = peek( currentActivity.actType ),
                    kimState = peek( currentActivity.kimState ),
                    flatFeeTreatmentId = peek( currentActivity.flatFeeTreatmentId ),
                    incaseconfiguration = binder.getInitialData( 'incaseconfiguration' );

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
                    case 'DOCLETTER':

                        if (
                            kimState  === 'RECEIVED_AND_READ' &&
                            !flatFeeTreatmentId &&
                            !incaseconfiguration.kimTreatmentAutoCreationOnEDocLetterReceived
                        ) {
                            Y.doccirrus.modals.KimTreatmentAutoCreationConfirmationModal.show(incaseconfiguration)
                                .then(function (updatedInCaseConfiguration) {
                                    Y.log('ActivityDetailsViewModel => saveAttachmentsAndTransition: DOCLETTER transitioned and KimTreatmentAutoCreationConfirmationModal taken', 'info', NAME);


                                    if ( updatedInCaseConfiguration ) {
                                        binder.setInitialData('incaseconfiguration', updatedInCaseConfiguration);

                                        resolve();
                                    } else {
                                        reject();
                                    }
                                })
                                .catch(function (error) {
                                    Y.log('Error during KimTreatmentAutoCreationConfirmationModal confirmation: ' + JSON.stringify(error), 'warn', NAME);

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
                    //  if activity is new, save form even if clean (ko mask mappers might not mark it dirty)
                    var isCreated = ( 'CREATED' === currentActivity.status() );

                    //  fill form fields embedded in activity content (currently restricted to HISTORY type)
                    if ( 'HISTORY' === unwrap( currentActivity.actType ) ) {
                        self.attachmentsModel.processActivityContentEmbeds( currentActivity );
                    }

                    //  pass all new/modified documents to server for saving
                    dirtyDocuments = self.attachmentsModel.getDirtyDocuments( isCreated );
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

                    //console.log( 'ActivityDetailsVM transition parameters', parameters );

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
                        formDoc,
                        modifyHomeCat = activityData.modifyHomeCat,
                        isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

                    if( catalogTextModel && !catalogTextHidden && ( !isSwiss || modifyHomeCat )){
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

                    //  Form may need to invoice number, receipt number, status, etc
                    if ( 'APPROVED' === activityData.status && self.mapper && self.mapper.onActivityApproved ) {
                        self.mapper.onActivityApproved( activityData );
                    }

                    if( 'PREPARED' === currentActivity.status() ) {
                        currentActivity.timestamp( moment( new Date() ).toISOString() );
                        currentActivity.timestamp.readOnly( true );
                        currentActivity.setNotModified();
                    }

                    self.reloadActivityTable();

                    if( binder && binder.navigateToActivity && redirectAfter ) {
                        binder.navigateToActivity( { activityId: redirectAfter } );
                    } else if ( binder && binder.isFrameView() ) {
                        // to trigger postMessage hooks in FrameView mode
                        binder.navigateToCaseFileBrowser();
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
        },

        /**
         * Method that notifies the user about the restriction of a BTM receipt to have more than 2 medications
         *
         * If accepted: It will resolve the promise and then create the BTM receipt with the first
         * two medications selected, not without having others unlinked
         *
         * If canceled: It will reject the promise and furthermore cancel the transition
         *
         * @return Promise */

        showBtmRestrictionModal: function( ) {
            var
                self = this,
                currentActivity = peek( self.get( 'currentActivity' ) ),
                activitiesWithoutRepetition = self.getActivitiesWithoutRepetition();

            return new Promise( function(resolve, reject) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: i18n( 'InCaseMojit.ActivityDetailsVM.warn.BTM_RESTRICTION' ),
                    window: {
                        width: 'auto',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        this.close();
                                        reject({
                                            message: 'CANCELLED'
                                        });
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'GENERATE', {
                                    isDefault: true,
                                    action: function() {
                                        _.chain( activitiesWithoutRepetition )
                                            .remove(function(activity, index) {
                                                return index >= 2;
                                            })
                                            .each(function(activityRest) {
                                                _.each(Y.dcforms.mapper.objUtils.getAllLinkedActivities( currentActivity ), function(activity) {
                                                    if (activity.code === activityRest.code) {
                                                        currentActivity._unlinkActivity(activity._id);
                                                    }
                                                });
                                            })
                                            .value();

                                        resolve();
                                        this.close();
                                    }
                                } )
                            ]
                        }
                    }
                } );
            });
        },

        activeDynamicTabs: ko.observableArray(),

        getActivitiesWithoutRepetition: function() {
            var
                self = this,
                currentActivity = peek( self.get( 'currentActivity' ) );

            return _.uniq( Array.from( Y.dcforms.mapper.objUtils.getAllLinkedActivities( currentActivity ) ), function(activity) {
                return activity.code;
            });
        },

        /**
         *  Interrupt saveAttachmentsAndTransition to wait for the form to be ready
         *
         *  If the form is busy mapping at the moment when the user clicks save, we need to wait for the mapping to
         *  complete, and the new form state to be written to the form document before we can save the attachments, or
         *  incorrect data may be written to the server, and the completed mapping overwritten when the transition
         *  calls back after processing on the server.  MOJ-10565
         *
         *  @param parameters
         *  @return promise
         */

        saveWhenFormReady: function( parameters ) {
            var
                self = this,
                currentActivity = peek( self.get( 'currentActivity' ) );

            if ( !currentActivity._formBusy || 0 === currentActivity._formBusy() ) {
                return self.saveAttachmentsAndTransition( parameters );
            }

            return new Promise( function( resolve, reject ) {

                //  subscribe to count of pending form operations
                var tempSubscription = currentActivity._formBusy.subscribe( onFormBusyStateChange );

                //  disable transition buttons while waiting to prevent double-save, etc
                self.activityActionButtonsViewModel.lockAllButtons( true );

                //  when the number of pending operations changes, check if we're done yet
                function onFormBusyStateChange( pendingOperationsCount ) {

                    if ( 0 === pendingOperationsCount ) {
                        tempSubscription.dispose();

                        self.activityActionButtonsViewModel.lockAllButtons( false );

                        self.saveAttachmentsAndTransition( parameters ).then( resolve ).catch( reject );
                    }
                }
            } );

        }

    }, {
        NAME: 'ActivityDetailsViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' );
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

    KoViewModel.registerConstructor( ActivityDetailsViewModel );

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
        'ActivitySidebarViewModel',
        'ActivityHouseCatalogViewModel',
        'ActivityDocTreeViewModel',
        'AttachmentsViewModel',

        'ActivitySectionDocumentViewModel',
        'ActivitySectionPDFViewModel',
        'ActivitySectionFormViewModel',
        'ActivitySectionFormTreeViewModel',
        'ActivitySectionTableViewModel',
        'QuotationTreatmentsHandler',
        'ActivitySectionTextViewModel',
        'MirrorActivitySidebarViewModel',
        'ActivitySectionDynamicTabViewModel',

        'dcforms-mappinghelper',
        'KimTreatmentAutoCreationConfirmationModal'
    ]
} );
