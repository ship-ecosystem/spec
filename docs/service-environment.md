# Shared service environment

The [connection variable catalog](../contracts/service-environment.json) lists
the names that PHP, Python and JavaScript producers set in the application
environment when a shared service is selected. The service name in the catalog
is the provider key in `ship.json`. PHP's `dusk` integration supplies the
`selenium` connection.

The keys apply in each environment where the provider is active. An additional
named service uses the same keys with its uppercase instance name and an
underscore, such as `REPORTING_DB_USERNAME`. A Compose service rename changes
hostnames and endpoints while preserving the setting names and data volumes.

Producers can also provide framework settings and compatibility aliases.
`DB_DATABASE`, `DB_USERNAME` and `MONGODB_USERNAME` are the portable names.
Applications that build connection URLs from the individual settings must
encode their credentials using the client library. Administrative credentials
used to provision a database are private to the database container.

Browser endpoints apply in development where those services are available.
`PLAYWRIGHT_BASE_URL` points to the application from the browser network.
`PW_TEST_CONNECT_WS_ENDPOINT` and `SELENIUM_REMOTE_URL` point to the browsers
from the application or test runner.
