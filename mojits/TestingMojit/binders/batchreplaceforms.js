/*
 *  Binder for batch PDF regneration within a date range
 *
 *  This is for operational support to recreate PDFs made with incorrect forms, or where a bug has affected PDF output.
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $, moment */

YUI.add('TestingMojitBinderBatchReplaceForms', function(Y, NAME) {
        /**
         * The TestingMojitBinderBatchReplaceForms module.
         *
         * @module TestingMojitBinderBatchReplaceForms
         */

        'use strict';

        Y.log('YUI.add TestingMojitBinderBatchReplaceForms with NAMEs ' + NAME, 'info');

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
            formList: [],
            replacements: [],
            replacementsDoc: [],

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
                    btnReplace: $('#btnReplace'),
                    divConfirm: $('#divConfirm'),
                    divReplace: $('#divReplace'),
                    divFormDocList: $('#divFormDocList'),
                    taFormIds: $('#taFormIds'),
                    divProgressArea: $('#divProgressArea'),
                    divProgressBar: $('#divProgressBar'),
                    spanProgressSr: $('#spanProgressSr'),
                    divProgressLabel: $('#divProgressLabel'),
                    divListForms: $('#divListForms')
                };

                //  set both dates to today
                this.startDate = moment();
                this.endDate = moment();
                this.jq.txtStartDate.val(this.startDate.format());
                this.jq.txtEndDate.val(this.endDate.format());

                //  attach event handlers
                this.jq.txtStartDate.on('change keyup', function() { that.onDateChange(); });
                this.jq.txtEndDate.on('change keyup', function() { that.onDateChange(); });
                this.jq.btnReplace.on('click', function() { that.onRegenerateClick(); });

                this.jq.taFormIds.val('oldForm1->newForm1' + "\n" + 'oldForm2->newForm2');
                this.jq.taFormIds.on('change keyup', function() {
                    that.readFormIds();
                    console.log('remake taForms');
                    that.jq.divListForms.html(that.printMigrations() + '<hr/>' + that.printFormIds());
                });



                //  download the current set of forms available in database
                this.listForms();

                //
                this.jq.btnConfirm.on('click', function() {
                    that.jq.divConfirm.html('');

                    that.replaceForms(function onRegen(err, report) {
                        if (err) {
                            that.jq.divConfirm.html('<pre>ERROR: ' + JSON.stringify(err) + '</pre>');
                            return;
                        }
                        that.jq.divConfirm.html('<pre>' + report + '</pre>');

                        that.replaceDocuments(function onRegenDoc(err, report2) {
                            if (err) {
                                that.jq.divConfirm.html(that.jq.divConfirm.html() + '<pre>ERROR: ' + JSON.stringify(err) + '</pre>');
                                return;
                            }
                            that.jq.divConfirm.html(that.jq.divConfirm.html() + '<br/><pre>' + report2 + '</pre>');
                        });

                    });

                });
            },

            /**
             *  Make and store a list of forms available on this instance
             */

            listForms: function() {
                var that = this;

                Y.doccirrus.comctl.privateGet('/1/formtemplate/:listforms', {}, onFormListLoaded);

                function onFormListLoaded(err, data) {
                    if (err) {
                        that.jq.divListForms.html('Could not load form list: ' + JSON.stringify(err));
                        return;
                    }

                    data = data.data ? data.data : data;

                    that.formList = data;
                    that.jq.divListForms.html(that.printFormIds());
                }
            },

            /**
             *  Print a table of forms and their usages
             */

            printFormIds: function() {
                this.jq.divListForms.html(JSON.stringify(this.formList));

                var i, htmlForms = '';

                htmlForms = htmlForms +
                '<table style="width: 100%">' + "\n" +
                '<tr>' +
                '<th>CATEGORY</th>' +
                '<th>FORMID</th>' +
                '<th>FORMVERSION</th>' +
                '<th>NAME</th>' +
                '<th>USAGE</th>' +
                '</tr>' + "\n";

                for (i = 0; i < this.formList.length; i++) {
                    htmlForms = htmlForms +
                    '<tr>' +
                    '<td>' + this.formList[i].category + '</td>' +
                    '<td>' + this.formList[i].formId + '</td>' +
                    '<td>' + this.formList[i].latestVersionId + '</td>' +
                    '<td>' + this.formList[i].title.de + '</td>' +
                    '<td>' + this.countUsages(this.formList[i].formId) + '</td>' +
                    '</tr>';
                }

                htmlForms = htmlForms + '</table>';

                return htmlForms;
            },

            countUsages: function(formId) {
                var i, total = 0;

                if (!this.activities || 0 === this.activities.length) {
                    return '...';
                }

                for (i = 0; i < this.activities.length; i++) {
                    if (this.activities[i].formId && formId === this.activities[i].formId) {
                        total = total + 1;
                    }
                }

                return total;
            },

            readFormIds: function() {
                var
                    txt = this.jq.taFormIds.val(),
                    migrations, parts, i;

                txt = txt.replace(new RegExp(' ', 'g'), ',');
                txt = txt.replace(new RegExp("\n", 'g'), ',');
                txt = txt.replace(new RegExp("\r", 'g'), ',');
                txt = txt.replace(new RegExp("\t", 'g'), ',');
                txt = txt.replace(new RegExp("\"", 'g'), ',');
                txt = txt.replace(new RegExp("\'", 'g'), ',');
                txt = txt.replace(new RegExp("&quot;", 'g'), ',');

                migrations = txt.split(',');

                this.formIds = [];
                this.allForms = false;

                for (i = 0; i < migrations.length; i++) {
                    if ('' !== migrations[i] + '') {
                        parts = migrations[i].split('->');
                        if (2 === parts.length) {

                            this.formIds.push({ 'old': parts[0], 'new_': parts[1] });

                        }
                    }
                }

            },

            printMigrations: function() {
                var i, newMeta, htmlMigrations = '', htmlErr = '';

                htmlMigrations = htmlMigrations +
                '<table style="width: 100%">' + "\n" +
                '<tr>' +
                '<th>Find usages of:</th>' +
                '<th>Replace with latest version of:</th>' +
                '</tr>' + "\n";

                for (i = 0; i < this.formIds.length; i++) {

                    newMeta = this.getFormMeta(this.formIds[i].new_);

                    if (newMeta) {
                        htmlMigrations = htmlMigrations +
                        '<tr>' +
                        '<td>' + this.formIds[i].old + '</td>' +
                        '<td>' + this.formIds[i].new_ + '</td>' +
                        '</tr>';
                    } else {
                        htmlErr = htmlErr + 'WARNING: Form not found: ' + this.formIds[i].new_ + '<br/>';
                    }

                }

                htmlMigrations = htmlMigrations + '</table>';

                if ('' !== htmlErr) {
                    htmlErr = '<h2>Notice: please check the following:</h2>' + htmlErr;
                    htmlMigrations = htmlMigrations + htmlErr;
                }

                return htmlMigrations;
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
                    if (this.formIds[i].old === formId) {
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

                function loadNext() {
                    if (0 === that.attachmentsToLoad.length) {
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

            getFormMeta: function(formId) {
                var i;
                for (i = 0; i < this.formList.length; i++) {
                    if (this.formList[i].formId === formId || this.formList[i].latestVersionId === formId) {
                        return this.formList[i];
                    }
                }
                return null;
            },

            createReplacements: function() {
                this.replacements = [];
                this.replacementsDoc = [];

                var i, j, activity, formDoc, oldMeta, newMeta;

                //alert('formids ' + JSON.stringify(this.formIds));

                for (i = 0; i < this.activities.length; i++) {
                    activity = this.activities[i];

                    oldMeta = null;
                    newMeta = null;

                    for (j = 0; j < this.formIds.length; j++) {
                        if (activity.formId === this.formIds[j].old || activity.formVersion === this.formIds[j].old) {

                            oldMeta = this.getFormMeta(this.formIds[j].old);
                            newMeta = this.getFormMeta(this.formIds[j].new_);

                            //alert('formMeta ' + this.formIds[j].new_ + ': ' + JSON.stringify(newMeta));
                        }
                    }

                    if (newMeta) {

                        console.log('add ', JSON.stringify({
                            'activityId': activity._id,
                            'formId': newMeta.formId,
                            'formVersion': newMeta.latestVersionId
                        }, undefined, 2));

                        this.replacements.push({
                            'activityId': activity._id,
                            'formId': newMeta.formId,
                            'formVersion': newMeta.latestVersionId
                        });
                        activity.formId = newMeta.formId;
                        activity.formVersion = newMeta.latestVersionId;
                    }

                }

                //alert('replacements: ' + JSON.stringify(this.replacements));

                //alert('attachments: ' + this.attachments.length);

                for (i = 0; i < this.attachments.length; i++) {
                    formDoc = this.attachments[i];

                    newMeta = this.getFormMetaForDoc(formDoc._id);

                    console.log('newMeta for ' + formDoc._id + '  ' + JSON.stringify(newMeta));

                    if (newMeta) {
                        this.replacementsDoc.push({
                            'documentId': formDoc._id,
                            'formId': newMeta.formId,
                            'formVersionId': newMeta.latestVersionId
                        });
                    }
                }

                console.log('replacementsDoc: ' + JSON.stringify(this.replacementsDoc));
            },

            getActivityForDoc: function(docId) {
                var i, j, activity;
                for (i = 0; i < this.activities.length; i++) {
                    activity = this.activities[i];
                    for (j = 0; j < activity.attachments.length; j++) {
                        if (activity.attachments[j] === docId) {
                            return activity;
                        }
                    }
                }
                return null;
            },

            getFormMetaForDoc: function(docId) {
                var activity = this.getActivityForDoc(docId);
                return this.getFormMeta(activity.formId);
            },

            /**
             *  Regenerate PDFs for all selected activities
             */

            replaceForms: function(callback) {
                var
                    that = this,
                    toReplace = [],
                    postData,
                    i,
                    regenLog = '',
                    progress = 0,
                    failures = 0,
                    total = this.activities.length;

                console.log('replacements: ' + JSON.stringify(this.replacements));

                for (i = 0; i < this.replacements.length; i++) {
                    toReplace.push(this.replacements[i]);
                }

                replaceNext();

                function replaceNext() {
                    if (0 === toReplace.length) {
                        console.log('Forms have been replaced in all activities');
                        regenLog = regenLog + 'Forms replaced in '  + total + ' specified activities.' + "\n";
                        regenLog = regenLog + 'Number of failures: ' + failures + "\n";
                        that.jq.divProgressLabel.html('<br/><br/>');
                        callback(null, regenLog);
                        return;
                    }

                    postData = toReplace.pop();
                    progress = progress + 1;
                    that.jq.divProgressLabel.html('<br/><br/>updating activity ' + JSON.stringify(postData));
                    that.setProgressBar(progress, total);

                    Y.doccirrus.comctl.privatePost('/1/formtemplate/:replaceform', postData, onReplaceForm);
                }

                function onReplaceForm(err, data) {
                    if (err) {
                        Y.log('Could not replace form: ' + JSON.stringify(err), 'debug', NAME);
                        regenLog = regenLog + 'Could not replace form: ' + JSON.stringify(postData) + "\n";
                        failures = failures + 1;
                        replaceNext();
                        return;
                    }

                    regenLog = regenLog + 'regenerated ' + JSON.stringify(postData) + ': ' + JSON.stringify(data.data) + "\n";
                    replaceNext();
                }
            },

            replaceDocuments: function(callback) {
                var
                    that = this,
                    toReplace = [],
                    postData,
                    i,
                    regenLog = '',
                    progress = 0,
                    failures = 0,
                    total = this.attachments.length;

                console.log('replacementsDoc: ' + JSON.stringify(this.replacementsDoc));

                for (i = 0; i < this.replacementsDoc.length; i++) {
                    toReplace.push(this.replacementsDoc[i]);
                }

                replaceNext();

                function replaceNext() {
                    if (0 === toReplace.length) {
                        console.log('Forms have been replaced in all documents');
                        regenLog = regenLog + 'Forms replaced in '  + total + ' specified documents.' + "\n";
                        regenLog = regenLog + 'Number of failures: ' + failures + "\n";
                        that.jq.divProgressLabel.html('<br/><br/>');
                        callback(null, regenLog);
                        return;
                    }

                    postData = toReplace.pop();
                    progress = progress + 1;
                    that.jq.divProgressLabel.html('<br/><br/>updating formDoc ' + JSON.stringify(postData));
                    that.setProgressBar(progress, total);

                    Y.doccirrus.comctl.privatePost('/1/formtemplate/:replaceformindoc', postData, onReplaceForm);
                }

                function onReplaceForm(err, data) {
                    if (err) {
                        Y.log('Could not replace form: ' + JSON.stringify(err), 'debug', NAME);
                        regenLog = regenLog + 'Could not replace form: ' + JSON.stringify(postData) + "\n";
                        failures = failures + 1;
                        replaceNext();
                        return;
                    }

                    regenLog = regenLog + 'replaced ' + JSON.stringify(postData) + ': ' + JSON.stringify(data.data) + "\n";
                    replaceNext();
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
                    this.jq.divReplace.show();
                } else {
                    this.jq.divReplace.hide();
                }

                this.readFormIds();
            },

            onRegenerateClick: function () {
                var that = this;
                Y.log('user clicked regenerate: ' + JSON.stringify(this.formIds), 'debug', NAME);

                this.jq.btnReplace.hide();
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
                    that.jq.divListForms.html(that.printMigrations() + '<hr/>' + that.printFormIds());
                    that.loadAttachments(function(err) {
                        if (err) {
                            Y.log('Error loading attachments: ' + JSON.stringify(err), 'warn', 'NAME');
                        }
                        that.createReplacements();
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
