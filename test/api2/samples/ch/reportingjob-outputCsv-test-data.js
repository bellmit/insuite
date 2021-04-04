'use strict';
var
    outputCsvMinimalPostBody =
        {
            // insightConfigId of standard report "Patienten mit Leistungen und Diagnosen"
            "insightConfigId": "575154d9719f70f7221d2b5b",
            "startDate": "2019-03-31T22:00:00.000Z",
            "endDate": "2020-06-30T21:59:59.999Z"
        },

    outputCsvExtensivePostBody =
        {
            // insightConfigId of standard report "Patienten mit Leistungen und Diagnosen"
            "insightConfigId": "575154d9719f70f7221d2b5b",
            "fileName": "anotherOutputTest.csv",
            "startDate": "2019-03-31T22:00:00.000Z",
            "endDate": "2020-06-30T21:59:59.999Z",
            "separator": "separatorTest",
            "newline": "newlineTest",
            "lang": "en"
        },

    standardReportMinimalReference =
        {
            "displayFields": [
                {
                    value: "lastname",
                    "label": {
                        "en": "Pat. Surname",
                        "de": "Pat. Nachname",
                        "de-ch": "Pat. Nachname"
                    }
                },
                {
                    "value": "firstname",
                    "label": {
                        "en": "Pat. first name",
                        "de": "Pat. Vorname",
                        "de-ch": "Pat. Vorname"
                    }
                },
                {
                    value: "title",
                    "label": {
                        "en": "Title",
                        "de": "Titel",
                        "de-ch": "Titel"
                    }
                },
                {
                    value: "caseFolderType",
                    "label": {
                        "de-ch": "Abrechnung",
                        "de": "Abrechnung",
                        "en": "Billing"
                    }
                },
                {
                    value: "catalogShort",
                    "label": {
                        "de-ch": "Katalog",
                        "de": "Katalog",
                        "en": "Catalog"
                    }
                },
                {
                    value: "diagnosis",
                    "label": {
                        "de-ch": "Diagnosen",
                        "de": "Diagnosen",
                        "en": "Diagnoses"
                    }
                },
                {
                    value: "treatments",
                    "label": {
                        "de-ch": "Leistungen",
                        "de": "Leistungen",
                        "en": "Treatments"
                    }
                }
            ]
        };

module.exports = {
    getDataSet1: function() {
        var
            data = JSON.parse( JSON.stringify( outputCsvMinimalPostBody ) );

        return data;
    },
    getDataSet2: function() {
        var
            data = JSON.parse( JSON.stringify( outputCsvExtensivePostBody ) );

        return data;
    },
    getInsightConfig: function() {
        var
            config = JSON.parse( JSON.stringify( standardReportMinimalReference ) );

        return config;
    }
};

