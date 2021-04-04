# TestingMojit

This is a place to put demos, experiments, hacks and other code / actions which do not belong with production code,
which must be of a higher standard.

## Routes ##

To use this mojit, please add the following to ../../routes.json (pages section)

        "testing": {
            "call": "DocCirrus.testing",
            "path": "/testing",
            "verbs": ["get", "post"]
        },

        "anembeddedform": {
            "call": "DocCirrus.anembeddedform",
            "path": "/anembeddedform",
            "verbs": ["get"]
        },

        "xsstest": {
            "call": "DocCirrus.xsstest",
            "path": "/xsstest",
            "verbs": ["get", "post"]
        },

        "mediatest": {
            "call": "DocCirrus.mediatest",
            "path": "/mediatest",
            "verbs": ["get", "post"]
        },

        "imagetest": {
            "call": "DocCirrus.imagetest",
            "path": "/imagetest",
            "verbs": ["get", "post"]
        },

        "filterdb": {
            "call": "DocCirrus.filterdb",
            "path": "/filterdb",
            "verbs": ["get", "post"]
        },

## REST Routes ##

To use this mojit, please add the following to ../../routes.json (REST section)

                    "xsstestrunner": "TestingMojit",
                    "applyfiltertodb": "TestingMojit",





