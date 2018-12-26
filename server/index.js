const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});
pgClient.on('error', () => console.log('Lost PG connection'));

pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(err => console.log(err));

// Redis Client Setup
//const redis = require('redis');
var redis = require('redis');
// const redisClient = redis.createClient({
//   host: keys.redisHost,
//   port: keys.redisPort,
//   retry_strategy: () => 1000
// });
var redisClient = redis.createClient({host:keys.redisHost,port:keys.redisPort});
var redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values');

  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  console.log("server index.js /values/current called.");
  redisClient.hgetall('values', (err, values) => {
    if(err){
      console.log("server index.js /values/current: redis err="+err);
    }
    console.log("server index.js /values/current redisClient ok");
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;
  console.log("server app.post(values) index = "+index);

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }
  console.log("redisHost="+keys.redisHost+", redisPort="+keys.redisPort);
  console.log("server index.js:66 before redisClient.hset()");
  redisClient.hset('values', index, 'Nothing yet!',redis.print);
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({ working: true });
});

app.listen(5000, err => {
  console.log('Listening');
});
