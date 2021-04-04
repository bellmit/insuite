/**
 *  jadeLoaded panel to set config options
 *
 *  DEPRECATED: tenant config files have been replaced by reference to the defaultFor key in the database
 *
 *  TODO: remove this component
 *
 *  With ability to import and export forms comes the need to dynamically assign forms to roles in CaseFile and
 *  elsewhere.  This will be a debug panel to allow default forms to be changed or replaced.
 *
 *  @author: strix
 *
 *  Copyright (c) 2012 Doc Cirrus GmbH all rights reserved.
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*exported _fn */
/*global $, ko */

function _fn(Y, NAME) {
    'use strict';

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            //  PRIVATE VARS

            var
                myNode = node,                          //  YUI / DOM node this is rendered into
            //  userLang = Y.dcforms.getUserLang(),     //  user's language, may be overridden by template
                jqCache = {},                           //  cached jQuery selectors
                canonicalId = '',                       //  _id of current formtemplate
                i18n = Y.doccirrus.i18n;


            /*
             *  Cache Query selectors for controls
             */

            jqCache = {                                          //%  pre-cached cached DOM queries [object]
                'selConfigKey': $('#selConfigKey'),
                'btnApplyConfig': $('#btnApplyConfig')
            };

            //  INITIALIZATION

            /**
             *  Set up event listeners and request forms list from server
             */

            function initAssignmentPanel() {

                //  read any configuration passed by parent binder

                if (myNode.passToBinder) {
                    if (myNode.passToBinder.hasOwnProperty('canonicalId')) {
                        canonicalId = node.passToBinder.canonicalId;
                    }
                }

                //  set event handlers

                jqCache.btnApplyConfig.off('click.forms').on('click.forms', onApplyClick);

                //  compare current form to config

                setDefaultValue();
            }

            initAssignmentPanel();

            //  PRIVATE METHODS

            /**
             *  Updates the select box value according to currently loaded form
             */

            function setDefaultValue() {

                function onLoadAllConfig(err, allConfig) {
                    if (err) {
                        Y.log('Could not load complete FEM config: ' + JSON.stringify(err), 'warn', NAME);
                        return;
                    }

                    var k;

                    for (k in allConfig) {
                        if (allConfig.hasOwnProperty(k)) {
                            if (allConfig[k] === canonicalId) {
                                jqCache.selConfigKey.val(k);
                            }
                        }
                    }

                }

                Y.dcforms.getConfigVar('', '*', false, onLoadAllConfig);
            }


            //  EVENT HANDLERS

            /**
             *  Button handler, sets a form a default for some role
             */

            function onApplyClick() {

                var keyName = jqCache.selConfigKey.val();

                if ('' === keyName) {
                    Y.log('Cannot set empty config key.', 'debug', NAME);
                    return;
                }

                function onConfigUpdated(err) {
                    if (err) {
                        Y.log('Could not update forms config: ' + err, 'warn', NAME);
                    }
                }

                Y.dcforms.setConfigVar('', keyName, canonicalId, onConfigUpdated);
            }

            function FormAssignVM() {
                var
                    self = this;

                self.labelAssignI18n = i18n('FormEditorMojit.form_assignment.LBL_ASSIGN');
                self.lblStartFormI18n = i18n('FormEditorMojit.form_assignment.LBL_STARTFORM');
                self.lblInvoiceI18n = i18n('FormEditorMojit.form_assignment.LBL_INVOICE');
                self.lblPrescriptionI18n = i18n('FormEditorMojit.form_assignment.LBL_PRESCRIPTION');
                self.personalienFeldI18n = i18n('FormEditorMojit.form_assignment.LBL_PERSONALIENFELD');
                self.patientRecieptI18n = i18n('FormEditorMojit.form_assignment.LBL_PATIENTRECIEPT');
                self.lblTerministeI18n = i18n('FormEditorMojit.form_assignment.LBL_TERMINLISTE');
                self.lblInsuranceI18n = i18n('FormEditorMojit.form_assignment.LBL_INSURANCE');
                self.lblDisabilityI18n = i18n('FormEditorMojit.form_assignment.LBL_DISABILITY');
                self.lblTransferI18n = i18n('FormEditorMojit.form_assignment.LBL_TRANSFER');
                self.lblDocletterI18n = i18n('FormEditorMojit.form_assignment.LBL_DOCLETTER');
                self.privateBillI18n = i18n('FormEditorMojit.form_assignment.LBL_PRIVATEBILL');
                self.lblDKGBillI18n = i18n('FormEditorMojit.form_assignment.LBL_DKGBILL');
                self.btnAssignI18n = i18n('FormEditorMojit.form_assignment.BTN_ASSIGN');
            }

            ko.applyBindings( new FormAssignVM(), document.querySelector( '#divConfigAssignment' ) );


        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_assign.js - ' + node.getAttribute('id'), 'debug', NAME);

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}