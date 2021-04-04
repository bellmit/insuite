/**
 *  Forms diagnostic page, admin interface to check db state, references and migration
 *
 *  @author: strix
 *  @copyright: Doc Cirrus GmbH 2012
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, $ */

YUI.add( 'FormEditorMojitBinderFormsDiagnostic', function( Y, NAME ) {

        'use strict';

        var
            throbberUrl = '/static/DocCirrus/assets/images/ajax-loader.gif',
            throbberImg = '<img src="' + throbberUrl + '" />';

        /**
         * The FormEditorMojitBinderIndex module.
         *
         * @module FormEditorMojitBinderForms
         */

        /**
         *  Load a table of forms from the given collection into the given DOM ID
         *
         *  @param  divId       {String}
         *  @param  modelName   {String}    'form'|'formtemplate'|'formtemplateversion'
         */

        function getFormList(divId, modelName) {

            var
                jqDiv = $('#' + divId),
                params = {
                    'modelname': modelName
                };

            Y.doccirrus.comctl.privateGet('/1/formtemplate/:listforms', params, onFormsLoaded);

            function onFormsLoaded(err, data) {
                if (err) {
                    jqDiv.html('<pre>' + err + '</pre>');
                    return;
                }

                var rows = {
                        '_id': '_id',
                        'formId': 'formId',
                        'title': 'title',
                        'version': 'version',
                        'revision': 'revision'
                    },
                    html = makeTable(rows, data),
                    i;

                jqDiv.html(html);

                //  bind click event to each data row
                for (i = 0; i < data.length; i++) {
                    $('#tr' + data[i]._id).off('click.formdiag').on('click.formDiag', getRowClick(data[i]._id));
                }

            }

            function getRowClick(forId) {
                Y.log('Making row click for: ' + modelName + ' '+ forId);
                return function onRowClick() {
                    Y.log('Row click for: ' + modelName + ' - '+ forId);
                    showItemDetails(modelName, forId);
                };
            }

        }

        function getSettings(divId) {
            var jqDiv = $('#' + divId);

            Y.doccirrus.comctl.privateGet('/r/forms/getformconfig', { 'action': 'getformconfig' }, onSettingsLoaded);
            function onSettingsLoaded(err, data) {
                if (err) {
                    jqDiv.html('<pre>' + err + '</pre>');
                    return;
                }

                jqDiv.html('<pre>' + JSON.stringify(data, undefined, 2) + '</pre>');
            }
        }

        function makeTable(cols, data) {
            var
                html = '',
                row,
                k,
                i;

            html = html + '<table border="1px" ' + 'width="100%">';
            html = html + '<tr>';

            for (k in cols) {
                if (cols.hasOwnProperty(k)) {
                    html = html + '<td><b>' + cols[k] + '</b></td>';
                }
            }

            html = html + '</tr>';

            for (i =0 ; i < data.length; i++) {
                row = data[i];
                html = html + '<tr id="tr' + row._id + '">';

                for (k in cols) {
                    if (cols.hasOwnProperty(k)) {
                        if (row.hasOwnProperty(k)) {
                            if ('string' === typeof row[k]) {
                                html = html + '<td>' + row[k] + '</td>';
                            } else {
                                html = html + '<td>' + JSON.stringify(row[k]) + '</td>';
                            }

                        } else {
                            html = html + '<td><i>undefined</i></td>';
                        }

                    }
                }

                //html = html + '<td><button class="btn" id="btnDel' + row._id + '"><i class="fa fa-icon-trash"></i></button></td>';

                html = html + '</tr>';
            }

            html = html + '</table>';
            return html;
        }

        /**
         *  Show a modal with more information on the selected item
         *
         *  @param modelName
         *  @param id
         */

        function showItemDetails(modelName, id) {

            var
                html = '' +
                '<h4>Dependancies</h4>' +
                '<div id="divDeps' + id + '" class="well">' + throbberImg + '</div>' +
                '<h4>Source</h4>' +
                '<div id="divDetail' + id + '" class="well">' + throbberImg + '</div>';

            Y.doccirrus.comctl.setModal(modelName + ' ' + id, html, true, null, loadDependancies);

            function loadDependancies() {
                var
                    params = {
                        'modelname': modelName,
                        'id': id
                    };

                Y.log('Loading form dependancies: ' + modelName + ' - ' + id, 'debug', NAME);
                Y.doccirrus.comctl.privateGet('/1/formtemplate/:listdependencies', params, onDepsLoaded);

            }

            function onDepsLoaded(err, data) {
                if (err) { data = err; }
                $('#divDeps' + id).html('<pre>' + JSON.stringify(data, undefined, 2) + '</pre>');
                loadRawForm();
            }

            function loadRawForm() {
                var
                    params = {
                        'modelname': modelName,
                        'id': id
                    };

                Y.log('Loading form: ' + modelName + ' - ' + id, 'debug', NAME);
                Y.doccirrus.comctl.privateGet('/1/formtemplate:/:loadform', params, onFormLoaded);
            }

            function onFormLoaded(err, data) {
                if (err) { data = err; }
                $('#divDetail' + id).html('<pre>' + JSON.stringify(data, undefined, 2) + '</pre>');
                Y.doccirrus.comctl.addModalButton('Delete', true, onClickDelete);
            }

            function onClickDelete() {
                var
                    delParams = {
                        'modelname': modelName,
                        'id': id
                    };

                Y.doccirrus.comctl.setModal('Deleting', 'Please wait...');
                Y.doccirrus.comctl.privatePost('/1/formtemplate/:deletewithhistory', delParams, onFormDeleted);
            }

            function onFormDeleted(err, data) {
                if (err) {
                    Y.doccirrus.comctl.setModal('Error', 'Could not delete form: ' + ('object' === typeof err ? err.statusText : err));
                    return;
                }

                getFormList('divShow' + modelName, modelName);
                Y.doccirrus.comctl.setModal('Success', 'Deleted ' + modelName + ' ' + id + '<br/><pre>' + JSON.stringify(data) + '</pre>');
            }

        }

        /**
         *  Import images which may have been migrated by other tenants, or added to default set
         */

        function importDefaultImages() {
            Y.log( 'Removed: importDefaultImages, disk migration is no longer used', 'info', NAME );
        }

        /**
         *  Import forms from /assets/templates and start a version history for them
         */

        function migrateDBForms() {
            Y.doccirrus.comctl.setModal('Moving DB Forms', '<div id="divDBFormsReport">' + throbberImg + '</div>', true, null, doMigrate);

            function doMigrate() {
                Y.doccirrus.comctl.privateGet('/r/forms/migrateformstest', { 'action': 'migrateformstest', 'task': 'dbforms' }, onMigrate );
            }

            function onMigrate(err, data) {
                var jqReport = $('#divDBFormsReport');

                if (err) {
                    jqReport.html('<pre>' + JSON.stringify(err) + '</pre>');
                    return;
                }

                jqReport.html('<pre>' + data.report + '</pre>');
            }
        }

        /**
         *  Migrate activities collection to new form version references
         */

        function migrateDBActivities() {
            Y.doccirrus.comctl.setModal('Moving DB Activities', '<div id="divDBActivitiesReport">' + throbberImg + '</div>', true, null, doMigrate);

            function doMigrate() {
                Y.doccirrus.comctl.privateGet('/r/forms/migrateformstest', { 'action': 'migrateformstest', 'task': 'dbactivities' }, onMigrate );
            }

            function onMigrate(err, data) {
                var jqReport = $('#divDBActivitiesReport');

                if (err) {
                    jqReport.html('<pre>' + JSON.stringify(err) + '</pre>');
                    return;
                }

                jqReport.html('<pre>' + data.report + '</pre>');
            }
        }

        /**
         *  Migrate documents collection to new form version references
         */

        function migrateDBDocuments() {
            Y.doccirrus.comctl.setModal('Moving DB Documents', '<div id="divDBDocumentsReport">' + throbberImg + '</div>', true, null, doMigrate);

            function doMigrate() {
                Y.doccirrus.comctl.privateGet('/r/forms/migrateformstest', { 'action': 'migrateformstest', 'task': 'dbdocuments' }, onMigrate );
            }

            function onMigrate(err, data) {
                var jqReport = $('#divDBDocumentsReport');

                if (err) {
                    jqReport.html('<pre>' + JSON.stringify(err) + '</pre>');
                    return;
                }

                jqReport.html('<pre>' + data.report + '</pre>');
            }
        }

        /**
         * The FormEditorMojitBinderIndex module.
         *
         * @module FormEditorMojitBinderForms
         */


        /**
         * Constructor for the FormEditorMojitBinderFormsDiagnostic class.
         *
         * @class FormEditorMojitBinderFormsDiagnostic
         * @constructor
         */

        Y.namespace( 'mojito.binders' )[NAME] = {
            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function( mojitProxy ) {
                Y.log( 'FormEditorMojitBinderFormsDiagnostic::Init', 'debug', NAME );
                this.mojitProxy = mojitProxy;
            },

            /**
             * The binder method, invoked to allow the mojit to attach DOM event
             * handlers.
             *
             * @param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function( node ) {

                //change active tab in toplevel menu
                Y.doccirrus.NavBarHeader.setActiveEntry( 'drop-admin' );

                //Y.log('FormEditorMojitBinderFormsDiagnostic::Bind');
                this.node = node;

                //  Preload the translation dictionary for YUI files (to be phased out in favor of jadeLoaded translations
                Y.Intl.setLang( 'FormEditorMojit', $( '#YUI_SERVER_LANG' ).val() );
                Y.log( 'Set language from hidden element: ' + Y.Intl.getLang( 'FormEditorMojit' ), 'info', NAME );

                var il8nDict = Y.Intl.get( 'FormEditorMojit' );

                /*
                 *  Load translation dictionary
                 */

                Y.dcforms.il8nDict = il8nDict;

                /*
                 *  bind buttons
                 */

                $('#btnImportDefaultImages').on('click.formsdiag', function(){ importDefaultImages(); });
                $('#btnMoveDBForms').on('click.formsdiag', function(){ migrateDBForms(); });
                $('#btnUpdateActivities').on('click.formsdiag', function(){ migrateDBActivities(); });
                $('#btnUpdateDocuments').on('click.formsdiag', function(){ migrateDBDocuments(); });

                /*
                 *  Load list of forms in various tables
                 */

                getFormList('divShowform', 'form');
                getFormList('divShowformtemplate', 'formtemplate');
                getFormList('divShowformtemplateversion', 'formtemplateversion');
                getSettings('divSettings');
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'NavBarHeader',
            'dc-comctl',
            'dcmedia',
            'dcforms-utils',
            'dcforms-newform',
            'dcforms-reducedschema',
            'dcforms-template',
            'dcforms-categories',
            'dcforms-pdf',
            'dcforms-listeditor',
            'dcforms-hyperlinkeditor',
            'dcforms-papersizes',
            'dcforms-reorder',
            'dcforms-translation',

            'event-mouseenter',
            'mojito-client',
            'intl',
            'mojito-intl-addon',
            'mojito-rest-lib'
        ]
    }
);
