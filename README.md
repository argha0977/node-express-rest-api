# Node Express REST API Bolerplate

> '@argha0277/express-rest-api' is a boilerplate for developing REST API using Express framework in ES6 format of Javascript.



## Index
* [Clone](#clone)
* [Dependencies](#dependencies)
* [Run](#run)
* [URL](#URL)

## Clone

```bash
git clone git@github.com:argha0977/node-express-rest-api.git
```

## Dependencies

```js
npm install bcryptjs lodash cors mongodb nodemailer googleapis onesignal-node superagent winston aws-sdk moment connect-multiparty jsonwebtoken --save
npm install
```

## Run

### Development 

```js
pm2 start --watch --env development
pm2 logs
pm2 stop NODE_EXPRESS_API
```
### Production 

```js
pm2 start --watch --env production
pm2 logs
pm2 stop NODE_EXPRESS_API
```

## URL

```js
http://localhost:4012/api\
```