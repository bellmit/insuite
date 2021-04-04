/*eslint prefer-template:0 strict:0 */
/*global YUI, ko, moment, jQuery, $, _ */

'use strict';

YUI.add( 'CaseFileViewModel', function( Y, NAME ) {

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        ignoreDependencies = ko.ignoreDependencies,
        i18n = Y.doccirrus.i18n,
        BL_EXCEEDED = i18n( 'InCaseMojit.casefile_navJS.message.BL_EXCEEDED' ),
        NOT_PRINTED_ACTIVITIES = i18n( 'InCaseMojit.casefile_navJS.message.NOT_PRINTED_ACTIVITIES' ), // eslint-disable-line no-unused-vars
        SHOW_LEFT_SIDE_PANEL = i18n( 'InCaseMojit.casefile_browserJS.hotkey.SHOW_LEFT_SIDE_PANEL' ),
        CREATE_TRANSCRIPTION_TASK = i18n( 'InCaseMojit.casefile_browserJS.hotkey.CREATE_TRANSCRIPTION_TASK' ),
        SHOW_RIGHT_SIDE_PANEL = i18n( 'InCaseMojit.casefile_browserJS.hotkey.SHOW_RIGHT_SIDE_PANEL' ),
        NO_CASEFOLDER = i18n( 'InCaseMojit.casefile_detailJS.message.NO_CASEFOLDER' ),
        PATIENT_ERROR_ALERT = i18n( 'InCaseMojit.casefile_detailJS.message.PATIENT_ERROR_ALERT' ),
        CONTINUOUS_MEDICATION = i18n( 'InCaseMojit.activity_schema.CONTINUOUS_MEDICATION' ),
        NO_LONGER_VALID_MEDICATION = i18n( 'InCaseMojit.activity_schema.NO_LONGER_VALID' ),
        NO_LONGER_VALID_MEDICATION_TITLE = i18n( 'InCaseMojit.activity_schema.NO_LONGER_VALID.i18n' ),
        CONTINUOUS_MEDICATION_TITLE = i18n( 'activity-schema.Medication_T.phContinuousMed.i18n' ),
        SAMPLE_MEDICATION = i18n( 'InCaseMojit.activity_schema.SAMPLE_MEDICATION' ),
        SAMPLE_MEDICATION_TITLE = i18n( 'activity-schema.Medication_T.phSampleMed.i18n' ),
        SIDE_LEFT = i18n( 'activity-schema.Side_CH_E.LEFT' ),
        SIDE_RIGHT = i18n( 'activity-schema.Side_CH_E.RIGHT' ),
        DIAGNOSE_DOK = i18n( 'activity-schema.DiagnosisTreatmentRelevance_E.DOKUMENTATIV' ),
        DIAGNOSE_INVALIDATING = i18n( 'activity-schema.DiagnosisTreatmentRelevance_E.INVALIDATING' ),
        ACUTE_DOK = i18n( 'InCaseMojit.activity_schema.diagnose_type.ACUTE_DOK' ),
        ACUTE_TITLE = i18n( 'activity-schema.DiagnosisType_E.ACUTE' ),
        ACUTE_INVALIDATING = i18n( 'InCaseMojit.activity_schema.diagnose_type.ACUTE_INVALIDATING' ),
        CONT_DIAGNOSES = i18n( 'InCaseMojit.activity_schema.diagnose_type.CONT_DIAGNOSES' ),
        CONT_DIAGNOSES_TITLE = i18n( 'activity-schema.DiagnosisType_E.CONTINUOUS' ),
        CONT_DIAGNOSES_DOK = i18n( 'InCaseMojit.activity_schema.diagnose_type.CONT_DIAGNOSES_DOK' ),
        CONT_DIAGNOSES_INVALIDATING = i18n( 'InCaseMojit.activity_schema.diagnose_type.CONT_DIAGNOSES_INVALIDATING' ),
        A_CONT_DIAGNOSES = i18n( 'InCaseMojit.activity_schema.diagnose_type.A_CONT_DIAGNOSES' ),
        A_CONT_DIAGNOSES_TITLE = i18n( 'activity-schema.DiagnosisType_E.ANAMNESTIC' ),
        A_CONT_DIAGNOSES_DOK = i18n( 'InCaseMojit.activity_schema.diagnose_type.A_CONT_DIAGNOSES_DOK' ),
        A_CONT_DIAGNOSES_INVALIDATING = i18n( 'InCaseMojit.activity_schema.diagnose_type.A_CONT_DIAGNOSES_INVALIDATING' ),
        EXPENSES = i18n( 'InCaseMojit.casefile_detail.group.EXPENSES' ),
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        DocumentModel = KoViewModel.getConstructor( 'DocumentModel' ),

        InCaseMojitViewModel = KoViewModel.getConstructor( 'InCaseMojitViewModel' ),

        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),

        ActivityPatientInfoViewModel = KoViewModel.getConstructor( 'ActivityPatientInfoViewModel' ),
        ActivityDetailsViewModel = KoViewModel.getConstructor( 'ActivityDetailsViewModel' ),
        ActivityCaseFileButtonsViewModel = KoViewModel.getConstructor( 'ActivityCaseFileButtonsViewModel' ),
        ActivityConfigurableActionButtonsViewModel = KoViewModel.getConstructor( 'ActivityConfigurableActionButtonsViewModel' ),
        ActivityCaseFoldersViewModel = KoViewModel.getConstructor( 'ActivityCaseFoldersViewModel' ),
        ActivityCreateButtonsViewModel = KoViewModel.getConstructor( 'ActivityCreateButtonsViewModel' ),
        ActivitySequenceViewModel = KoViewModel.getConstructor( 'ActivitySequenceViewModel' ),
        CASE_FOLDER_TYPE_TO_COUNTRY_MAP =  Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP;

    function renderKimStatus( activity ) {
        var kimSignedBy, rendererdKimSignedBy, renderedKimState, kimStateIconClass,
            kimStateI18n = Y.doccirrus.schemaloader.translateEnumValue( 'i18n', activity.kimState, Y.doccirrus.schemas.activity.types.KimState_E.list, '-' );

        if( activity.kimSignedBy && activity.kimSignedBy.length ) {
            kimSignedBy = activity.kimSignedBy.map( function( signer ) {
                return [moment( signer.timestamp ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) ), signer.name].join( ' ' );
            } ).join( ', ' );
            rendererdKimSignedBy = ['&nbsp;<span class="glyphicon glyphicon-certificate" title="', kimSignedBy, '">', '</span>'].join( '' );
        }

        if( ['RECEIVED', 'RECEIVED_AND_READ'].indexOf( activity.kimState ) !== -1 ) {
            kimStateIconClass = 'fa-download';
        } else if( ['SEND'].indexOf( activity.kimState ) !== -1 ) {
            kimStateIconClass = 'fa-paper-plane-o';
        }
        if( kimStateIconClass ) {
            renderedKimState = ['&nbsp;<span class="fa ' + kimStateIconClass + '" title="', kimStateI18n, '">', '</span>'].join( '' );
        }

        return [rendererdKimSignedBy, renderedKimState].join( '' );
    }
    /**
     * @constructor
     * @class CaseFileViewModel
     * @extends InCaseMojitViewModel
     * @param   {Object}    config
     */
    function CaseFileViewModel( config ) {
        CaseFileViewModel.superclass.constructor.apply( this, config );
    }

    /**
     * @method randomString
     * return random string of given length
     * @private
     * @param {Number}    length
     * @return {String}
     */
    function randomString(length) {
        var result = '',
            characters  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
            charactersLength = characters.length,
            i;
        for ( i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    Y.extend( CaseFileViewModel, InCaseMojitViewModel, {
        templateName: 'CaseFileViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initCaseFileViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyCaseFileViewModel();
            if( this.removeVisibilityChangeListener ) {
                this.removeVisibilityChangeListener();
                this.removeVisibilityChangeListener = null;
            }
        },
        notifyMasterTab: function() {
            var
                self = this,
                currentPatient = unwrap( self.get( 'currentPatient' ) ) || {},
            handler = function() {
                if( !document.hidden && -1 !== location.hash.indexOf('/patient/') ) {
                    Y.doccirrus.communication.emit( 'masterTab.handleActivePatient', { patientId: peek( currentPatient._id ) } );
                }
            };
            document.addEventListener( 'visibilitychange', handler, false );
            this.removeVisibilityChangeListener = function() {
                document.removeEventListener( 'visibilitychange', handler );
            };
            Y.doccirrus.communication.emit( 'masterTab.handleActivePatient', { patientId: peek( currentPatient._id ) } );
        },

        /**
         * @property isFrameView
         * @type {boolean|ko.observable}
         * @default false
         */
        isFrameView: false,

        initCaseFileViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) );

            self.incaseConfig = binder.getInitialData( 'incaseconfiguration' );

            self.isFrameView = unwrap( binder.isFrameView );

            self.notifyMasterTab();
            self.initActivityCaseFoldersViewModel();
            self.initActivitiesTable();
            self.initPatientErrorAlert();
            self.initActivityPatientInfoViewModel();
            self.addDisposable( ko.computed( function() {

                return ignoreDependencies( function() {
                    var
                        currentActivityPatientInfoViewModel = peek( self.activityPatientInfoViewModel );

                    if( currentActivityPatientInfoViewModel ) {
                        currentActivityPatientInfoViewModel.destroy();
                    }

                    if( currentPatient ) {
                        self.activityPatientInfoViewModel( new ActivityPatientInfoViewModel() );
                    }
                    else {
                        self.activityPatientInfoViewModel( null );
                    }
                } );

            } ) );

            self.initActivityDetailsViewModel();
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( binder.currentActivity );

                return ignoreDependencies( function() {
                    var
                        currentActivityDetailsViewModel = peek( self.activityDetailsViewModel );

                    if( currentActivityDetailsViewModel ) {
                        currentActivityDetailsViewModel.destroy();
                    }

                    if( currentActivity ) {
                        self.activityDetailsViewModel( new ActivityDetailsViewModel() );
                    }
                    else {
                        self.activityDetailsViewModel( null );
                    }
                } );

            } ) );

            self.initActivityCaseFileButtonsViewModel();
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( binder.currentActivity );

                return ignoreDependencies( function() {
                    var
                        currentActivityCaseFileButtonsViewModel = peek( self.activityCaseFileButtonsViewModel );

                    if( currentActivityCaseFileButtonsViewModel ) {
                        currentActivityCaseFileButtonsViewModel.destroy();
                    }

                    if( currentActivity ) {
                        self.activityCaseFileButtonsViewModel( null );
                    }
                    else {
                        self.activityCaseFileButtonsViewModel( new ActivityCaseFileButtonsViewModel() );
                    }
                } );

            } ) );

            self.initActivityConfigurableActionButtonsViewModel();
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( binder.currentActivity );

                return ignoreDependencies( function() {
                    var
                        currentActivityConfigurableActionButtonsViewModel = peek( self.activityConfigurableActionButtonsViewModel );

                    if( currentActivityConfigurableActionButtonsViewModel ) {
                        currentActivityConfigurableActionButtonsViewModel.destroy();
                    }

                    if( currentActivity ) {
                        self.activityConfigurableActionButtonsViewModel( null );
                    }
                    else {
                        self.activityConfigurableActionButtonsViewModel( new ActivityConfigurableActionButtonsViewModel() );
                    }
                } );

            } ) );

            if (!self.isFrameView) {
                self.initActivityCreateButtonsViewModel();
                self.initActivitySequenceViewModel();
            }
            self.initColumnClassName();
            self.initSocketListeners();
            self.initComputedIsCurrentView();

            self.initPin();
        },
        initPin: function() {
            var
                self = this;

            // Patient Info PIN Handler
            self.addDisposable( ko.computed( function() {
                var
                    // Selectors
                    $patientInfo,
                    $caseFolders,
                    $caseFileButtons,
                    $activityActionButtons,
                    $wyswyg,

                    // Flags
                    activityPatientInfoRendered,
                    activityCaseFoldersRendered,
                    activityCaseFileButtonsRendered,
                    activityActionButtonsRendered,
                    wyswygRendered,

                    activityPatientInfoPinned,
                    activityCaseFoldersPinned,
                    activityCaseFileButtonsPinned,
                    activityActionButtonsPinned,
                    wyswygPinned,

                    binder = self.get( 'binder' ),
                    activeTab = unwrap( binder.get('navigation').activeTab ), // eslint-disable-line
                    isNavBarHeaderPinned = unwrap( Y.doccirrus.NavBarHeader.fixed ), // eslint-disable-line
                    activityPatientInfo = unwrap( self.activityPatientInfoViewModel ),
                    isPatientInfoCollapsed = unwrap (activityPatientInfo.isInfoCollapsed), // eslint-disable-line
                    activityCaseFolders = unwrap( self.activityCaseFoldersViewModel ),
                    activityCaseFileButtons = unwrap( self.activityCaseFileButtonsViewModel ),
                    activityDetailsViewModel = unwrap( self.activityDetailsViewModel ),
                    activityActionButtons = activityDetailsViewModel ? activityDetailsViewModel.activityActionButtonsViewModel : null,
                    wyswyg = getWyswyg();

                function getWyswyg () {
                    var
                        wyswyg = null,
                        currentActivitySectionViewModel,
                        currentActivityEditor;

                    if (activityDetailsViewModel) {
                        currentActivitySectionViewModel = unwrap(activityDetailsViewModel.currentActivitySectionViewModel);

                        if (currentActivitySectionViewModel && currentActivitySectionViewModel.name === 'ActivitySectionTextViewModel') {
                            currentActivityEditor = unwrap( currentActivitySectionViewModel.currentActivityEditor );

                            if (currentActivityEditor) {
                                wyswyg = currentActivityEditor.wyswyg;
                            }
                        } else if (currentActivitySectionViewModel && currentActivitySectionViewModel.wyswyg) {
                            wyswyg = currentActivitySectionViewModel.wyswyg;
                        }
                    }

                    return wyswyg;
                }


                if ( activeTab && peek( activeTab.name ) !== 'tab_caseFile' ) {
                    return;
                }

                // PatientInfo Flags
                activityPatientInfoRendered = activityPatientInfo ? unwrap( activityPatientInfo.isRendered ) : false;

                activityPatientInfoPinned = activityPatientInfoRendered ? unwrap( activityPatientInfo.isPinned ) : null;

                // ActivityCaseFolders Flags
                activityCaseFoldersRendered = activityCaseFolders ? unwrap( activityCaseFolders.isRendered ) : false;

                activityCaseFoldersPinned = activityCaseFolders ? unwrap( activityCaseFolders.isPinned ) : null;

                // ACtivityCaseFileButtons Flags
                activityCaseFileButtonsRendered = activityCaseFileButtons ? unwrap( activityCaseFileButtons.isRendered ) : false;

                activityCaseFileButtonsPinned = activityCaseFileButtons ? unwrap( activityCaseFileButtons.isPinned ) : null;

                // ActivityActionButtons Flags
                activityActionButtonsRendered = activityActionButtons ? unwrap( activityActionButtons.isRendered ) : false;

                activityActionButtonsPinned = activityActionButtons ? unwrap( activityActionButtons.isPinned ) : null;

                // wyswyg Flags
                wyswygRendered = wyswyg ? unwrap( wyswyg.isRendered ) : false;

                wyswygPinned = wyswyg ? unwrap( wyswyg.isPinned ) : null;

                $('.phantom-item').remove();

                $(window).off('.affix');

                /**
                 *
                 * PatientInfo Pin Handler
                 *
                 */
                if (activityPatientInfoRendered) {
                    $patientInfo =  $('.activityPatientInfoViewModel');

                    if ( activityPatientInfoPinned ) {
                        addAffix($patientInfo.find('.panel-heading'), 'patient-info');
                    }  else {
                        disableAffix($patientInfo.find('.panel-heading'));
                        removePhantom( $patientInfo.find('.panel-heading'), 'patient-info' );
                    }
                }


                /**
                 *
                 * ActivityCaseFolders Pin Handler
                 *
                 */

                if (activityCaseFoldersRendered) {
                    $caseFolders =  $('.activityCaseFoldersViewModeldiv');

                    if ( activityCaseFoldersPinned ) {
                        addAffix($caseFolders, 'case-folders');
                    }  else {
                        disableAffix($caseFolders);
                        removePhantom( $caseFolders, 'case-folders');
                    }
                } else {
                    return;
                }


                /**
                 *
                 * ActivityCaseFileButtons Pin Handler
                 *
                 */

                if (activityCaseFileButtonsRendered) {
                    $caseFileButtons = $('.activityCaseFileButtonsViewModel');

                    if ( activityCaseFoldersPinned && activityCaseFileButtonsPinned) {
                        addAffix($caseFileButtons, 'case-buttons');
                    }  else {
                        disableAffix($caseFileButtons);
                        removePhantom( $caseFileButtons, 'case-buttons');
                    }
                }

                /**
                 * ActivityDetailsVieModel > activityActionButtonsViewModel  Pin Handler
                 */

                if (activityActionButtonsRendered) {
                    $activityActionButtons = $('.activityActionButtonsViewModel');

                    if ( activityCaseFoldersPinned && activityActionButtonsPinned ) {
                        addAffix($activityActionButtons, 'activity-buttons');
                    }  else {
                        disableAffix($activityActionButtons);
                        removePhantom( $activityActionButtons, 'activity-buttons');
                    }
                }

                /**
                 * ActivityDetailsVieModel > currentActivitySectionViewModel > wyswyg Pin Handler
                 */

                if (wyswygRendered) {
                    $wyswyg = $('.wyswyg_bar');

                    if ( wyswygPinned ) {
                        addAffix($wyswyg, 'wyswyg');
                    }  else {
                        disableAffix($wyswyg);
                        removePhantom( $wyswyg, 'wyswyg');
                    }
                }
            }).extend({ method: "notifyWhenChangesStop", notify: 'always', rateLimit: 500 }));

            /**
             * @method PRIVATE
             *
             * Add phantom item before the element passed
             *
             * @param $element {Object} - jQuery element of the component
             * @param idName {string} - ID to identify the phantom
             */
            function addPhantom ($element, idName) {
                var
                    windowOffset = window.pageYOffset,
                    phantomHeight;

                if ( !$element.prev().is('#phantom-' + idName) ) {
                    phantomHeight = getCompleteItemHeight($element, true);
                    $('<div class="phantom-item" id="phantom-' + idName + '"></div>').height( phantomHeight ).insertBefore($element);
                    $(window).scrollTop(windowOffset);
                }
            }

            /**
             * @method PRIVATE
             *
             * Remove the phantom item related to the element passed
             *
             * @param $element {Object} - jQuery element of the component
             * @param idName {string} - ID to identify the phantom
             *
             */
            function removePhantom ($element, idName) {
                if ( $element.prev().is('#phantom-' + idName ) ) {
                    $element.prev().remove();
                }
            }

            /**
             * @method PRIVATE
             *
             * Helper to get the OffsetTop value of the $element passed
             * Taking into account its phantom element(if is still on the DOM) subtracting its height,
             * and also subtracting height of the pinned items above it so that it will be pinned
             * exactly when scrolling by the top edge of the $element and the bottom edge of the last pinned component
             *
             * @param $element
             * @returns {number} - OffsetTop value of the element passed
             */
            function getOffsetTop($element) {
                var
                    offsetTop,
                    phantomPrefix = 'phantom-',
                    phantomId = phantomPrefix + $element.data('phantomId'),
                    $phantomElement = $('#' + phantomId);


                /**
                 *
                 * If the component is already pinned
                 * then it should take the offset of its phantom element
                 * so that the affix point is the real position of the element when is not Pinned
                 *
                 */
                if ($phantomElement.length > 0) {
                    offsetTop = $phantomElement.offset().top;
                } else {
                    offsetTop = $element.offset().top;
                }

                /**
                 *
                 * The current pinned element's heights above the evaluated $element
                 * should be added so the component gets pinned when its top point match with
                 * the bottom point of the last item pinned
                 *
                 */
                $('.NavBarHeader-fixed, .affix-enabled').get().some(function(element) {
                    var $currentElement = $(element),
                        hasPhantom = $currentElement.prev().is('#phantom-'+$currentElement.data('phantomId'));

                    if ($element.get(0).className === element.className) {
                        return true;
                    } else {
                        offsetTop -= getCompleteItemHeight(hasPhantom ? $currentElement.prev() : $currentElement, true) || 0;
                    }
                });

                this.top = offsetTop;

                return offsetTop;
            }

            /**
             * @method PRIVATE
             *
             * Callback to PIN a component
             *
             * @param $element {Object} - jQuery element of the component to PIN
             */
            function pinCb($element) {
                var
                    marginTopValue = 0,
                    phantomId = $element.data('phantomId');

                if ($element.hasClass('affix-enabled') && $element.hasClass('affix')) {
                    addPhantom($element, phantomId);

                    $element.css( 'width', $element.parent().width() + 'px');

                    $('.NavBarHeader-fixed, .affix-enabled').get().some(function(element) {
                        var $currentElement = $(element);

                        if ($element.get(0).className === element.className) {
                            return true;
                        } else {
                            marginTopValue += getCompleteItemHeight($currentElement) || 0;
                        }
                    });

                    $element.css('margin-top', marginTopValue + 'px' );
                }
            }

            /**
             * @method PRIVATE
             *
             * Add affix to the elements that are affix-enabled, disabling old affix so that the element have just one event listener
             * Also add the event listener when its being pin(affix)/unpinned(affixed-top)
             *
             * @param $element {Object} - jQuery element of the component to affix
             * @param phantomId {String} - ID used to select the phantom element related to the element
             */
            function addAffix ($element, phantomId) {
                disableAffix($element);

                if ($element.hasClass('affix-enabled')) {
                    $element.data('phantomId', phantomId);

                    $element.affix({
                        offset: {
                            top: getOffsetTop
                        }
                    });

                    pinCb($element);

                    /**
                     * Listener for the affixed/pinned event
                     */
                    $element.on('affixed.bs.affix', pinCb.bind(this, $element));

                    /**
                     * Listener for the affixed-top/unpinned event
                     */
                    $element.on('affixed-top.bs.affix', function () {
                        removePhantom($element, phantomId);
                        restoreUnpinned($element);
                    });
                }
            }

            /**
             * @method PRIVATE
             *
             * Disable old affix event listeners and clean css
             *
             * @param $widget
             */
            function disableAffix ($widget) {
                var
                    phantomId = 'phantom-' + $widget.data('phantomId');

                removePhantom($widget, phantomId);

                $widget.css('margin-top', '0px');
                $widget.removeData('bs.affix phantomId').removeClass('affix affix-top');
                $widget.off('affixed affixed-top affixed.bs affixed.bs.affix affixed-top.bs.affix');

                restoreUnpinned($widget);
            }

            /**
             * @method PRIVATE
             * Restore width and margin top to the component
             * Used when unpinning component
             *
             * @param $widget {Object} - jQuery element of the component to clean up
             */
            function restoreUnpinned ($widget) {
                $widget.css('margin-top', '');
                $widget.css('width', '100%');
            }

            /**
             * @method PRIVATE
             *
             * Helper to get elements complete height taken in the DOM, incluiding padding top/bottom,
             * and if needed also the margin top/bottom if the flag is passed
             *
             * @param $item
             * @param includeMargin {Boolean} - Flag to determine if margin should alaso be taken into account
             *
             * @returns {number} - Number of the complete height computed
             */
            function getCompleteItemHeight ($item, includeMargin) {
                var
                    height = $item.height(),
                    paddingTop = parseInt( $item.css('padding-top'), 10 ),
                    paddingBottom = parseInt( $item.css('padding-bottom'), 10 ),
                    borderTop = parseInt( $item.css('border-top-width'), 10 ),
                    borderBottom = parseInt( $item.css('border-bottom-width'), 10 ),
                    total =  (height + paddingTop + paddingBottom + borderTop + borderBottom);

                if ( includeMargin ) {
                    total += parseInt( $item.css('margin-top'), 10 );
                    total += parseInt( $item.css('margin-bottom'), 10 );
                }

                return total;
            }

            /**
             * activityCaseFileButtons (CaseFileBrowser View) and activityActionButtons (ActivityView)
             * depends on the activityCaseFoldersViewModel, meaning both will be pinned (if available) when
             * activityCaseFoldersViewModel is pinned
             */
            self.addDisposable( ko.computed( function() {
                var
                    activityCaseFolders = peek( self.activityCaseFoldersViewModel ),
                    activityCaseFoldersPinned = unwrap( activityCaseFolders.isPinned ),
                    activityDetailsViewModel = unwrap( self.activityDetailsViewModel ),
                    activityCaseFileButtons = unwrap( self.activityCaseFileButtonsViewModel ),

                    activityActionButtons = activityDetailsViewModel ? activityDetailsViewModel.activityActionButtonsViewModel : null;

                if ( activityCaseFileButtons ) {
                    activityCaseFileButtons.isPinned(activityCaseFoldersPinned);
                }

                if ( activityActionButtons ) {
                    activityActionButtons.isPinned(activityCaseFoldersPinned);
                }
            }));


            /**
             * @method PRIVATE
             *
             * When side bars are pinned/unpinned, the width of the pinned components should change to match their containers width
             */
            function adjustPinnedComponentsWidth() {
                $('.affix-enabled.affix').each(function () {
                    var $currentElement = $(this);

                    _.delay(function () {
                        $currentElement.css( 'width', $currentElement.parent().width() + 'px');
                    }, 0);
                });
            }

            /**
             *
             * Listen for columnClassName change to re-calculate the width of the pinned components
             * this columnClassName change when some of the sidebars component are pinned/unpinned
             *
             */
            self.addDisposable( self.columnClassName.subscribe(adjustPinnedComponentsWidth) );

            $(window).resize(_.throttle(adjustPinnedComponentsWidth, 500));
        },
        initComputedIsCurrentView: function() {
            var
                self = this;

            self.addDisposable( ko.computed( function() {
                var
                    isCurrentView = unwrap( self.isCurrentView );

                ignoreDependencies( function() {
                    if( isCurrentView ) {
                        self.initHotKeys();
                        self.attachActivitiesTableShowMoreContentListener();
                    }
                    else {
                        self.destroyHotKeys();
                        self.detachActivitiesTableShowMoreContentListener();
                    }
                } );
            } ) );
        },
        initHotKeys: function() {
            var
                self = this,
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder );

            self.addDisposable( ko.computed( function() {
                var
                    currentPatient = unwrap( self.get( 'currentPatient' ) ),
                    caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                    isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder );

                if( self.creationKeysSubscribed === null || self.navigationKeysSubscribed === null ) {
                    return;
                }

                if( !self.hotKeysGroup ) {
                    self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'CaseFileViewModel' );
                }

                if( isEDOC && self.creationKeysSubscribed ) {
                    self.unsubscribeCreationKeys();
                }

                if( !isEDOC && !self.creationKeysSubscribed ) {
                    self.subscribeCreationKeys();
                }

                if( !self.navigationKeysSubscribed ) {
                    self.subscribeNavigationKeys();
                }

            } ) );

            //  TODO: check if existing activity should be saved MOJ-6386

            self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'CaseFileViewModel' );
            if( isEDOC ) {
                self.subscribeNavigationKeys();
                self.creationKeysSubscribed = false;
            } else {
                self.subscribeCreationKeys();
                self.subscribeNavigationKeys();
            }

        },

        creationKeysSubscribed: null,
        navigationKeysSubscribed: null,

        subscribeCreationKeys: function() {

            var
                self = this;

            Y.doccirrus.jsonrpc.api.shortcut.read( { query: { group: 'CaseFileViewModel', actType: { $ne: '' } } } )
                .then( function( response ) {

                    //  timing - on slow systems the vm may be disposed before this step, when navigating away from the casefolder
                    if (!self.hotKeysGroup) {
                        return;
                    }

                    response.data.forEach( function( shortcut ) {
                        var newActivityConfig = {};
                        if( shortcut.formId ) {
                            newActivityConfig.formId = shortcut.formId;
                        }

                        self.hotKeysGroup.on( shortcut.name, Y.doccirrus.schemaloader.translateEnumValue( 'i18n', shortcut.actType, Y.doccirrus.schemas.activity.types.Activity_E.list, '' ) + ' ' + shortcut.description, function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: shortcut.actType,
                                newActivityConfig: newActivityConfig
                            } );
                        } );
                    } );

                    self.hotKeysGroup
                        .on( 'ctrl+a', 'Anamnese', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'HISTORY'
                            } );
                        } )
                        .on( 'ctrl+d', 'Diagnose', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'DIAGNOSIS'
                            } );
                        } )
                        .on( 'ctrl+f', 'Formular', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'FORM'
                            } );
                        } )
                        .on( 'ctrl+k', 'Kassenrezept Formular', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'PUBPRESCR'
                            } );
                        } )
                        .on( 'ctrl+l', 'Leistung', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'TREATMENT'
                            } );
                        } )
                        .on( 'ctrl+m', 'Medikament', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'MEDICATION'
                            } );
                        } )
                        .on( 'ctrl+e', 'Neuen Eintrag', function() {
                            Y.doccirrus.inCaseUtils.createActivity();
                        } )
                        .on( 'ctrl+r', 'Privatrezept Formular', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'PRIVPRESCR'
                            } );
                        } )
                        .on( 'ctrl+b', 'Schein', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'SCHEIN'
                            } );
                        } )
                        .on( 'shift+ctrl+b', 'Fall', function() {
                            Y.doccirrus.inCaseUtils.createNewCaseFolderWithSchein();
                        } )
                        .on( 'shift+ctrl+k', 'Kontakt', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'CONTACT'
                            } );
                        } )
                        .on( 'ctrl+u', 'Überweisungsformular', function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'REFERRAL'
                            } );
                        } )
                        .on( 'shift+ctrl+z', i18n( 'InCaseMojit.casefile_browserJS.hotkey.CREATE_OPHTHALMOLOGY_TONOMETRY' ), function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'OPHTHALMOLOGY_TONOMETRY'
                            } );
                        } )
                        .on( 'shift+ctrl+r', i18n( 'InCaseMojit.casefile_browserJS.hotkey.CREATE_OPHTHALMOLOGY_REFRACTION' ), function() {
                            //  hard reload, route needed to refresh page from server on windows machines, eg after hotpatches
                            //  task from impediments list
                            window.location.reload( true );
                        } )
                        .on( 'shift+ctrl+a', i18n( 'InCaseMojit.casefile_browserJS.hotkey.CREATE_AU' ), function() {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                actType: 'AU'
                            } );
                        } )
                        .on( 'ctrl+s', CREATE_TRANSCRIPTION_TASK, function() {
                            onTranscribeHotKey();
                        } )
                        .on( 'alt+s', CREATE_TRANSCRIPTION_TASK, function() {
                            onTranscribeHotKey();
                        } )
                        .on( 'shift+ctrl+arrowLeft', SHOW_LEFT_SIDE_PANEL, function() {
                            var
                                activityCreateButtonsViewModel,
                                leftSidePanel;

                            if (!self.isFrameView) {
                                activityCreateButtonsViewModel = peek( self.activityCreateButtonsViewModel );
                                leftSidePanel = activityCreateButtonsViewModel && activityCreateButtonsViewModel.leftSidePanel;

                                if( leftSidePanel ) {
                                    leftSidePanel.toggleSideBar();
                                }
                            }
                        } )
                        .on( 'shift+ctrl+arrowRight', SHOW_RIGHT_SIDE_PANEL, function() {
                            var
                                activitySequenceViewModel,
                                rightSidePanel;

                            if (!self.isFrameView) {
                                activitySequenceViewModel = peek(self.activitySequenceViewModel);
                                rightSidePanel = activitySequenceViewModel && activitySequenceViewModel.rightSidePanel;

                                if (rightSidePanel) {
                                    rightSidePanel.toggleSideBar();
                                }
                            }
                        } )
                        .on( 'shift+ctrl+m', 'Neuer Termin', function() {
                            var
                                binder = self.get( 'binder' );
                            binder.navigateToCalendar();
                        } )
                        .on( 'shift+ctrl+v', i18n( 'InCaseMojit.casefile_browserJS.hotkey.PRESCRIBE' ), function() {
                            var
                                currentPatient = peek( self.get( 'currentPatient' ) ),
                                activitiesTable = self.activitiesTable,
                                caseFolderActive = currentPatient.caseFolderCollection.getActiveTab(),
                                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                                allValid = selected.every( function( activity ) {
                                    return 'VALID' === activity.status;
                                } ),
                                allMedications = selected.every( function( activity ) {
                                    return 'MEDICATION' === activity.actType;
                                } );
                            if ( allValid && caseFolderActive.type && allMedications ) {
                                self.openMedicationPlanModal();
                            }
                        } )

                        .on( 'alt+p', i18n( 'InCaseMojit.casefile_browserJS.hotkey.PRINT' ), function() {

                            var
                                binder = self.get( 'binder' ),
                                currentView = unwrap( binder.currentView ),
                                activityDetailsVM = currentView.activityDetailsViewModel ? unwrap( currentView.activityDetailsViewModel ) : null;

                            if ( activityDetailsVM ) {

                                activityDetailsVM
                                    .activityHeadingViewModel
                                    .activityHeadingButtonsViewModel
                                    .shortcutPrint();

                            }

                            if ( !activityDetailsVM && self.activitiesTable && self.activitiesTable.data ) {
                                //  if no data in the table then skip printing empty document
                                if ( 0 === self.activitiesTable.data().length ) {
                                    return;
                                }
                                self.activitiesTable.showExportPdfDataStart();
                            }


                        } )
                        .on( i18n( 'InCaseMojit.casefile_browserJS.title.SHIFT_COPY' ), i18n( 'InCaseMojit.casefile_browserJS.hotkey.COPY_TO_ANOTHER_CASEFOLDER' ) );

                    self.creationKeysSubscribed = true;
                } );


            function onTranscribeHotKey() {
                var advm, ahvm, ahbvm;

                advm = self.activityDetailsViewModel();
                if ( !advm ) { return; }

                ahvm = advm.activityHeadingViewModel;
                if ( !ahvm ) { return; }

                ahbvm = ahvm.activityHeadingButtonsViewModel;
                ahbvm.btnCreateTranscriptionTaskClick();
            }
        },

        subscribeNavigationKeys: function() {

            var
                self = this,
                binder = self.get( 'binder' );

            self.hotKeysGroup
                .on( 'ctrl+p', 'Wechsel in Patientenliste', function() {
                    binder.navigateToPatientBrowser();
                } );

            self.navigationKeysSubscribed = true;

        },
        openMedicationPlanModal: function(  ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = ko.unwrap( binder.currentPatient ),
                caseFolderActive = currentPatient.caseFolderCollection.getActiveTab(),
                selected = self.activitiesTable.getComponentColumnCheckbox().checked(),
                preselectedMedications = selected.filter( function( selectedActivity ) {
                  return selectedActivity.actType === 'MEDICATION';
                } ),
                preselectedPrescriptionsAndMedicationPlans = selected.filter( function( selectedActivity ) {
                    return Y.doccirrus.schemas.activity.isPrescriptionType( selectedActivity.actType ) || selectedActivity.actType === 'MEDICATIONPLAN' || selectedActivity.actType === 'KBVMEDICATIONPLAN';
                } ),
                expandedMedications = [];
            Promise.resolve()
                .then( function() {
                    var expandedMedicationIds = [];
                    preselectedPrescriptionsAndMedicationPlans.forEach( function( prescriptionOrMedicationPlan ) {
                        (prescriptionOrMedicationPlan.activities || []).forEach( function( activityId ) {
                            expandedMedicationIds.push( activityId );
                        } );
                    } );
                    expandedMedicationIds = expandedMedicationIds.filter( function( expandedMedicationId ) {
                        return !preselectedMedications.find( function( preselectedMedication ) {
                            return preselectedMedication._id === expandedMedicationId;
                        } );
                    } );
                    if( expandedMedicationIds.length ) {
                        Y.log( 'expanding ' + expandedMedicationIds.length + ' medication activities from prescriptions and medication plans that have been pre-selected', 'info', NAME );
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.activity.read( {
                            query: {
                                _id: {
                                    $in: expandedMedicationIds
                                },
                                actType: 'MEDICATION'
                            }
                        } ) ).then( function( response ) {
                            expandedMedications = response.data;
                        } ).catch( function( err ) {
                            Y.log( 'could not expand linked activities of preselected prescriptions and medication plans: ' + (err.stack || err), 'warn', NAME );
                        } );
                    }
                } )
                .then( function() {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.mmi.getMappingCatalogEntries( {
                        query: {
                            catalogShortNames: [ 'MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'DISCOUNTAGREEMENT' ]
                        }
                    } ) )
                        .then( function( response ) {
                            var
                                data = response && response.data;
                            self.defaultMappings = data;
                            return data;
                        } )
                        .catch( function( error ) {
                            Y.log( 'can not get defaultMappings from MMI' + error.toString(), 'error', NAME );
                            return null;
                        } );

                } )
                .then( function( defaultMappings ) {
                    var
                        insurance = Y.doccirrus.schemas.patient.getInsuranceByType( currentPatient.toJSON(), caseFolderActive.type );
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.casefolder.getCaseFolderDataForActivity( {
                        data: {
                            insuranceLocation: insurance && insurance.locationId,
                            patientId: peek( currentPatient._id ),
                            caseFolderType: caseFolderActive.type,
                            caseFolderId: caseFolderActive._id
                        }
                    } ) )
                        .then( function( response ) {
                            var
                                caseFolderData = response.data || {};
                            return {
                                caseFolderData: caseFolderData,
                                defaultMappings: defaultMappings
                            };
                        } );
                } )
                .then( function( additionalData ) {
                    var
                        message;
                    if( !additionalData.caseFolderData.hasLastSchein ) {
                        message = 'PUBLIC' === caseFolderActive.type ? i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN_IN_QUARTER' )
                            : (i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN' ) + '<br/><br/>' + i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN_EXPLANATION' ) );
                        Y.doccirrus.DCWindow.notice( {
                            message: message,
                            window: {
                                id: 'checkQuarterHasSchein',
                                width: 'medium',
                                buttons: {
                                    footer: [
                                        {
                                            isDefault: true,
                                            label: i18n( 'InCaseMojit.casefile_detailJS.button.CREATE_SCHEIN' ),
                                            action: function() {
                                                this.close();
                                                Y.doccirrus.inCaseUtils.createActivity( { actType: 'SCHEIN' } );
                                            }
                                        }
                                    ]
                                }
                            }
                        } );
                        return;
                    }


                    return Y.doccirrus.modals.medicationPlanPrescription.show( {
                        activitySettings: binder.getInitialData( 'activitySettings' ),
                        currentPatient: currentPatient,
                        defaultMappings: additionalData.defaultMappings,
                        locationId: additionalData.caseFolderData.locationId,
                        employeeId: additionalData.caseFolderData.employeeId,
                        preselectedMedications: preselectedMedications.concat(expandedMedications),
                        caseFolder: caseFolderActive,
                        binder: binder,
                        swissPreselectedMedications: preselectedMedications,
                        swissMedPlans: self.preselectedMedPlans,
                        swissCaseFolder: CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderActive.type] === 'CH',
                        swissMedications: preselectedMedications,
                        swissMedicationPlan: self.activitiesTable.getComponentColumnCheckbox().checked()
                    } )
                        .then( function() {
                            binder.showBackgroundProcessMask();
                        } );
                } )
                .catch( catchUnhandled );
        },
        destroyHotKeys: function() {
            var
                self = this;
            if( self.hotKeysGroup ) {
                self.unsubscribeCreationKeys();
                self.unsubscribeNavigationKeys();
                self.hotKeysGroup = null;
            }
        },

        unsubscribeCreationKeys: function() {
            var
                self = this,
                i;

            self.hotKeysGroup
                .un( 'ctrl+a' )
                .un( 'ctrl+d' )
                .un( 'ctrl+f' )
                .un( 'ctrl+l' )
                .un( 'ctrl+m' )
                .un( 'ctrl+e' )
                .un( 'ctrl+b' )
                .un( 'ctrl+k' )
                .un( 'ctrl+r' )
                .un( 'ctrl+u' )
                .un( 'shift+ctrl+v' )
                .un( 'shift+ctrl+b' )
                .un( 'shift+ctrl+k' )
                .un( 'shift+ctrl+z' )
                .un( 'shift+ctrl+m' )
                .un( 'shift+ctrl+r' )
                .un( 'shift+ctrl+a' )
                .un( 'alt+ctrl+s' )
                .un( 'shift+ctrl+arrowLeft' )
                .un( 'shift+ctrl+arrowRight' )
                .un('alt+p');

            for( i = 0; i < 10; i++ ) {
                self.hotKeysGroup
                    .un( 'shift+ctrl+' + i );
            }

            self.creationKeysSubscribed = false;
        },

        unsubscribeNavigationKeys: function() {
            var
                self = this;
            self.hotKeysGroup
                .un( 'ctrl+p' );

            self.navigationKeysSubscribed = false;
        },

        /**
         * Attached event delegation for activities table "more"-link
         */
        _ActivitiesTableShowMoreContentListener: null,
        /**
         * Attaches event delegation for activities table "more"-link
         */
        attachActivitiesTableShowMoreContentListener: function() {
            var
                self = this;

            self._ActivitiesTableShowMoreContentListener = Y.delegate( 'click', self.onActivitiesTableShowMoreContent, document.body, 'td.KoTableCell-forPropertyName-content a.onActivitiesTableShowMoreContent-more', self );
        },
        /**
         * Detaches event delegation for activities table "more"-link
         */
        detachActivitiesTableShowMoreContentListener: function() {
            var
                self = this;

            if( self._ActivitiesTableShowMoreContentListener ) {
                self._ActivitiesTableShowMoreContentListener.detach();
                self._ActivitiesTableShowMoreContentListener = null;
            }
        },
        /**
         * Handles activities table "more"-link
         * @param {Object}  yEvent
         */
        onActivitiesTableShowMoreContent: function( yEvent ) {
            var
                yTarget = yEvent.target || null,
                yDetail = yTarget ? yTarget.next( '.onActivitiesTableShowMoreContent-detail' ) : null,
                hidden = yDetail ? yDetail.hasClass( 'onActivitiesTableShowMoreContent-detail-hidden' ) : null;

            if ( !yDetail ) { return; }

            if( hidden ) {
                yDetail.removeClass( 'onActivitiesTableShowMoreContent-detail-hidden' );
                yDetail.addClass( 'onActivitiesTableShowMoreContent-detail-shown' );
            }
            else {
                yDetail.removeClass( 'onActivitiesTableShowMoreContent-detail-shown' );
                yDetail.addClass( 'onActivitiesTableShowMoreContent-detail-hidden' );
            }
        },
        destroyCaseFileViewModel: function() {
            var
                self = this;

            self.destroyPatientErrorAlert();
            self.destroyActivityPatientInfoViewModel();
            self.destroyActivityDetailsViewModel();
            self.destroyActivityCaseFileButtonsViewModel();
            self.destroyActivityCaseFoldersViewModel();
            self.destroyActivityConfigurableActionButtonsViewModel();
            self.destroyActivityCreateButtonsViewModel();
            self.destroyActivitySequenceViewModel();
            self.destroySocketListeners();
            self.destroyHotKeys();
            self.detachActivitiesTableShowMoreContentListener();
            self.destroyActivitiesTable();
        },
        patientErrorAlert: null,
        initPatientErrorAlert: function() {
            var self = this,
                currentPatient;
            self.patientErrorAlert = ko.computed( function() {
                currentPatient = unwrap( self.get( 'currentPatient' ) );
                if( currentPatient && !currentPatient.isValid() ) {
                    return {
                        i18n: PATIENT_ERROR_ALERT,
                        onClick: function() {
                            var binder = self.get( 'binder' );
                            binder.navigateToPatientDetail();
                        }
                    };
                }
                return null;
            } );
        },
        destroyPatientErrorAlert: function() {
            var self = this;
            if( self.patientErrorAlert ) {
                self.patientErrorAlert.dispose();
            }
        },
        activityPatientInfoViewModel: null,
        initActivityPatientInfoViewModel: function() {
            var
                self = this,
                observable;

            if( !self.activityPatientInfoViewModel ) {
                observable = ko.observable( null );
                self.activityPatientInfoViewModel = ko.computed( {
                    read: observable,
                    write: function( value ) {
                        var
                            observablePeek = peek( observable );

                        if( value !== observablePeek ) { // prevent change for same value
                            if( observablePeek ) {
                                observablePeek.destroy();
                            }
                            observable( value );
                        }
                    }
                } );
            }
        },
        destroyActivityPatientInfoViewModel: function() {
            var
                self = this,
                activityPatientInfoViewModelPeek;

            if( self.activityPatientInfoViewModel ) {
                activityPatientInfoViewModelPeek = peek( self.activityPatientInfoViewModel );
                self.activityPatientInfoViewModel.dispose();
                if( activityPatientInfoViewModelPeek ) {
                    self.activityPatientInfoViewModel( null );
                    activityPatientInfoViewModelPeek.destroy();
                }
                self.activityPatientInfoViewModel = null;
            }
        },
        activityDetailsViewModel: null,
        initActivityDetailsViewModel: function() {
            var
                self = this,
                observable;

            if( !self.activityDetailsViewModel ) {
                observable = ko.observable( null );
                self.activityDetailsViewModel = ko.computed( {
                    read: observable,
                    write: function( value ) {
                        var
                            observablePeek = peek( observable );

                        if( value !== observablePeek ) { // prevent change for same value
                            if( observablePeek ) {
                                observablePeek.destroy();
                            }
                            observable( value );
                        }
                    }
                } );
            }
        },
        destroyActivityDetailsViewModel: function() {
            var
                self = this,
                activityDetailsViewModelPeek;

            if( self.activityDetailsViewModel ) {
                activityDetailsViewModelPeek = peek( self.activityDetailsViewModel );
                self.activityDetailsViewModel.dispose();
                if( activityDetailsViewModelPeek ) {
                    self.activityDetailsViewModel( null );
                    activityDetailsViewModelPeek.destroy();
                }
                self.activityDetailsViewModel = null;
            }
        },
        /**
         * @property activitiesTable
         * @type {null|KoTable}
         */
        activitiesTable: null,
        /**
         * @property activitiesTableActivityCopiedListener
         * @type {null|Y.EventHandler}
         */
        activitiesTableActivityCopiedListener: null,
        /**
         * @property activitiesTableActivityPrintedListener
         * @type {null|Y.EventHandler}
         */
        activitiesTableActivityPrintedListener: null,
        /**
         * @property activitiesTableActivityTransitionedListener
         * @type {null|Y.EventHandler}
         */
        activitiesTableActivityTransitionedListener: null,
        /**
         * @property activitiesTableActivityPDFChangeListener
         * @type {null|Y.EventHandler}
         */
        activitiesTableActivityPDFChangeListener: null,
        /** @protected */
        activitiesTableCollapseRowsTooltips: null,
        /** @protected */
        initActivitiesTable: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                patientName = unwrap( currentPatient.firstname ) + ' ' + unwrap( currentPatient.lastname ),
                // dynamic list of "Qn YYYY"/CURRENT_Q_VALUE descending from current quarter
                quarterColumnFilterList = makeQuarterList(),
                locations = binder.getInitialData( 'location' ),
                foreignLocations = binder.getInitialData( 'foreignLocations' ),
                locationFilter = locations.map( locationAsSel2Item ),
                actTypeColorMap = {},
                activitySettings = binder.getInitialData( 'activitySettings' ) || [],
                currentActivityObservable = binder.currentActivity,
                activitiesTable,
                activityTableBaseParams,
                collapseRowsActTypes = Y.doccirrus.schemas.activity.types.Activity_E.list.map( function( item ) {
                    return item.val;
                } ),
                dependentCollapseRowsActTypeMap,
                dependentCollapseRows,
                swissInsuranceDescription = Y.doccirrus.schemas.activity.swissInsuranceDescription,
                activeCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                caseFolderType = activeCaseFolder && activeCaseFolder.type,
                isSwissCaseFolder = Y.doccirrus.schemas.casefolder.isSwissCaseFolderType( caseFolderType );

            //  make current list of quarters
            function makeQuarterList() {
                var
                    quarterListLength = 8,
                    quarterListResult = [],
                    quarterListMom = moment(),
                    quarterListQn = quarterListMom.get( 'quarter' ),
                    quarterListYYYY = quarterListMom.get( 'year' ),
                    quarterListN,
                    i;

                for( i = quarterListLength; i > 0; i-- ) {
                    quarterListN = (i + quarterListQn) % 4 || 4;
                    if( i !== quarterListLength && quarterListN === 4 ) {
                        quarterListYYYY--;
                    }
                    quarterListResult.push( {
                        text: 'Q' + quarterListN + ' ' + quarterListYYYY,
                        value: 'Q' + quarterListN + ' ' + quarterListYYYY
                    } );
                }

                quarterListResult.unshift( {
                    text: i18n( 'DCQuery.CURRENT_Q_VALUE.i18n' ),
                    value: Y.doccirrus.DCQuery.CURRENT_Q_VALUE
                } );

                return quarterListResult;
            }

            //  reduce location object to dropdown option
            function locationAsSel2Item( location ) {
                return { val: location._id, i18n: location.locname };
            }

            activitySettings.forEach( function( activitySetting ) {
                actTypeColorMap[activitySetting.actType] = activitySetting.color;
            } );

            activityTableBaseParams = ko.computed( function() {
                var
                    activityCaseFoldersViewModel = unwrap( self.activityCaseFoldersViewModel ),
                    caseFileDoctorSelectFilter = unwrap( activityCaseFoldersViewModel.caseFileDoctorSelectFilter ),
                    patientId = unwrap( currentPatient && currentPatient._id ),

                    activeCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                    caseFolderId = activeCaseFolder && activeCaseFolder._id,

                    userFilter = Y.doccirrus.utils.getFilter(),
                    filterQuery = userFilter && userFilter.location && { "locationId": userFilter.location },

                    query = Y.merge( filterQuery );

                if( patientId ) {
                    query.patientId = patientId;
                }

                if( caseFolderId ) {
                    query.caseFolderId = caseFolderId;
                }

                return {
                    query: query,
                    caseFileDoctorSelectFilter: caseFileDoctorSelectFilter,
                    noBlocking: true
                };
            } );

            function formatSelection( el ) {
                return "<div style=' width: 10px; height: 20px; background-color: " + el.text + "'></div>";
            }
            function formatResult( el ) {
                return "<div style='margin:auto; width: 30px; height: 20px; background-color: " + el.text + "'></div>";
            }
            function getColorForAPKState( state ) {
                switch( state ) {
                    case "IN_PROGRESS":
                        return "#c12e2a";
                    case 'DOCUMENTED':
                        return "#eb9316";
                    case 'VALIDATED':
                        return "#419641";
                }
            }

            /**
             * [MOJ-11908]
             * renders badges (bootstrap-labels) for medication-specific properties
             * e.g. sample medications get a blue badge
             * @param {activity} activity
             * @param {string|undefined} multiBadgeJoinChar, optional character put between badges, default: " " (space)
             * @returns {string}
             */
            function renderBadgesForActivity( activity, multiBadgeJoinChar ) {
                var badges = [],
                    joinCharacter = (typeof multiBadgeJoinChar === "string") ? multiBadgeJoinChar : " ";

                /**
                 * Creates a badge config object depending on the diagnosis state
                 * @param {object} activity MUST BE A DIAGNOSIS
                 * @returns {object}
                 */
                function createDiagnosisBadgeConfig( activity ) {
                    var style = "info",
                        title = "",
                        titleAddon = [],
                        text = "";

                    switch( activity.diagnosisType ) {
                        case 'ACUTE':
                            title = ACUTE_TITLE;
                            if( 'DOKUMENTATIV' === activity.diagnosisTreatmentRelevance ) {
                                text = ACUTE_DOK;
                            } else if( 'INVALIDATING' === activity.diagnosisTreatmentRelevance ) {
                                style = "default";
                                text = ACUTE_INVALIDATING;
                            } else if( activity.diagnosisInvalidationDate ) {
                                text = ACUTE_INVALIDATING;
                            }
                            break;
                        case 'ANAMNESTIC':
                            title = A_CONT_DIAGNOSES_TITLE;
                            if( 'DOKUMENTATIV' === activity.diagnosisTreatmentRelevance ) {
                                text = A_CONT_DIAGNOSES_DOK;
                            } else if( 'INVALIDATING' === activity.diagnosisTreatmentRelevance ) {
                                style = "default";
                                text = A_CONT_DIAGNOSES_INVALIDATING;
                            } else {
                                text = A_CONT_DIAGNOSES;
                            }
                            break;
                        case 'CONTINUOUS':
                            title = CONT_DIAGNOSES_TITLE;
                            if( 'DOKUMENTATIV' === activity.diagnosisTreatmentRelevance ) {
                                text = CONT_DIAGNOSES_DOK;
                            } else if( 'INVALIDATING' === activity.diagnosisTreatmentRelevance ) {
                                style = "default";
                                text = CONT_DIAGNOSES_INVALIDATING;
                            } else {
                                text = CONT_DIAGNOSES;
                            }
                            break;
                    }

                    // extend the title by more information, if this has been an invalidated or a documentary diagnosis
                    if( 'DOKUMENTATIV' === activity.diagnosisTreatmentRelevance ) {
                        titleAddon.push( DIAGNOSE_DOK );
                    } else if( 'INVALIDATING' === activity.diagnosisTreatmentRelevance ) {
                        titleAddon.push( DIAGNOSE_INVALIDATING );
                    }

                    // additionally, if the diagnosis has been invalidated by another one, show the invalidation date
                    if( activity.diagnosisInvalidationDate ) {
                        // invalidated diagnoses get a gray badge
                        style = "default";
                        titleAddon.push( i18n( 'activity-schema.Diagnosis_T.diagnosisInvalidationDate.i18n' ) +
                                         ": " + moment( activity.diagnosisInvalidationDate ).format( i18n( 'general.TIMESTAMP_FORMAT' ) ) );
                    }

                    // modify the title, if an addon has been added
                    if( titleAddon.length > 0 ) {
                        title += " (" + titleAddon.join( ", " ) + ")";
                    }

                    return {style: style, title: title, text: text};
                }

                // depending on the actType and other properties, we add tags for different activity-attributes
                if( activity.actType === "MEDICATION" ) {
                    if( activity.phContinuousMed && activity.noLongerValid ) {
                        badges.push( {
                            style: "default",
                            title: NO_LONGER_VALID_MEDICATION_TITLE + " " + CONTINUOUS_MEDICATION_TITLE,
                            text: CONTINUOUS_MEDICATION +  "." + NO_LONGER_VALID_MEDICATION
                        } );
                    } else if ( activity.noLongerValid ) {
                        badges.push( {
                            style: "default",
                            title: NO_LONGER_VALID_MEDICATION_TITLE,
                            text: NO_LONGER_VALID_MEDICATION
                        } );
                    } else if( activity.phContinuousMed) {
                        badges.push( {
                            style: "info",
                            title: CONTINUOUS_MEDICATION_TITLE,
                            text: CONTINUOUS_MEDICATION
                        } );
                    }

                    if( activity.phSampleMed ) {
                        badges.push( {
                            style: "info",
                            title: SAMPLE_MEDICATION_TITLE,
                            text: SAMPLE_MEDICATION
                        } );
                    }
                }
                // add badges for diagnoses-specific properties
                else if( activity.actType === "DIAGNOSIS" ) {
                    badges.push( createDiagnosisBadgeConfig( activity ) );
                } else if( activity.costType ) {
                    badges.push( {
                        style: "info",
                        title: EXPENSES,
                        text: EXPENSES
                    } );
                }

                // finally, if there are any badges, join them
                return (badges.length > 0) ? badges.map( function( badge ) { return ActivityModel.formatBadge( badge ); } ).join( joinCharacter ) : "";
            }

            self.activitiesTable = activitiesTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {

                    formRole: 'casefile-patient-folder',
                    pdfTitle: i18n( 'InCaseMojit.casefile_detailJS.pdfTitle' ),
                    pdfFile: i18n( 'InCaseMojit.casefile_detailJS.pdfTitle' ) + patientName,
                    pdfFields: {
                        'patientName': currentPatient._getNameSimple(),
                        'dob': moment( unwrap( currentPatient.dob ) ).format( 'DD.MM.YYYY' ),
                        'insuranceNames': currentPatient.getInsuranceNames()
                    },

                    stateId: 'CaseFileMojit-CasefileNavigationBinderIndex-activitiesTable',
                    states: ['limit', 'usageShortcutsVisible', 'collapseRows'],
                    striped: false,
                    moveWithKeyboard: true,
                    cellForClick: 4,
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.activity.getCaseFileLight,
                    baseParams: activityTableBaseParams,
                    ignoreCountLimit: true, // as per MOJ-11879, this will override the hardcoded count limit of 2000 entries
                    limit: 10,
                    limitList: [10, 20, 30, 40, 50, 100],

                    columns: [
                        {
                            componentType: 'KoTableColumnRenderer',
                            forPropertyName: 'collapseRowsMinus',
                            width: '32px',
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    showDependentCollapseRows = unwrap( dependentCollapseRows && dependentCollapseRows.showRowDependentCollapseRowsObservables[data._id] ),
                                    collapsedComplex = unwrap( dependentCollapseRows && dependentCollapseRows.collapsedComplex[ data._id ] );

                                if( !showDependentCollapseRows && !unwrap( activitiesTable.collapseRows ) ) {
                                    return '';
                                }

                                return '<span class="' + ( collapsedComplex ? 'fa fa-plus-square-o' : 'fa fa-minus-square-o' ) + '" style="cursor: pointer;"></span>';
                            },
                            onCellClick: function( meta, event ) {
                                var
                                    data = meta.row;

                                if( event.target.classList.contains( 'fa-minus-square-o' ) ) {
                                    dependentCollapseRows.minusClick( data );
                                }
                                if( event.target.classList.contains( 'fa-plus-square-o' ) ) {
                                    dependentCollapseRows.plusClick( data );
                                }
                            }
                        },
                        {
                            componentType: 'KoTableColumnLinked',
                            forPropertyName: 'linked',
                            label: '(y)',
                            visible: false,
                            isCheckBoxDisabledHook: function( data ) {
                                var
                                    linked = this.linked(),
                                    currentActivity = unwrap( currentActivityObservable );
                                if( !currentActivity ){
                                    return true;
                                }

                                return currentActivity.linkedActivityCheckboxDisabled( linked, data );
                            },
                            toggleLinkOfRowHook: function( link, data ) {
                                var
                                    columnLinked = this,
                                    currentActivity = unwrap( currentActivityObservable );
                                if( !currentActivity ){
                                    return false;
                                }

                                return currentActivity.linkedActivityCheckboxTrigger( columnLinked, link, data );
                            },
                            toggleSelectAllHook: function( rows ) {
                                var
                                    columnLinked = this,
                                    currentActivity = unwrap( currentActivityObservable );
                                if( !currentActivity ){
                                    return false;
                                }

                                return currentActivity.linkedActivityCheckboxSelectAll( columnLinked, rows );
                            },
                            toggleDeselectAllHook: function( rows ) {
                                var
                                    columnLinked = this,
                                    currentActivity = unwrap( currentActivityObservable );
                                if( !currentActivity ){
                                    return false;
                                }

                                return currentActivity.linkedActivityCheckboxDeselectAll( columnLinked, rows );
                            },
                            getCss: function( $context ) {
                                //  used to highlight other activities which refer to this one (ie, parents) MOJ-8169
                                var css = $context.$data.css();
                                css['KoTableCell-linkBack'] = true;
                                return css;
                            }
                        },
                        {
                            componentType: 'KoTableColumnDrag',
                            forPropertyName: 'KoTableColumnDrag',
                            onlyDragByHandle: true,
                            visible: false
                        },
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            visible: true,
                            allToggleVisible: true
                        },
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                            width: '85px',
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                    autoCompleteDateRange: true
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    timestamp = meta.value;

                                if( timestamp && !moment( timestamp ).isAfter( new Date() ) ) {
                                    return moment( timestamp ).format( 'DD.MM.YYYY' );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'time',
                            label: i18n( 'activity-schema.Activity_T.time.i18n' ),
                            title: i18n( 'activity-schema.Activity_T.time.i18n' ),
                            width: '65px',
                            visible: false,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'actType',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                            width: '120px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options:  Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            interceptRenderOutput: function( output, meta, isTitle ){
                                arguments[0] = output && isTitle ? Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', output, 'i18n', 'k.A.' ) : output;
                                var intercepted = meta.col.__proto__.interceptRenderOutput.apply(this, arguments);
                                if ( !intercepted ) {
                                    return '';
                                }
                                if ( 'string' !== typeof intercepted ) {
                                    intercepted = intercepted.toString();
                                }
                                // remove non-breaking spaces from the tooltip, MOJ-12611
                                intercepted = intercepted.replace( new RegExp( '&nbsp;', 'g' ), ' ' );
                                return intercepted;
                            },
                            renderer: function( meta ) {
                                var
                                    actType = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, 'i18n', 'k.A.' );
                            }
                        },
                        {
                            forPropertyName: 'subType',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            width: '100px',
                            queryFilterType: Y.doccirrus.DCQuery.IREGEX_ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'String',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    isSelectMultiple: true,
                                    placeholder: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' )
                                }
                            },
                            pdfRenderer: function( meta ) {
                                var data = meta.row;
                                return data.subType;
                            }
                        },
                        {
                            forPropertyName: 'catalogShort',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                            width: '100px',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'code',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                            width: '110px',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row;

                                if( data.status === 'LOCKED') {
                                    return '';
                                }

                                // Special case forT CARDIO codes
                                if( data && 'BIOTRONIK' === data.catalogShort ) {
                                    return data.catalogShort;
                                }

                                return Y.doccirrus.schemas.activity.displayCode( data );
                            }
                        },
                        {
                            forPropertyName: 'content',
                            componentType: "KoTablePreviewColumn",
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                            width: '70%',
                            isSortable: true,
                            isFilterable: true,
                            cashTitle: true,
                            iconClass: "fa fa-envelope KoTableHeader-FilterIcon",
                            getIconTitlePromise: function( meta ) {
                                return new Promise( function( resolve ) {
                                    Y.doccirrus.jsonrpc.api.patientemails.getSavedEmails( {
                                        data: {
                                            ids: meta.row.savedEmails || []
                                        }
                                    } ).done( function( res ) {
                                        var content = "";

                                        res.data.forEach( function( email ) {
                                            content += "<p style='font-style: italic;'>" +
                                                       moment( email.sentDate ).format( 'DD.MM.YYYY HH:mm' ) +
                                                       "</p>"
                                                       + email.content + "<br/>";
                                        } );
                                        return resolve( "<div style='text-align: left'>" + content + "</div>" );
                                    } ).fail( function( err ) {
                                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                    } );
                                } );

                            },
                            iconCount: function( meta ) {
                              return "("+ (meta.row.savedEmails || []).length + ")";
                            },
                            hasIcon: function( meta ) {
                                return (meta.row.savedEmails || []).length;
                            },
                            onIconClick:function( meta, $event ) {
                                    Y.doccirrus.modals.mailActivitiesPreviewModal.showDialog( meta.row.savedEmails || [] );
                                    $event.stopPropagation();
                            },
                            interceptRenderOutput: function( output, meta, isTitle ){

                                arguments[0] = output && isTitle ? output.replace( /<\/?[a-z]+\/?>/gi, '' ) : output;
                                // [MOJ-12031] call parent function after manipulating the content for further processing
                                var intercepted = meta.col.__proto__.interceptRenderOutput.apply(this, arguments);
                                if ( !intercepted ) {
                                    return '';
                                }
                                if ( 'string' !== typeof intercepted ) {
                                    intercepted = intercepted.toString();
                                }
                                // remove non-breaking spaces from the tooltip, MOJ-12611
                                intercepted = intercepted.replace( new RegExp( '&nbsp;', 'g' ), ' ' );
                                return intercepted;
                            },
                            renderer: function( meta ) {
                                var
                                    USER_CONTENT_FOLD_MARKER = '{{...}}',
                                    data = meta.row,
                                    renderedKimStatus = renderKimStatus( data ),
                                    severity = data.severity,
                                    severityMap = binder.getInitialData( 'severityMap' ),
                                    activitySettings = binder.getInitialData( 'activitySettings' ),
                                    renderContentAsHTML,
                                    useMarkdown = false,
                                    parts,
                                    kennfeld,
                                    content,
                                    comment,
                                    commentIndentation,
                                    compactView,
                                    overview,
                                    tests,
                                    pdfLinks,
                                    i,
                                    collapsedComplex = dependentCollapseRows && dependentCollapseRows.collapsedComplex[ data._id ],
                                    USER_CONTENT_FOLD_BY_LEN_REGEXP = /{{\.\.\. ?\((\d+)\) ?}}/g,
                                    match,
                                    divideByCharacters = 0,
                                    side,
                                    foldedSomehow = false;

                                //  TODO: deduplicate this and replace with the version in inCaseUtils MOJ-13266
                                function foldTextByCharsNumber( renderContentAsHTML, divideByCharacters ){
                                    var stripedHtml, left, right, found, ind;
                                    if( !divideByCharacters ) {
                                        return divideByCharacters;
                                    }
                                    stripedHtml = renderContentAsHTML.replace(/<[^>]+>/g, '').replace( /&nbsp;/g, String.fromCharCode(0) );
                                    renderContentAsHTML = renderContentAsHTML.replace( /&nbsp;/g, String.fromCharCode(0) );
                                    if (stripedHtml.length > divideByCharacters ) {
                                        left = stripedHtml.substring( 0, divideByCharacters );
                                        right = stripedHtml.substring( divideByCharacters );
                                        found = false;

                                        //for left
                                        while( !found && left.length > 3 ) {
                                            found = renderContentAsHTML.indexOf( left ) >= 0;
                                            if( found ) {
                                                break;
                                            }
                                            left = left.substring( 1 );
                                        }

                                        if( found ) {
                                            foldedSomehow = true;
                                            ind = renderContentAsHTML.indexOf( left ) + left.length;
                                            renderContentAsHTML = renderContentAsHTML.substring( 0, ind ) +
                                                                  '<a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' +
                                                                  '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' +
                                                                  renderContentAsHTML.substring( ind ) +
                                                                  '</div>';
                                        } else {
                                            //for right
                                            while( !found && right.length > 3 ) {
                                                found = renderContentAsHTML.indexOf( right );
                                                if( found >= 0 ) {
                                                    break;
                                                }
                                                right = right.substring( 0, right.length - 1 );
                                            }

                                            if( found ) {
                                                foldedSomehow = true;
                                                ind = renderContentAsHTML.indexOf( right );
                                                renderContentAsHTML = renderContentAsHTML.substring( 0, ind ) +
                                                                      '<a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' +
                                                                      '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' +
                                                                      renderContentAsHTML.substring( ind ) +
                                                                      '</div>';

                                            }
                                        }

                                        renderContentAsHTML = renderContentAsHTML.replace( /\0/g, '&nbsp;' );
                                    }

                                    return renderContentAsHTML;
                                }


                                if( data.status === 'LOCKED') {
                                    return '<i class="fa fa-lock" aria-hidden="true"></i> ' + data.userContent;
                                }

                                if( severityMap && severity ) {
                                    data.textColor = severity && severityMap[severity] && severityMap[severity].color || '';
                                }

                                //  If this row is an activity with child activities, use alternate HTML rendering to show
                                //  child activities linked underneath content
                                if( collapsedComplex && unwrap( activitiesTable.collapseRows ) ) {
                                    foldedSomehow = true;
                                    return self.renderCollapsedRowComplex( data );
                                }

                                //  If this activity type is configured to use markdown, set the option for the renderer
                                for ( i = 0; i < activitySettings.length; i++ ) {
                                    if ( activitySettings[i].actType === data.actType && activitySettings[i].useWYSWYG ) {
                                        useMarkdown = true;
                                    }
                                }

                                renderContentAsHTML = ActivityModel.renderContentAsHTML( data, false, useMarkdown );

                                //match = (data.userContent || '').match(USER_CONTENT_FOLD_BY_LEN_REGEXP);
                                match = USER_CONTENT_FOLD_BY_LEN_REGEXP.exec(renderContentAsHTML || '');
                                if( match && match.length ){
                                    divideByCharacters = Number.parseInt(match[1], 10);
                                    renderContentAsHTML = (renderContentAsHTML || '').replace( USER_CONTENT_FOLD_BY_LEN_REGEXP, '');
                                }

                                if( data.careComment && !divideByCharacters) {
                                    foldedSomehow = true;
                                    renderContentAsHTML += ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a><div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' + data.careComment + '</div>';
                                }

                                if( 'MEASUREMENT' === data.actType || ( 'PROCESS' === data.actType && data.d_extra && Object.keys(data.d_extra).length ) && !divideByCharacters ) {
                                    foldedSomehow = true;
                                    renderContentAsHTML += ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a><div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' + data.userContent + '</div>';
                                }

                                //  Add custom fold to text, may be specified in activity type settings, or added to individual activities
                                if ( -1 !== renderContentAsHTML.indexOf( USER_CONTENT_FOLD_MARKER ) && !divideByCharacters) {
                                    foldedSomehow = true;
                                    parts = renderContentAsHTML.split( USER_CONTENT_FOLD_MARKER, 2 );
                                    renderContentAsHTML = parts[0] +
                                        '<a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' +
                                        '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' +
                                        parts[1] +
                                        '</div>';
                                }

                                var activitySetting = _.find(activitySettings, function (setting) {
                                   return setting.actType === data.actType;
                                });

                                if (activitySetting && activitySetting.showPrintCount) {
                                    renderContentAsHTML += ' <i class="fa fa-print" aria-hidden="true"></i> (' + (data.printCount || 0) + ')';
                                }

                                if (Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && data.actType === 'MEDICATION'){
                                    renderContentAsHTML+=" (" + (swissInsuranceDescription[data.insuranceCode] || "-") + ")";
                                    if( data.phContinuousMed && data.phContinuousMedDate ) {
                                        renderContentAsHTML+= " <br/>" + moment( data.phContinuousMedDate ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                                    }
                                }

                                if (Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && data.actType === 'TREATMENT' && unwrap( data.side ) && unwrap(data.treatmentCategory) !== "Referenzleistung"  ){
                                    if( unwrap( data.side ) === "LEFT") {
                                        side = SIDE_LEFT;
                                    }
                                    if(unwrap( data.side )  === "RIGHT" ) {
                                        side = SIDE_RIGHT;
                                    }
                                    renderContentAsHTML+=" (" + side + ")";
                                }

                                /**
                                 * [MOJ-11908]
                                 * renders badges (bootstrap-labels) for activity-specific properties
                                 * i.e. diagnoses, medications
                                 * e.g. sample medications get a blue badge with content "MM"
                                 */
                                renderContentAsHTML = renderBadgesForActivity( data ) + " " + renderContentAsHTML;
                                renderContentAsHTML += renderedKimStatus;

                                //TODO: remove this render hack and implement proper rendering/activity type of device result data
                                if (
                                    data.actType === 'FINDING' &&
                                    data.g_extra &&
                                    data.g_extra.versionUsed &&
                                    "gdt" === data.g_extra.versionUsed.type
                                ) {
                                    divideByCharacters = 0; //use specific folding defined here
                                    kennfeld = "Geräte und verfahrensspezifisches Kennfeld: ";
                                    comment = 'Kommentar:';
                                    commentIndentation = '    ';
                                    content = data.content.split( "\n" );
                                    compactView = "";
                                    overview = data.content.replace( /\n/g, "<br>" ).replace( / /g, "&nbsp;" );
                                    tests = null;

                                    for( i = 0; i < content.length; i++ ) {
                                        if( content[i].indexOf( kennfeld ) > -1 ) {
                                            compactView += content[i].substr( kennfeld.length );
                                        }
                                        if( content[i].indexOf( comment ) > -1 ) {
                                            if( compactView.length !== 0 ){
                                                compactView += '\n';
                                            }
                                            compactView += content[i+1].substr( commentIndentation.length );
                                        }
                                    }
                                    if( data.g_extra.records[0].testId ) {
                                        if( 'string' === typeof data.g_extra.records[0].testId ) {
                                            tests = [data.g_extra.records[0].testId];
                                        } else {
                                            tests = data.g_extra.records[0].testId.map( function(test){ return test.head; } );
                                        }
                                    }
                                    if( tests ) {
                                        compactView += "\nTests: " + tests.join( ", " );
                                    }

                                    //  TODO: deduplicate and tidy this into ActivityModel.processDocumentLinks
                                    pdfLinks = data.attachedMedia && data.attachedMedia.map(function(attachment){
                                        var
                                            ext = Y.doccirrus.media.types.getExt( attachment.contentType || 'application/binary' ),
                                            url  = DocumentModel.fullUrl( {
                                            contentType: attachment.contentType,
                                            mediaId: attachment.mediaId
                                        } );
                                        var title = attachment.title;

                                        if ( attachment.malwareWarning ) {
                                            //  do not link directly to malware from the table, make the user look at the warning
                                            return '<span style="color: red;">' + ext.toUpperCase() + '</span>';
                                        }

                                        return url ? '<a href="' + url + '"' + (title ? 'title="' + title + '"' : "") + ' target="_blank" style="margin-left: 10px;">' + ext.toUpperCase() + '</a>' : '';
                                    });

                                    pdfLinks = pdfLinks && Array.isArray( pdfLinks ) ? pdfLinks.join( ',' ) : '';

                                    compactView = compactView.replace( /\n/g, "<br>" ).replace( / /g, "&nbsp;" );

                                    renderContentAsHTML = compactView + ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' + pdfLinks + '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden"><br>Alle Daten:<br>' + overview + '</div>';
                                } else if( ['COMMUNICATION', 'MEDICATIONPLAN', 'KBVMEDICATIONPLAN'].includes(data.actType) ) {
                                        if( data.content.length > 80 || 'MEDICATIONPLAN' === data.actType ) {

                                        if ( ['MEDICATIONPLAN', 'KBVMEDICATIONPLAN'].includes(data.actType) && data.comment && data.comment.length ) {
                                            divideByCharacters = 85 + data.comment.length;
                                        } else {
                                            divideByCharacters = 80;
                                        }

                                        compactView = data.content.substring( 0, divideByCharacters );
                                        overview = data.content.substring( divideByCharacters );

                                        //  TODO: deduplicate and tidy this into ActivityModel.processDocumentLinks
                                        pdfLinks = data.attachedMedia && data.attachedMedia.map(function(attachment){
                                            var
                                                ext = Y.doccirrus.media.types.getExt( attachment.contentType || 'application/binary' ),
                                                useCaption = ( ( 'MEDICATIONPLAN' === data.actType ) ? ( attachment.title || attachment.caption || ext.toUpperCase() ) : ext.toUpperCase() ),
                                                url = DocumentModel.fullUrl( {
                                                    contentType: attachment.contentType,
                                                    mediaId: attachment.mediaId
                                                } );

                                            var title = attachment.title || '';

                                            if ( attachment.malwareWarning ) {
                                                //  do not link directly to malware from the table, make the user look at the warning
                                                return '<span style="color: red;">' + ext.toUpperCase() + '</span>';
                                            }

                                            return url ? '<a href="' + url + '"' + (title ? 'title="' + title + '"' : "") +  ' target="_blank" style="margin-left: 10px;">' + useCaption + '</a>' : '';
                                        });

                                        pdfLinks = pdfLinks && Array.isArray( pdfLinks ) ? pdfLinks.join( ',' ) : '';

                                        // Quick fix to the specific case of these act types. MOJ-11905.
                                        renderContentAsHTML = ActivityModel.renderContentAsHTML( { content: compactView }, false, useMarkdown ) + ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' + pdfLinks + '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden"> ' + overview + '</div>';

                                        divideByCharacters = 0; // as a specific folding  was defined here, set it back to 0 to avoid new folding
                                    }
                                }

                                if( divideByCharacters ){
                                    renderContentAsHTML = foldTextByCharsNumber( renderContentAsHTML, divideByCharacters );
                                } else if( !foldedSomehow && data.actType === 'PROCESS' ) {
                                    //if any folding are applied use default by 80 characters
                                    renderContentAsHTML = foldTextByCharsNumber( renderContentAsHTML, 80 );
                                }

                                if( (meta.row.actType === 'INVOICE' || meta.row.actType === 'INVOICEREF')
                                    && meta.row.status === 'CANCELLED' && meta.row.cancelReason ) {
                                    renderContentAsHTML += i18n( 'InCaseMojit.casefile_detail.label.CANCEL_REASON' ) + ': ' + meta.row.cancelReason;
                                }

                                return renderContentAsHTML;
                            },
                            getCss: function( $context ) {
                                var
                                    css = $context.$data.css(),
                                    actType = $context.$parent.actType,
                                    d_extra = $context.$parent.d_extra,
                                    color;

                                for( color in ActivityModel.TELEKARDIO_SEVERITY_COLORS ) {
                                    if( ActivityModel.TELEKARDIO_SEVERITY_COLORS.hasOwnProperty( color ) ) {
                                        css[ActivityModel.TELEKARDIO_SEVERITY_COLORS[color]] = d_extra && (actType === 'MEASUREMENT' || actType === 'PROCESS') && (d_extra.color === color);
                                    }
                                }

                                return css;
                            },
                            pdfRenderer: function( meta ) {
                                var data = meta.row;
                                return ActivityModel.renderContentAsHTML( data );
                            },
                            onCellClick: function( meta, event ) {
                                    if( meta.isLink && event.target && event.target.dataset && event.target.dataset.navigatetoactivity ) {
                                        binder.navigateToActivity( {activityId: event.target.dataset.navigatetoactivity} );
                                         event.preventDefault();
                                        return false;
                                    }

                            }

                        },
                        {
                            forPropertyName: 'caseFolderId',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                            width: '115px',
                            isSortable: true,
                            renderer: function( meta ) {
                                var
                                    id = meta.value,
                                    caseFolder = null;
                                if( id ) {
                                    caseFolder = currentPatient && currentPatient.caseFolderCollection.getTabById( id );
                                }
                                return caseFolder && ( caseFolder.merged ? caseFolder.title + ' (Z)' : caseFolder.title ) || '';
                            }
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                            width: '115px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.activity.getFilteredStatuses(),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    status = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', status, 'i18n', '' );
                            }
                        },
                        {
                            forPropertyName: 'editorName',  //  editor.name is editorName in Form schema
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    editor = data.editor;

                                if( editor && editor.length ) {
                                    return editor[editor.length - 1].name;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'editorInitials',  //  editor.initials is editorInitials in Form schema
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER_I' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            width: '50px',
                            visible: false,
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    editor = data.editor;

                                if( editor && editor.length ) {
                                    return editor[editor.length - 1].initials;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'employeeName',
                            label: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                            title: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'employeeInitials',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.EMPL_I' ),
                            title: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                            width: '50px',
                            visible: false,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'locationName',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                            width: '30%',
                            visible: false,
                            isFilterable: true,
                            filterPropertyName: 'locationId',
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: locationFilter,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    locationId = meta.row.locationId,
                                    i;

                                // location names are only a placeholder in data from getCaseFileLight, fill
                                // from location set loaded on binder

                                for( i = 0; i < locations.length; i++ ) {
                                    if( locations[i]._id === locationId ) {
                                        meta.row.locationName = locations[i].locname;
                                    }
                                }
                                if( !meta.row.locationName ) {
                                    foreignLocations.some( function( locObj ) {
                                        if( locObj._id === locationId ) {
                                            meta.row.locationName = locObj.locname;
                                            return true;
                                        }
                                    } );
                                }

                                return meta.row.locationName;
                            }
                        },
                        {
                            forPropertyName: 'price',
                            label: i18n( 'activity-schema.Price_T.price.i18n' ),
                            title: i18n( 'activity-schema.Price_T.price.i18n' ),
                            width: '90px',
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    price = meta.value,
                                    data = meta.row;

                                if ( data.actType === "MEDICATION" ) {
                                    price = meta.row.phPriceSale;
                                }

                                if( data.status === 'LOCKED') {
                                    return '';
                                }
                                if( 'FORM' === data.actType && 0 === price ) {
                                    return '';
                                }

                                if( isSwissCaseFolder && Y.Lang.isNumber( price ) ) {
                                    return Y.doccirrus.comctl.numberToLocalString( price ) + " CHF";
                                }

                                if( Y.Lang.isNumber( price ) ) {
                                    return Y.doccirrus.comctl.numberToLocalString( price );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'billingFactorValue',
                            label: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.billingFactorValue.label' ),
                            title: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.billingFactorValue.label' ),
                            width: '70px',
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    billingFactorValue = meta.value,
                                    data = meta.row;

                                if( 'TREATMENT' === data.actType && 'GOÄ' === data.catalogShort ) {
                                    return Y.doccirrus.comctl.factorToLocalString( billingFactorValue );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'quarterColumn',
                            label: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.quarter.label' ),
                            title: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.quarter.label' ),
                            width: '100px',
                            visible: false,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.QUARTER_YEAR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                placeholder: 'Qn YYYY',
                                options: quarterColumnFilterList,
                                optionsText: 'text',
                                optionsValue: 'value',
                                allowValuesNotInOptions: true,
                                // possibility to set own "Qn YYYY"
                                provideOwnQueryResults: function( options, data ) {
                                    var
                                        term = options.term,
                                        results = [];

                                    if( data.every( function( item ) {
                                            return !options.matcher( term, item.text );
                                        } ) ) {
                                        results.push( term );
                                    }

                                    return results;
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    timestamp = data.timestamp,
                                    momTimestamp;

                                if( timestamp ) {
                                    momTimestamp = moment( timestamp );
                                    return 'Q' + momTimestamp.quarter() + ' ' + momTimestamp.get( 'year' );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'materialCosts',
                            label: i18n( 'activity-schema.Activity_T.materialCosts.i18n' ),
                            title: i18n( 'activity-schema.Activity_T.materialCosts.i18n' ),
                            width: '100px',
                            visible: false,
                            isSortable: true,
                            isFilterable: false,
                            queryFilterType: Y.doccirrus.DCQuery.GT_OPERATOR,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    value = meta.value || 0,
                                    title = '';
                                if( 'TREATMENT' === data.actType ) {
                                    title = CaseFileViewModel.getMaterialCostsText( data );
                                }
                                return '<span title="' + title + '">' + (value ? Y.doccirrus.comctl.numberToLocalString( value ) : '') + '</span>';
                            }
                        },
                        {
                            forPropertyName: 'apkState',
                            label: i18n( 'activity-schema.Activity_T.apkState.i18n' ),
                            title: i18n( 'activity-schema.Activity_T.apkState.i18n' ),
                            width: '55px',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                placeholder: ' ',
                                select2Config: {
                                    formatSelection: formatSelection,
                                    formatResult: formatResult
                                },
                                options: Y.doccirrus.schemas.activity.types.ApkState_E.list.map(function( el ){
                                    return {
                                        text: getColorForAPKState( el.val ),
                                        val: el.val
                                    };
                                }),
                                optionsText: 'text',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    state = meta.value;

                                if( state ) {
                                    return "<div style='margin: auto; height:20px;width:30px;background-color:" +
                                           getColorForAPKState( state ) + ";'></div>";
                                }
                                return "";
                            }
                        },
                        {
                            forPropertyName: 'invoiceLogId', // or invoiceId
                            label: i18n( 'activity-schema.Activity_T.invoiceLogId.i18n' ),
                            title: i18n( 'activity-schema.Activity_T.invoiceLogId.i18n' ),
                            width: '55px',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    url,
                                    invoiceId = meta.row.invoiceId,
                                    invoiceLogId = meta.row.invoiceLogId,
                                    invoiceLogType = meta.row.invoiceLogType,
                                    invoiceLogTypeUrl = '',
                                    content = [], // should never be more than one entry
                                    makeLink = function( name, url ) {
                                        return ['<a href="', url, '" target="_blank">', name, '</a>'].join( '' );
                                    };

                                //  TREATMENT activities link back to the log

                                if( invoiceId ) {
                                    url = '/incase#/activity/' + invoiceId;
                                    content.push( makeLink( 'R', url ) );
                                } else if( invoiceLogId ) {
                                    if( !invoiceLogType ){
                                        switch( meta.row.actType ) {
                                            case 'TREATMENT':
                                                invoiceLogType = 'EBM' === meta.row.catalogShort ? 'KBV' : 'PVS';
                                                break;
                                            case 'INVOICE':
                                                invoiceLogType = 'CASH';
                                                break;
                                            default:
                                                invoiceLogType = 'SCHEIN' === meta.row.actType ? 'KBV' : 'PVS';
                                        }
                                    }
                                    switch(invoiceLogType) {
                                        case 'KBV':
                                            invoiceLogTypeUrl = 'gkv';
                                            break;
                                        case 'PVS':
                                            invoiceLogTypeUrl = 'pvs';
                                            break;
                                        case 'Medidata':
                                            invoiceLogTypeUrl = 'tarmed';
                                            break;
                                        default:
                                            invoiceLogTypeUrl = 'cashlog';
                                    }
                                    //  deep link to patient section of log
                                    url = '/invoice#/' + invoiceLogTypeUrl + '/' + invoiceLogId + '/' + meta.row.patientId;

                                    content.push( makeLink( invoiceLogType === 'CASH' ? 'R' : invoiceLogType, url ) );
                                }

                                //  INVOICEREFPVS links to PVS log
                                if ( meta.row.pvslogId ) {
                                    url = '/invoice#/pvs/' + meta.row.pvslogId + '/' + meta.row.patientId;
                                    content.push( makeLink( 'PVS', url ) );
                                }

                                //  INVOICEREFGKV links to PVS log
                                if ( meta.row.kbvlogId ) {
                                    url = '/invoice#/gkv/' + meta.row.kbvlogId + '/' + meta.row.patientId;
                                    content.push( makeLink( 'KBV', url ) );
                                }

                                return content.length ? content.join( '</br>' ) : '';
                            }
                        }
                    ],
                    responsive: false,
                    tableMinWidth: ko.computed( function() {
                        var
                            initializedColumns = activitiesTable.columns.peek(),
                            visibleColumns = initializedColumns.filter( function( col ) {
                                return ko.unwrap( col.visible );
                            } ),
                            tableMinWidth = 0;

                        // only "tableMinWidth" when those columns are visible
                        if( !Y.Array.find( visibleColumns, function( col ) {
                                if( col.forPropertyName === 'locationName' || col.forPropertyName === 'price' || col.forPropertyName === 'billingFactorValue' || col.forPropertyName === 'quarterColumn' ) {
                                    return true;
                                }
                                return false;
                            } ) ) {
                            activitiesTable.responsive( true );
                            return '';
                        }
                        else {
                            activitiesTable.responsive( false );
                        }

                        visibleColumns.forEach( function( col ) {
                            var
                                width = ko.utils.peekObservable( col.width ) || '';

                            if( width.indexOf( '%' ) > 0 ) {
                                tableMinWidth += 200;
                            }
                            else {
                                tableMinWidth += parseInt( width, 10 );
                            }
                        } );

                        return tableMinWidth + 'px';
                    }, null, { deferEvaluation: true } ).extend( { rateLimit: 0 } ),
                    selectMode: 'none',
                    draggableRows: true,
                    isRowDraggable: function( $context ) {
                        var
                            status = ko.utils.peekObservable( $context.$data.status );
                        return 'VALID' === status || 'CREATED' === status;
                    },
                    allowDragOnDrop: function( $contextDrag, $contextDrop ) {
                        var dragTime = ko.utils.peekObservable( $contextDrag.$data.time ),
                            dragTimestamp = ko.utils.peekObservable( $contextDrag.$data.timestamp ),
                            dropTimestamp = ko.utils.peekObservable( $contextDrop.$data.timestamp ),
                            timestampIsValid = true;
                        if( dragTime ) {
                            timestampIsValid = !moment( dragTimestamp ).isSame( dropTimestamp, 'day' );
                        }
                        return timestampIsValid;
                    },
                    getStyleRow: function getStyleRow( data ) {
                        var
                            result = '';

                        if( data.actType && actTypeColorMap[data.actType] ) {
                            result = 'background-color:' + actTypeColorMap[data.actType];
                        }

                        if( 'PREPARED' === data.status ) {
                            result = 'background-color: #d3d3d3;';
                        }

                        return result;
                    },
                    getCssRow: function( $context, css ) {
                        var
                            ATTRIBUTES = Y.doccirrus.schemas.activity.ATTRIBUTES,
                            _attributes = $context.$data._attributes || [],
                            parentActivity = currentActivityObservable ? currentActivityObservable() : null,
                            referencedBy = parentActivity && parentActivity.referencedBy ? parentActivity.referencedBy : [],
                            row = $context.$data;

                        //  Add css to rows which link to the current activity, if any, show parent relationship MOJ-8169
                        css[ 'KoTableCell-linkParentBG' ] = ( -1 !== referencedBy.indexOf( row._id ) );

                        Y.each( ATTRIBUTES, function( value, key ) {
                            if( -1 < _attributes.indexOf( value ) ) {
                                css['activity-attribute-' + key] = true;
                            }
                        } );
                    },

                    getCssRowAdditionalDependentCollapseRows: function( $context, css ) {
                        var
                            ATTRIBUTES = Y.doccirrus.schemas.activity.ATTRIBUTES,
                            _attributes = $context.$data._attributes || [];

                        Y.each( ATTRIBUTES, function( value, key ) {
                            if( -1 < _attributes.indexOf( value ) ) {
                                css['activity-attribute-' + key] = true;
                            }
                        } );

                        css['KoTableCell-isData'] = true;
                    },

                    onRowClick: function( meta ) {
                        var
                            currentPatient = ko.unwrap( binder.currentPatient ),
                            caseFolders = currentPatient && currentPatient.caseFolderCollection,
                            columnCheckBox = activitiesTable.getComponentColumnCheckbox();

                        if (!meta.isLink  && Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && meta.row.actType === "MEDICATIONPLAN") {
                            columnCheckBox.checkItemsByProperty( [meta.row._id] );
                            self.preselectedMedPlans = [meta.row];
                            self.openMedicationPlanModal();
                            return false;
                        }


                        if( !meta.isLink ) {
                            if(meta.row && meta.row.caseFolderId && caseFolders && caseFolders.activeCaseFolderId) {
                                caseFolders.activeCaseFolderId( meta.row.caseFolderId );
                            }

                            binder.navigateToActivity( { activityId: meta.row._id } );
                        }

                        return false;

                    },
                    onRowContextMenu: function( meta, $event ) {
                        var contextMenu,
                            transitions = Y.doccirrus.schemas.activity.getTransitionList(),
                            hasAccess = transitions.approve.accessGroups.some( Y.doccirrus.auth.memberOf ),
                            isAdmin = Y.doccirrus.auth.isAdmin(),
                            currentUserEmployeeId = Y.doccirrus.auth.getUserEmployeeId();

                        function batchTransition( transition, text, id, additionalParams, callback ) {
                            text = text || 'geändert';
                            additionalParams = additionalParams || {};

                            callback = callback || function() {
                                };
                            var
                                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                                ids = [id];

                            function onBatchTransition( err, result ) {

                                if( err ) {
                                    Y.log( 'Could not perform batch transition: ' + err, 'warn', NAME );
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'error',
                                        message: 'Nicht alle Einträge können  ' + text + ' werden.  Der Vorgang wurde abgebrochen.'
                                    } );
                                    return;
                                }

                                if( Y.config.debug ) {
                                    Y.log( 'Success: ' + JSON.stringify( result, undefined, 2 ), 'debug', NAME );
                                }
                                Y.log( 'Batch transition complete, reloading table', 'info', NAME );
                                activitiesTable.getComponentColumnCheckbox().uncheckAll();
                                activitiesTable.reload();
                                callback();
                            }

                            Y.doccirrus.jsonrpc.api.activity
                                .doTransitionBatch( {
                                    query: { ids: ids, transition: transition },
                                    additionalParams: additionalParams
                                } )
                                .then( function( result ) {
                                    onBatchTransition( null, result );
                                } )
                                .fail( function( err ) {
                                    onBatchTransition( err );
                                } );
                        }

                        function copy( id, toCurrentDate ) {
                            Y.doccirrus.jsonrpc.api.activity.updateBatch( {
                                query: {
                                    activitiesId: id
                                },
                                data: {
                                    currentDate: toCurrentDate,
                                    notShowProgress: true
                                },
                                fields: [],
                                copy: true
                            } )
                                .done( function() {
                                    self.activitiesTable.reload();
                                    contextMenu.close();
                                } )
                                .fail( function( error ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                    contextMenu.close();
                                } );
                        }

                        function copyAndMove( activity , toCurrentDate ) {
                            var
                                currentPatient = unwrap( self.get( 'currentPatient' ) ) || {},
                                caseFolderCollection = currentPatient.caseFolderCollection || {},
                                mirror = Boolean( activity.mirrorActivityId ),
                                caseFolders = caseFolderCollection.getCaseFolders();

                            contextMenu.close();
                            if( caseFolders && Boolean( caseFolders.length ) ) {
                                Y.doccirrus.modals.changeActivityModal.showDialog( {
                                    activities: [ activity ],
                                    caseFolders: caseFolders,
                                    currentDate: toCurrentDate,
                                    mirror: mirror,
                                    copy: true,
                                    currentCaseFolder: caseFolders && caseFolders[0]
                                }, function() {
                                    self.activitiesTable.reload();
                                } );
                            } else {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'info',
                                    message: NO_CASEFOLDER,
                                    window: {width: 'medium'}
                                } );
                                return;
                            }
                        }

                        function createTask( activity ) {
                                var
                                    currentPatient = unwrap( self.get( 'currentPatient' ) );

                                Y.doccirrus.modals.taskModal.showDialog( {
                                    activities: [ {
                                        _id: activity._id,
                                        actType: activity.actType
                                    } ],
                                    patientId: peek( currentPatient._id ),
                                    patientName: Y.doccirrus.schemas.person.personDisplay( {
                                        firstname: peek( currentPatient.firstname ),
                                        lastname: peek( currentPatient.lastname ),
                                        title: peek( currentPatient.title )
                                    } )
                                }  );
                        }

                        function resetStatus( id ) {
                            if( !id ) {
                                return;
                            }
                            Y.doccirrus.jsonrpc.api.activity.resetActivityStatus( {
                                data: {
                                    activityIds: [ id ]
                                }
                            } ).done( function() {
                                self.activitiesTable.reload();
                                contextMenu.close();
                            } ).fail( function( error ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                contextMenu.close();
                            } );
                        }

                        function activityStateRule( activity ) {
                            return !(self.incaseConfig.onSigningReleaseCorrespondingActivity === true && activity.status === 'VALID' || activity.status === 'APPROVED');
                        }
                        function activityTypRule( actType ) {
                            switch (actType) {
                                case 'DOCLETTER':
                                    return  !Y.doccirrus.auth.hasTelematikServices('eDocletter'); // not disabeld => enables
                                default:
                                    return true; // actType !== 'DOCLETTER'  always true (disabled)
                            }
                        }

                        function userHasLocationAccess() {
                            var
                                currentUser = binder.getInitialData( 'currentUser' ),
                                tenantSettings = binder.getInitialData( 'tenantSettings' ),
                                locationId = meta.row.locationId,
                                userHasLocation,
                                currentUserLocations;
                            if( true === (tenantSettings && tenantSettings.noCrossLocationAccess) ) {
                                currentUserLocations = currentUser.locations.map( function( _location ) {
                                    return _location._id;
                                } );
                                userHasLocation = -1 !== currentUserLocations.indexOf( locationId );
                                return userHasLocation;

                            } else {
                                return true;
                            }
                        }

                        function isCancelDisabled( ) {
                            var
                                createdOrInvalid = ( 'CREATED' === meta.row.status || 'INAVLID' === meta.row.status ),
                                hasInitialCancel = ( meta.row.notDeletable && createdOrInvalid );

                            if ( hasInitialCancel ) { return false; }
                            return ( 'APPROVED' !== meta.row.status );
                        }

                        if( !meta.isLink ) {
                            contextMenu = new Y.doccirrus.DCContextMenu( {
                                menu: [
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityCopy' ),
                                        disabled: !userHasLocationAccess(),
                                        click: function() {
                                            if(meta.row.mirrorActivityId){
                                                copyAndMove( meta.row, false );
                                            } else {
                                                copy( meta.row._id, false );
                                            }
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.RESET_STATUS' ),
                                        disabled: 'VALID' === meta.row.status || !userHasLocationAccess(),
                                        visible: Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.employee.userGroups.SUPPORT ),
                                        click: function() {
                                            resetStatus( meta.row._id );
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityCopyToday' ),
                                        disabled: !userHasLocationAccess(),
                                        click: function() {
                                            if(meta.row.mirrorActivityId){
                                                copyAndMove( meta.row, true );
                                            } else {
                                                copy( meta.row._id, true );
                                            }
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityApprove' ),
                                        disabled: !hasAccess || meta.row.mirrorActivityId || 'VALID' !== meta.row.status || !userHasLocationAccess(),
                                        click: function() {
                                            batchTransition( 'approve', 'freigegeben', meta.row._id );
                                            contextMenu.close();
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activitySign' ),
                                        disabled: !userHasLocationAccess() || activityTypRule(meta.row.actType) || activityStateRule( meta.row ),
                                        visible:  Y.doccirrus.auth.hasTelematikServices('QES'),
                                        click: function() {
                                            Y.doccirrus.modals.kimSignatureModal.show( [meta.row] );
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activitySend' ),
                                        disabled: !userHasLocationAccess() || activityTypRule(meta.row.actType) || activityStateRule( meta.row ),
                                        visible:  Y.doccirrus.auth.hasTelematikServices('KIM'),
                                        click: function() {
                                            Y.doccirrus.modals.kimSignatureModal.decideToOpenSignOrSendModal( [meta.row] );
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityCancel' ),
                                        disabled: isCancelDisabled() || !userHasLocationAccess(),
                                        click: function() {
                                            var REASON_TO_CANCEL = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.REASON_TO_CANCEL' );
                                            Y.doccirrus.modals.activityCancel.show( {
                                                'message': REASON_TO_CANCEL, callback: function( result ) {
                                                    batchTransition( 'cancel', 'storniert', meta.row._id, { cancelReason: result && result.data } );
                                                }
                                            } );

                                            contextMenu.close();
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityCancelAndCopy' ),
                                        disabled: isCancelDisabled() || !userHasLocationAccess(),
                                        click: function() {
                                            batchTransition( 'cancel', 'storniert', meta.row._id, {}, copy( meta.row._id, false ) );
                                            contextMenu.close();
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityCreateTask' ),
                                        disabled: false,
                                        click: function() {
                                            createTask( meta.row );
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.openActivityInTab.text' ),
                                        href: '#/activity/' + meta.row._id,
                                        target: '#/activity/' + meta.row._id,
                                        click: function() {
                                            window.open( this.href, this.target );
                                            contextMenu.close();
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.DEL' ),
                                        disabled: !(
                                                      ['VALID', 'CREATED', 'PREPARED'].includes( meta.row.status ) &&
                                                      !(meta.row.notDeletable && true === meta.row.notDeletable && !Y.doccirrus.auth.memberOf( 'SUPPORT' ))
                                                  ) || !userHasLocationAccess(),
                                        click: function() {
                                            var
                                                transitionDelete = Y.doccirrus.schemas.activity.getTransitionList().delete,
                                                CONFIRM_TRANSITION = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.CONFIRM_TRANSITION' ),
                                                DELETE_VERB = { transition: transitionDelete.i18n.toLowerCase() };
                                            Y.doccirrus.DCWindow.notice( {
                                                type: 'info',
                                                message: Y.Lang.sub( CONFIRM_TRANSITION, DELETE_VERB ),
                                                window: {
                                                    width: 'auto',
                                                    buttons: {
                                                        footer: [
                                                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                                                isDefault: true,
                                                                action: function() {
                                                                    this.close();
                                                                    Y.doccirrus.api.activity.transitionActivity( {
                                                                        activity: meta.row,
                                                                        transitionDescription: transitionDelete
                                                                    } )
                                                                        .then( function() {
                                                                            self.activitiesTable.reload();
                                                                            contextMenu.close();
                                                                        } )
                                                                        .catch( function() {
                                                                            contextMenu.close();
                                                                        } );

                                                                }
                                                            } )
                                                        ]
                                                    }
                                                }
                                            } );
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.SHOW_DIFF' ),
                                        click: function() {
                                            Y.doccirrus.jsonrpc.api.audit.getForAuditBrowser(
                                                {
                                                    query: { objId: meta.row._id },
                                                    sort: { timestamp: -1 }
                                                } )
                                                .done( function( result ) {
                                                    contextMenu.close();
                                                    Y.doccirrus.modals.auditDiffDialog.show( result.data );
                                                } )
                                                .fail( function( error ) {
                                                    contextMenu.close();
                                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                } );
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityLock' ),
                                        disabled: 'LOCKED' === meta.row.status || 'PREPARED' === meta.row.status,
                                        click: function() {
                                            if( meta.row.status === 'LOCKED' ){
                                                contextMenu.close();
                                                return;
                                            }
                                            Y.doccirrus.jsonrpc.api.activity.activitiesLockUnlock( {
                                                data: {
                                                    activities: [ meta.row._id ],
                                                    operation: 'lock'
                                                }
                                            } ).done( function() {
                                                binder.navigateToCaseFileBrowser({
                                                    refreshCaseFolder: true
                                                });
                                            } ).fail( function( error ) {
                                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                            } ).always( function() {
                                                contextMenu.close();
                                            } );
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityUnLock' ),
                                        disabled: 'LOCKED' !== meta.row.status || !(isAdmin || meta.row.lockedBy === currentUserEmployeeId),
                                        click: function() {
                                            if( meta.row.status !== 'LOCKED' ){
                                                contextMenu.close();
                                                return;
                                            }
                                            Y.doccirrus.jsonrpc.api.activity.activitiesLockUnlock( {
                                                data: {
                                                    activities: [ meta.row._id ],
                                                    operation: 'unlock'
                                                }
                                            } ).done( function() {
                                                binder.navigateToCaseFileBrowser({
                                                    refreshCaseFolder: true
                                                });
                                            } ).fail( function( error ) {
                                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                            } ).always( function() {
                                                contextMenu.close();
                                            } );
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_detail.menu.Dispensing' ),
                                        disabled: meta.row.actType !== 'MEDICATION' ||
                                                  meta.row.isDispensed ||
                                                  !meta.row.isArrived ||
                                                  (meta.row.status !== 'VALID' &&
                                                   meta.row.status !== 'APPROVED' &&
                                                   meta.row.status !== 'ORDERED' ),
                                        visible: ko.observable( Y.doccirrus.auth.hasAdditionalService('inStock') ),
                                        click: function() {
                                            var  phPZNs = [meta.row.phPZN];
                                            Y.doccirrus.modals.dispensingModal.showDialog({
                                                phPZNs: phPZNs,
                                                locationId: meta.row.locationId,
                                                activities: [meta.row],
                                                currentUser: binder.getInitialData( 'currentUser' ),
                                                callback: function( err ) {
                                                    if (!err) {
                                                        self.activitiesTable.reload();
                                                     }
                                                }
                                            });
                                        }
                                    } )
                                ]
                            } );

                            contextMenu.showAt( $event.pageX, $event.pageY );
                            $event.preventDefault();

                            return false;
                        }
                    },
                    collapseRowsActionVisible: true,
                    collapseMixedMode: false,
                    showRowDependentCollapseRows: function( $context ) {
                        var
                            model = $context.$data,
                            show = dependentCollapseRows.hideRows.indexOf( model ) === -1,
                            showRowDependentCollapseRow;

                        if( !show ) {
                            showRowDependentCollapseRow = dependentCollapseRows.showRowDependentCollapseRowsObservables[model._id];
                            return unwrap( showRowDependentCollapseRow );
                        }

                        return show;
                    },
                    showAdditionalDependentCollapseRows: function( $context ) {
                        var
                            model = $context.$data,
                            show = dependentCollapseRows.showAtRows.indexOf( model ) > -1,
                            showAdditionalDependentCollapseRow;

                        if( show ) {
                            showAdditionalDependentCollapseRow = dependentCollapseRows.showAdditionalDependentCollapseRowsObservables[model._id];
                            return unwrap( showAdditionalDependentCollapseRow );
                        }

                        return show;
                    },
                    getStyleRowAdditionalDependentCollapseRows: function( $context ) {
                        var
                            data = $context.$data,
                            result = '';

                        if( data.actType && actTypeColorMap[data.actType] ) {
                            result = 'background-color:' + actTypeColorMap[data.actType];
                        }

                        return result;
                    },
                    renderAdditionalDependentCollapseRows: function( $context ) {

                        var
                            $data = $context.$data,
                            items = [].concat( dependentCollapseRows.collapses[$data._id] ),
                            markup = [
                                '<span class="fa fa-plus-square-o" style="margin-right: 0.5em; cursor: pointer"></span>',
                                Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', $data.actType, 'i18n', 'k.A.' ),
                                ' ',
                                moment( $data.timestamp ).format( 'DD.MM.YYYY' ),
                                ': ',
                                items.sort( function( a, b ) {
                                    var timestampDiff = (new Date( b.timestamp )).setHours( 0, 0, 0, 0 ) -
                                                        (new Date( a.timestamp )).setHours( 0, 0, 0, 0 );

                                    if( 0 === timestampDiff ) {
                                        timestampDiff = a.code < b.code ? -1 : 1;
                                    }

                                    return timestampDiff;
                                } ).reduce( function( result, item, idx, array ) {
                                    var
                                        text = '',
                                        cropped,
                                        linkText = '',
                                        renderContentAsHTML = ActivityModel.renderContentAsHTML( item ),
                                        renderContentAsHTMLStripped = Y.doccirrus.utils.stripHTML.regExp( renderContentAsHTML ),
                                        linkTitle = renderContentAsHTMLStripped || '',
                                        code = item.code,
                                        entry = {
                                            _id: item._id,
                                            status: item.status,
                                            dateText: linkText,
                                            code: item.code,
                                            explanations: [],
                                            counter: 1
                                        };
                                    // are we repeating?

                                    if( item.code ) {
                                        text = Y.doccirrus.schemas.activity.displayCode( item );
                                    }
                                    else if( renderContentAsHTMLStripped ) {
                                        text = renderContentAsHTMLStripped;
                                        // cleanup
                                        text = Y.Escape.html( text );
                                        text = text.replace( '&amp;nbsp;&amp;nbsp;', '&nbsp;&nbsp;' );
                                        text = text.replace( '\n', ' ' );
                                    }

                                    if( !text ){
                                        //There are no codes or explanations, use actType
                                        text = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', item.actType, 'i18n', 'k.A.' );
                                    }

                                    cropped = text;
                                    if( cropped.length > 20 ) {
                                        cropped = cropped.substr( 0, 20 ) + ' …';
                                    }

                                    if( cropped ) {
                                        linkText += ' ' + cropped;
                                    }
                                    if( 'TREATMENT' === item.actType ) {
                                        if( item.explanations ) {
                                            entry.explanations.push( item.explanations );
                                        }
                                    }

                                    entry.linkTitle = linkTitle;
                                    entry.linkText = linkText;

                                    if( idx > 0 &&
                                        ( code && array[idx - 1].code === code || !code && !array[idx - 1].code ) &&
                                        result[(result.length) - 1].linkText === entry.linkText
                                    ) {
                                        entry = result[(result.length) - 1];
                                        entry.counter++;
                                        if( 'TREATMENT' === item.actType ) {
                                            if( item.explanations ) {
                                                entry.explanations.push( item.explanations );
                                            }
                                        }
                                    } else {
                                        result.push( entry );
                                    }

                                    return result;

                                }, [] )
                                    .map( function( item ) {
                                        var itemText = (item.counter > 1 ? item.counter + ' x ' : ''),
                                            explanations = '';
                                        if( item.explanations.length ) {
                                            explanations += ' (' + item.explanations.join( ',' ) + ')';
                                        }
                                        var a = Y.Lang.sub( '{itemText}<a href="javascript:void(0);" title="{title}" data-navigateToActivity="{navigateToActivity}" data-activity-status="{status}">{linkText}</a>', {
                                            navigateToActivity: item._id,
                                            status: item.status,
                                            title: item.linkTitle,
                                            linkText: item.linkText,
                                            itemText: itemText
                                        } );
                                        return a + explanations;
                                    } )
                                    .filter( function( value ) {
                                        return Boolean( value );
                                    } )
                                    .join( ', ' )
                            ];

                        if( $data.actType === 'TREATMENT' ) {
                            markup[1] = 'L';
                        }

                        return markup.join( '' );
                    },
                    onCollapseRowClick: function( model, event ) {
                        if( event.target.classList.contains( 'fa-plus-square-o' ) ) {
                            dependentCollapseRows.plusClick( model );
                        }
                        else if( 'A' === event.target.tagName ) {
                            binder.navigateToActivity( { activityId: event.target.getAttribute( 'data-navigateToActivity' ) } );
                        }
                    }
                }
            } );

            /**
             *  Subscribe to the 'compact mode' state on the table, automatically collapse the following when
             *  the feature is enabled, MOJ-11441
             *
             *      (*) all prescriptions (Kassenrezept, Privatrezept. Rezept H, Rezept BTM, Rezept T, Rezept G)
             *      (*) Medikationsplan
             *      (*) Leistungen
             */

            self.subscribeCompactMode = self.activitiesTable.collapseRows.subscribe( function( newVal ) {
                if ( false  === newVal ) { return; }

                var
                    alwaysCollapse = Y.doccirrus.schemas.activity.collapseByDefaultActTypes,
                    collapsedActTypes = Y.doccirrus.utils.localValueGet( 'collapsedActTypes' ),
                    i;

                try {
                    collapsedActTypes = JSON.parse( collapsedActTypes || '[]' );
                } catch ( parseErr ) {
                    Y.log( 'Could not parse collapsedActTypes from local storage: ' + collapsedActTypes, 'warn', NAME );
                    collapsedActTypes = alwaysCollapse;
                }

                for ( i = 0; i < alwaysCollapse.length; i++ ) {
                    if ( -1 === collapsedActTypes.indexOf( alwaysCollapse[i] ) ) {
                        collapsedActTypes.push( alwaysCollapse[i] );
                    }
                }

                Y.doccirrus.utils.localValueSet( 'collapsedActTypes', collapsedActTypes );
                self.needsCollapsedTableRender = true;
            } );

            /**
             *  Render collapsed row into HTML, to de-clutter content cell renderer
             *  @param  {Object}    data
             */

            self.renderCollapsedRowComplex = function( data ) {
                //content for collapsed
                var contentParent = ActivityModel.renderContentAsHTML( data, true ),
                    items,
                    linesToShow = 5,
                    placedLinks = [];

                contentParent = contentParent.replace( /{{\.\.\.(?: ?\((\d+)\) ?)?}}/g, '' ); //remove special folding

                items = (dependentCollapseRows.collapses[data._id] || []).filter( function( el ){
                    return !(dependentCollapseRows && dependentCollapseRows.collapsedComplex[ el._id ]);
                } ).sort( function( a, b ) {
                    var timestampDiff = (new Date( b.timestamp )).setHours( 0, 0, 0, 0 ) -
                        (new Date( a.timestamp )).setHours( 0, 0, 0, 0 );

                    if( 0 === timestampDiff ) {
                        timestampDiff = a.code < b.code ? -1 : 1;
                    }

                    return timestampDiff;
                } ).reduce( function( result, item /*, idx, array */ ) {
                    var
                        text = '',
                        orgText = '',
                        cropped,
                        linkText = '',
                        renderContentAsHTML = ActivityModel.renderContentAsHTML( item ),
                        renderContentAsHTMLStripped = Y.doccirrus.utils.stripHTML.regExp( renderContentAsHTML ),
                        entry = {
                            _id: item._id.toString(),
                            status: item.status,
                            dateText: linkText,
                            code: item.code,
                            explanations: [],
                            counter: 1,

                            // filled below, but initialized here
                            text : null,
                            orgText : null,
                            linkTitle : null,
                            linkText : null,

                            // [MOJ-11908] render badges, depending on the state of some activity-properties
                            badges: renderBadgesForActivity( item )
                        };

                    if( renderContentAsHTMLStripped ) {
                        text = renderContentAsHTMLStripped;
                        orgText = text;
                        // cleanup
                        text = Y.Escape.html( text );
                        text = text.replace( '&amp;nbsp;&amp;nbsp;', '&nbsp;&nbsp;' );
                        text = text.replace( '\n', ' ' );
                    } else if( item.code ) {
                        text = Y.doccirrus.schemas.activity.displayCode( item );
                    }

                    if( !text ) {
                        //There are no codes or explanations, use actType
                        text = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', item.actType, 'i18n', 'k.A.' );
                    }

                    entry.text = text;
                    entry.orgText = orgText;

                    switch (item.actType) {
                        case 'HISTORY':
                            text = 'A ' + text;
                            break;
                        case 'FINDING':
                            text = 'B ' + text;
                            break;
                        case 'PROCEDERE':
                            text = 'P ' + text;
                            break;
                        case 'DIAGNOSIS':
                            text = 'D ' + item.code + ' ' + text;
                            break;
                        case 'TREATMENT':
                            text = 'L ' + item.code + ' ' + text;
                            break;
                        default:
                            //leave text unchanged
                            break;
                    }

                    cropped = text;
                    if( cropped.length > 40 ) {
                        cropped = cropped.substr( 0, 40 ) + ' …';
                    }

                    if( cropped ) {
                        linkText += ' ' + cropped;
                    }
                    entry.linkTitle = text;
                    entry.linkText = linkText;
                    result.push( entry );

                    return result;
                }, [] ).map( function( item ) {
                    var randomLinkText = randomString(15),
                        itemText = '',
                        link,
                        foundPlaced;

                    if( -1 !== contentParent.indexOf( item.orgText )){
                        placedLinks.push( {key: randomLinkText, text: item.linkText, title: item.linkTitle});
                        link = Y.Lang.sub( '{badges}{itemText}<a href="javascript:void(0);" title="{title}" data-navigateToActivity="{navigateToActivity}" data-activity-status="{status}">{linkText}</a>', {
                            navigateToActivity: item._id,
                            status: item.status,
                            title: randomLinkText + '_L',
                            linkText: randomLinkText + '_S',
                            itemText: itemText,
                            badges: item.badges
                        });
                        contentParent = contentParent.replace( item.orgText, link);
                    } else {
                        foundPlaced = placedLinks.find( function( el ){
                            return el.text === item.linkText;
                        });
                        if( !foundPlaced ) {
                            return Y.Lang.sub( '{badges}{itemText}<a href="javascript:void(0);" title="{title}" data-navigateToActivity="{navigateToActivity}" data-activity-status="{status}">{linkText}</a>', {
                                navigateToActivity: item._id,
                                status: item.status,
                                title: item.linkTitle,
                                linkText: item.linkText,
                                itemText: itemText,
                                badges : item.badges
                            });
                        }
                    }
                } ).filter( function( value ) {
                    return Boolean( value );
                } );

                placedLinks.forEach(function( el ){
                    contentParent = contentParent.replace( el.key + '_S', el.text ).replace( el.key + '_L', el.title );
                });

                contentParent = contentParent.replace( /(\(\d+\) )/g, '<br>$1');
                contentParent = contentParent.replace( /<br\/?><br\/?>/g, '<br>');
                items = contentParent.split('<br>').concat( items || []).filter( function( el ){ return Boolean( el ); });

                //  add links to attached files in first line, prevent PDF link being cut off below the fold
                if ( items && items[0] && data.attachedMedia && data.attachedMedia.length ) {
                    items[0] = items[0] + ActivityModel.processDocumentLinks( data.attachedMedia );
                }

                if( items.length < linesToShow ){
                    return items.join( '<br>' );
                } else {
                    return items.slice(0,linesToShow).join( '<br>' ) +
                        '<br/><a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' +
                        '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' +
                        '<br>' + items.slice(linesToShow).join( '<br>' ) + '</div>';
                }

            };

            /**
             *  Handle collapseRows
             *
             *  Initializse dependentCollapseRows
             */

            self.addDisposable( ko.computed( function initializeDependentCollapseRows() {
                var
                    collapseRows = unwrap( activitiesTable.collapseRows ),
                    mixedMode = unwrap( activitiesTable.collapseMixedMode ),
                    rows = unwrap( activitiesTable.rows ),
                    localStorageActTypes,
                    localStorageParsedActTypes,
                    tempRows;

                if( collapseRows || mixedMode ) {
                    // namespace
                    dependentCollapseRows = {};
                    dependentCollapseRows.linkedToComplex = [];
                    dependentCollapseRows.collapsedComplex = {};

                    // rows that are hidden
                    dependentCollapseRows.hideRows = [];
                    // rows that are shown with alternative content
                    dependentCollapseRows.showAtRows = [];
                    // id map who collapses who
                    dependentCollapseRows.collapses = {};
                    // id map who is collapsed by who
                    dependentCollapseRows.collapsedBy = {};
                    dependentCollapseRows.collapsedByAdditional = {};
                    // id map of observables for re-rendering of hidden rows
                    dependentCollapseRows.showRowDependentCollapseRowsObservables = {};
                    // id map of observables for re-rendering of alternative content rows
                    dependentCollapseRows.showAdditionalDependentCollapseRowsObservables = {};

                    /**
                     *  Get list of activity types to collapse from local storage, returns array of strings
                     */

                    dependentCollapseRows.getCollapsedActTypes = function() {
                        var
                            localStorageActTypesData = Y.doccirrus.utils.localValueGet( 'collapsedActTypes' ),
                            localStorageParsedActTypesData = [];

                        if( localStorageActTypesData ) {
                            try {
                                localStorageParsedActTypesData = JSON.parse( localStorageActTypesData );
                            } catch( parseErr ) {
                                Y.log( 'Problem getting localStorage actTypes for collapse: ' + JSON.stringify( parseErr ), 'warn', NAME );
                            }
                        }

                        return localStorageParsedActTypesData;
                    };

                    /**
                     *  Handles plus click of a row that was collapsed
                     *
                     *  Clicking this will expand minimized rows of child activities, or simple activities
                     *  all collected into a single row.
                     *
                     *  @param  {Object}    Model   activity as a plain javascript object
                     */

                    dependentCollapseRows.plusClick = function( model ) {
                        // - need to re-initialize things
                        // - need to change observables for re-rendering
                        var //localStorageActTypesData = Y.doccirrus.utils.localValueGet( 'collapsedActTypes' ),
                            localStorageParsedActTypesData = dependentCollapseRows.getCollapsedActTypes(),
                            actTypePosition,
                            showAdditionalDependentCollapseRowsObservable,
                            collapses,
                            collapsedBy = dependentCollapseRows.collapsedBy || {},
                            collapsedByAdditional = dependentCollapseRows.collapsedByAdditional || {},
                            collapsesByType = [],
                            key;

                        activitiesTable.destroyDraggableRows();

                        for (key in collapsedBy) {
                            if (collapsedBy.hasOwnProperty(key) && collapsedBy[key].actType === model.actType) {
                                collapsesByType.push( collapsedBy[key]._id );
                            }
                        }
                        for (key in collapsedByAdditional) {
                            if (collapsedBy.hasOwnProperty(key) && collapsedBy[key].actType === model.actType) {
                                collapsesByType.push( collapsedBy[key]._id );
                            }
                        }
                        collapsesByType.push(model._id);
                        collapsesByType = _.uniq(collapsesByType);

                        collapsesByType.forEach( function( id ){
                            collapses = dependentCollapseRows.collapses[ id ];

                            dependentCollapseRows.collapsedComplex[ id ] = false;
                            dependentCollapseRows.showRowDependentCollapseRowsObservables[ id ]( false );
                            collapses.forEach( function( collapsed ) {
                                var
                                    showRowDependentCollapseRowsObservable = dependentCollapseRows.showRowDependentCollapseRowsObservables[collapsed._id];

                                showRowDependentCollapseRowsObservable( true );
                            } );
                            showAdditionalDependentCollapseRowsObservable = dependentCollapseRows.showAdditionalDependentCollapseRowsObservables[ id ];
                            showAdditionalDependentCollapseRowsObservable( false );
                        });

                        actTypePosition = localStorageParsedActTypesData.indexOf( model.actType );
                        if( -1 !== actTypePosition ) {
                            localStorageParsedActTypesData.splice( actTypePosition, 1 );
                        }

                        Y.doccirrus.utils.localValueSet( 'collapsedActTypes', localStorageParsedActTypesData );

                        setTimeout( function() {
                            activitiesTable.initDraggableRows();
                        }, 10 );
                    };

                    /**
                     *  Handles minus click of a row that can be collapsed
                     *
                     *  @param  {Object}    Model   activity as a plain javascript object
                     */

                    dependentCollapseRows.minusClick = function( model ) {
                        var //localStorageActTypesData = Y.doccirrus.utils.localValueGet( 'collapsedActTypes' ),
                            localStorageParsedActTypesData = dependentCollapseRows.getCollapsedActTypes(),
                            // - need to change observables for re-rendering
                            collapsedByModel,
                            collapsedBy = dependentCollapseRows.collapsedBy || {},
                            collapsedByAdditional = dependentCollapseRows.collapsedByAdditional || {},
                            collapsesByType = [],
                            key;

                        for (key in collapsedBy) {
                            if (collapsedBy.hasOwnProperty(key) && collapsedBy[key].actType === model.actType) {
                                collapsesByType.push( collapsedBy[key]._id );
                            }
                        }
                        for (key in collapsedByAdditional) {
                            if (collapsedBy.hasOwnProperty(key) && collapsedBy[key].actType === model.actType) {
                                collapsesByType.push( collapsedBy[key]._id );
                            }
                        }
                        collapsesByType.push(model._id);
                        collapsesByType = _.uniq(collapsesByType);

                        var
                            linkedIds = [].concat( model.activities || [] )
                                .concat( model.icds || [] )
                                .concat( model.icdsExtra || [] )
                                .concat( model.continuousIcds || [] );

                        collapsesByType.forEach( function( id ){
                            collapsedByModel = dependentCollapseRows.collapsedBy[ id ];

                            if( linkedIds.length && !['DOCLETTER', 'TREATMENT'].includes(model.actType) ) {
                                dependentCollapseRows.collapsedComplex[ id ] = true;
                                dependentCollapseRows.showRowDependentCollapseRowsObservables[ id ]( false );
                            }

                            dependentCollapseRows.collapses[collapsedByModel._id].forEach( function( model ) {
                                dependentCollapseRows.showRowDependentCollapseRowsObservables[model._id]( dependentCollapseRows.collapsedComplex[ model._id ] );
                            } );
                            dependentCollapseRows.showAdditionalDependentCollapseRowsObservables[collapsedByModel._id]( !dependentCollapseRows.collapsedComplex[ id ] );

                        });


                        if( -1 === localStorageParsedActTypesData.indexOf( model.actType ) ) {
                            localStorageParsedActTypesData.push( model.actType );
                            Y.doccirrus.utils.localValueSet( 'collapsedActTypes', localStorageParsedActTypesData );
                        }
                    };

                    // get data from localStorage
                    localStorageActTypes = Y.doccirrus.utils.localValueGet( 'collapsedActTypes' );

                    if( localStorageActTypes ) {
                        try {
                            localStorageParsedActTypes = JSON.parse( localStorageActTypes );
                        } catch( parseErr ) {
                            Y.log( 'Problem getting localStorage actTypes for collapse: ' + JSON.stringify( parseErr ), 'warn', NAME );
                            localStorageParsedActTypes = [];
                        }
                    } else {
                        localStorageParsedActTypes = [];
                    }

                    // build namespace for COMPLEX first
                    dependentCollapseRowsActTypeMap = _.reduce( rows, function( result, currentItem ) {

                        if( -1 === collapseRowsActTypes.indexOf( currentItem.actType ) ) {
                            return result;
                        }

                        if( mixedMode && !collapseRows && !localStorageParsedActTypes.includes(currentItem.actType) ) {
                            return result;
                        }

                        dependentCollapseRows.hideRows.push( currentItem );

                        // Check if we have in result item with current date and timestamp
                        var searchKey = {
                                timestamp: moment( currentItem.timestamp ).format( 'DD.MM.YYYY' ),
                                actType: currentItem.actType,
                                daySeparation: currentItem.daySeparation
                            },
                            activitiesToCollapse = [],
                            // Check if we have in result item with current date and timestamp
                            linkedIds = [].concat( currentItem.activities || [] )
                                .concat( currentItem.icds || [] )
                                .concat( currentItem.icdsExtra || [] )
                                .concat( currentItem.continuousIcds || [] );

                        if( linkedIds.length && !['DOCLETTER', 'TREATMENT'].includes(currentItem.actType) ) {
                            activitiesToCollapse = rows.filter(function( row ) {
                                return -1 !== linkedIds.indexOf( row._id );
                            });
                            activitiesToCollapse.push( currentItem );
                            searchKey.actType = 'COMPLEX' + currentItem.actType;
                            result.push( _.assign( searchKey, { items: activitiesToCollapse } ) );
                            if( localStorageParsedActTypes.includes( currentItem.actType ) ) {
                                dependentCollapseRows.linkedToComplex = dependentCollapseRows.linkedToComplex.concat( activitiesToCollapse.map( function(el){ return el._id; } ));
                                dependentCollapseRows.collapsedComplex[currentItem._id] = true;
                            }
                        }
                        return result;
                    }, [] );


                    // build namespace for group by act type
                    dependentCollapseRowsActTypeMap = _.reduce( rows, function( result, currentItem ) {

                        if( -1 === collapseRowsActTypes.indexOf( currentItem.actType ) ) {
                            return result;
                        }

                        if( mixedMode && !collapseRows && !localStorageParsedActTypes.includes(currentItem.actType) ) {
                            return result;
                        }

                        var
                            linkedIds = [].concat( currentItem.activities || [] )
                            .concat( currentItem.icds || [] )
                            .concat( currentItem.icdsExtra || [] )
                            .concat( currentItem.continuousIcds || [] );

                        if( linkedIds.length && !['DOCLETTER', 'TREATMENT'].includes(currentItem.actType) || dependentCollapseRows.linkedToComplex.includes(currentItem._id) ) {
                            return result;
                        }

                        dependentCollapseRows.hideRows.push( currentItem );

                        // Check if we have in result item with current date and timestamp
                        var searchKey = {
                                timestamp: moment( currentItem.timestamp ).format( 'DD.MM.YYYY' ),
                                actType: currentItem.actType,
                                daySeparation: currentItem.daySeparation
                            },
                            // Check if we have in result item with current date and timestamp
                            searchResult = _.find( result, searchKey );

                        if( searchResult ) {
                            searchResult.items.push( currentItem );
                        } else {
                            result.push( _.assign( searchKey, { items: [currentItem] } ) );
                        }
                        return result;
                    }, dependentCollapseRowsActTypeMap );

                    Y.each( dependentCollapseRowsActTypeMap, function( items ) {
                        var
                            lastItem = items.items[items.items.length - 1];

                        dependentCollapseRows.showAtRows.push( lastItem );
                        dependentCollapseRows.collapses[lastItem._id] = [].concat( items.items );

                        items.items.forEach( function( model ) {
                            dependentCollapseRows.showRowDependentCollapseRowsObservables[model._id] = ko.observable(
                                -1 === localStorageParsedActTypes.indexOf( model.actType ) &&
                                !dependentCollapseRows.linkedToComplex.includes( model._id ) ||
                                dependentCollapseRows.collapsedComplex[ model._id ]

                            );
                            //same activities can be collapsed by several parent activities: with same actType and/or as part of Complex activities
                            if( dependentCollapseRows.collapsedBy[model._id] ){
                                dependentCollapseRows.collapsedByAdditional[model._id + '_' + lastItem._id] = dependentCollapseRows.collapsedBy[model._id];
                            }
                            dependentCollapseRows.collapsedBy[model._id] = lastItem;
                        } );

                        dependentCollapseRows.showAdditionalDependentCollapseRowsObservables[lastItem._id] = ko.observable(
                            -1 !== localStorageParsedActTypes.indexOf( lastItem.actType ) &&
                            !dependentCollapseRows.collapsedComplex[ lastItem._id ]
                        );
                    } );

                    //  force an update of the table rows to cause rerender of content cells
                    if ( self.needsCollapsedTableRender ) {
                        tempRows = self.activitiesTable.data();
                        if ( tempRows.length !== 0 ) {
                            self.needsCollapsedTableRender = false;
                            //  KO table needs a slight delay to register that the content has changed, or it won't re-render
                            setTimeout( function() { self.activitiesTable.data( [] ); }, 100 );
                            setTimeout( function() { self.activitiesTable.data( tempRows ); }, 200 );
                        }
                    }

                }
                else {
                    dependentCollapseRows = null;
                }

            } ) ); // don't rateLimit - otherwise building dependencies will be made after needed
            self.addDisposable( ko.computed( function() {
                // - needs to hide/show collapse minus column
                var
                    collapseRows = unwrap( activitiesTable.collapseRows ),
                    collapseRowsMinus = activitiesTable.getColumnByPropertyName( 'collapseRowsMinus' ),
                    mixedMode = unwrap( activitiesTable.collapseMixedMode );

                if( collapseRowsMinus ) {
                    collapseRowsMinus.visible( collapseRows || mixedMode );
                }
            } ) );

            /**
             * Handle showing of "currentActivity" dependent columns
             */
            self.addDisposable( ko.computed( function() {
                var
                    hasCurrentActivity = unwrap( currentActivityObservable );

                ignoreDependencies( function() {

                    if( hasCurrentActivity ) {
                        activitiesTable.getComponentColumnCheckbox().visible( false );
                        activitiesTable.getComponentColumnDrag().visible( false );
                        activitiesTable.getComponentColumnLinked().visible( true );
                    }
                    else {
                        activitiesTable.getComponentColumnCheckbox().visible( true );
                        activitiesTable.getComponentColumnDrag().visible( true );
                        activitiesTable.getComponentColumnLinked().visible( false );
                    }
                } );
            } ) );

            /**
             * Handle drag and drop
             */
            activitiesTable.events.on( 'KoTable:draggedRows', function( yEvent, data ) {
                Y.doccirrus.jsonrpc.api.activity.moveActivity( {
                    query: {
                        targetId: data.dragData._id,
                        targetPosition: data.dropData.timestamp,
                        direction: (data.dragIndex < data.dropIndex) ? -1 : 1
                    }
                } )
                    .fail( function( err ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: Y.doccirrus.errorTable.getMessage( err ),
                            window: { width: Y.doccirrus.DCWindow.SIZE_MEDIUM }
                        } );
                    } )
                    .always( function() {
                        activitiesTable.reload();
                    } );
            } );

            /**
             * Handle "currentActivity" linking
             */
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( currentActivityObservable ),
                    hasCurrentActivity = Boolean( currentActivity ),
                    currentActivityActivities,
                    currentActivityIcds,
                    currentActivityReceipts = [],
                    currentActivityReferencedBy = [];   //  MOJ-9777 break pattern to show invoices on receipts

                if( !hasCurrentActivity ) {
                    return;
                }

                currentActivityActivities = unwrap( currentActivity.activities || [] ).slice( 0 );
                currentActivityIcds = unwrap( currentActivity.icds || [] ).slice( 0 );

                if( ['INVOICEREF', 'INVOICE'].includes( unwrap( currentActivity.actType ) ) ) {
                    currentActivityReceipts = unwrap( currentActivity.receipts || [] ).slice( 0 );
                }

                if ( 'RECEIPT' === unwrap( currentActivity.actType ) ) {
                    currentActivityReferencedBy = unwrap( currentActivity.referencedBy || [] ).slice( 0 );
                }

                ignoreDependencies( function() {
                    var
                        componentColumnLinked = activitiesTable.getComponentColumnLinked(),
                        linkIds = [];

                    linkIds = linkIds.concat( currentActivityActivities ).concat( currentActivityIcds ).concat( currentActivityReceipts );

                    if ( currentActivityReferencedBy && currentActivityReferencedBy[0] && !currentActivityActivities[0] ) {
                        linkIds.push( currentActivityReferencedBy[0] );
                    }

                    componentColumnLinked.removeLinks();
                    componentColumnLinked.addLinks( linkIds );
                } );
            } ) );

            self.activitiesTableActivityTransitionedListener = Y.on( 'activityTransitioned', function( evt ) {
                var
                    binder = self.get( 'binder' ),
                    notDelete = 'delete' !== evt.transitionDescription.transition,
                    notRepeat = 'repeat' !== evt.transitionDescription.transition;
                //  linked activities may have been updated on server, reload them all, MOJ-9078
                if ( evt && evt.data && evt.data.activities && evt.data.activities.length > 0 ) {
                    evt.reloadTable = true;
                }

                //  try to update the table without reloading it from server
                if( evt && !evt.reloadTable && evt.data && !evt.isNew && evt.transitionDescription && notDelete && notRepeat ) {
                    self.updateActivitiesTable( evt.data );
                    return;
                }

                if( activitiesTable ) {
                    activitiesTable.reload();
                }

                if ( !notRepeat ) {
                    Y.log( 'Navigating to new repetition: ', evt.data._id );

                    binder.navigateToCaseFolder( {
                        'patientId': evt.data.patientId,
                        'caseFolderId': evt.data.caseFolderId
                    } );

                    binder.navigateToActivity( { activityId: evt.data._id } );
                }

            } );
            self.activitiesTableActivityPDFChangeListener = Y.on( 'activityPDFChange', function( /* evt */ ) {
                activitiesTable.reload();
            } );
            self.activitiesTableActivityCopiedListener = Y.on( 'activityCopied', function() {
                activitiesTable.reload();
            } );
            self.activitiesTableActivityPrintedListener = Y.on( 'activityPrinted', function() {
                activitiesTable.reload();
            } );

            /**
             *  Refresh display of activities changed on server (only those, don't refresh everything)
             */

            self.activitiesTableActivityChangedOnServerListener = Y.on( 'activityChangedOnServer', function( evt ) {
                var
                    changes = evt.data || [],
                    toDownload = [],
                    i;

                for ( i = 0; i < changes.length; i++ ) {
                    if ( self.isActivityInTable( changes[i] ) ) {
                        toDownload.push( changes[i] );
                    }
                }

                //  changed activities are not currently displayed
                if ( 0 === toDownload.length ) { return; }

                Y.doccirrus.jsonrpc.api.activity
                    .read( {  query: { _id: { $in: toDownload } } } )
                    .then( onUpdatesDownloaded );

                function onUpdatesDownloaded( newActivities ) {
                    newActivities = newActivities.data ? newActivities.data : newActivities;
                    for ( i = 0; i < newActivities.length; i++ ) {
                        self.updateActivitiesTable( newActivities[i] );
                    }
                }
            } );

            /**
             *  Check whether an activity is displayed on the current page of the activities table
             *  (only need to handle updates from the server if their activities are displayed )
             */

            self.isActivityInTable = function __isActivityInTable( activityId ) {
                //  table may be in process of init or dispose
                if( !activitiesTable || !activitiesTable.data ) { return false; }

                var
                    tableData = activitiesTable.data(),
                    i;

                for( i = 0; i < tableData.length; i++ ) {
                    if( tableData[i]._id === activityId ) { return true; }
                }
                return false;
            };

            self.updateActivitiesTable = function( activity ) {
                //  table may be in process of init or dispose
                if( !activitiesTable || !activitiesTable.data ) {
                    return false;
                }

                var
                    tableData = activitiesTable.data(),
                    i;

                for( i = 0; i < tableData.length; i++ ) {
                    if( tableData[i]._id === activity._id ) {
                        tableData[i] = activity;
                        activitiesTable.data( tableData );
                        Y.log( 'Activity has changed, updating in table: ' + i + ' ' + activity._id + ' ' + activity.actType, 'debug', NAME );
                        return true;
                    }
                }
                return false;
            };

            /** Handle bootstrap tooltips on "navigateToActivity"-links **/
            self.activitiesTableCollapseRowsTooltips = {
                mouseenter: Y.one( "body" ).delegate( "mouseenter", function( event ) {
                    jQuery( 'a[data-navigateToActivity]', event.target.getDOMNode() ).tooltip( {
                        delay: 0,
                        placement: 'top'
                    } );
                }, ".KoTable-row-collapse" ),
                mouseleave: Y.one( "body" ).delegate( "mouseleave", function( event ) {
                    jQuery( 'a[data-navigateToActivity]', event.target.getDOMNode() ).each( function() {
                        var
                            $tooltip = jQuery( this ).data( 'bs.tooltip' );

                        if( $tooltip ) {
                            $tooltip.destroy();
                        }
                    } );
                }, ".KoTable-row-collapse" )
            };

        },  // end initActivitiesTable

        destroyActivitiesTable: function() {
            var

                self = this;
            if( self.activitiesTableActivityTransitionedListener ) {
                self.activitiesTableActivityTransitionedListener.detach();
                self.activitiesTableActivityTransitionedListener = null;
            }
            if( self.activitiesTableActivityPDFChangeListener ) {
                self.activitiesTableActivityPDFChangeListener.detach();
                self.activitiesTableActivityPDFChangeListener = null;
            }
            if( self.activitiesTableActivityCopiedListener ) {
                self.activitiesTableActivityCopiedListener.detach();
                self.activitiesTableActivityCopiedListener = null;
            }
            if( self.activitiesTableActivityPrintedListener ) {
                self.activitiesTableActivityPrintedListener.detach();
                self.activitiesTableActivityPrintedListener = null;
            }
            /** Remove bootstrap tooltips on "navigateToActivity"-links **/
            if( self.activitiesTableCollapseRowsTooltips ) {
                self.activitiesTableCollapseRowsTooltips.mouseenter.detach();
                self.activitiesTableCollapseRowsTooltips.mouseleave.detach();
                self.activitiesTableCollapseRowsTooltips = null;
            }
        },
        initSocketListeners: function() {
            var
                self = this,
                currentPatient = unwrap( self.get( 'currentPatient' ) );

            Y.doccirrus.communication.on( {
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                handlerId: 'CaseFileViewModel',
                done: function success( response ) {
                    var
                        data = response && response.data,
                        activitiesTable = self.activitiesTable,
                        caseFolderId = data && data[0],
                        activeCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab();
                    if( activitiesTable && activeCaseFolder && caseFolderId === activeCaseFolder._id ) {
                        activitiesTable.reload();
                    }
                }
            } );
            Y.doccirrus.communication.on( {
                event: 'invoiceTransitionDone',
                handlerId: 'CaseFileViewModel',
                done: function success( response ) {
                    var
                        data = response && response.data,
                        activitiesTable = self.activitiesTable,
                        caseFolderId = data && data[0],
                        activeCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab();
                    if( activitiesTable && activeCaseFolder && caseFolderId === activeCaseFolder._id ) {
                        activitiesTable.reload();
                    }
                }
            } );
            Y.doccirrus.communication.on( {
                event: 'system.BL_EXCEEDED',
                handlerId: 'CaseFileViewModel',
                done: function success( response ) {
                    var caseFolderId = response.data[0] && response.data[0].caseFolderId,
                        caseFolders = currentPatient && currentPatient.caseFolderCollection,
                        caseFolder,
                        text;
                    if( caseFolders && caseFolderId ) {
                        caseFolder = caseFolders.getTabById( caseFolderId );
                    }
                    text = Y.Lang.sub( BL_EXCEEDED, { caseFolderName: (caseFolder && caseFolder.title) || '' } );

                    Y.doccirrus.DCSystemMessages.removeMessage( 'BLExceeded' );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'BLExceeded',
                        content: text,
                        level: 'WARNING'
                    } );
                }
            } );
        },
        destroySocketListeners: function() {
            Y.doccirrus.communication.off( 'system.UPDATE_ACTIVITIES_TABLES', 'CaseFileViewModel' );
            Y.doccirrus.communication.off( 'system.BL_EXCEEDED', 'CaseFileViewModel' );
        },
        activityCaseFileButtonsViewModel: null,
        initActivityCaseFileButtonsViewModel: function() {
            var
                self = this,
                observable;

            if( !self.activityCaseFileButtonsViewModel ) {
                observable = ko.observable( null );
                self.activityCaseFileButtonsViewModel = ko.computed( {
                    read: observable,
                    write: function( value ) {
                        var
                            observablePeek = peek( observable );

                        if( value !== observablePeek ) { // prevent change for same value
                            if( observablePeek ) {
                                observablePeek.destroy();
                            }
                            observable( value );
                        }
                    }
                } );
            }
        },
        destroyActivityCaseFileButtonsViewModel: function() {
            var
                self = this,
                activityCaseFileButtonsViewModelPeek;

            if( self.activityCaseFileButtonsViewModel ) {
                activityCaseFileButtonsViewModelPeek = peek( self.activityCaseFileButtonsViewModel );
                self.activityCaseFileButtonsViewModel.dispose();
                if( activityCaseFileButtonsViewModelPeek ) {
                    self.activityCaseFileButtonsViewModel( null );
                    activityCaseFileButtonsViewModelPeek.destroy();
                }
                self.activityCaseFileButtonsViewModel = null;
            }
        },
        activityConfigurableActionButtonsViewModel: null,
        initActivityConfigurableActionButtonsViewModel: function() {
            var
                self = this,
                observable;

            if( !self.activityConfigurableActionButtonsViewModel ) {
                observable = ko.observable( null );
                self.activityConfigurableActionButtonsViewModel = ko.computed( {
                    read: observable,
                    write: function( value ) {
                        var
                            observablePeek = peek( observable );

                        if( value !== observablePeek ) { // prevent change for same value
                            if( observablePeek ) {
                                observablePeek.destroy();
                            }
                            observable( value );
                        }
                    }
                } );
            }
        },
        destroyActivityConfigurableActionButtonsViewModel: function() {
            var
                self = this,
                activityConfigurableActionButtonsViewModelPeek;

            if( self.activityConfigurableActionButtonsViewModel ) {
                activityConfigurableActionButtonsViewModelPeek = peek( self.activityConfigurableActionButtonsViewModel );
                self.activityConfigurableActionButtonsViewModel.dispose();
                if( activityConfigurableActionButtonsViewModelPeek ) {
                    self.activityConfigurableActionButtonsViewModel( null );
                    activityConfigurableActionButtonsViewModelPeek.destroy();
                }
                self.activityConfigurableActionButtonsViewModel = null;
            }
        },
        activityCaseFoldersViewModel: null,
        initActivityCaseFoldersViewModel: function() {
            var
                self = this;

            if( !self.activityCaseFoldersViewModel ) {
                self.activityCaseFoldersViewModel = ko.observable( new ActivityCaseFoldersViewModel() );
            }
        },
        destroyActivityCaseFoldersViewModel: function() {
            var
                self = this;

            if( self.activityCaseFoldersViewModel ) {
                peek( self.activityCaseFoldersViewModel ).destroy();
                self.activityCaseFoldersViewModel = null;
            }
        },
        activityCreateButtonsViewModel: null,
        initActivityCreateButtonsViewModel: function() {
            var
                self = this;
            if( !self.activityCreateButtonsViewModel ) {
                self.activityCreateButtonsViewModel = ko.observable( new ActivityCreateButtonsViewModel() );
            }
        },
        destroyActivityCreateButtonsViewModel: function() {
            var
                self = this;

            if( self.activityCreateButtonsViewModel ) {
                peek( self.activityCreateButtonsViewModel ).destroy();
                self.activityCreateButtonsViewModel = null;
            }
        },
        activitySequenceViewModel: null,
        initActivitySequenceViewModel: function() {
            var
                self = this;
            if( !self.activitySequenceViewModel ) {
                self.activitySequenceViewModel = ko.observable( new ActivitySequenceViewModel() );
            }
        },
        destroyActivitySequenceViewModel: function() {
            var
                self = this;

            if( self.activitySequenceViewModel ) {
                peek( self.activitySequenceViewModel ).destroy();
                self.activitySequenceViewModel = null;
            }
        },
        columnClassName: null,
        initColumnClassName: function() {
            var
                self = this;

            self.columnClassName = ko.computed( function() {
                var
                    isLeftPinned = false,
                    isRightPinned = false,
                    activityCreateButtonsViewModel = unwrap( self.activityCreateButtonsViewModel ),
                    activitySequenceViewModel = unwrap( self.activitySequenceViewModel );

                if( activityCreateButtonsViewModel ) {
                    isLeftPinned = unwrap( activityCreateButtonsViewModel.isPinned );
                }

                if( activitySequenceViewModel ) {
                    isRightPinned = unwrap( activitySequenceViewModel.isPinned );
                }

                if( !isLeftPinned && !isRightPinned ) {
                    return 'col-md-12';
                }
                else if( (isLeftPinned && !isRightPinned) || (!isLeftPinned && isRightPinned) ) {
                    return 'col-md-10';
                }
                else if( isLeftPinned && isRightPinned ) {
                    return 'col-md-8';
                }
            } );
        },
        //  raised from ko event binding, used to update form editors, MOJ-9552
        onMainColumnScroll: function( /* data, event */ ) {
            var
                self = this,
                activityDetailsVM = unwrap( self.activityDetailsViewModel ) || null;

            if ( !activityDetailsVM ) { return; }
            if ( !activityDetailsVM.template ) { return; }
            if ( !activityDetailsVM.template.valueEditor ) { return; }
            if ( !activityDetailsVM.template.valueEditor.reposition ) { return; }

            activityDetailsVM.template.valueEditor.reposition();
        }
    }, {
        NAME: 'CaseFileViewModel',
        ATTRS: {
            currentPatient: {
                valueFn: function() {
                    return this.get( 'binder' ).currentPatient;
                },
                lazyAdd: false
            }
        },
        getMaterialCostsText: function( item ) {
            var
                fk5011,
                title = '',
                fk5012Text = [];
            if( 'TREATMENT' !== item.actType ) {
                return '';
            }
            if( item.billingFactorValue && 'EBM' !== item.catalogShort ) {
                title = i18n( 'activity-schema.Treatment_T.billingFactorValue.i18n' ) + ': ' + Y.doccirrus.comctl.numberToLocalString( item.billingFactorValue ) + '\n';
            }
            if( 'EBM' === item.catalogShort ) {
                item.fk5012Set.forEach( function( fk5012Set ) {
                    var
                        fk5012 = fk5012Set.fk5012 || 0;
                    fk5011 = [];
                    if( fk5012Set.fk5011Set ) {
                        fk5012Set.fk5011Set.forEach( function( item ) {
                            fk5011.push( item.fk5011 );
                        } );
                    }
                    if( fk5011.length ) {
                        fk5012Text.push( fk5011.join( ', ' ) + ': ' + Y.doccirrus.comctl.numberToLocalString( fk5012 / 100 ) );
                    }
                } );
                if( fk5012Text.length ) {
                    title += i18n( 'InCaseMojit.casefile_browser.label.LIST_OF_DESCRIPTION' ) + ': ' + '\n' + fk5012Text.join( '\n' ) + '\n';
                }
            } else {
                title += i18n( 'activity-schema.Price_T.ASK.i18n' ) + ': ' + (Y.doccirrus.comctl.numberToLocalString( item.generalCosts || 0 ) ) + ' ' + i18n( 'activity-schema.Price_T.BSK.i18n' ) + ': ' + (Y.doccirrus.comctl.numberToLocalString( item.specialCosts || 0 ) );
            }
            return title;
        }
    } );

    KoViewModel.registerConstructor( CaseFileViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InCaseMojitViewModel',
        'DCKimSignatureModal',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',
        'dcquery',
        'dcutils',
        'dc-comctl',
        'dchotkeyshandler',
        'dcschemaloader',
        'DCContextMenu',
        'activity-schema',
        'ActivityModel',
        'Collection',
        'DCMailActivitiesModalPreview',
        'ActivityPatientInfoViewModel',
        'ActivityDetailsViewModel',
        'ActivityCaseFileButtonsViewModel',
        'ActivityConfigurableActionButtonsViewModel',
        'ActivityCaseFoldersViewModel',
        'ActivityCreateButtonsViewModel',
        'ActivitySequenceViewModel',
        'auditDiffDialog',
        'v_treatment-schema'
    ]
} );
