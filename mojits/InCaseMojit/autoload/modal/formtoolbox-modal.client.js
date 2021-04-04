/*global YUI, ko, $, moment */

YUI.add( 'formtoolbox-modal', function( Y, NAME ) {
        'use strict';

        var i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            Disposable = Y.doccirrus.KoViewModel.getDisposable(),
            KoViewModel = Y.doccirrus.KoViewModel,
            WYSWYGViewModel = KoViewModel.getConstructor( 'WYSWYGViewModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            ActivityDocTreeViewModel = KoViewModel.getConstructor( 'ActivityDocTreeViewModel' ),
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            ignoreDependencies = ko.ignoreDependencies,

            ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),
            DocumentModel = KoViewModel.getConstructor( 'DocumentModel' ),
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            DEFAULT_SIZES = {
                preview: 'col-xs-2',
                editor: 'col-xs-7',
                toolbox: 'col-xs-3'
            },
            LOCAL_STORAGE_NAME = 'formtoolbox-modal-column-sizes',
            LOCAL_STORAGE_ACTIVE_TAB = 'formtoolbox-modal-active-tab';

        function FormToolboxModel() {
            FormToolboxModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( FormToolboxModel, Disposable, {
            initializer: function FormToolboxModel_initializer( config ) {
                var self = this;

                self.caseFileBinder = config.binder || {};
                self.currentActivity = config.activity || {};
                self.currentPatient = config.patient || {};
                self.mapperContext = config.mapperContext || {};
                self.linkedActivities = config.linkedActivities || [];
                self.currentCaseFolderId = ko.observable( unwrap( self.currentActivity.caseFolderId ) );

                self.template = config.template || {};
                self.initializeMarkdownEditor();
                self.initActivityDocTreeViewModel( config.currentActivityEditor );
                self.initCaseFolderNav();
                self.initActivitiesTable();
                self.initActivityDetailsViewModel();

                self.textBlocksNavI18n = i18n( 'InCaseMojit.formtoolbox_modal.navTabs.TEXT_BLOCKS' );
                self.healthRecordNavI18n = i18n( 'InCaseMojit.formtoolbox_modal.navTabs.FILE' );
            },
            initializeMarkdownEditor: function() {
                var
                    self = this;

                //  form text controls
                self.wyswyg = new WYSWYGViewModel();

                self.listenActivityStatusForm = ko.computed( function() {
                    self.wyswyg.isEditable( unwrap( self.currentActivity._isEditable ) );
                } );

                self.template.off( 'elementSelected', NAME );
                self.template.on( 'elementSelected', NAME, function onElementSelected( elem ) {
                    if( self.template.valueEditor && self.template.valueEditor.jqContentEditable ) {
                        self.wyswyg.setTextArea( self.template.valueEditor.jqContentEditable[0], elem );
                    }
                } );
            },
            currentActivity: null,
            currentPatient: null,
            currentCaseFolderId: null,
            pages: ko.observableArray( [] ),
            showDocTree: null,      //  observable, true if doc tree should be shown
            hasDocTree: null,       //  observable, true if doc tree should be shown and exists
            activityDocTreeViewModel: null,
            caseFolderNav: null,
            activitiesTable: null,
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

            destructor: function() {
                this.destroyActivityDocTreeViewModel();
            },

            updatePages: function( pages ) {
                this.pages( pages );
            },

            scrolToPage: function( canvas ) {
                canvas.text.scrollIntoView();
            },

            cloneCanvas: function( elem, data ) {
                //create a new canvas
                var context = elem.getContext( '2d' ),
                    containerWidth = ($( "#preview" ).width() - 11),
                    ratio = containerWidth / data.text.width;

                //set dimensions
                elem.width = containerWidth;
                elem.height = data.text.height * ratio;

                //apply the old canvas to the new one
                context.drawImage( data.bg, 0, 0, data.bg.width, data.bg.height, 0, 0, elem.width, elem.height );
                context.drawImage( data.text, 0, 0, data.text.width, data.text.height, 0, 0, elem.width, elem.height );
            },

            initActivityDocTreeViewModel: function( currentActivityEditor ) {
                var
                    self = this;

                self.activityDocTreeViewModel = new ActivityDocTreeViewModel( {currentEditor: currentActivityEditor} );
                self.activityDocTreeViewModel.setTarget( null );
            },
            initCaseFolderNav: function() {
                var
                    self = this,
                    currentPatient = self.currentPatient;

                self.caseFolderNav = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {}
                } );

                /**
                 * Syncs case folders with nav items
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        caseFolders = currentPatient && unwrap( currentPatient.caseFolderCollection.items );

                    if( !currentPatient ) {
                        return;
                    }

                    ignoreDependencies( function() {
                        self.caseFolderNav.items.removeAll();

                        caseFolders = [
                            {
                                _id: undefined,
                                title: i18n( 'InCaseMojit.casefile_browser.label.ALL_CASES' )
                            }].concat( caseFolders );
                        self.caseFolderNav.addItems( caseFolders.map( function( folder ) {
                            var
                                postfix = folder._id || 'all',
                                config = {
                                    name: 'caseFolder-' + postfix,
                                    html: Y.doccirrus.schemas.casefolder.renderCasefolderName( folder, true ),
                                    caseFolderId: folder._id,
                                    css: {
                                        'toolbox-item': true
                                    },
                                    click: function( item ) {
                                        self.caseFolderNav.activateTab( item );
                                        self.currentCaseFolderId( item.caseFolderId );
                                    }
                                };

                            return config;
                        } ) );
                    } );

                } ) );

                // set active tab for caseFolders nav
                self.caseFolderNav.activateTab( 'caseFolder-' + (unwrap( self.currentCaseFolderId ) || 'all') );
            },

            initActivitiesTable: function() {
                var
                    self = this,
                    currentPatient = self.currentPatient,
                    currentActivityObservable = self.currentActivity,
                    activitySettings = self.caseFileBinder.getInitialData( 'activitySettings' ) || [],
                    activitiesTable,
                    actTypeColorMap = {},
                    activityTableBaseParams,
                    swissInsuranceDescription = Y.doccirrus.schemas.activity.swissInsuranceDescription,
                    activeCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                    caseFolderType = activeCaseFolder && activeCaseFolder.type,
                    isSwissCaseFolder = Y.doccirrus.schemas.casefolder.isSwissCaseFolderType( caseFolderType );

                activitySettings.forEach( function( activitySetting ) {
                    actTypeColorMap[activitySetting.actType] = activitySetting.color;
                } );

                activityTableBaseParams = ko.computed( function() {
                    var
                        patientId = unwrap( currentPatient && currentPatient._id ),
                        caseFolderId = unwrap( self.currentCaseFolderId ),
                        userFilter = Y.doccirrus.utils.getFilter(),
                        filterQuery = userFilter && userFilter.location && {"locationId": userFilter.location},
                        query = Y.merge( filterQuery );

                    if( patientId ) {
                        query.patientId = patientId;
                    }

                    if( caseFolderId ) {
                        query.caseFolderId = caseFolderId;
                    }

                    return {
                        query: query,
                        caseFileDoctorSelectFilter: {},
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

                function mapLinkedActivities( callback ) {

                    if( !callback ) {
                        callback = function() {
                        };
                    }

                    function onFormDataComplete( err, formData ) {

                        function onMapComplete( err ) {

                            if( err ) {
                                Y.log( 'Error mapping values into form: ' + err, 'warn', NAME );
                                return callback( err );
                            }

                            //  been loaded, raise event through template
                            self.template.raise( 'mapcomplete', formData );
                            callback( null, formData );
                        }

                        if( err ) {
                            Y.log( 'Could not get formData from template ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }

                        //  map values into form
                        self.template.map( formData, true, onMapComplete );
                    }

                    self.currentActivity._reloadLinkedActivities().then( function() {
                        Y.dcforms.mapper.genericUtils.getFormDataForLinkedActivities(
                            self.template,
                            {
                                user: null,
                                activity: self.currentActivity,
                                patient: self.currentPatient,
                                locations: [],
                                caseFolder: null,
                                invoiceconfiguration: {}
                            },
                            onFormDataComplete
                        );
                    } );
                }

                self.activitiesTable = activitiesTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        formRole: 'casefile-patient-folder',
                        stateId: 'CaseFileMojit-formtoolbox-activitiesTable',
                        states: ['limit', 'usageShortcutsVisible'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.activity.getCaseFileLight,
                        baseParams: activityTableBaseParams,
                        ignoreCountLimit: true, // as per MOJ-11879, this will override the hardcoded count limit of 2000 entries
                        limit: 10,
                        limitList: [10, 20, 30, 40, 50, 100],
                        columns: [
                            {
                                componentType: 'KoTableColumnLinked',
                                forPropertyName: 'linked',
                                label: '(y)',
                                visible: false,
                                isCheckBoxDisabledHook: function( data ) {
                                    var
                                        linked = this.linked(),
                                        currentActivity = self.currentActivity;
                                    if( !currentActivity ) {
                                        return true;
                                    }

                                    if( unwrap( self.currentCaseFolderId ) !== unwrap( currentActivity.caseFolderId ) ) {
                                        return true;
                                    }

                                    return currentActivity.linkedActivityCheckboxDisabled( linked, data );
                                },
                                toggleLinkOfRowHook: function( link, data ) {
                                    var
                                        columnLinked = this,
                                        currentActivity = self.currentActivity,
                                        result;
                                    if( !currentActivity ) {
                                        return false;
                                    }

                                    result = currentActivity.linkedActivityCheckboxTrigger( columnLinked, link, data );
                                    mapLinkedActivities();
                                    return result;
                                },
                                toggleSelectAllHook: function( rows ) {
                                    var
                                        columnLinked = this,
                                        currentActivity = self.currentActivity,
                                        result;
                                    if( !currentActivity ) {
                                        return false;
                                    }

                                    if( unwrap( self.currentCaseFolderId ) !== unwrap( currentActivity.caseFolderId ) ) {
                                        return false;
                                    }
                                    result = currentActivity.linkedActivityCheckboxSelectAll( columnLinked, rows );
                                    columnLinked.removeLinks();
                                    columnLinked.addLinks( self.linkedActivities && self.linkedActivities.linked() );
                                    mapLinkedActivities();
                                    return result;
                                },
                                toggleDeselectAllHook: function( rows ) {
                                    var
                                        columnLinked = this,
                                        currentActivity = self.currentActivity,
                                        result;
                                    if( !currentActivity ) {
                                        return false;
                                    }

                                    if( unwrap( self.currentCaseFolderId ) !== unwrap( currentActivity.caseFolderId ) ) {
                                        return false;
                                    }

                                    result = currentActivity.linkedActivityCheckboxDeselectAll( columnLinked, rows );
                                    columnLinked.removeLinks();
                                    columnLinked.addLinks( self.linkedActivities && self.linkedActivities.linked() );
                                    setTimeout( mapLinkedActivities, 1000 );
                                    return result;
                                },
                                getCss: function( $context ) {
                                    //  used to highlight other activities which refer to this one (ie, parents) MOJ-8169
                                    var css = $context.$data.css();
                                    css['KoTableCell-linkBack'] = true;
                                    return css;
                                }
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
                                        return moment( timestamp ).format( TIMESTAMP_FORMAT );
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
                                    options: Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                interceptRenderOutput: function( output, meta, isTitle ) {
                                    arguments[0] = output && isTitle ? Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', output, 'i18n', 'k.A.' ) : output;
                                    var intercepted = meta.col.__proto__.interceptRenderOutput.apply( this, arguments );
                                    if( !intercepted ) {
                                        return '';
                                    }
                                    if( 'string' !== typeof intercepted ) {
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
                                visible: false,
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

                                    if( data.status === 'LOCKED' ) {
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
                                iconCount: function( meta ) {
                                    return "(" + (meta.row.savedEmails || []).length + ")";
                                },
                                hasIcon: function( meta ) {
                                    return (meta.row.savedEmails || []).length;
                                },
                                onIconClick: function( meta, $event ) {
                                    Y.doccirrus.modals.mailActivitiesPreviewModal.showDialog( meta.row.savedEmails || [] );
                                    $event.stopPropagation();
                                },
                                interceptRenderOutput: function( output, meta, isTitle ) {

                                    arguments[0] = output && isTitle ? output.replace( /<\/?[a-z]+\/?>/gi, '' ) : output;
                                    // [MOJ-12031] call parent function after manipulating the content for further processing
                                    var intercepted = meta.col.__proto__.interceptRenderOutput.apply( this, arguments );
                                    if( !intercepted ) {
                                        return '';
                                    }
                                    if( 'string' !== typeof intercepted ) {
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
                                        USER_CONTENT_FOLD_BY_LEN_REGEXP = /{{\.\.\. ?\((\d+)\) ?}}/g,
                                        match,
                                        divideByCharacters = 0,
                                        foldedSomehow = false;

                                    //  TODO: deduplicate this and replace with the version in inCaseUtils MOJ-13266
                                    function foldTextByCharsNumber( renderContentAsHTML, divideByCharacters ) {
                                        var stripedHtml, left, right, found, ind;
                                        if( !divideByCharacters ) {
                                            return divideByCharacters;
                                        }
                                        stripedHtml = renderContentAsHTML.replace( /<[^>]+>/g, '' ).replace( /&nbsp;/g, String.fromCharCode( 0 ) );
                                        renderContentAsHTML = renderContentAsHTML.replace( /&nbsp;/g, String.fromCharCode( 0 ) );
                                        if( stripedHtml.length > divideByCharacters ) {
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

                                    if( data.status === 'LOCKED' ) {
                                        return '<i class="fa fa-lock" aria-hidden="true"></i> ' + data.userContent;
                                    }

                                    renderContentAsHTML = ActivityModel.renderContentAsHTML( data, false, useMarkdown );

                                    //match = (data.userContent || '').match(USER_CONTENT_FOLD_BY_LEN_REGEXP);
                                    match = USER_CONTENT_FOLD_BY_LEN_REGEXP.exec( renderContentAsHTML || '' );
                                    if( match && match.length ) {
                                        divideByCharacters = Number.parseInt( match[1], 10 );
                                        renderContentAsHTML = (renderContentAsHTML || '').replace( USER_CONTENT_FOLD_BY_LEN_REGEXP, '' );
                                    }

                                    if( data.careComment && !divideByCharacters ) {
                                        foldedSomehow = true;
                                        renderContentAsHTML += ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a><div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' + data.careComment + '</div>';
                                    }

                                    if( 'MEASUREMENT' === data.actType || ('PROCESS' === data.actType && data.d_extra && Object.keys( data.d_extra ).length) && !divideByCharacters ) {
                                        foldedSomehow = true;
                                        renderContentAsHTML += ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a><div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' + data.userContent + '</div>';
                                    }

                                    //  Add custom fold to text, may be specified in activity type settings, or added to individual activities
                                    if( -1 !== renderContentAsHTML.indexOf( USER_CONTENT_FOLD_MARKER ) && !divideByCharacters ) {
                                        foldedSomehow = true;
                                        parts = renderContentAsHTML.split( USER_CONTENT_FOLD_MARKER, 2 );
                                        renderContentAsHTML = parts[0] +
                                                              '<a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' +
                                                              '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' +
                                                              parts[1] +
                                                              '</div>';
                                    }

                                    if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && data.actType === 'MEDICATION' ) {
                                        renderContentAsHTML += " (" + (swissInsuranceDescription[data.insuranceCode] || "-") + ")";
                                        if( data.phContinuousMed && data.phContinuousMedDate ) {
                                            renderContentAsHTML += " <br/>" + moment( data.phContinuousMedDate ).format( TIMESTAMP_FORMAT );
                                        }
                                    }

                                    //TODO: remove this render hack and implement proper rendering/activity type of device result data
                                    if(
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
                                                if( compactView.length !== 0 ) {
                                                    compactView += '\n';
                                                }
                                                compactView += content[i + 1].substr( commentIndentation.length );
                                            }
                                        }
                                        if( data.g_extra.records[0].testId ) {
                                            if( 'string' === typeof data.g_extra.records[0].testId ) {
                                                tests = [data.g_extra.records[0].testId];
                                            } else {
                                                tests = data.g_extra.records[0].testId.map( function( test ) {
                                                    return test.head;
                                                } );
                                            }
                                        }
                                        if( tests ) {
                                            compactView += "\nTests: " + tests.join( ", " );
                                        }

                                        //  TODO: deduplicate and tidy this into ActivityModel.processDocumentLinks
                                        pdfLinks = data.attachedMedia && data.attachedMedia.map( function( attachment ) {
                                            var
                                                ext = Y.doccirrus.media.types.getExt( attachment.contentType || 'application/binary' ),
                                                url = DocumentModel.fullUrl( {
                                                    contentType: attachment.contentType,
                                                    mediaId: attachment.mediaId
                                                } );
                                            var title = attachment.title;

                                            if( attachment.malwareWarning ) {
                                                //  do not link directly to malware from the table, make the user look at the warning
                                                return '<span style="color: red;">' + ext.toUpperCase() + '</span>';
                                            }

                                            return url ? '<a href="' + url + '"' + (title ? 'title="' + title + '"' : "") + ' target="_blank" style="margin-left: 10px;">' + ext.toUpperCase() + '</a>' : '';
                                        } );

                                        pdfLinks = pdfLinks && Array.isArray( pdfLinks ) ? pdfLinks.join( ',' ) : '';

                                        compactView = compactView.replace( /\n/g, "<br>" ).replace( / /g, "&nbsp;" );

                                        renderContentAsHTML = compactView + ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' + pdfLinks + '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden"><br>Alle Daten:<br>' + overview + '</div>';
                                    } else if( ['COMMUNICATION', 'MEDICATIONPLAN', 'KBVMEDICATIONPLAN'].includes( data.actType ) ) {
                                        if( data.content.length > 80 || 'MEDICATIONPLAN' === data.actType ) {

                                            if( ['MEDICATIONPLAN', 'KBVMEDICATIONPLAN'].includes( data.actType ) && data.comment && data.comment.length ) {
                                                divideByCharacters = 85 + data.comment.length;
                                            } else {
                                                divideByCharacters = 80;
                                            }

                                            compactView = data.content.substring( 0, divideByCharacters );
                                            overview = data.content.substring( divideByCharacters );

                                            //  TODO: deduplicate and tidy this into ActivityModel.processDocumentLinks
                                            pdfLinks = data.attachedMedia && data.attachedMedia.map( function( attachment ) {
                                                var
                                                    ext = Y.doccirrus.media.types.getExt( attachment.contentType || 'application/binary' ),
                                                    useCaption = (('MEDICATIONPLAN' === data.actType) ? (attachment.title || attachment.caption || ext.toUpperCase()) : ext.toUpperCase()),
                                                    url = DocumentModel.fullUrl( {
                                                        contentType: attachment.contentType,
                                                        mediaId: attachment.mediaId
                                                    } );

                                                var title = attachment.title || '';

                                                if( attachment.malwareWarning ) {
                                                    //  do not link directly to malware from the table, make the user look at the warning
                                                    return '<span style="color: red;">' + ext.toUpperCase() + '</span>';
                                                }

                                                return url ? '<a href="' + url + '"' + (title ? 'title="' + title + '"' : "") + ' target="_blank" style="margin-left: 10px;">' + useCaption + '</a>' : '';
                                            } );

                                            pdfLinks = pdfLinks && Array.isArray( pdfLinks ) ? pdfLinks.join( ',' ) : '';

                                            // Quick fix to the specific case of these act types. MOJ-11905.
                                            renderContentAsHTML = ActivityModel.renderContentAsHTML( {content: compactView}, false, useMarkdown ) + ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' + pdfLinks + '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden"> ' + overview + '</div>';

                                            divideByCharacters = 0; // as a specific folding  was defined here, set it back to 0 to avoid new folding
                                        }
                                    }

                                    if( divideByCharacters ) {
                                        renderContentAsHTML = foldTextByCharsNumber( renderContentAsHTML, divideByCharacters );
                                    } else if( !foldedSomehow && data.actType === 'PROCESS' ) {
                                        //if any folding are applied use default by 80 characters
                                        renderContentAsHTML = foldTextByCharsNumber( renderContentAsHTML, 80 );
                                    }

                                    return renderContentAsHTML;
                                }
                            },
                            {
                                forPropertyName: 'caseFolderId',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                                width: '115px',
                                isSortable: true,
                                visible: false,
                                renderer: function( meta ) {
                                    var
                                        id = meta.value,
                                        caseFolder = null;
                                    if( id ) {
                                        caseFolder = currentPatient && currentPatient.caseFolderCollection.getTabById( id );
                                    }
                                    return caseFolder && (caseFolder.merged ? caseFolder.title + ' (Z)' : caseFolder.title) || '';
                                }
                            },
                            {
                                forPropertyName: 'status',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                                width: '115px',
                                isSortable: true,
                                isFilterable: true,
                                visible: false,
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
                                visible: false,
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
                                visible: false,
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

                                    if( data.actType === "MEDICATION" ) {
                                        price = meta.row.phPriceSale;
                                    }

                                    if( data.status === 'LOCKED' ) {
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
                                    options: Y.doccirrus.schemas.activity.types.ApkState_E.list.map( function( el ) {
                                        return {
                                            text: getColorForAPKState( el.val ),
                                            val: el.val
                                        };
                                    } ),
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
                                        if( !invoiceLogType ) {
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
                                        switch( invoiceLogType ) {
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
                                        url = '/invoice#/' + invoiceLogTypeUrl + '/' + invoiceLogId + ' /' + meta.row.patientId;

                                        content.push( makeLink( invoiceLogType === 'CASH' ? 'R' : invoiceLogType, url ) );
                                    }

                                    //  INVOICEREFPVS links to PVS log
                                    if( meta.row.pvslogId ) {
                                        url = '/invoice#/pvs/' + meta.row.pvslogId + '/' + meta.row.patientId;
                                        content.push( makeLink( 'PVS', url ) );
                                    }

                                    //  INVOICEREFGKV links to PVS log
                                    if( meta.row.kbvlogId ) {
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
                            } else {
                                activitiesTable.responsive( false );
                            }

                            visibleColumns.forEach( function( col ) {
                                var
                                    width = ko.utils.peekObservable( col.width ) || '';

                                if( width.indexOf( '%' ) > 0 ) {
                                    tableMinWidth += 200;
                                } else {
                                    tableMinWidth += parseInt( width, 10 );
                                }
                            } );

                            return tableMinWidth + 'px';
                        }, null, {deferEvaluation: true} ).extend( {rateLimit: 0} ),
                        onCellClick: function( meta, $event ) {
                            var
                                insertText = '',
                                target = $( "#divFloatEditorMDFloatEditor" ) && $( "#divFloatEditorMDFloatEditor" ).length &&
                                         $( "#divFloatEditorMDFloatEditor" )['0'];

                            if( $event.originalEvent && $event.originalEvent.detail && 2 === $event.originalEvent.detail && target ) {
                                insertText = meta.col.renderer( meta );
                                document.execCommand( 'insertHTML', false, insertText );
                            }
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
                        }
                    }
                } );

                var subscriptOnce = self.activitiesTable.data.subscribe( function() {
                    var
                        componentColumnLinked = self.activitiesTable.getComponentColumnLinked();

                    if( self.linkedActivities && self.linkedActivities.linked() && self.linkedActivities.linked().length ) {
                        componentColumnLinked.removeLinks();
                        componentColumnLinked.addLinks( self.linkedActivities && self.linkedActivities.linked() );
                        mapLinkedActivities( function() {
                            self.updatePages( [] );
                            self.updatePages( self.template.pages );
                        } );
                    }
                    subscriptOnce.dispose();
                } );

                /**
                 * Handle showing of "currentActivity" dependent columns
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        currentActivity = unwrap( currentActivityObservable ),
                        currentCasefolder = unwrap( self.currentCaseFolderId );

                    ignoreDependencies( function() {
                        if( currentCasefolder !== unwrap( currentActivity.caseFolderId ) ) {
                            activitiesTable.getComponentColumnCheckbox().visible( false );
                            activitiesTable.getComponentColumnLinked().visible( false );
                        } else if( currentActivity ) {
                            activitiesTable.getComponentColumnCheckbox().visible( false );
                            activitiesTable.getComponentColumnLinked().visible( true );
                        } else {
                            activitiesTable.getComponentColumnCheckbox().visible( true );
                            activitiesTable.getComponentColumnLinked().visible( false );
                        }
                    } );
                } ) );

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
            }
        } );

        function closeCurrentEditor( template ) {
            if( template.valueEditor ) {

                if( template.selectedElement ) {
                    template.raise( 'editorLostFocus', template.selectedElement );
                }

                template.valueEditor.destroy();
                if( template.valueEditor.jqEditor ) {
                   // remove outer divFloatEditor to be able to work with a new one on toolbox modal
                   template.valueEditor.jqEditor.detach();
                }
                template.valueEditor = null;
            }

            // remove scroll from body to make modal wider and to avoid redundant scrolling
            $('body').css( 'overflow', 'hidden' );
        }

        function show( options ) {
            var
                JADE_TEMPLATE = 'InCaseMojit/views/formtoolbox_modal',
                template,
                modal,
                formTemplate,
                model,

                formOptions = {
                    'canonicalId': options.editTemplate.canonicalId,
                    'formVersionId': options.editTemplate.formVersionId,
                    'divId': 'divFormsComposeToolBox',
                    'doRender': false,
                    'isFromToolbox': true
                };

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( {path: JADE_TEMPLATE} ) )
                .then( loadFormTemplate )
                .then( prepareModal )
                .then( resizeAndRenderForm )
                .then( addEventListeners )
                .catch( catchUnhandled );

            function prepareModal( response ) {
                return new Promise( function( resolve ) {
                    var modalTemplate = (response && response.data) ? response.data : null,
                        bodyContent = Y.Node.create( modalTemplate );

                    closeCurrentEditor( options.editTemplate );

                    modal = new Y.doccirrus.DCWindow( { //  eslint-disable-line no-unused-vars
                        id: 'formToolboxModal',
                        className: 'DCWindow-toolbox',
                        bodyContent: bodyContent,
                        title: i18n( 'InCaseMojit.formtoolbox_modal.text.TITLE' ),
                        width: Math.ceil( $( window ).width() ),
                        height: Math.ceil( $( window ).height() ),
                        centered: true,
                        modal: true,
                        render: document.body,
                        dragable: false,
                        maximizable: true,
                        resizeable: false,
                        focusOn: [],
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        this.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    label: i18n( 'general.button.APPLY' ),
                                    isDefault: true,
                                    action: function() {
                                        var self = this;
                                        if( options.editTemplate && template ) {
                                            options.editTemplate.fromDict( template.toDict(), function() {
                                                options.editTemplate.render( function() {

                                                    (options.editTemplate.pages || []).map(function( page ){
                                                        var editableElements = (page.elements || []).filter( function( el ){ return el.canEdit(); } );
                                                        editableElements.map( function( element ){
                                                            options.editTemplate.raise( 'valueChanged', element );
                                                        } );
                                                    } );
                                                    self.close();
                                                } );
                                            } );
                                                                                    }
                                    }
                                } )
                            ]
                        },
                        after: {
                            visibleChange: function( event ) {
                                var sizes = Object.assign( {}, DEFAULT_SIZES );
                                if( false === event.newVal ) {
                                    $( '#toolBoxModal div.row > div' ).each( function() {
                                        var elem = $( this ),
                                            size = elem.attr( 'class' ).split( ' ' ).find( function( cl ) {
                                                return cl.indexOf( 'col-' ) === 0;
                                            } );
                                        if( size ) {
                                            sizes[elem.attr( 'id' )] = size;
                                        }
                                    } );
                                    Y.doccirrus.utils.localValueSet( LOCAL_STORAGE_NAME, sizes );
                                }
                            },
                            render: function onRender() {
                                var modalMask = $( '.modal-backdrop.DCWindow-modal' ),
                                    modal = $( '#formToolboxModal' ),
                                    formModal = $( '#toolBoxModal' ),
                                    formHeight = $( '.toolbox-modal' ).parent().height(),
                                    wyswygHeight = $( '#wyswyg' ).height();
                                formModal.height( formHeight );
                                if( modalMask && modalMask[0] ) {
                                    modalMask[0].style.zIndex = 1999;
                                }
                                if( modal && modal[0] ) {
                                    modal[0].style.zIndex = 2000;
                                    modal[0].style.position = 'fixed';
                                    modal[0].style.top = 0;

                                }
                                var sizes;
                                try {
                                    sizes = JSON.parse( Y.doccirrus.utils.localValueGet( LOCAL_STORAGE_NAME ) );
                                } catch( e ) {
                                    sizes = undefined;
                                }
                                if( !sizes ) {
                                    sizes = Object.assign( {}, DEFAULT_SIZES );
                                }

                                Object.keys( sizes ).forEach( function( key ) {
                                    $( '#toolBoxModal #' + key ).addClass( sizes[key] ).height( formHeight );
                                    if( key === 'editor' ) {
                                        $( '#toolBoxModal #divFormFillToolBox' ).height( formHeight - wyswygHeight );
                                    }
                                } );
                                $( '#editor' ).on( 'resizeGrid', resizeAndRenderForm );
                                $( '.grid' ).resizableGrid();

                                $( ".activitiesTable" ).on( "mousedown", function( e ) {
                                    if( e && e.originalEvent && e.originalEvent.target &&
                                        'KoTableCell' === e.originalEvent.target.className ) {
                                        // stop propagation for mouseclick on KoTableCell in toolbox
                                        // to prevent loosing of focus from editable div
                                        return false;
                                    }
                                } );

                                $( '#divFloatEditor' ).css( 'z-index', 2001 );

                                var activeTab = Y.doccirrus.utils.localValueGet( LOCAL_STORAGE_ACTIVE_TAB );
                                if( activeTab ) {
                                    $( activeTab ).addClass( 'active in' );
                                    $( activeTab + '-link' ).addClass( 'active' );

                                } else {
                                    $( '#textblocks-link' ).addClass( 'active' );
                                    $( '#textblocks' ).addClass( 'active' );
                                    Y.doccirrus.utils.localValueSet( LOCAL_STORAGE_ACTIVE_TAB, '#textblocks' );
                                }

                                $( '#casefile-link, #textblocks-link' ).on( 'click', function( event ) {
                                    Y.doccirrus.utils.localValueSet( LOCAL_STORAGE_ACTIVE_TAB, '#' + $( event.currentTarget ).attr( 'id' ).split( '-' )[0] );
                                } );
                            },
                            destroy: function() {
                                if( template ) {
                                    closeCurrentEditor( template );
                                    template.destroy();
                                }
                                // return scroll for body
                                $( 'body' ).css( 'overflow', '' );
                                ko.cleanNode( bodyContent.getDOMNode() );
                            }
                        }
                    } );

                    model = new FormToolboxModel( Object.assign( {}, options, {template: formTemplate} ) );
                    ko.applyBindings( model, bodyContent.getDOMNode() );

                    var
                        jqFloatEditor = $( '#divFloatEditor' ),
                        modalOffset = jqFloatEditor.offset();

                    jqFloatEditor
                        .css( 'position', 'relative' )
                        .css( 'background-color', 'rgba(100,0,0,0.3)' )
                        .css( 'left', -1 * modalOffset.left )
                        .css( 'top', (-1 * modalOffset.top) + adjustBootstrapHeader() );

                    resolve();
                } );
            }

            function adjustBootstrapHeader() {
                var navHeader = $( '#NavBarHeader' );
                if( navHeader[0] && navHeader.hasClass( 'NavBarHeader-fixed' ) ) {
                    return navHeader.height();
                }
                return 0;
            }

            function loadFormTemplate( response ) {
                return new Promise( function( resolve, reject ) {
                    Y.dcforms.getFormListing( '', formOptions.canonicalId, createFormTemplate );

                    function createFormTemplate( err, formMeta ) {

                        if( !err ) {
                            formOptions.formVersionId = formMeta.latestVersionId;
                        }

                        formOptions.callback = onFormTemplateCreated;
                        Y.dcforms.createTemplate( formOptions );

                        function onFormTemplateCreated( err, newFormTemplate ) {
                            if( !err && !newFormTemplate ) {
                                err = 'Could not create form template';
                            }
                            if( err ) {
                                return reject( err );
                            }

                            formTemplate = newFormTemplate;
                            template = newFormTemplate;
                            template.highlightEditable = false;
                            template.fromDict( options.editTemplate.toDict() );
                            template.mode = 'fill';

                            resolve( response );
                        }
                    }
                } );
            }

            function resizeAndRenderForm() {
                return new Promise( function( resolve, reject ) {
                    template.resize( $( "#divFormFillToolBox" ).width() - 11, onRedrawComplete );

                    function onRedrawComplete() {
                        template.setSelected( 'fixed', null );
                        template.render( function( err, result ) {
                            if( err ) {
                                return reject( err );
                            }
                            model.updatePages( [] );
                            model.updatePages( template.pages );
                            resolve( result );
                        } );
                    }
                } );
            }

            function addEventListeners() {
                return new Promise( function( resolve ) {
                    template.on( 'requestImage', NAME, function( args ) { options.activitySectionViewModel.onRequestImage( args ); } );
                    template.on( 'requestAudioPlayback', NAME, function( args ) { options.activitySectionViewModel.onRequestAudioPlay( args ); } );
                    template.on( 'requestAudioRecord', NAME, function( args ) { options.activitySectionViewModel.onRequestAudioRecord( args ); } );
                    template.on( 'requestLabData', NAME, function( args ) { options.activitySectionViewModel.onRequestLabdata( args ); } );
                    template.on( 'requestContacts', NAME, function( args ) { options.activitySectionViewModel.onRequestContacts( args ); } );
                    template.on( 'createOverFlowPage', NAME, function(){
                        setTimeout( function() {
                            model.updatePages( [] );
                            model.updatePages( template.pages );
                        }, 0 );
                    } );
                    resolve();
                } );
            }
        }

        Y.namespace( 'doccirrus.modals' ).formToolbox = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'ActivityDetailsViewModel'
        ]
    }
);
