/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */

/*eslint-disable no-unused-vars */
/*exported _fn */
/*global $ */

function _fn(Y, NAME) {
    'use strict';

    var
        element,                                //  reference to dcforms-element object this table belongs to
        schemaLoaded = false,                   //  set to true when current schema is loaded
        jq = {};                                //  cached jQuery selectors

    /**
     *  Configure this form to loaded page and (re)bind events
     */

    function initForm() {

        //  ensure that element has table properties

        if (!element.table) {
            element.table = {};
        }

        if (!element.table.reducedSchema) {
            element.table.reducedSchema = '';
        }

        if (!element.table.cols) {
            element.table.cols = [];
        }

        //  load reduced schema into select box
        jq.divSelTableSchema.html(Y.dcforms.reducedschema.renderSelectBoxSync('selectTableSchema', 'selTableSchema'));
        jq.selTableSchema = $('#selTableSchema');
        jq.btnUpdateSchema.off( 'click.forms' ).on( 'click.forms', onChangeSchema );


        //  bind 'add column' button
        jq.btnAddColumn.off( 'click.forms' ).on( 'click.forms', onAddColClicked );

        //  add current column set
        renderCols();
    }

    /**
     *  Display the current columns in the UI with 'remove' buttons
     */

    function renderCols() {
        var html, i;

        html = '<table border="1px">';

        for (i = 0; i < element.table.cols.length; i++) {
            html = html +
                '<tr>' +
                  '<td>' +
                    element.table.cols[i].title + '<br/>' +
                    '<small>' + element.table.cols[i].schemaMember + '</small>' +
                  '</td>' +
                   '<td>' +
                     '<button id="btnTColRemove' + i + '"><i class="icon-remove"></i></button>' +
                   '</td>' +
                   '<td>' +
                     '<button id="btnTColTop' + i + '"><i class="icon-arrow-up"></i></button>' +
                   '</td>' +
                '</tr>';
        }

        html = html + '</table>';

        jq.divTableColumns.html(html);

        for (i = 0; i < element.table.cols.length; i++) {
            bindRemoveButton('btnTColRemove' + i, element.table.cols[i].title);
            bindTopButton('btnTColTop' + i, element.table.cols[i].title);
        }
    }

    /**
     *  Add onClick event to a 'remove column' button
     *  @param id       {string}    DOM ID of a button to remove a table column
     *  @param title    {string}    title of table column
     */

    function bindRemoveButton(id, title) {
        $('#' + id ).off('click.forms' ).on('click.forms', function onRemoveCol(){
            removeColumn(title);
        });
    }

    /**
     *  Add onClick event to a 'remove column' button
     *  @param id       {string}    DOM ID of a button to remove a table column
     *  @param title    {string}    title of table column
     */

    function bindTopButton(id, title) {
        $('#' + id ).off('click.forms' ).on('click.forms', function onRemoveCol(){
            topColumn(title);
        });
    }

    /**
     *  Delete a column from the set
     *  @param  title   {string}    Title of column to remove
     */

    function removeColumn(title) {
        var i;

        for (i = 0; i < element.table.cols.length; i++) {
            if (element.table.cols[i].title === title) {
                element.table.cols.splice(i, 1);
                i--;
            }
        }

        element.onEditForm();
        renderCols();
    }

    /**
     *  Move  a column to the top of the set
     *  @param  title   {string}    Column title to promote
     */

    function topColumn(title) {
        var
            i,
            newCols = [];

        for (i = 0; i < element.table.cols.length; i++) {
            if (element.table.cols[i].title === title) {
                newCols.push(element.table.cols[i]);
            }
        }

        for (i = 0; i < element.table.cols.length; i++) {
            if (element.table.cols[i].title !== title) {
                newCols.push(element.table.cols[i]);
            }
        }

        element.table.cols = newCols;
        element.onEditForm();
        renderCols();
    }

    /**
     *  Add / update the box for selecting the schema binding for new table columns
     */

    function renderSelectMemberBox() {

       if ('' === element.table.reducedSchema) {
           $('#spanTableSchemaMember' ).html('');
           return;
       }

        Y.dcforms.reducedschema.renderSelectMemberBoxSync(
            element.table.reducedSchema,                    //  name of reduced schema
            'spanTableSchemaMember',                        //  DOM ID to render this into
            'tableSchemaMember',                            //  name of new select element
            'selTableSchemaMember'                          //  id of new select element
        );

        jq.selTableSchemaMember = $('#selTableSchemaMember');
    }

    //  event handlers

    /**
     *  Button to add a new column clicked
     */

    function onAddColClicked() {
        if ('' === $.trim(jq.txtNewColName.val())) {
            Y.doccirrus.comctl.setModal('Warn','Please choose a name for your table column.', NAME);
        }
    }

    function onChangeSchema() {
        var
            i,
            newSchemaName = jq.selTableSchema.val();

        if (element.table.reducedSchema === newSchemaName) { return; }

        Y.log('Changing table schema to ' + newSchemaName, 'info', NAME);

        for (i = 0; i < element.table.cols.length; i++) {
            element.table.cols[i].schemaMember = '';
        }

        renderSelectMemberBox();
        schemaLoaded = true;
        element.table.reducedSchema = newSchemaName;
        element.onEditForm();
    }

    /**
     *  return constructor / desctructor for jadeLoader
     */

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            var i18n = Y.doccirrus.i18n;

            /*
             *  recover any dcforms-element reference which was passed to this
             */

            if (('undefined' !== node.passToBinder) && ('undefined' !== node.passToBinder.element)) {
                element = node.passToBinder.element;
            } else {
                Y.log('Please pass a dcforms-element object to this binder', 'warn', NAME);
            }

            /*
             *  Cache Query selectors for controls
             */

            jq = {                                          //%  pre-cached cached DOM queries [object]
                'divDataBinding': $('#divDataBinding'),
                'divTableColumns': $('#spanPageId'),
                'txtNewColName': $('#txtNewColName'),
                'txtNewColBinding': $('#txtNewColBinding'),
                'btnAddColumn': $('#btnAddColumn'),
                'btnUpdateSchema': $('#btnUpdateSchema'),
                'divSelTableSchema': $('#divSelTableSchema')
            };

            /*
             *  load values from them element
             */

            initForm();

            function EditTableDefinitionVM() {
                var
                    self = this;

                self.lblTableSchemaI18n = i18n('FormEditorMojit.te.LBL_TABLE_SCHEMA');
                self.lblLoadingSchemaI18n = i18n('FormEditorMojit.te.LBL_LOADING_SCHEMA');
                self.btnSetSchemaI18n = i18n('FormEditorMojit.te.BTN_SET_SCHEMA');
                self.lblColsI18n = i18n('FormEditorMojit.te.LBL_COLS');
                self.btnAddColI18n = i18n('FormEditorMojit.te.BTN_ADD_COL');
            }

            ko.applyBindings( new EditTableDefinitionVM(), document.querySelector( '#editTableDefinition' ) );

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for edit_page_properties.js - ' + node.getAttribute('id'), 'debug', NAME);

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screw up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}