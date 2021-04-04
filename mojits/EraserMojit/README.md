# Eraser

Multipurpose service to erase data.

## Usage

Eraser tasks can be set up via `cronjobs.json`:

```json
{
  "jobs": [
    {
      "name": "Erase",
      "time": "0 25 3 * * *",
      "config": "mojits/FooMojit/foo.eraser.json"
    }
  ]
}
```

The configuration set by `config` in the cron job defines all details of the eraser task:

```json
[
  {
    "name": "Foos",
    "description": "Foos need to be deleted after 3 months in line with bar.",
    "model": "foo",
    "expiration": {
      "field": "baz.qux",
      "time": "P3M"
    },
    "selection": {
      "bar": { "$eq": "baz" }
    }
  }
]
```

## Configuration

See `tasks-schema.json` for a detailed explanation of the eraser task configuration.

## Prospect

 * Redaction of document subsets
 * Backup of erased data
