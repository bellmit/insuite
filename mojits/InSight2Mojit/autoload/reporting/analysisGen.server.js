/* eslint no-inner-declarations:0 */
/*global YUI */



YUI.add( 'AnalysisGen', function( Y/*, NAME*/ ) {

    var GroupObject = Y.doccirrus.insight2.GroupObject,
        ProjectObject = Y.doccirrus.insight2.ProjectObject,
        analysisVirtualMap = Y.doccirrus.insight2.analysisVirtualMap,
        inCaseSchema = Y.dcforms.reducedschema.loadSync('InCase_T');

    var modelFieldsMap = {
        patient: 'patientDbId',
        employee: 'employeeId',
        //activity: 'activityId',
        location: 'locationId'
    };

    function AnalysisGen(data) {
        this.groupByFields = data.groupByFields.reverse();
        this.virtualFields = data.virtualFields;
        this.filter = data.filter;
        this.additionalFields = data.additionalFields || {};
        this.additionalFieldsList = this.getAdditionalFieldsList();
        this.options = data.options;
        this.pipeline = [];
        this.modelStats = {};
        this.modelFields = this.getModelFields();
        this.fieldsLength = this.groupByFields.length;
        this.lastIndex = this.fieldsLength - 1;
        this.childrenOpts = {
            limit: data.childrenLimit || 10,
            order: data.childrenOrder || -1
        };
    }

    AnalysisGen.prototype.generate = function() {
        if (this.modelStats._activityCount >= 2) {
            this._genForActivities();
        } else {
            this._genStandard();
        }
        return this.pipeline;
    };

    AnalysisGen.prototype._genStandard = function() {
        if (this.fieldsLength) {

            var baseMatch = this.prepareBaseMatch(),
                baseGroup = this.prepareBaseGroup(),
                rootGroup = this.prepareRootGroup(),
                middleGroups = this.prepareMiddleGroups(),
                preProject = this.preparePreProject(),
                sortByField = this.options.showPrice ? 'price' : 'total',
                sortByTotal = this.getSortBy(sortByField, this.childrenOpts.order),
                rootProject = this.prepareRootProject();

            // push base match
            this.pipeline.push(baseMatch);

            if (preProject) {
                this.pipeline.push(preProject);
            }

            // push base group
            this.pipeline.push(baseGroup);

            // sort by total
            this.pipeline.push(sortByTotal);

            // concat middle group
            this.pipeline = this.pipeline.concat(middleGroups);

            // push root group
            this.pipeline.push(rootGroup);

            // push root project
            this.pipeline.push(rootProject);

        } else {

            var pEmpty = this.preparePipelineForEmpty();
            this.pipeline = this.pipeline.concat(pEmpty);

        }
    };

    AnalysisGen.prototype._genForActivities = function() {
        var baseMatch = this.prepareBaseMatch(),
            baseGroup = this.prepareBaseGroupForActivities(),
            preProject = this.preparePreProject(),
            filterProject = this.prepareFilterForActivities(),
            unwinds = this.prepareUnwindsForActivities(),
            middleGroups = this.prepareMiddleGroupsForActivities(),
            rootGroup = this.prepareRootGroup(),
            sortByField = this.options.showPrice ? 'price' : 'total',
            sortByTotal = this.getSortBy(sortByField, this.childrenOpts.order),
            rootProject = this.prepareRootProject();

        // push base match
        this.pipeline.push(baseMatch);

        if (preProject) {
            this.pipeline.push(preProject);
        }

        // push base group
        this.pipeline.push(baseGroup);

        // sort by total
        this.pipeline.push(sortByTotal);

        // push filter project
        this.pipeline.push(filterProject);

        // unwind arrays
        this.pipeline = this.pipeline.concat(unwinds);

        // flatten object
        if (this.options.showPrice) {
            var flattenProject = this.prepareFlattenForActivitiesWithPrice();
            this.pipeline.push(flattenProject);
        }

        // push middle groups
        this.pipeline = this.pipeline.concat(middleGroups);

        // push root group
        this.pipeline.push(rootGroup);

        // push root project
        this.pipeline.push(rootProject);
    };

    AnalysisGen.prototype.preparePipelineForEmpty = function() {
        var p1 = new GroupObject(),
            p2 = new GroupObject();

        p1.setId('$patientDbId');
        p1.setPriceSum('$total');

        p2.setId(1);
        p2.setNameFirst('root');
        p2.setTotalSum(1);
        p2.setPriceSum('$price');

        return [p1.getQuery(), p2.getQuery()];
    };

    AnalysisGen.prototype.prepareFilterForActivities = function() {
        var self = this,
            p = new ProjectObject();

        p.setCopyField('_id');
        p.setCopyField('total');

        this.groupByFields.forEach(function(field, i) {
            if (self.options.showPrice && i === 0) {
                p.setFilterFieldNotEqual(field, '_EMPTY_', 'val');
            } else if (field === 'mediCode' ||
                field === 'diagCode' ||
                field === 'treatCode') {

                p.setFilterFieldNotEqual(field, '_EMPTY_');
            } else {
                p.setCopyField(field);
            }
        });

        return p.getQuery();
    };

    AnalysisGen.prototype.prepareBaseGroupForActivities = function() {
        var self = this,
            p = new GroupObject();

        p.setTotalSum(1);
        p.setId({caseFolderId: '$caseFolderId'});

        this.groupByFields.forEach(function(field, i) {
            if (self.options.showPrice && i === 0) {
                p.setFieldAddToSetWithPrice(field);
            } else {
                p.setFieldAddToSet(field);
            }
        });

        return p.getQuery();
    };

    AnalysisGen.prototype.prepareMiddleGroupsForActivities = function() {
        var self = this,
            _pipeline = [],
            idField = this.prepareIdField(),
            sortByField = this.options.showPrice ? 'price' : 'total',
            sortByTotal = this.getSortBy(sortByField, this.childrenOpts.order);

        idField.caseFolderId = '$_id.caseFolderId';

        this.groupByFields.forEach( function( groupField, i ) {

            // first item
            if (i === 0) {


                var firstGroup = new GroupObject(),
                    idFieldWoPrefix = self.prepareIdFieldWithoutPrefix();

                idFieldWoPrefix.caseFolderId = '$_id.caseFolderId';

                firstGroup.setId(idFieldWoPrefix);
                firstGroup.setTotalSum(1);
                firstGroup.setPriceSum('$price');
                firstGroup.setNameFirst('$' + groupField);

                _pipeline.push(firstGroup.getQuery());
                _pipeline.push(sortByTotal);

            } else if (i > 0) {

                var previousField = self.groupByFields[i - 1];
                delete idField[previousField];
                var currentIdField = JSON.parse(JSON.stringify(idField));

                var stage2Group = self.prepareFieldGroup(currentIdField, groupField);

                _pipeline.push(stage2Group);
                _pipeline.push(sortByTotal);

            }

        });

        return _pipeline;
    };

    AnalysisGen.prototype.prepareUnwindsForActivities = function() {
        var self = this,
            _pipeline = [],
            unwind;

        this.groupByFields.forEach(function(field) {
            unwind = self.getUnwind('$' + field);
            if (unwind) {
                _pipeline.push(unwind);
            }
        });

        return _pipeline;
    };

    AnalysisGen.prototype.prepareFlattenForActivitiesWithPrice = function() {
        var self = this,
            p = new ProjectObject();

        p.setCopyField('_id');

        this.groupByFields.forEach(function(field, i) {
            if (self.options.showPrice && i === 0){
                p.moveField(field, '$' + field + '.val');
                p.moveField('price', '$' + field + '.price');
            } else {
                p.setCopyField(field);
            }
        });

        return p.getQuery();
    };

    AnalysisGen.prototype.prepareBaseMatch = function() {
        var p = {};

        for (var field in this.filter) {
            if (this.filter.hasOwnProperty(field)) {
                p[field] = {
                    $in: this.filter[field]
                };
            }
        }

        return {$match: p};
    };

    AnalysisGen.prototype.preparePreProject = function() {
        var p = {$project: {}},
            addKeys = Object.keys(this.additionalFieldsList);

        this.groupByFields.forEach( function( field ) {
            p.$project[field] = 1;
        });

        if (this.modelFields && this.modelFields.length) {
            this.modelFields.forEach( function( modelField ) {
                p.$project[modelField] = 1;
            });
        }

        if (this.virtualFields.length) {
            var vFieldMap = {};
            this.virtualFields.forEach( function( vField ) {
                vFieldMap = analysisVirtualMap.getMap(vField);
                if (vFieldMap) {
                    p.$project[vField] = vFieldMap.query || 1;
                }
            });
        }

        addKeys.map(function(addField) {
            p.$project[addField] = 1;
        });

        if (this.options.showPrice) {
            p.$project.price = "$total";
        }

        return p;
    };

    AnalysisGen.prototype.prepareMiddleGroups = function() {
        var self = this,
            _pipeline = [],
            idField = this.prepareIdField(),
            sortByField = this.options.showPrice ? 'price' : 'total',
            sortByTotal = this.getSortBy(sortByField, this.childrenOpts.order);

        if (this.modelFields && this.modelFields.length) {
            var currentIdField = JSON.parse(JSON.stringify(idField)),
                modelGroup = this.prepareModelGroup(currentIdField);
            _pipeline.push(modelGroup);
            _pipeline.push(sortByTotal);
        }

        this.groupByFields.forEach( function( groupField, i ) {
            var previousField = self.groupByFields[i - 1];

            if (i > 0 && i !== self.lastIndex) { // standard items

                delete idField[previousField];
                var currentIdField = JSON.parse(JSON.stringify(idField));

                var stage2Group = self.prepareFieldGroup(currentIdField, groupField, previousField);
                _pipeline.push(stage2Group);
                _pipeline.push(sortByTotal);

            } else if (i === self.lastIndex) { // last item

                var groupQuery = self.prepareLastGroup(groupField, previousField);
                _pipeline.push(groupQuery);
                _pipeline.push(sortByTotal);

            }

        });

        return _pipeline;
    };

    AnalysisGen.prototype.prepareModelGroup = function(idField) {
        var self = this,
            p = new GroupObject(),
            totalSum = this.modelStats.none && '$total' || 1,
            addKeys = Object.keys(this.additionalFieldsList);

        p.setId(idField);
        p.setNameFirst('$name');
        p.setTotalSum(totalSum);

        addKeys.map(function(addField) {
            p.setFieldWithOperator(addField, self.additionalFieldsList[addField]);
        });

        if (this.options.showPrice) {
            p.setPriceSum('$price');
        }

        return p.getQuery();
    };

    AnalysisGen.prototype.prepareIdField = function() {
        var idField = {};

        this.groupByFields.forEach( function( groupField ) {
            idField[groupField] = '$_id.' + groupField;
        });

        return idField;
    };

    AnalysisGen.prototype.prepareIdFieldWithoutPrefix = function() {
        var idField = {};

        this.groupByFields.forEach( function( groupField ) {
            idField[groupField] = '$' + groupField;
        });

        return idField;
    };

    AnalysisGen.prototype.prepareFieldGroup = function( idField, currentField, previousField ) {
        var self = this,
            p = new GroupObject(),
            addFields = this.prepareAdditionalFieldsForChildren(previousField),
            addKeys = Object.keys(this.additionalFieldsList);

        p.setId(idField);
        p.setNameFirst('$_id.' + currentField);
        p.setTotalSum('$total');

        addKeys.map(function(addField) {
            p.setFieldWithOperator(addField, self.additionalFieldsList[addField]);
        });

        p.setChildrenInheritance({
            limit: this.childrenOpts.limit,
            additionalFields: addFields
        });

        if (this.options.showPrice) {
            p.setPriceSum('$price');
        }

        return p.getQuery();
    };

    AnalysisGen.prototype.prepareBaseGroup = function() {
        var self = this,
            p = new GroupObject(),
            idField = {},
            addKeys = Object.keys(this.additionalFieldsList);

        this.groupByFields.forEach( function( field ) {
            idField[field] = '$' + field;
        });

        if (this.modelFields && this.modelFields.length) {
            this.modelFields.forEach( function( modelField ) {
                idField[modelField] = '$' + modelField;
            });
        }

        addKeys.map(function(addField) {
            p.setFieldWithOperator(addField, self.additionalFieldsList[addField]);
        });

        if (!(this.modelFields && this.modelFields.length) || this.modelStats.none) {
            p.setTotalSum(1);
        }

        if (this.options.showPrice) {
            p.setPriceSum('$price');
        }

        p.setId(idField);
        p.setNameFirst('$' + this.groupByFields[0]);

        return p.getQuery();
    };

    AnalysisGen.prototype.prepareLastGroup = function(groupField, previousField) {
        var self = this,
            p = new GroupObject(),
            totalVal = '$total',
            addFields = this.prepareAdditionalFieldsForChildren(previousField),
            addKeys = Object.keys(this.additionalFieldsList);

        p.setId('$_id.' + groupField);
        p.setNameFirst('$_id.' + groupField);
        p.setTotalSum(totalVal);

        if (this.options.showPrice) {
            p.setPriceSum('$price');
        }

        addKeys.map(function(addField) {
            p.setFieldWithOperator(addField, self.additionalFieldsList[addField]);
        });

        if (this.fieldsLength > 1) {
            p.setChildrenInheritance({
                limit: this.childrenOpts.limit,
                additionalFields: addFields
            });
        }

        return p.getQuery();
    };

    AnalysisGen.prototype.prepareRootGroup = function() {
        var p = new GroupObject(),
            lastField = this.groupByFields[this.lastIndex],
            addFields = this.prepareAdditionalFieldsForChildren(lastField);

        p.setId('root');
        p.setNameFirst('root');
        p.setTotalSum('$total');
        p.setPriceSum('$price');

        p.setChildrenInheritance({
            limit: this.childrenOpts.limit,
            additionalFields: addFields
        });

        return p.getQuery();
    };

    AnalysisGen.prototype.prepareRootProject = function() {
        var p = new ProjectObject();

        p.setCopyField('_id');
        p.setCopyField('total');
        p.setCopyField('name');
        p.setSliceArray('children', this.childrenOpts.limit);

        if (this.options.showPrice) {
            p.setCopyField('price');
        }

        return p.getQuery();
    };

    AnalysisGen.prototype.getModelFields = function() {
        var self = this,
            models = {},
            modelFields = [];

        this.groupByFields.forEach(function(fieldName) {
            var fieldSchemaDef = inCaseSchema[fieldName];

            if (fieldSchemaDef) {
                var model = fieldSchemaDef.model;

                if(model && !models[model]) {
                    models[model] = true;
                    if (modelFieldsMap[model]) {
                        modelFields.push(modelFieldsMap[model]);
                    }
                }

                var modeStatName = modelFieldsMap[model] ? model : 'none';
                self._addModelStat(modeStatName);

                if (model === 'activity') {
                    self._addModelStat('_activityCount');
                }
            }
        });

        return modelFields;
    };

    AnalysisGen.prototype.prepareAdditionalFieldsForChildren = function(field) {
        var addFields = [];
        if (this.additionalFields[field]) {
            addFields = this.additionalFields[field].map(function(fieldDef) {
                return fieldDef.fieldName;
            });
        }
        return addFields;
    };

    AnalysisGen.prototype.getAdditionalFieldsList = function() {
        var self = this,
            res = {};

        if (this.additionalFields) {
            var fields = Object.keys(this.additionalFields);

            fields.map(function(fieldName) {
                if (Array.isArray(self.additionalFields[fieldName])) {
                    self.additionalFields[fieldName].map(function(def) {
                        res[def.fieldName] = def.mode;
                    });
                }
            });
        }

        return res;
    };

    AnalysisGen.prototype.getUnwind = function(field) {
        return {
            $unwind: field
        };
    };

    AnalysisGen.prototype.getSortBy = function(field, order) {
        var p = {
            $sort: {}
        };

        p.$sort[field] = order || -1;

        return p;
    };

    AnalysisGen.prototype._addModelStat = function(modelName) {
        if (this.modelStats[modelName] === undefined) {
            this.modelStats[modelName] = 1;
        } else {
            this.modelStats[modelName]++;
        }
    };

    Y.namespace( 'doccirrus.insight2' ).AnalysisGen = AnalysisGen;

}, '0.0.1', {requires: [
    'GroupObject',
    'ProjectObject',
    'analysisVirtualMap',
    'dcforms-reducedschema',
    'dcforms-schema-InCase-T'
]});