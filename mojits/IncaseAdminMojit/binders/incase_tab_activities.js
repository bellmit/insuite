/*global YUI, fun:true, $, ko */
/*exported fun */

fun = function _fn( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,

        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        peek = ko.utils.peekObservable,
        DocumentationTreeModel = KoViewModel.getConstructor( 'DocumentationTreeModel' ),

        // SUCCESS = i18n( 'IncaseAdminMojit.incase_tab_activities.message.SUCCESS' ),
        ERROR = i18n( 'IncaseAdminMojit.incase_tab_activities.message.ERROR' ),
        LBL_CONFIG_TEXTBLOCKS = i18n( 'IncaseAdminMojit.incase_tab_activities.label.LBL_CONFIG_TEXTBLOCKS' ),
        SAVE = i18n( 'general.button.SAVE' ),
        COLOR_NO_CONFIG = '#FFFFFF',
        COLOR_HAS_CONFIG = '#CCCCCC',

        id = Y.doccirrus.schemas.activitysettings.getId(),
        colorListener = ko.observable( 0 ),                     //  observable to hold subscriptions for button colors
        otherScheins = [],

        allSubTypes = null,
        subscriptions = [],                              //  disposables from select 2
        isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
        isGerman = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();

    function showError() {
        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            message: ERROR
        } );
    }

    // function showSuccess( msg, type ) {
    //     notice( {
    //         type: type,
    //         message: msg,
    //         window: {width: 'medium'}
    //     } );
    // }

    function mergeWithOtherScheins( settings ) {
        var schein;

        settings.some( function( setting ) {
            if( 'SCHEIN' === setting.actType ) {
                schein = setting;
                return true;
            }
        } );

        if( schein ) {
            otherScheins.forEach( function( oSchein ) {
                var data = ko.toJS( oSchein );
                data.color = schein.color;
                data.userContent = schein.userContent;
                data.isVisible = true;
                settings.push( data );
            } );
        }

    }

    /**
     *  Save activity settings back to the server
     *
     *  TODO: replace this $ajax call with jsonrpc
     *
     *  @param vm
     *  @param btn
     */

    function saveSettings( vm, btn ) {
        var data = vm.activitySettings._serializeToJS();

        btn.masked( true );
        mergeWithOtherScheins( data.settings );
        data.fields_ = ['settings'];
        $.ajax( {
            type: 'PUT',
            contentType: 'application/json; charset=UTF-8',
            data: JSON.stringify( data ),
            xhrFields: {withCredentials: true},
            url: Y.doccirrus.infras.getPrivateURL( '/1/activitysettings/' + id )
        } ).done( function( response ) {
            if( response.meta.errors.length ) {
                showError();
            }
            // else {
            //     showSuccess(SUCCESS, 'info');
            // }
        } ).fail( function() {
            showError();
        } ).always( function() {
            btn.masked( false );
        } );

    }

    function filterSettings( settingsObj ) {
        var filterered = [],
            settings = settingsObj.settings();

        settings.forEach( function( setting ) {

            if( isGerman ) {
                if( 'LONGPRESCR' === setting.actType ) {
                    return false;
                }
            }
            if( 'BGSCHEIN' === setting.actType || 'PKVSCHEIN' === setting.actType && !isSwiss ) {
                otherScheins.push( setting );
            } else {
                filterered.push( setting );
            }
            if( !setting.hasOwnProperty( 'schein' ) ) {
                setting.schein = false;
            }
            if( !setting.hasOwnProperty( 'userContent' ) ) {
                setting.userContent = '';
            }
        } );

        filterered.sort( sortByName );

        function sortByName( a, b ) {
            if( a.de.toLowerCase() > b.de.toLowerCase() ) {
                return 1;
            }
            if( b.de.toLowerCase() > a.de.toLowerCase() ) {
                return -1;
            }
            return 0;
        }

        settingsObj.settings( filterered );
        return settingsObj;
    }

    /**
     *  Instantiate a modal for editing the documentation tree / textbausteine
     *
     *  TODO:  move to Y.doccirrus.modals
     *  @param  {Object}    options
     *  @param  {String}    options.title               Modal title
     *  @param  {Object}    options.documentationTree   KO DocumentationTreeModel
     *  @param  {Function}  options.callback            Optional
     */

    function documentationTree( options ) {
        var
            title = options.title,
            documentationTree = options.documentationTree,
            documentationTreeWindow,
            callback = options.callback || function() {
            },
            callbackObj = {
                success: false
            },
            node = Y.Node.create( '<div></div>' );

        Y.Node.one( 'body' ).append( node );

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'editDocumentationTree',
            'IncaseAdminMojit',
            {
                title: title
            },
            node,
            onNodeTemplateNoaded
        );

        function onNodeTemplateNoaded() {
            var treeBindings = {
                TreeModel: documentationTree,
                _addButton: __addButton,
                _removeButton: __removeButton,
                _getNextLevel: __getNextLevel
            };

            function __addButton( index ) {
                if( !index ) {
                    documentationTree.createButtonAtPath( 0 );
                } else {
                    documentationTree.createButtonAtPath( index() + 1 );
                }
            }

            function __removeButton( index ) {
                documentationTree.removeButtonAtPath( index() );
            }

            function __getNextLevel( index ) {
                documentationTree.getNextLevelAtIndex( index() );
            }

            ko.applyBindings( treeBindings, node.getDOMNode() );
        }

        var clearbindings = function() {
            $( 'body' ).unbind( 'click' );
            $( 'body' ).unbind( 'keydown' );
        };

        function closeWindow() {
            clearbindings();
            documentationTreeWindow.close();
            callback( callbackObj );
        }

        documentationTreeWindow = new Y.doccirrus.DCWindow( {
            className: 'DCWindow-editDocumentationTree',
            title: title,
            bodyContent: node,
            render: document.body,
            width: Y.doccirrus.DCWindow.SIZE_LARGE,
            height: 600,
            minHeight: 250,

            centered: true,
            maximizable: true,
            fitOnViewPortResize: true,

            buttons: {
                header: ['maximize'],
                footer: [
                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                        action: function() {
                            closeWindow();
                        }
                    } ),
                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                        isDefault: true,
                        action: function() {
                            callbackObj.success = true;
                            documentationTree._save( closeWindow );
                        }
                    } )
                ]
            }
        } );
    }

    function configureDocTree( item ) {

        var
            actType = item.actType,
            actName = item.de,

            treeData = item.__docTree || {actType: actType},
            treeModel = new DocumentationTreeModel( {data: treeData} ),

            treeModalOptions = {
                'title': LBL_CONFIG_TEXTBLOCKS.replace( '$actName$', actName ),
                'actType': actType,
                'documentationTree': treeModel,
                'callback': onDocTreeChanged
            };

        treeModel.initiate();

        documentationTree( treeModalOptions );

        function onDocTreeChanged() {
            Y.doccirrus.jsonrpc.api.documentationtree
                .read( {query: {actType: item.actType}} )
                .then( onGetUpdatedDocTree )
                .fail( onDocTreeFail );
        }

        function onGetUpdatedDocTree( result ) {
            var newTree = result && result.data && result.data[0] ? result.data[0] : null;
            item.__docTree = newTree;
            //  increment observable, cause button colors to update
            colorListener( colorListener() + 1 );
        }

        function onDocTreeFail( err ) {
            Y.log( 'Problem updating documentation tree from server: ' + JSON.stringify( err ), 'warn', NAME );
        }

    }

    function configureUserContent( item ) {
        Y.doccirrus.modals.backmapping.show( {
            'actType': item.actType,
            'userContent': item.userContent,
            'onUpdate': onUpdate
        } );

        //  called after user has changed default userContent / backmapping template
        function onUpdate( newUserContent ) {
            item.userContent = newUserContent;
            //  increment observable, cause button colors to be updated
            colorListener( colorListener() + 1 );
        }
    }

    function btnColorUserContent( actSettings ) {
        //  invoke observable to create subscription
        colorListener();
        return (!actSettings.userContent || '' === actSettings.userContent) ? COLOR_NO_CONFIG : COLOR_HAS_CONFIG;
    }

    function btnColorDocTree( actSettings ) {
        var
            actDocTree = actSettings.__docTree || {},
            hasDocTreeEntries = (!actDocTree.entries || 0 === actDocTree.entries.length);

        //  invoke observable to create subscription
        colorListener();
        return hasDocTreeEntries ? COLOR_NO_CONFIG : COLOR_HAS_CONFIG;
    }

    function btnColorAdditionalParams( actSettings ) {
        //  invoke observable to create subscription
        colorListener();
        return Y.doccirrus.schemas.activitysettings.hasAdditionalParametersChanged( actSettings ) ? COLOR_HAS_CONFIG : COLOR_NO_CONFIG;
    }

    function showAdditionalParams( data ) {
        var
            vm = this;
        Y.doccirrus.modals.additionalActivitySettingsModal.show( {
            data: {
                maxMedicationAmount: peek( data.maxMedicationAmount ),
                quickPrintInvoice: peek(data.quickPrintInvoice),
                hideLinksOfPrintedPDF: peek(data.hideLinksOfPrintedPDF),
                quickPrintInvoiceBill: peek(data.quickPrintInvoiceBill),
                quickPrintPrescription: peek(data.quickPrintPrescription)
            },
            actType: data.actType
        } )
            .then( function( result ) {
                peek( vm.activitySettings.settings ).some( function( item ) {
                    if( item.actType === data.actType ) {
                        item.maxMedicationAmount = result.maxMedicationAmount;
                        item.quickPrintInvoice = result.quickPrintInvoice;
                        item.hideLinksOfPrintedPDF = result.hideLinksOfPrintedPDF;
                        item.quickPrintInvoiceBill = result.quickPrintInvoiceBill;
                        item.quickPrintPrescription = result.quickPrintPrescription;
                        colorListener( colorListener() + 1 );
                        return true;
                    }
                } );
            } );
    }

    function hasAdditionalSettings( data ) {
        return ['PRIVPRESCR', 'LONGPRESCR'].indexOf( data.actType ) !== -1;
    }

    function isVisibleDisabled( actType ) {
        if( 'SCHEIN' === actType ) {
            return true;
        }

        return Y.doccirrus.schemas.activity.isEdoc( actType );
    }

    function isScheinDisabled( activityType ) {
        const hasInVoice = Y.doccirrus.auth.hasBaseServices( Y.doccirrus.schemas.settings.baseServices.INVOICE );
        return hasInVoice && activityType === 'DIAGNOSIS' || activityType === 'TREATMENT' || activityType === 'SCHEIN';
    }

    function isShowPrintCountDisabled( activityType ) {
        return activityType === "OBSERVATION" || activityType === "CAVE" || activityType === "EXTERNAL" || activityType === "CONTACT" || activityType === "MEDICATIONPLAN" ||
               activityType === "PREVENTION" || activityType === "PROCEDERE" || activityType === "TELECONSULT" || activityType === "THERAPYSTEP";
    }

    function isWYSWYGDisabled( activityType ) {
        var
            //  findings and simple activities for now, not types with a mask
            canHaveWYSWYG = [
                "HISTORY",
                "EXTERNAL",
                "FINDING",
                "PREVENTION",
                "PROCEDERE",
                "THERAPY",
                "COMMUNICATION",
                "PROCESS",
                "CONTACT",
                "FROMPATIENT",
                "FROMPATIENTMEDIA",
                "TELECONSULT",
                "MEDICATIONPLAN",
                "GRAVIDOGRAMM",
                "DOCLETTERDIAGNOSIS",
                "DOCLETTER",
                "PRIVPRESCR",
                "LONGPRESCR",
                "PUBPRESCR",
                "FORM",
                "THERAPYSTEP",
                "STOCKDISPENSE",
                "VACCINATION",
                "OBSERVATION",
                "CAVE",
                "REMINDER",
                "RECEIPT",
                "WARNING1",
                "WARNING2",
                "CREDITNOTE",
                "INVOICE"
            ];

        return (-1 === canHaveWYSWYG.indexOf( activityType ));
    }

    /**
     *  Check if a given actType can have custom user content
     *
     *  @param  {Object}    item    activity settings item
     *  @return {Boolean}
     */

    function hasUserContent( item ) {
        var exclude = [
            /*
            'GRAVIDOGRAMMPROCESS',
            'MEDDATA',
            'UTILITY',
            'DIAGNOSIS',
            'FINDING',
            'TREATMENT',
            'MEDICATION',
            'OPHTHALMOLOGY_TONOMETRY',
            'OPHTHALMOLOGY_REFRACTION',
            'LABREQUEST',
            'AU',
            'ASSISTIVE',
            'EHKSND',
            'EHKSD'
            */
        ];

        return (-1 === exclude.indexOf( item.actType ));
    }

    function attachMiniColors( domNode ) {
        var elementsToAttach = $( '.input-color', domNode );
        if( !elementsToAttach.length ) {
            return false;
        }
        elementsToAttach.minicolors(
            'create',
            {
                theme: 'bootstrap',
                position: 'bottom left',
                change: function( value ) {
                    var
                        inputDom = $( this ).get( 0 ),
                        $data = ko.dataFor( inputDom );

                    $data.color( value );
                }
            }
        );
    }

    /**
     *  Handles requests from subtype select2 elements when searching for subtypes
     *
     *  Lazy-loads and then filters the whole set of subTypes
     *
     *  @param  {Object}    query           As provided by select2
     *  @param  {String}    query.term      Search term
     *  @param  {Function}  query.callback  New results for select2
     */

    function querySubTypesFromServer( query ) {
        var
            tagsQuery = {
                query: {
                    type: 'SUBTYPE',
                    title: {$regex: query.term, $options: 'i'}
                },
                options: {
                    sort: {title: 1}
                },
                fields: {title: 1}
            };

        //  query is for all subtypes and these have already been cached
        if( '' === query.term && allSubTypes ) {
            query.callback( {results: allSubTypes.slice( 0 )} );
            return;
        }

        //  we have the complete list of subtypes cached, filter it and return
        if( allSubTypes ) {
            filterSubTypesOnClient( query );
            return;
        }

        //  subTypes have not already been cached
        Y.doccirrus.jsonrpc.api.tag.read( tagsQuery ).done( onSubTypesQuery ).fail( onSubTypesFailed );

        function onSubTypesQuery( response ) {
            var
                data = response.data,
                formattedSubtypes = data.map( subTypeToSelect2 );

            if( '' === query.term ) {
                allSubTypes = formattedSubtypes;
            }

            query.callback( {results: formattedSubtypes} );
        }

        function onSubTypesFailed( err ) {
            Y.log( 'Error on query: ' + JSON.stringify( err ), 'error', NAME );
            query.callback( {results: []} );
        }
    }

    /**
     *  Reduce the set of subTypes on the client, no need to reload them
     *  @param query
     */

    function filterSubTypesOnClient( query ) {
        var
            filteredSubTypes = [],
            queryRegEx = Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, {
                onlyRegExp: true,
                noRegexEscape: true
            } ),
            i;

        for( i = 0; i < allSubTypes.length; i++ ) {
            if( allSubTypes[i].text.match( queryRegEx ) ) {
                filteredSubTypes.push( allSubTypes[i] );
            }
        }

        query.callback( {results: filteredSubTypes} );
    }

    /**
     *  Utility method to format simple subtype strings for select2 elements
     *  @param      {Mixed}     subType string or object
     *  @returns    {Object}    select2 options
     */

    function subTypeToSelect2( subType ) {
        if( 'object' === typeof subType ) {
            subType = subType.title;
        }
        return {
            id: subType,
            text: subType
        };
    }

    /**
     *  Small utility to manage disposal of computeds
     */

    function addDisposable( koComputed ) {
        subscriptions.push( koComputed );
        return koComputed;
    }

    return {

        //  load settings and bind the control
        registerNode: function( node ) {

            var
                domNode = node.getDOMNode(),
                subTypeSelect2 = {},
                bindings = {
                    //  bound methods
                    configureDocumentationTree: configureDocTree,
                    configureUserContent: configureUserContent,
                    showAdditionalParams: showAdditionalParams,
                    hasAdditionalSettings: hasAdditionalSettings,
                    hasUserContent: hasUserContent,
                    btnColorUserContent: btnColorUserContent,
                    btnColorDocTree: btnColorDocTree,
                    btnColorAdditionalParams: btnColorAdditionalParams,
                    isVisibleDisabled: isVisibleDisabled,
                    isScheinDisabled: isScheinDisabled,
                    isShowPrintCountDisabled: isShowPrintCountDisabled,
                    isWYSWYGDisabled: isWYSWYGDisabled,
                    getSubtypeSelect2: getSubtypeSelect2,       //  used by KO binding

                    //  translations
                    labelVisibleI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.VISIBLE' ),
                    labelEntryTypeI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.ENTRY_TYPE' ),
                    labelColorI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.COLOR' ),
                    labelTextBlocksI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.TEXT_BLOCKS' ),
                    labelBackMappingI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.BACKMAPPING' ),
                    labelSubtypesI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.SUBTYPES' ),
                    labelAdditionalParamsI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.ADDITIONAL_PARAMS' ),
                    labelScheinMandatoryI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.SCHEIN_MANDATORY' ),
                    labelShowPrintCountI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.SHOW_PRINT_COUNT' ),
                    labelUseWYSWYGI18n: i18n( 'IncaseAdminMojit.incase_tab_activities.label.USE_WYSWYG' ),

                    saveBtn: KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'saveBtn',
                            text: SAVE,
                            option: 'PRIMARY',
                            click: function() {
                                saveSettings( bindings, this );
                            }
                        }
                    } )
                };

            bindings.showAdditionalParams = bindings.showAdditionalParams.bind( bindings );

            //  load settings from server, bind into template
            Y.doccirrus.api.activitysettings.initWithDocTree( onSettingsInitialized );

            function onSettingsInitialized( err, settingsObj ) {
                if( err ) {
                    Y.log( 'Could not load activity settings: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                bindings.activitySettings = filterSettings( settingsObj );

                ko.applyBindings( bindings, domNode );
                attachMiniColors( domNode );
            }

            function getSubtypeSelect2( koIndex ) {
                var idx = koIndex();

                var allSettings = bindings.activitySettings.settings();
                var settingsModel = allSettings[idx];
                var subTypes = settingsModel.subTypes;

                if( !subTypeSelect2.hasOwnProperty( idx ) ) {
                    try {

                        subTypeSelect2[idx] = {
                            data: addDisposable(
                                ko.computed( {
                                    read: function() {
                                        return ko.unwrap( subTypes ).map( subTypeToSelect2 );
                                    },
                                    write: function( $event ) {
                                        if( Y.Object.owns( $event, 'added' ) ) {
                                            subTypes.push( $event.added.text );
                                        }
                                        if( Y.Object.owns( $event, 'removed' ) ) {
                                            subTypes.remove( $event.removed.text );
                                        }
                                    }
                                } )
                            ),
                            select2: {
                                multiple: true,
                                width: '100%',
                                query: function( query ) {
                                    querySubTypesFromServer( query );
                                },
                                formatResult: function( obj ) {
                                    return obj.text;
                                }
                            }
                        };

                    } catch( select2Err ) {
                        Y.log( 'Error while creating select2 (' + idx + '): ' + JSON.stringify( select2Err ), 'error', NAME );
                    }
                }

                return subTypeSelect2[idx];
            }

        },

        deregisterNode: function() {
            subscriptions.forEach( function( koComputed ) {
                if( koComputed.dispose ) {
                    koComputed.dispose();
                }
            } );
        }
    };
};
