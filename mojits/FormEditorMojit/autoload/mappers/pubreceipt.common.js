/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Used by CaseFile to map patient data and billable activities into forms mapped with PubReceipt_T
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*eslint-disable no-unused-vars */
/*jshint latedef:false, esnext:true */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-map-pubreceipt',  // based on invoice mapper

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        // http://stackoverflow.com/questions/149055 -- think of movning this out to a util
        /**
         * Format to Money
         *
         * TODO: tidy this and make readable
         *
         * @param n {Number} number
         * @param c {Number} floating precision
         * @param t {String} sections delimiter
         * @param d {String} decimal delimiter
         * @returns {string}
         */
        function formatMoney( n, c, d, t ) {
            c = isNaN( c = Math.abs( c ) ) ? 2 : c;                                 //  eslint-disable-line no-cond-assign
            d = (d === undefined) ? "." : d;
            t = (t === undefined) ? "," : t;
            var
                s = n < 0 ? "-" : "",
                i = parseInt( n = Math.abs( +n || 0 ).toFixed( c ), 10 ) + "",
                j = (j = i.length) > 3 ? j % 3 : 0;                                 //  eslint-disable-line no-cond-assign
            return s + (j ? i.substr( 0, j ) + t : "") + i.substr( j ).replace( /(\d{3})(?=\d)/g, "$1" + t ) + (c ? d + Math.abs( n - i ).toFixed( c ).slice( 2 ) : "") + " €";
        }

        /**
         *  Factory for mapper objects
         *
         *  @param  template    {Object}    Form template
         *  @param  context     {Object}    Set of viewmodels providing values for pubreciept forms
         */

        Y.namespace( 'dcforms.mapper' ).pubreceipt = function( template, context ) {

            //  PRIVATE MEMBERS

            var
                currentActivity = context.activity,
                currentPatient = context.patient,

                treatments = [],        //  cache of linked activities for table rows
                invoiceConfig = null,   //
                koSubscriptions = [],   //  holds KO subscriptions so they can be destroyed on unload [array]
                formMode = 'fill',      //  will usually be 'fill' or 'pdf', may be 'shutdown' as page closed
                formDoc = null,

            // GOTCHA!!!
                // KBV can have an adjustment!!!
                adjust = 0.05,

                _moment = Y.dcforms.mapper.objUtils.getMoment(),
                _k = Y.dcforms.mapper.koUtils.getKo();

            //  Invoices have their own settings object

            Y.dcforms.mapper.objUtils.getInvoiceConfiguration(template.user, onInvoiceConfigurationLoaded);

            function onInvoiceConfigurationLoaded(err, useInvoiceConfig) {

                if (err) {
                    //  nothing we can do
                    template.raise('mapcomplete', {});
                    return;
                }

                invoiceConfig = useInvoiceConfig;

                if (false === Y.dcforms.isOnServer) {

                    //  subscribe to the set of linked activities
                    koSubscriptions.push( currentActivity._activitiesObj.subscribe( onSelectionChanged ) );
                    koSubscriptions.push( currentActivity.timestamp.subscribe( onSelectionChanged ) );

                    //  subscribe to state changes
                    koSubscriptions.push( currentActivity.status.subscribe( onStateChanged ) );

                    //  subscribe to user-driven changes in form values
                    template.on( 'valueChanged', 'dcforms-map-pubreceipt', onFormValueChanged );
                    //  subscribe to changes in form mode, get notified when to dispose of event listeners
                    template.on( 'modeSet', 'dcforms-map-pubreceipt', onModeSet );
                }

                if (template._isServerZip) {
                    onFormDocumentLoaded(null, {}, true);
                    return;
                }

                context.attachments.getOrCreateFormDocument(context, template, onFormDocumentLoaded);

            }

            /**
             *  Called after searching activity for saved form state to be loaded
             *
             *  @param  err         {Object}    If failure of getOrCreateFormDocument
             *  @param  myDoc       {Object}    A document viewModel (client) or object (server)
             *  @param  needsRemap  {Boolean}   If true then bound fields on the form should be updated from activity
             */

            function onFormDocumentLoaded( err, myDoc, needsRemap ) {

                if( err ) {
                    //  form event with empty response prevents server zombie on error
                    Y.log( 'Could not load or create form document: ' + err, 'warn', NAME );
                    template.raise( 'mapcomplete', {} );
                    return;
                }

                formDoc = myDoc;

                //Y.log( 'Loading saved data: ' + JSON.stringify(Y.doccirrus.api.document.formDocToDict(formDoc)), 'warn', NAME );
                template.fromDict( Y.doccirrus.api.document.formDocToDict( formDoc ), onLoadFromDict );

                function onLoadFromDict( err ) {
                    if ( err ) {
                        Y.log( 'Problem loading form from formDoc: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }
                    if (true === needsRemap) {
                        Y.log('remapping / no form document was present on load', 'debug', NAME);
                        map( onFormMapped );
                    } else {
                        //Y.log('form document loaded, not remapping', 'debug', NAME);
                        onFormRestored(null);
                    }
                }

                //  after mapping the form document should be updated

                function onFormMapped(err) {
                    if (err) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could not map the form from current activity: ' + err, 'warn', NAME );
                        template.raise( 'mapcomplete', {} );
                        return;
                    }

                    if (template._isServerZip) {
                        onFormRestored(null);
                        return;
                    }

                    context.attachments.updateFormDoc( context, template, onFormRestored );
                }

                //  called when form values restored from save or copied from activity

                function onFormRestored(err) {
                    if (err) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could not load or create form document: ' + err, 'warn', NAME );
                        template.raise( 'mapcomplete', {} );
                        return;
                    }

                    template.render( onTemplateRendered );
                }

                //  called when form is displayed (client) or ready for export to PDF (server)

                function onTemplateRendered() {

                    template.raise( 'formDocumentLoaded', formDoc );
                    template.raise( 'mapcomplete', unmap() );
                }
            }

            //  PUBLIC METHODS

            /**
             *  Fill a form with the contents of this passed object
             *
             *  @param  callback        {Function}  Of the form fn(err)
             */

            function map( callback ) {

                Y.log( 'Mapping pubreceipt into form: ' + context.bindCollection + '::' + context.bindId, 'debug', NAME );

                var

                    addr = currentPatient.getAddressByKind( 'OFFICIAL' ) ||        //  if available
                           currentPatient.getAddressByKind( 'POSTAL' ) ||         //  postal preferred
                           currentPatient.getAddressByKind( 'POSTBOX' ),

                    formData = {};           //  created from viewModel, matches PubReceipt_T, is mapped [object]

                /**
                 *  Called when all sub-tasks and linked data has been loaded and mapped
                 */

                function onMapComplete( err ) {
                    if( err ) {
                        Y.log( 'Error mapping into form: ' + err, 'warn', NAME );
                        callback(err);
                        return;
                    }
                    callback(null);
                }

                function onFormDataComplete() {
                    //  map values into form
                    if( Y.config.debug ) {
                        Y.log('Mapping values into pubreceipt: ' + JSON.stringify(formData, 'undefined', 2), 'debug', NAME);
                    }
                    template.map( formData, true, onMapComplete );
                }
                //  adds address from patient object, insurance info
                Y.dcforms.mapper.objUtils.setup1(formData, currentActivity, currentPatient, addr, null, null, onSetup1Done );

                function onSetup1Done( err ) {
                    if(err) {
                        Y.log('Error occured while mapping docletter into form: ' + err, 'warn', NAME );
                        callback(err);
                        return;
                    }
                    // adds additional data: location info, employee info
                    Y.dcforms.mapper.objUtils.setup3(formData, currentActivity, currentPatient, onSetup3Complete);
                }

                function onSetup3Complete( err ) {

                    if(err) {
                        Y.log('Error occured while mapping docletter into form: ' + err, 'warn', NAME );
                        callback(err);
                        return;
                    }

                    //  add personalienfeld
                    Y.dcforms.mapper.objUtils.setup2(formData, addr, null, null );
                    Y.dcforms.mapper.objUtils.setBarcodeData( formData );
                    formData.docBlock = Y.dcforms.mapper.objUtils.docBlock( formData );

                    formData = processLinkedActivities( formData, context.activity );
                    onFormDataComplete();
                }
            }

            /**
             *  Returns the current contents of a form as a plain javascript object
             *
             *  @returns    {Object}    Returned object will mmatch Innvoice_T
             */

            function unmap() {
                return template.unmap();
            }

            /**
             *  Create mapped values for those elements which depend on linked activities
             *
             *  @param  formData    {Object}    keys and values matching reduced schema
             *  @param  viewModel   {Object}    current activity
             *  @returns            {Object}    formData expanded with fields requiring linked activities
             */

            function processLinkedActivities(formData, viewModel) {

                var
                    empVal = invoiceConfig.empiricalvalue,
                    validTreatments = [],           //  to update current selection if bad entries chosen [array]
                    tableRows = [],
                    treatment,
                    total = 0,
                    price,
                    actualPrice,
                    tdate,
                    i;

                //  get all linked activities
                treatments = Y.dcforms.mapper.objUtils.getAllLinkedActivities(viewModel);

                if( Y.config.debug ) {
                    Y.log('Processing linked activities: ' + treatments.length, 'debug', NAME);
                    Y.log('viewModel activities: ' + JSON.stringify(viewModel.activities), 'debug', NAME);
                    Y.log('viewModel _activitiesObj: ' + JSON.stringify(viewModel._activitiesObj), 'debug', NAME);
                }
                // system-wide configurable parameter (deal with err / or swallow)
                if( empVal ) {
                    empVal = (parseInt( empVal, 10 ) / 100);
                    adjust = empVal;
                    //
                    // MOJ-1710 req.
                    formData.p2_840 = '' +
                    'Der untenstehende Betrag für die von mir erbrachten ärztlichen Leistungen wird ' +
                    'wegen der Begrenzung der Finanzmittel der Krankenkassen gegebenenfalls nur zum Teil ' +
                    'an mich ausbezahlt. Die Bezahlung wird im Nachhinein von der Krankenkasse um ' +
                    (empVal * 100).toFixed( 2 ) + '% vermindert, damit das von ' +
                    'Ihrer Krankenkasse zur Verfügung gestellte Geld ausreicht.';
                } else {
                    formData.p2_840 = '' +
                    'Der untenstehende Betrag für die von mir erbrachten ärztlichen Leistungen wird wegen ' +
                    'der Begrenzung der Finanzmittel der Krankenkassen gegebenenfalls nur zum Teil an mich ' +
                    'ausbezahlt. Die Bezahlung wird im Nachhinein von der Krankenkasse soweit vermindert, ' +
                    'dass das von Ihrer Krankenkasse zur Verfügung gestellte Geld ausreicht.';
                }

                //  add items
                formData.diagnoses = '';
                for( i = 0; i < treatments.length; i++ ) {

                    treatment = treatments[i];

                    Y.log( 'Adding activity: ' + _k.unwrap( treatment.actType ), 'info', NAME );

                    if(
                        (treatment._id) &&
                        (treatment.actType) &&
                        (('TREATMENT' === _k.unwrap( treatment.actType )) || ('DIAGNOSIS' === _k.unwrap( treatment.actType )))
                    ) {

                        if( 'TREATMENT' === _k.unwrap( treatment.actType ) ) {

                            price = treatment.price ? _k.unwrap( treatment.price ) : 0.00;
                            price = +price;
                            actualPrice = treatment.actualPrice ? _k.unwrap( treatment.actualPrice ) : price;
                            actualPrice = +actualPrice;

//                          // compensate for junk data --> there should be no more junk data, so removing this MOJ-2637
//                          if( 'string' === typeof price ) {
//                              price = Y.doccirrus.comctl.localStringToNumber( price );
//                          }
//                          if( 'string' === typeof actualPrice ) {
//                              actualPrice = Y.doccirrus.comctl.localStringToNumber( actualPrice );
//                          }

                            actualPrice = actualPrice && Math.floor(actualPrice);

                            //  TODO: replace, temporarily removed for testing
                            if( treatment.actualUnit && 'Punkte' !== _k.unwrap( treatment.actualUnit )) {
                                actualPrice = '';
                            }

                            if( treatment.timestamp ) {
                                tdate = _moment( _k.unwrap( treatment.timestamp ) ); // deviation
                            }
                            //  Must match PubReceiptItem_T.reduced.json
                            tableRows.push( {
                                'activityId': treatment._id,
                                'content': _k.unwrap( treatment.content ), //lineSplit( _k.unwrap( treatment.content ), 40 ),
                                'code': _k.unwrap( treatment.code ),
                                'unit': treatment.unit ? _k.unwrap( treatment.unit ) : 1,
                                'costperitem': '',
                                'quantity': '1',
                                'price': (price && formatMoney(price, 2, ',', '.' )),
                                'actualPrice': actualPrice + '', // DEVIATION
                                'dateObj': tdate, // Deviation
                                'timestamp': tdate.format( 'DD.MM.YYYY' ) // DEVIATION
                            } );

                            Y.log( 'Added table row for TREATMENT: ' + treatment._id, 'debug', NAME );

                            // we can only assume this is the same for each entry.
                            // entries spanning time periods can in fact have
                            // varying factor value, but this is not our problem
                            formData.sysPoints = _k.unwrap( treatment.billingFactorValue );

                            total = total + price;
                            validTreatments.push( treatment );
                        }

                        if( 'DIAGNOSIS' === _k.unwrap( treatment.actType ) ) {
                            //  used to build diagnosis field
                            //Y.log('Adding DIAGNOSIS: ' + JSON.stringify(treatment, undefined, 2), 'debug', NAME);

                            formData.diagnoses = formData.diagnoses + '**' + _k.unwrap( treatment.code ) + '**: ' + _k.unwrap( treatment.content ) + '\n';
                            validTreatments.push( treatment );
                        }
                    } else {
                        Y.log( 'Invalid item(s) in treatments table: ' + _k.unwrap( treatment.actType ), 'warn', NAME );
                    }
                }

                Y.log( 'Built diagnosis string: ' + formData.diagnoses, 'debug', NAME );

                if( Y.config.debug ) {
                    Y.log( 'Mapping TREATMENT and DIAGNOSIS activities to ' + JSON.stringify( tableRows ), 'debug', NAME );
                }
                //Y.log( 'Number of rows, filtered: ' + mArray.length, 'debug', NAME );
                formData.items = tableRows;

                formData.total = formatMoney(total, 2, ',', '.' );

                // get the original...
                formData.totalAdjusted = formatMoney( (total * (1 - adjust)), 2, ',', '.' );


                /**
                 *  Add date range for treatments
                 */

                function addDateQuarter() {

                    var
                        rows = formData.items,
                        qStart, qEnd,
                        i;

                    formData.from = -1;
                    formData.to = -1;

                    for( i = 0; i < rows.length; i++ ) {
                        formData.from = (-1 === formData.from) ? rows[i].dateObj : formData.from;
                        formData.to = (-1 === formData.to) ? rows[i].dateObj : formData.to;

                        formData.from = (rows[i].dateObj < formData.from) ? rows[i].dateObj : formData.from;
                        formData.to = (rows[i].dateObj > formData.to) ? rows[i].dateObj : formData.to;
                    }

                    if( -1 !== formData.from ) {

                        qStart = _moment.utc( formData.from ).local().quarter();
                        qEnd = _moment.utc( formData.to ).local().quarter();

                        formData.quarters = _moment.utc( formData.from ).local().startOf( 'quarter' ).format( 'MMM' ) +
                                            ' bis ' +
                                            _moment.utc( formData.to ).local().endOf( 'quarter' ).format( 'MMM YYYY' );
                        formData.quarters += '  (';
                        if( qEnd === qStart ) {
                            formData.quarters += qEnd + '. Quartal ' + _moment.utc( formData.to ).local().endOf( 'quarter' ).format( 'YYYY' );
                        } else {
                            formData.quarters += qStart + '. Quartal ' + _moment.utc( formData.from ).local().startOf( 'quarter' ).format( 'YYYY' ) +
                                                 ' bis ' +
                                                 qEnd + '. Quartal ' + _moment.utc( formData.to ).local().endOf( 'quarter' ).format( 'YYYY' );
                        }
                        formData.quarters += ')';

                        formData.from = _moment.utc( formData.from ).local().format( 'DD.MM.YYYY' );
                        formData.to = _moment.utc( formData.to ).local().format( 'DD.MM.YYYY' );
                    } else {
                        formData.quarters = ' ';
                        formData.from = '';
                        formData.to = '';
                    }

                }

                //  add date ranges for treatment
                addDateQuarter();

                return formData;
            }

            //  EVENT HANDLING - update currentActivity in response to changes by user

            /**
             *  Template events are passed by the parent, which embeds the form
             *
             *  @param  eventName   {String}
             *  @param  eventData   {Object}
             */

            function onTemplateEvent( eventName, eventData ) {

                Y.log( 'pubreceipt mapper received event: ' + eventName, 'debug', NAME );

                switch( eventName ) {

                    case 'onElementValueSet':                                               //  fallthrough
                    case 'onElementValueChanged':
                        onElementValueChanged( eventData );
                        break;
                    case 'onModeSet':
                        onModeSet( eventData );
                        break;

                    case 'onSchemaSet':
                        Y.log( 'Schema has been set.', 'debug', NAME );
                        break;

                    case 'onTableValueChanged':
                        onTableValueChanged( eventData );
                        break;

                    case 'beforeUnload':
                        onUnload( eventData );
                        break;

                    default:
                        //  noisy, used when debugging subforms
                        //Y.log( 'Unhandled template event: ' + eventName, 'warn', NAME );
                        break;
                }

            }

            /**
             *  Clear and knockout dependencies for a clean close
             *  @/param formUID
             */

            function onUnload( /* formUID */ ) {

                if (Y.dcforms.isOnServer) {
                    return;
                }

                var i;
                for( i = 0; i < koSubscriptions.length; i++ ) {
                    koSubscriptions[i].dispose();
                }
                koSubscriptions = [];
                template.off( '*', 'dcforms-map-pubreceipt' );
                Y.log('Unsubscribed from activity.', 'debug', NAME);
            }

            /**
             *  Raised when the user changes the value of a form element
             *
             *  This includes all elements and types (checking a box, entering text in an input. etc)
             *
             *  At present there is no reverse mapping (updating of the activity based on new form values)
             *
             *  This mapper also does not keep a form document, but changes may be possible to some fields prior to
             *  rendering a PDF - these will not be persistent.
             *
             *  @param  element {Object}    The dcforms-element object which changed
             */

            function onElementValueChanged( element ) {

                //Y.log( 'CHANGED! ' + element.schemaMember, 'debug', NAME );

                switch( element.schemaMember ) {

                    default:
                        //  not bound to anything, or not relevant to pubreceipt
                        Y.log( 'Form element is not bound to mapped object, or not handled ' + element.domId, 'debug', NAME );
                        break;
                }

            }

            /**
             *  Raised in response to user changing the value of form elements
             */

            function onFormValueChanged( /* element */ ) {

                function onResetToStoredData() {
                    Y.log( 'Form reset to state before edit.', 'debug', NAME );
                    template.render( Y.dcforms.nullCallback );
                }

                function onUpdatedFormData() {
                    Y.log( 'Saved form state has been updated.', 'debug', NAME );
                }

                if (template._isServerZip) {
                    return;
                }

                if( currentActivity._isEditable() ) {

                    context.attachments.updateFormDoc( context, template, onUpdatedFormData );

                } else  {

                    if (formDoc && formDoc.type) {
                        try {
                            template.fromDict( Y.doccirrus.api.document.formDocToDict(formDoc), onResetToStoredData );
                        } catch( parseErr ) {
                            Y.log( 'Could not parse saved form state.', 'warn', NAME );
                        }
                    }
                }
            }

            /**
             *  Not currently in use, editable tables are a planned feature
             *  @param detail
             */

            function onTableValueChanged( detail ) {

                var
                    row = detail.row,
                    col = detail.col,
                    value = detail.text,
                    element = detail.element,
                    ds = element.dataSet;

                if( 'object' !== typeof element.dataSet ) {
                    return;
                }

                Y.log( 'Changed - cellId: ' + detail.id + ' row: ' + row + ' col:' + col + ' value: ' + value, 'debug', NAME );

                if(
                    (ds[row].hasOwnProperty( 'costperitem' )) &&
                    (ds[row].hasOwnProperty( 'quantity' )) &&
                    (ds[row].hasOwnProperty( 'cost' )) &&
                    (!isNaN( ds[row].quantity )) &&
                    (!isNaN( ds[row].costperitem )) &&
                    (('costperitem' === col) || ('quantity' === col))
                    ) {
                    ds[row].cost = (parseFloat( ds[row].quantity ) * parseFloat( ds[row].costperitem ));
                    element.setTableCell( row, 'cost', ds[row].cost.toFixed( 2 ) + '' );

                } else {
                    if( Y.config.debug ) {
                        Y.log( 'Not changed ' + JSON.stringify( ds[row] ), 'debug', NAME );
                    }
                }

                onRecalculateTotal( element );

            }

            /**
             *  Update the pubreceipt total from the items table in reponse to user action
             *
             *  LEGACY: this is kept for archival activities, there is a new common API for calculating invoices which
             *  should be used going forward.
             *
             *  @param tableElement
             */

            function onRecalculateTotal( tableElement ) {
                var
                    ds = tableElement.dataSet,
                    row,
                    total = 0;

                for( row = 0; row < ds.length; row++ ) {

                    if( ds[row].hasOwnProperty( 'cost' ) && !isNaN( ds[row].cost ) ) {
                        total = total + parseFloat( ds[row].cost );
                    }
                }

                //total = total.toLocaleString( 'de-DE', {style: 'currency', currency: 'EUR'} );
                Y.log( 'Grand total: ' + total );

                //currentActivity.content('EUR ' + total.toFixed( 2 ) + ' (' + ds.length + ')');

                //  remap it into the form

                function onReMapComplete( err ) {
                    if( err ) {
                        Y.log( 'Error remapping total into form: ' + err, 'warn', NAME );
                    }
                }

                template.map( { 'total': Y.doccirrus.comctl.numberToLocalCurrency( total ) }, true, onReMapComplete );
            }

            /**
             *  Called when the user selects or deselects items in the datatable
             *
             *  Re-maps linked activities and their fields into form
             *
             *  @param  newSelection    {String}    Set of _ids of selected items
             */

            function onSelectionChanged( newSelection ) {

                function onMapLinkedActivities(err) {
                    if (err) {
                        Y.log('Problem mapping linked activities: ' + JSON.stringify(err), 'warn', NAME);
                    }

                    //alert('form mapped after selection change, saving form: ' + JSON.stringify(template.toDict()), 'debug', NAME);
                    context.attachments.updateFormDoc( context, template, onFormDocUpdated );

                }

                function onFormDocUpdated(err) {
                    if (err) {
                        Y.log('Problem updating form document: ' + JSON.stringify(err), 'warn', NAME);
                    }
                    template.raise('mapcomplete', template.unmap());
                }

                if( Y.config.debug ) {
                    Y.log( 'Selection changed to: ' + JSON.stringify( newSelection, undefined, 2 ), 'debug', NAME );
                }
                //alert( 'Selection changed to: ' + JSON.stringify( newSelection, undefined, 2 ));

                if (currentActivity.inTransition()) {
                    Y.log( 'Activity is in transition, not remapping form.', 'info', NAME );
                    return;
                }

                if( false === currentActivity._isEditable() ) {
                    Y.log( 'Invoice is not in an editable state, not remapping', 'warn', NAME );
                    return;
                }

                if (template._isServerZip) {
                    return;
                }

                /*
                var formData = processLinkedActivities({}, currentActivity);
                template.map(formData, true, onMapLinkedActivities);
                */

                map( onMapLinkedActivities );
            }

            /**
             *  Change form editable state according to activity status
             *  @param   newState    {String}    A member of ActStatus_E
             */

            function onStateChanged( newState ) {

                function onNewModeSet() {
                    Y.log( 'Form mode changed to: ' + template.mode, 'debug', NAME );
                }

                var editable = false;

                switch( newState ) {
                    case 'CREATED':
                        editable = true;
                        break;
                    case 'VALID':
                        editable = true;
                        break;
                }

                if( editable ) {
                    Y.log( 'set form editable for pubreceipt state ' + newState, 'info', NAME );
                    template.setMode( 'fill', onNewModeSet );
                } else {
                    Y.log( 'set form uneditable for pubreceipt state ' + newState, 'info', NAME );
                    template.setMode( 'locked', onNewModeSet );
                }
            }

            /**
             *  Prevent changes cased by PDF rendering or other mode changes from being saved
             *
             *  Note that this view should only see 'fill', 'locked' and 'pdf' modes, and require no action at present
             *
             *  @param  mode    {String}    Name of a template mode
             */

            function onModeSet( mode ) {
                formMode = mode;
                if ('shutdown' === mode) {
                    onUnload();
                }
            }

            //  RETURN MAPPER INTERFACE  / API

            return {
                'map': map,
                'unmap': unmap,
                'destroy': onUnload,
                'handleEvent': onTemplateEvent
            };

        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['dc-comctl', 'document-api']
    }
);