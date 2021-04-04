/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, $ */
/*exported fun */
fun = function _fn( Y ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        userLang = Y.doccirrus.comctl.getUserLang(),
        i18n = Y.doccirrus.i18n;

    /**
     * Represents a shortcut collection
     * @constructor
     * @property shortcuts
     */
    function ShortcutsModel() {

        var
            self = this;

        self.shortcuts = ko.observableArray();
        self.initShortcuts();
        self.isLoaded = ko.observable( false );
        $( '#loadInProgress' ).spin();
        self.headerTitleI18n = i18n( 'IncaseAdminMojit.incase_tab_shorcuts.header.TITLE' );
        self.shortcutColumnI18n = i18n( 'IncaseAdminMojit.incase_tab_shorcuts.table.SHORTCUT_COLUMN' );
        self.activityColumnI18n = i18n( 'IncaseAdminMojit.incase_tab_shorcuts.table.ACTIVITY_COLUMN' );
        self.DCColumnI18n = i18n( 'IncaseAdminMojit.incase_tab_shorcuts.table.FORM_COLUMN_DC' );
        self.PCColumnI18n = i18n( 'IncaseAdminMojit.incase_tab_shorcuts.table.FORM_COLUMN_PC' );
        self.buttonSaveI18n = i18n( 'InCaseMojit.casefile_browser.button.SAVE' );
    }

    ShortcutsModel.prototype.save = function() {
        var
            self = this;

        Y.doccirrus.jsonrpc.api.shortcut.saveShortcuts( {
            data: self.shortcuts().filter( function( shortcutModel ) {
                return shortcutModel.isModified();
            } ),
            fields: ['actType', 'formId', 'description']
        } ).fail( function( reason ) {

            var errors = [], k;
            if( reason.errors ) {
                for( k in reason.errors ) {
                    if( reason.errors.hasOwnProperty( k ) ) {
                        errors.push( reason.errors[k].message );
                    }
                }
            } else {
                errors.push( reason.message );
            }

            Y.doccirrus.DCWindow.notice( {
                type: "error",
                message: errors.join( "\n" )
            } );
        } );
    };

    ShortcutsModel.prototype.getActivityList = function() {
        return Y.doccirrus.jsonrpc.api.activitysettings
            .read( { query: { _id: Y.doccirrus.schemas.activitysettings.getId() } } );
    };

    ShortcutsModel.prototype.filterActivityList = function( response ) {
        var activitySettings = Y.Lang.isArray( response.data ) && response.data[0] && Y.Lang.isArray( response.data[0].settings ) && response.data[0].settings || [],
            activitySettingsMap = Y.Array.reduce( activitySettings, {}, function( result, item ) {
                result[item.actType] = item;
                return result;
            } ),
            actTypeConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig(),
            ACTTYPELIST = Y.Array.map( Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs, function( item ) {
                var
                    config = actTypeConfig[item.val],
                    activitySetting = activitySettingsMap[item.val],
                    result = Y.merge( item, {
                        visible: activitySetting && activitySetting.isVisible || false,
                        activeTab: config.activeTab,
                        disabledTabs: config.disabledTabs,
                        editorView: item.functionality,
                        activitySetting: activitySetting
                    } );
                return result;
            } ).filter( function checkAllowed( item ) {
                if( actTypeConfig[item.val] && actTypeConfig[item.val].blockCreation ) {
                    return false;
                }
                return item.visible;
            } );

        return ACTTYPELIST;
    };

    /**
     *  Initialise shortcuts observable collection
     *  @function
     */
    ShortcutsModel.prototype.initShortcuts = function() {

        var self = this,
            formCats = Y.dcforms.getCategories( {
                'withArchiv': true,
                'withGHD': true,
                'withInSight2': true,
                'withEDMP': true,
                'withEnvelopes': true,
                'withTelekardio': true,
                'withDOQUVIDE': true,
                'withInGyn': true
            } );

        function compareAlphabetical( a, b ) {
            if( a.title[userLang] < b.title[userLang] ) {
                return -1;
            }
            if( a.title[userLang] > b.title[userLang] ) {
                return 1;
            }
            return 0;
        }

        function map2Form( form ) {
            return {
                id: form._id,
                text: form.title[userLang] + ' v' + form.version
            };
        }

        self.getActivityList()
            .then( self.filterActivityList )
            .then( function( activityList ) {
                return Y.dcforms.getFormList( '', false, function( err, result ) {

                    var
                        dataGroupedDC = {},
                        dataGroupedUser = {},
                        data = result.map( function( dt ) {
                            var cat = formCats.filter( function( cat ) {
                                return cat.canonical === dt.category;
                            } );

                            cat = cat.length > 0 ? cat[0] : null;

                            dt.category = cat ? cat[userLang] : dt.category;
                            return dt;
                        } );

                    if( !err ) {

                        data.forEach( function( dt ) {
                            var
                                dataGrouped = dt.isReadOnly ? dataGroupedDC : dataGroupedUser;

                            if( dataGrouped[dt.category] ) {
                                dataGrouped[dt.category].push( dt );
                            } else {
                                dataGrouped[dt.category] = [dt];
                            }
                        } );

                        Object.keys( dataGroupedDC ).forEach( function( key ) {
                            dataGroupedDC[key].sort( compareAlphabetical );
                        } );

                        dataGroupedDC = Object.keys( dataGroupedDC ).sort().map( function( key ) {
                            return {
                                text: key,
                                children: dataGroupedDC[key].map( map2Form )
                            };
                        } );

                        dataGroupedUser = Object.keys( dataGroupedUser ).map( function( key ) {
                            return {
                                text: key,
                                children: dataGroupedUser[key].map( map2Form )
                            };
                        } );
                    }

                    return Y.doccirrus.jsonrpc.api.shortcut.read( {
                        query: { group: 'CaseFileViewModel' },
                        sort: { '_id': 1 }
                    } ).then( function( response ) {
                        response.data.forEach( function( rawShotcut ) {
                            self.shortcuts.push( new KoViewModel.createViewModel( {
                                NAME: 'ShortcutModel', config: {
                                    data: rawShotcut || {},
                                    activityList: activityList,
                                    practiceForms: dataGroupedUser,
                                    docCirrusForms: dataGroupedDC
                                }
                            } ) );
                        } );
                        $( '#loadInProgress' ).spin( false );
                        self.isLoaded( true );
                    } );
                } );
            } )
            .fail( function() {
                throw 'Failed fo fetch shortcuts';
            } );
    };

    return {

        registerNode: function( node ) {
            ko.applyBindings( new ShortcutsModel(), node.getDOMNode() );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
