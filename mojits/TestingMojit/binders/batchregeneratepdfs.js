/*
 *  Binder for batch PDF regneration within a date range
 *
 *  This is for operational support to recreate PDFs made with incorrect forms, or where a bug has affected PDF output.
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $, jQuery, moment */

YUI.add('TestingMojitBinderBatchRegneratePdfs', function(Y, NAME) {
        /**
         * The TestingMojitBinderBatchRegneratePdfs module.
         *
         * @module TestingMojitBinderBatchRegneratePdfs
         */

        'use strict';

        Y.log('YUI.add TestingMojitBinderBatchRegneratePdfs with NAMEs ' + NAME, 'info');

        /**
         * Constructor for the TestingMojitBinderImageTest class.
         *
         * @class testingMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            //  PROPERTIES

            jq: {},
            startDate: null,
            endDate: null,
            report: '',
            allForms: false,
            formIds: [],
            activities: [],

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */

            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {

                var that = this;

                this.node = node;

                //  cache jQuery selectors
                this.jq = {
                    divStatusbar: $('#divStatusbar'),
                    txtStartDate: $('#txtStartDate'),
                    txtEndDate: $('#txtEndDate'),
                    spnStartDate: $('#spnStartDate'),
                    spnEndDate: $('#spnEndDate'),
                    btnConfirm: $('#btnConfirm'),
                    btnRegenerate: $('#btnRegenerate'),
                    divConfirm: $('#divConfirm'),
                    divRegenerate: $('#divRegenerate'),
                    divFormDocList: $('#divFormDocList'),
                    taFormIds: $('#taFormIds'),
                    divProgressArea: $('#divProgressArea'),
                    divProgressBar: $('#divProgressBar'),
                    spanProgressSr: $('#spanProgressSr'),
                    divProgressLabel: $('#divProgressLabel')
                };

                //  set both dates to today
                this.startDate = moment();
                this.endDate = moment();
                this.jq.txtStartDate.val(this.startDate.format());
                this.jq.txtEndDate.val(this.endDate.format());

                //  attach event handlers
                this.jq.txtStartDate.on('change keyup', function() { that.onDateChange(); });
                this.jq.txtEndDate.on('change keyup', function() { that.onDateChange(); });
                this.jq.btnRegenerate.on('click', function() { that.onRegenerateClick(); });

                //
                this.jq.btnConfirm.on('click', function() {
                    that.jq.divConfirm.html('');

                    that.regeneratePDFs(function onRegen(err, report) {
                        if (err) {
                            that.jq.divConfirm.html('<pre>ERROR: ' + JSON.stringify(err) + '</pre>');
                            return;
                        }
                        that.jq.divConfirm.html('<pre>' + report + '</pre>');
                    });


                });
            },

            readFormIds: function() {
                var
                    txt = this.jq.taFormIds.val(),
                    parts, i;

                txt = txt.replace(new RegExp(' ', 'g'), ',');
                txt = txt.replace(new RegExp("\n", 'g'), ',');
                txt = txt.replace(new RegExp("\r", 'g'), ',');
                txt = txt.replace(new RegExp("\t", 'g'), ',');
                txt = txt.replace(new RegExp("\"", 'g'), ',');
                txt = txt.replace(new RegExp("\'", 'g'), ',');
                txt = txt.replace(new RegExp("&quot;", 'g'), ',');

                parts = txt.split(',');

                this.formIds = [];
                this.allForms = false;

                if ('*' === jQuery.trim(txt)) {
                    this.allForms = true;
                }

                for (i = 0; i < parts.length; i++) {
                    if ('' !== parts[i] + '') {
                        this.formIds.push(parts[i]);
                    }
                }

            },

            /**
             *  Check if a form or version is on the 'to regenerate' list
             *
             *  @param  formId  {String}    Form or version id
             */

            formIsAllowed: function(formId) {
                if (true === this.allForms) {
                    return true;
                }

                var i;
                for (i = 0; i < this.formIds.length; i++) {
                    if (this.formIds[i] === formId) {
                        return true;
                    }
                }
                return false;
            },

            /**
             *  Make a table of activities with forms to be regenerated
             *  @return {String}    HTML table
             */

            activitiesToHtml: function() {
                var i, htmlActivities = '';

                htmlActivities = htmlActivities +
                    '<table style="width: 100%">' + "\n" +
                    '<tr>' +
                    '<th>ACTIVITY</th>' +
                    '<th>ACTTYPE</th>' +
                    '<th>FORMID</th>' +
                    '<th>FORMVERSION</th>' +
                    '<th>TIMESTAMP</th>' +
                    '<th>CONTENT</th>' +
                    '</tr>' + "\n";

                for (i = 0; i < this.activities.length; i++) {
                    htmlActivities = htmlActivities +
                        '<tr>' +
                        '<td>' + this.activities[i]._id + '</td>' +
                        '<td>' + this.activities[i].actType + '</td>' +
                        '<td>' + this.activities[i].formId + '</td>' +
                        '<td>' + this.activities[i].formVersion + '</td>' +
                        '<td>' + this.activities[i].timestamp + '</td>' +
                        '<td>' + this.activities[i].content + '</td>' +
                        '</tr>';
                }

                htmlActivities = htmlActivities + '</table>';

                return htmlActivities;
            },

            /**
             *  Load all documents referred to by this.attachmentsToLoad into this.attachments
             *  @param callback
             */

            loadAttachments: function(callback) {
                Y.log('loading ' + this.attachmentsToLoad.length + ' attachments', 'debug', NAME);

                var that = this, nextId, total = this.attachmentsToLoad.length, progress = 0;
                this.attachments = [];
                loadNext();

                that.jq.divProgressLabel.html('<br/><br/>Checking ' + total +' linked attachments... ');

                function loadNext() {
                    if (0 === that.attachmentsToLoad.length) {
                        that.jq.divProgressLabel.html('...');
                        that.jq.divProgressArea.hide();
                        callback(null);
                        return;
                    }

                    progress = progress + 1;
                    that.setProgressBar(progress, total);

                    nextId = that.attachmentsToLoad.pop();
                    Y.doccirrus.comctl.privateGet('/1/document/' + nextId, {}, onAttachmentLoaded);
                }

                function onAttachmentLoaded(err, data) {
                    if (err) {
                        Y.log('error loading attachment ' + nextId + ': ' + JSON.stringify(err), 'debug', NAME);
                        loadNext();
                        return;
                    }

                    data = data.data ? data.data : data;

                    if (!data[0]) {
                        Y.log('attachment not found: ' + nextId, 'debug', NAME);
                        loadNext();
                        return;
                    }

                    that.attachments.push(data[0]);
                    loadNext();
                }

            },

            /**
             *  Display a progress bar
             *
             *  @param  value   {Number}    Current propertion
             *  @param  max     {Number}    Total work
             */

            setProgressBar: function(value, max) {
                var percentage = parseInt(((value / max) * 100), 10);
                this.jq.divProgressBar.attr('aria-valuenow', percentage);
                this.jq.divProgressBar.css('width', percentage + '%');
                this.jq.spanProgressSr.html(percentage + '%');
                this.jq.divProgressArea.show();
            },

            /**
             *  Regenerate PDFs for all selected activities
             */

            regeneratePDFs: function(callback) {
                var
                    that = this,
                    toRegenerate = [],
                    nextId,
                    i,
                    regenLog = '',
                    progress = 0,
                    failures = 0,
                    total = this.activities.length;

                for (i = 0; i < this.activities.length; i++) {
                    toRegenerate.push(this.activities[i]._id);
                }

                regenNext();

                function regenNext() {
                    if (0 === toRegenerate.length) {
                        console.log('All PDFs regenerated for specified activities');
                        regenLog = regenLog + 'All PDFs regenerated for '  + total + ' specified activities.' + nextId + "\n";
                        regenLog = regenLog + 'Number of failures: ' + failures + "\n";


                        callback(null, regenLog);
                        return;
                    }

                    nextId = toRegenerate.pop();
                    var postData = { 'activityId': nextId };

                    progress = progress + 1;
                    that.setProgressBar(progress, total);
                    that.jq.divProgressLabel.html('<br/><br/>Regenerating PDF for activity: ' + nextId);

                    console.log('posting to regeneratepdf: ' + JSON.stringify(postData));

                    Y.doccirrus.comctl.privatePost('/1/formtemplate/:regeneratepdf', postData, onRegeneratePdf);
                }

                function onRegeneratePdf(err, data) {
                    if (err) {
                        Y.log('Could not regenerate PDF: ' + JSON.stringify(err), 'debug', NAME);
                        regenLog = regenLog + 'Could not regenerate PDF for activity: ' + nextId + "\n";
                        failures = failures + 1;
                        regenNext();
                        return;
                    }

                    regenLog = regenLog + 'regenerated ' + nextId + ': ' + JSON.stringify(data.data) + "\n";
                    regenNext();
                }
            },

            /**
             *  User must enter two valid dates/times more than an hour apart, start date must be before end date
             */

            onDateChange: function() {
                var
                    sd = moment(this.jq.txtStartDate.val()),
                    ed = moment(this.jq.txtEndDate.val());

                if (sd.isValid()) {
                    this.startDate = sd;
                    this.jq.spnStartDate.html(sd.format());
                    this.jq.spnStartDate.css('background-color', '#ffffff');
                } else {
                    this.jq.spnStartDate.css('background-color', '#ff9999');
                }

                if (ed.isValid()) {
                    this.endDate = ed;
                    this.jq.spnEndDate.html(ed.format());
                    this.jq.spnEndDate.css('background-color', '#ffffff');
                } else {
                    this.jq.spnEndDate.css('background-color', '#ff9999');
                }

                if (ed.isValid() && sd.isValid() && ed.diff(sd, 'hours') > 1) {
                    this.jq.divRegenerate.show();
                } else {
                    this.jq.divRegenerate.hide();
                }

                this.readFormIds();
            },

            onRegenerateClick: function () {
                var that = this;
                Y.log('user clicked regenerate: ' + JSON.stringify(this.formIds), 'debug', NAME);

                this.jq.btnRegenerate.hide();
                this.jq.txtStartDate.attr('disabled', true);
                this.jq.txtStartDate.attr('disabled', true);
                this.jq.taFormIds.attr('disabled', true);
                this.readFormIds();

                //  note that we can only query activities after a date, not in a range, so we will trim down the set later
                this.jq.divFormDocList.html('Loading activities...');
                Y.doccirrus.comctl.privateGet('/1/activity/timestamp_gt/' + this.startDate.format(), {}, onActivitiesLoaded);

                function onActivitiesLoaded(err, data) {

                    //  check and format the result
                    if (err) {
                        that.jq.divFormDocList.html('Could not list form pdfs: ' + JSON.stringify(err));
                        return;
                    }

                    data = data.data ? data.data : data;
                    Y.log('Checking ' + data.length + ' activities', 'debug', NAME);

                    var i, j, tempDate;

                    that.activities = [];

                    //  reduce set to those before the end date, which have a form, and which are in the allowed list of forms
                    for (i = 0; i < data.length; i++) {
                        tempDate = moment(data[i].timestamp);
                        if (tempDate.valueOf() >= that.startDate.valueOf() && tempDate.valueOf() <= that.endDate.valueOf()) {

                            if (data[i].hasOwnProperty('formId') && '' !== data[i].formId) {
                                if (that.formIsAllowed(data[i].formId) || that.formIsAllowed(data[i].formVersion)) {
                                    data[i].attachmentsLoaded = false;
                                    that.activities.push(data[i]);
                                } else {
                                    console.log('Not considering activity ' + data[i]._id + ' (form not in list)');
                                }

                            }

                        }
                    }

                    //  make list of attachments to load
                    that.attachmentsToLoad = [];
                    for (i = 0; i < that.activities.length; i++) {
                        if (that.activities[i].hasOwnProperty('attachments')) {
                            for (j = 0; j < that.activities[i].attachments.length; j++) {
                                that.attachmentsToLoad.push(that.activities[i].attachments[j]);
                            }
                        }
                    }

                    //  print results

                    that.jq.divFormDocList.html(that.activitiesToHtml());
                    that.loadAttachments(function(err) {
                        if (err) {
                            Y.log('Error loading attachments: ' + JSON.stringify(err), 'warn', 'NAME');
                        }
                        that.jq.divConfirm.show();
                    });
                }
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',
            'dcbatchpdfzip',
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'JsonRpcReflection-doccirrus',
            'dcregexp',
            'dcsubviewmodel',
            'dcutils',
            'dcauth',
            'dccasefilebinderevents',
            'dcloadhelper',
            'base',
            'router',
            'json',
            'model-sync-rest',
            'intl',
            'mojito-intl-addon',
            'dc-comctl',
            'dcmedia',
            'dcvat',
            'DCWindow',
            'dcmarkermodel',
            'dcmarkerarraymodel',
            'dchotkeyshandler',
            'DCSystemMessages',
            'parallel',
            'dcFkModels',
            'dcOphthalmologyModels',
            'kbv-api',
            'dccrmanager',
            'cardreader',
            'DCFsmDefault',
            'DeviceReader',
            'dccommunication-client'
        ]
    }
);
