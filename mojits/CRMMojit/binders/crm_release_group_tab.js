/**
 * User: dcdev
 * Date: 8/28/17  1:25 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko, moment */
/*exported fun */
"use strict";
fun = function _fn( Y ) {

    var releaseGroupModel,
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        RELEASE = i18n( 'CRMMojit.crm_release_group_tab.button.RELEASE' );

    function ReleaseGroupModel() {
        ReleaseGroupModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ReleaseGroupModel, Y.doccirrus.KoViewModel.getDisposable(), {
        initializer: function ReleaseGroupModel_initializer() {
            var
                self = this;
            self.initReleaseGroupModel();
        },
        destructor: function ReleaseGroupModel_destructor() {
        },
        initReleaseGroupModel: function ReleaseGroupModel_initReleaseGroupModel() {
            var
                self = this,
                user = Y.doccirrus.auth.getUser();

            self.selectGroupI18n = i18n( 'CRMMojit.crm_release_group_tab.label.SELECT_GROUP' );
            self.releaseAllI18n = i18n( 'CRMMojit.crm_release_group_tab.label.RELEASE_ALL' );
            self.emailTextI18n = i18n( 'CRMMojit.crm_release_group_tab.label.EMAIL_TEXT' );
            self.messageI18n = i18n( 'general.title.MESSAGE' );
            self.emailText = '';

            self.releaseVersion = Y.Lang.sub( i18n( 'CRMMojit.crm_release_group_tab.label.RELEASE_VERSION' ), {version: user && user.systemVersion} );

            self.releaseAll = false;

            self.initGroups();
            self.initButtons();
            self.initReleaseTable();
        },
        initGroups: function ReleaseGroupModel_initGroups() {
            var
                self = this,
                groupMap = [],
                availableGroups = [];

            for( let i = 1; i < 11; i++ ) {
                groupMap.push( {
                    id: i,
                    text: i.toString()
                } );
            }

            Y.each( groupMap, function( alias, group ) {
                availableGroups.push( {
                    id: group + 1,
                    text: alias.text
                } );
            } );

            self.groups = ko.observable( self.get( 'upgradedGroups' ) || [] );

            self.select2Groups = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            groups = self.groups();

                        return groups.map( function( group ) {
                            return {
                                id: +group,
                                text: group
                            };
                        } );
                    },
                    write: function( $event ) {
                        var
                            value = $event.val;

                        self.groups( Y.Array.map( value, function( group ) {
                            return +group;
                        } ) );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    multiple: true,
                    data: function() {
                        return {
                            // list of available groups to choose from
                            results: availableGroups
                        };
                    }
                }
            };
        },
        initButtons: function ReleaseGroupModel_initButtons() {
            var
                self = this;

            self.release = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'release',
                    text: RELEASE,
                    option: 'PRIMARY',
                    click: function() {
                        self.releaseConfirm();
                    }
                }
            } );

        },
        initReleaseTable: function ReleaseGroupModel_initReleaseTable() {
            var self = this;

            self.releaseTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CRMMojit-ReleaseGroupTab-releaseTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 10,
                    limitList: [5, 10, 20, 50, 100],
                    rowPopover: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.audit.get,
                    baseParams: {
                        query: { objId: "000000000000000000000001", model: "settings", diff: { $exists: true }, release: true }
                    },
                    columns: [
                        {
                            forPropertyName: '_id',
                            label: i18n( 'CRMMojit.crm_release_group_tab.table.UPGRADE_DATE' ),
                            title: i18n( 'CRMMojit.crm_release_group_tab.table.UPGRADE_DATE' ),
                            isSortable: true,
                            isFilterable: true,
                            direction: 'DESC',
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'CRMMojit.crm_release_group_tab.table.UPGRADE_DATE' ),
                                    autoCompleteDateRange: true
                                }
                            },
                            width: '17%',
                            renderer: function( meta ) {
                                var data = meta.row;
                                return data && data.diff && data.diff.upgrade && data.diff.upgrade.newValue || '';
                            }
                        },
                        {
                            forPropertyName: 'diff.currentVersion.newValue',
                            label: i18n( 'CRMMojit.crm_release_group_tab.table.VERSION' ),
                            title: i18n( 'CRMMojit.crm_release_group_tab.table.VERSION' ),
                            isFilterable: true,
                            width: '17%'
                        },
                        {
                            forPropertyName: 'diff.upgradedGroups.newValue',
                            label: i18n( 'CRMMojit.crm_release_group_tab.table.UPGRADED_GROUPS' ),
                            title: i18n( 'CRMMojit.crm_release_group_tab.table.UPGRADED_GROUPS' ),
                            isFilterable: true,
                            width: '17%'
                        },
                        {
                            forPropertyName: 'diff.conames.newValue',
                            label: i18n( 'CRMMojit.crm_release_group_tab.table.CONAMES' ),
                            title: i18n( 'CRMMojit.crm_release_group_tab.table.CONAMES' ),
                            isFilterable: true,
                            width: '17%'
                        },
                        {
                            forPropertyName: 'diff.emailText.newValue',
                            label: i18n( 'CRMMojit.crm_release_group_tab.table.EMAIL_TEXT' ),
                            title: i18n( 'CRMMojit.crm_release_group_tab.table.EMAIL_TEXT' ),
                            isFilterable: true,
                            width: '17%'
                        },
                        {
                            forPropertyName: 'user',
                            label: i18n( 'CRMMojit.crm_release_group_tab.table.USER' ),
                            title: i18n( 'CRMMojit.crm_release_group_tab.table.USER' ),
                            isFilterable: true,
                            width: '17%'
                        }
                    ],
                    selectMode: 'none'
                }
            } );

        },
        releaseConfirm: function ReleaseGroupModel_releaseConfirm() {
            var
                self = this,
                releaseAll = self.releaseAll,
                message;

            Y.doccirrus.jsonrpc.api.company.getCompanyData( {
                query: {
                    releaseGroup: {$in: self.groups()}
                }
            } ).done( function( response ) {
                var data = response && response.data,
                    conames = [];

                data.forEach( function( item ) {
                    conames.push( item.company.coname );
                } );

                if( releaseAll ) {
                    message = i18n( 'CRMMojit.crm_release_group_tab.message.RELEASE_ALL_CONFIRM' );
                } else {
                    message = Y.Lang.sub( i18n( 'CRMMojit.crm_release_group_tab.message.RELEASE_CONFIRM' ), {
                        groups: self.groups().join( ', ' ),
                        conames: conames.join( ', ' )
                    } );
                }
                Y.doccirrus.DCWindow.confirm( {
                    message: message,
                    callback: function(confirm){
                        if( confirm.success ) {
                            Y.doccirrus.jsonrpc.api.company.upgradeCompaniesInGroup( {
                                data: {
                                    groups: self.groups(),
                                    releaseAll: releaseAll,
                                    conames: releaseAll ? ['ALLE'] : conames,
                                    emailText: self.emailText
                                }
                            } ).done( function() {
                                self.releaseTable.reload();
                            } )
                                .fail( function( error ) {
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'error',
                                        message: JSON.stringify( error )
                                    } );
                                } );
                        }
                    }
                } );
            } );
        }

    }, {
        ATTRS: {
            upgradedGroups: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    return {
        registerNode: function() {
            var groups = [],
                data = {};
            Y.doccirrus.jsonrpc.api.settings.read()
                .then( function( response ) {
                    if( response.data && response.data[0] ) {
                        if( moment().format( 'DD.MM.YYYY' ) === response.data[0].upgrade ) {
                            groups = response.data && response.data[0].upgradedGroups;
                        }
                        data = {upgradedGroups: groups};
                    }
                    releaseGroupModel = new ReleaseGroupModel( data );
                    ko.applyBindings( releaseGroupModel, document.querySelector( '#releaseGroupModel' ) );
                } );
        },
        deregisterNode: function() {
            if( releaseGroupModel && releaseGroupModel.destroy ) {
                releaseGroupModel.destroy();
            }
        }
    };
};