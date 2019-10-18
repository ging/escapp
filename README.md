# escapp

## Installation

* Install [node](https://nodejs.org/es/) (10.x.x) with npm.
* Install [postgres](https://postgresql.org) or any other supported DB (MySQL, MariaDB, SQLite and Microsoft SQL Server).
* Create a [Sendgrid](https://sendgrid.com) account.
* Create a [Cloudinary account](https://cloudinary.com) account.
* Clone this repository:
```shell
git clone http://github.com/sonsoleslp/escapp
cd escapp
```
* Install dependencies:
```shell
npm install
```
* Create database tables:
```shell
npm run migrate_local
```
* [ **Optional** ] Seed database:
```shell
npm run seed_local
```
* Configure environment variables in `.env` file:
```shell
DATABASE_URL=...
CLOUDINARY_URL=...
SENDGRID_API_KEY=...
APP_NAME=...
```
* Run the server
```
npm run dev
```

## Production

* Set the `NODE_ENV` environment variable to production:
```shell
export NODE_ENV=production
```

* Run the server:
```shell
npm run start_production
```
* [ **Optional** ] Run the server with `forever`:
```shell
npm run start_production_forever
```
