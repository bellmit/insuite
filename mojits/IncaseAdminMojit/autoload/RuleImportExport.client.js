/**
 * Created by Slava on 17/08/16.
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, $, _ */
'use strict';

YUI.add( 'dcRuleImportExport', function( Y, NAME ) {

        var
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            i18n = Y.doccirrus.i18n;

        function importData( isImportingOrExporting, api, isMapping, exportLocation, fromSettings ) {
            return KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'IMPORT_BTN',
                    option: 'PRIMARY',
                    size: 'XSMALL',
                    disabled: false,
                    text: 'Import',
                    click: function( meta, e, data ) {
                        e.stopPropagation();
                        var locData = {
                            ruleId: e.currentTarget.parentNode.dataset.id,
                            leaf: data && data.$parent && data.$parent.isLeaf()
                        };
                        if(data && data.$parent && data.$parent.entry ){
                            locData.entry = data.$parent.entry;
                        }
                        if(data && data.$parent && data.$parent.entry ){
                            locData.entry = data.$parent.entry;
                        }
                        if('function' === typeof isMapping && isMapping()){
                            locData.mappedLocation = exportLocation();
                        }
                        locData.fromSettings = fromSettings;
                        api.importSet( {
                            data: locData
                        } );
                        isImportingOrExporting( true );
                    }
                }
            } );
        }

        function exportData( isImportingOrExporting, api, isMapping ) {
            return KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'EXPORT_BTN',
                    option: 'PRIMARY',
                    size: 'XSMALL',
                    disabled: isMapping,
                    text: 'Export',
                    click: function( meta, e, data ) {
                        e.stopPropagation();
                        var locData = {
                            ruleId: e.currentTarget.parentNode.dataset.id,
                            leaf: data && data.$parent && data.$parent.isLeaf()
                        };
                        if(data && data.$parent && data.$parent.entry ){
                            locData.entry = data.$parent.entry;
                        }
                        api.exportSet( {
                            data: locData
                        } );

                        isImportingOrExporting( true );
                    }
                }
            } );
        }


        function repopulateFirstLevelFilter( data, orgResult, listData, selectedLocation, showLocationMapping, locations ){
            orgResult( data.root && data.root.children && data.root.children() || [] );
            var filterData = ( orgResult() ).map( function( el ){
                var title = el.entry && el.entry.title,
                    id = el.entry && el.entry._id;
                title = title === 'null' ? '           ' : title;
                return {id: id, title: title};
            } );
            if( locations && locations.length ){
                filterData = _.uniq(filterData.concat(locations), 'id');
            }
            listData( filterData );
            if( showLocationMapping() ){
                selectedLocation.valueHasMutated();
            }
        }

        function RuleImportExport( options ) {

            if( !options.jsonRpcApiImportExport ) {
                throw new Error( 'No API for import/export is set!' );
            }

            var
                self = this;

            this.isImportingOrExporting = ko.observable( false );
            this.someChangesWasMaid = ko.observable( false );
            this.downloadIFrame = ko.observable( '' );
            this.isShowButtons = ko.observable( false );
            this.metaDataFileName = options.metaDataFileName;
            this.fileNamePrefix = options.fileNamePrefix;
            this.fromSettings = options.fromSettings;

            this.showLocationMapping = ko.observable( false );
            this.importUnfiltered = ko.observable( [] );
            this.importLocationsList = ko.observableArray( [] );
            this.importLocation = ko.observable();
            this.exportUnfiltered = ko.observable( [] );
            this.exportLocationsList = ko.observableArray( [] );
            this.exportLocation = ko.observable();

            self.labelHDDI18n = i18n( 'IncaseAdminMojit.rules.RuleImportExport.labels.HDD' );
            self.importAllI18n = i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.IMPORT_ALL' );
            self.buttonDeleteArchiveI18n = i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.DELETE_ARCHIVE' );
            self.labelDBI18n = i18n( 'IncaseAdminMojit.rules.RuleImportExport.labels.DB' );
            self.exportAllI18n = i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.EXPORT_ALL' );
            self.processingI18n = i18n( 'IncaseAdminMojit.rules.RuleImportExport.labels.PROCESSING' );
            self.downloadArchiveI18n = i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.DOWNLOAD_ARCHIVE' );
            self.uploadArchiveI18n = i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.UPLOAD_ARCHIVE' );

            this.locations = ko.observableArray( [] );
            Y.doccirrus.jsonrpc.api.location
                .read( {
                    query: {},
                    options: { fields: [ 'locname' ]}
                } )
                .then( function( result){
                    var locs = result && result.data || [];
                    locs = locs.map( function( el ){
                        var title = el.locname,
                            id = el._id;
                        title = title === 'null' ? '           ' : title;
                        return {id: id, title: title};
                    } );
                    self.locations( locs );
                } )
                .fail( function( err ){
                    Y.log( 'could not get locations ' + err.message, 'error', NAME );
                } );

            function filterTree( children, unfiltered, value ) {
                if(value || value === null){
                    children( unfiltered().filter( function( el ){
                        return el.entry._id === value;
                    } ) );
                } else {
                    children( unfiltered() );
                }
            }

            this.showLocationMapping.subscribe( function( value ) {
                var selectedImport, selectedExport;
                if( !value ){
                    self.importTree.root.children( self.importUnfiltered() );
                    self.exportTree.root.children( self.exportUnfiltered() );
                } else {
                    repopulateFirstLevelFilter( self.importTree, self.importUnfiltered, self.importLocationsList, self.importLocation, self.showLocationMapping );
                    selectedImport = self.importLocation();
                    if( selectedImport || selectedImport === null){
                        filterTree( self.importTree.root.children, self.importUnfiltered, selectedImport );
                    }
                    repopulateFirstLevelFilter( self.exportTree, self.exportUnfiltered, self.exportLocationsList, self.exportLocation, self.showLocationMapping, self.locations() );
                    selectedExport = self.exportLocation();
                    if( selectedExport || selectedExport === null ){
                        filterTree( self.exportTree.root.children, self.exportUnfiltered, selectedExport );
                    }

                }
            } );

            this.importLocation.subscribe( function( value ){
                filterTree( self.importTree.root.children, self.importUnfiltered, value );
            } );

            this.exportLocation.subscribe( function( value ){
                filterTree( self.exportTree.root.children, self.exportUnfiltered, value );
            } );

            this.jsonRpcApiImportExport = options.jsonRpcApiImportExport;

            this.exportTree = KoComponentManager.createComponent( {
                componentType: 'KoTree',
                componentConfig: Y.mix( options.exportConfig, {rowActionButton: exportData( this.isImportingOrExporting, this.jsonRpcApiImportExport, this.showLocationMapping )} )
            } );

            this.importTree = KoComponentManager.createComponent( {
                componentType: 'KoTree',
                componentConfig: Y.mix( options.importConfig, {rowActionButton: importData( this.isImportingOrExporting, this.jsonRpcApiImportExport, this.showLocationMapping, this.exportLocation, this.fromSettings )} )
            } );


            Y.doccirrus.communication.on( {
                event: 'ruleExportDone',
                handlerId: 'ruleExportDone.RuleImportExport',
                done: function() {
                    self.someChangesWasMaid( true );
                    self.isImportingOrExporting( false );
                    if( self.importTree.root && self.importTree.root.children ){
                        self.importTree.root.children( self.importUnfiltered() );
                    }
                    self.importTree.reload( function(){
                        repopulateFirstLevelFilter( self.importTree, self.importUnfiltered, self.importLocationsList, self.importLocation, self.showLocationMapping );
                    } );
                }
            } );

            Y.doccirrus.communication.on( {
                event: 'ruleImportDone',
                handlerId: 'ruleImportDone.RuleImportExport',
                done: function() {
                    self.someChangesWasMaid( true );
                    self.isImportingOrExporting( false );
                    if( self.exportTree.root && self.exportTree.root.children ){
                        self.exportTree.root.children( self.exportUnfiltered() );
                    }
                    self.exportTree.reload( function(){
                        repopulateFirstLevelFilter( self.exportTree, self.exportUnfiltered, self.exportLocationsList, self.exportLocation, self.showLocationMapping, self.locations() );
                    } );
                }
            } );
        }
        RuleImportExport.prototype.toggleMapping = function() {
            this.showLocationMapping( !this.showLocationMapping() );
        };

        RuleImportExport.prototype.exportAll = function() {
            this.jsonRpcApiImportExport.exportSet( {
                data: {ruleId: null, entry: { userId: Y.doccirrus.auth.getUserId() }}
            } );
            this.isImportingOrExporting( true );
        };

        RuleImportExport.prototype.importAll = function() {
            var self = this;
            this.jsonRpcApiImportExport.importSet( {
                data: {ruleId: null, entry: { userId: Y.doccirrus.auth.getUserId() }, fromSettings: self.fromSettings }
            } );
            this.isImportingOrExporting( true );
        };

        RuleImportExport.prototype.deleteArchive = function() {

            var
                self = this,
                clearFn = self.jsonRpcApiImportExport.clearByMetadata ? self.jsonRpcApiImportExport.clearByMetadata : Y.doccirrus.jsonrpc.api.ruleimportexport.clearByMetadata,
                formUpload = $( '#formUploadArchive' ).get(0);

            clearFn( {data: {metaDataFileName: self.metaDataFileName}} )
                .then( function() {
                    self.importUnfiltered( [] );
                    self.importLocationsList( [] );
                    self.importLocation( null );
                    self.importTree.reload();
                    if('function' === typeof formUpload.reset){
                        formUpload.reset();
                    }
                } );
        };

        RuleImportExport.prototype.dispose = function() {
            Y.doccirrus.communication.off( 'ruleImportDone', 'ruleImportDone.RuleImportExport' );
            Y.doccirrus.communication.off( 'ruleExportDone', 'ruleExportDone.RuleImportExport' );
        };

        RuleImportExport.prototype.downloadArchive = function() {

            var
                dateStr = moment().format( 'YYYY-MM-DD_H-mm-ss' ),
                fileName = ( this.fileNamePrefix || '' ) + 'export-' + dateStr + '.zip',
                tgzUrl = Y.doccirrus.infras.getPrivateURL( '/zip/' + fileName ),
                self = this;

            $( '#iframeUploadTarget' ).off( 'load.forms' ).on( 'load.forms', function() {
                if( self.importTree.root && self.importTree.root.children ){
                    self.importTree.root.children( self.importUnfiltered() );
                }
                self.importTree.reload( function(){
                    repopulateFirstLevelFilter( self.importTree, self.importUnfiltered, self.importLocationsList, self.importLocation, self.showLocationMapping );
                } );
            } );

            this.downloadIFrame( '<iframe src="' + tgzUrl + '" width="5px" height="5px" frameborder="no"></iframe>' );
        };

        RuleImportExport.prototype.uploadArchive = function() {

            var
                self = this;

            $( '#iframeUploadTarget' ).off( 'load.forms' ).on( 'load.forms', function() {
                self.importTree.reload();
            } );

            $( '#fileUploadArchive' ).off( 'change.forms' ).on( 'change.forms', function() {
                var
                    apiName = ( (self.metaDataFileName || '').indexOf( 'catalogusage' ) === 0 ) ? 'catalogusageimportexport' :
                        ( ( (self.metaDataFileName || '').indexOf( 'flow' ) === 0 ) ? 'flowimportexport' : 'ruleimportexport' ),
                    postUrl = Y.doccirrus.infras.getPrivateURL( '/1/' + apiName + '/:uploadbackup' );
                $( '#formUploadArchive' ).attr( 'action', postUrl ).submit();
            } );

            $( '#fileUploadArchive' ).click();
        };

        Y.namespace( 'doccirrus' ).RuleImportExport = {

            name: NAME,

            create: function( options ) {
                return new RuleImportExport( options );
            }
        };

    },
    '0.0.1',
    {
        requires: [
            'JsonRpcReflection-doccirrus',
            'KoUI',
            'KoComponentManager',
            'KoTree'
        ]
    }
);
